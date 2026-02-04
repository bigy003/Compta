import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
// Note: xlsx doit être installé avec: npm install xlsx
// Pour l'instant, l'import Excel est désactivé si xlsx n'est pas disponible
let XLSX: any = null;
try {
  XLSX = require('xlsx');
} catch (e) {
  // xlsx non installé
}

export interface TransactionImportee {
  date: Date;
  montant: number;
  libelle: string;
  type: 'DEBIT' | 'CREDIT';
  reference?: string;
  categorie?: string;
}

@Injectable()
export class ImportMultiFormatsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Importe un relevé bancaire depuis un fichier CSV
   * Supporte différents formats de banques ivoiriennes
   */
  async importerCSV(
    compteBancaireId: string,
    fileContent: string,
    formatBanque?: string, // 'SGBCI', 'BICICI', 'UBA', 'ECOBANK', 'GENERIQUE'
  ): Promise<{ creees: number; ignorees: number; erreurs: string[] }> {
    const compte = await this.prisma.compteBancaire.findUnique({
      where: { id: compteBancaireId },
    });

    if (!compte) {
      throw new BadRequestException('Compte bancaire introuvable');
    }

    let transactions: TransactionImportee[] = [];

    try {
      // Parser le CSV selon le format de la banque
      switch (formatBanque) {
        case 'SGBCI':
          transactions = this.parserSGBCI(fileContent);
          break;
        case 'BICICI':
          transactions = this.parserBICICI(fileContent);
          break;
        case 'UBA':
          transactions = this.parserUBA(fileContent);
          break;
        case 'ECOBANK':
          transactions = this.parserECOBANK(fileContent);
          break;
        default:
          transactions = this.parserGenerique(fileContent);
      }
    } catch (error: any) {
      throw new BadRequestException(
        `Erreur lors du parsing CSV: ${error.message}`,
      );
    }

    return this.creerTransactions(compteBancaireId, transactions);
  }

  /**
   * Importe un relevé bancaire depuis un fichier Excel
   */
  async importerExcel(
    compteBancaireId: string,
    filePath: string,
  ): Promise<{ creees: number; ignorees: number; erreurs: string[] }> {
    if (!XLSX) {
      throw new BadRequestException(
        'Le module xlsx n\'est pas installé. Installez-le avec: npm install xlsx',
      );
    }

    const compte = await this.prisma.compteBancaire.findUnique({
      where: { id: compteBancaireId },
    });

    if (!compte) {
      throw new BadRequestException('Compte bancaire introuvable');
    }

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Fichier Excel introuvable');
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { raw: false });

    const transactions: TransactionImportee[] = [];

    for (const row of data as any[]) {
      try {
        // Format générique Excel : colonnes Date, Montant, Libellé, Type
        const dateStr = row.Date || row.Date || row['Date opération'] || row.date;
        const montantStr = row.Montant || row.montant || row['Montant'] || row.Amount;
        const libelle = row.Libellé || row.libelle || row.Libelle || row['Description'] || row.description || '';
        const typeStr = row.Type || row.type || row['Type'] || '';

        if (!dateStr || !montantStr) {
          continue;
        }

        const date = this.parseDate(dateStr);
        const montant = Math.abs(parseFloat(montantStr.toString().replace(/\s/g, '').replace(',', '.')));
        const type = this.determinerType(typeStr, montantStr);

        transactions.push({
          date,
          montant,
          libelle: libelle.toString().substring(0, 500),
          type,
          reference: row.Reference || row.reference || row['Référence'] || undefined,
          categorie: row.Categorie || row.categorie || undefined,
        });
      } catch (error) {
        // Ignorer les lignes invalides
        continue;
      }
    }

    return this.creerTransactions(compteBancaireId, transactions);
  }

  /**
   * Importe un relevé bancaire depuis un fichier OFX
   */
  async importerOFX(
    compteBancaireId: string,
    fileContent: string,
  ): Promise<{ creees: number; ignorees: number; erreurs: string[] }> {
    const compte = await this.prisma.compteBancaire.findUnique({
      where: { id: compteBancaireId },
    });

    if (!compte) {
      throw new BadRequestException('Compte bancaire introuvable');
    }

    const transactions: TransactionImportee[] = [];

    // Parser le format OFX (XML)
    try {
      // Format OFX basique
      const dateRegex = /<DTPOSTED>(\d{8})/g;
      const amountRegex = /<TRNAMT>([-\d.]+)/g;
      const memoRegex = /<MEMO>(.*?)</g;
      const fitidRegex = /<FITID>(.*?)</g;

      const dates = [...fileContent.matchAll(dateRegex)];
      const amounts = [...fileContent.matchAll(amountRegex)];
      const memos = [...fileContent.matchAll(memoRegex)];
      const fitids = [...fileContent.matchAll(fitidRegex)];

      for (let i = 0; i < dates.length && i < amounts.length; i++) {
        const dateStr = dates[i][1];
        const montant = parseFloat(amounts[i][1]);
        const libelle = memos[i] ? memos[i][1] : '';
        const reference = fitids[i] ? fitids[i][1] : undefined;

        // Format date OFX : YYYYMMDD
        const date = new Date(
          parseInt(dateStr.substring(0, 4)),
          parseInt(dateStr.substring(4, 6)) - 1,
          parseInt(dateStr.substring(6, 8)),
        );

        transactions.push({
          date,
          montant: Math.abs(montant),
          libelle: libelle.substring(0, 500),
          type: montant >= 0 ? 'CREDIT' : 'DEBIT',
          reference,
        });
      }
    } catch (error: any) {
      throw new BadRequestException(
        `Erreur lors du parsing OFX: ${error.message}`,
      );
    }

    return this.creerTransactions(compteBancaireId, transactions);
  }

  /**
   * Parseur spécifique SGBCI
   */
  private parserSGBCI(content: string): TransactionImportee[] {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',
    });

    return records.map((row: any) => {
      const date = this.parseDate(row.Date || row['Date opération']);
      const montant = Math.abs(
        parseFloat(
          (row.Montant || row.montant || row['Montant'] || '0')
            .toString()
            .replace(/\s/g, '')
            .replace(',', '.'),
        ),
      );
      const libelle = row.Libellé || row.libelle || row.Libelle || '';
      const type = this.determinerType(row.Type || row.type, row.Montant || row.montant);

      return {
        date,
        montant,
        libelle: libelle.substring(0, 500),
        type,
        reference: row.Reference || row.reference,
      };
    });
  }

  /**
   * Parseur spécifique BICICI
   */
  private parserBICICI(content: string): TransactionImportee[] {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
    });

    return records.map((row: any) => {
      const date = this.parseDate(row.Date || row['Date']);
      const montant = Math.abs(
        parseFloat(
          (row.Montant || row['Montant'] || '0')
            .toString()
            .replace(/\s/g, '')
            .replace(',', '.'),
        ),
      );
      const libelle = row.Description || row['Description'] || '';
      const type = this.determinerType(row.Type || row['Type'], row.Montant || row['Montant']);

      return {
        date,
        montant,
        libelle: libelle.substring(0, 500),
        type,
        reference: row.Reference || row['Référence'],
      };
    });
  }

  /**
   * Parseur spécifique UBA
   */
  private parserUBA(content: string): TransactionImportee[] {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: '\t',
    });

    return records.map((row: any) => {
      const date = this.parseDate(row.Date || row['Transaction Date']);
      const montant = Math.abs(
        parseFloat(
          (row.Amount || row['Amount'] || '0')
            .toString()
            .replace(/\s/g, '')
            .replace(',', '.'),
        ),
      );
      const libelle = row.Description || row['Description'] || '';
      const type = this.determinerType(row.Type || row['Transaction Type'], row.Amount || row['Amount']);

      return {
        date,
        montant,
        libelle: libelle.substring(0, 500),
        type,
        reference: row.Reference || row['Reference Number'],
      };
    });
  }

  /**
   * Parseur spécifique ECOBANK
   */
  private parserECOBANK(content: string): TransactionImportee[] {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',
    });

    return records.map((row: any) => {
      const date = this.parseDate(row.Date || row['Date']);
      const montant = Math.abs(
        parseFloat(
          (row.Amount || row['Amount'] || '0')
            .toString()
            .replace(/\s/g, '')
            .replace(',', '.'),
        ),
      );
      const libelle = row.Narrative || row['Narrative'] || '';
      const type = this.determinerType(row.DrCr || row['Dr/Cr'], row.Amount || row['Amount']);

      return {
        date,
        montant,
        libelle: libelle.substring(0, 500),
        type,
        reference: row.Reference || row['Reference'],
      };
    });
  }

  /**
   * Parseur générique (format CSV standard)
   */
  private parserGenerique(content: string): TransactionImportee[] {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: [',', ';', '\t'],
    });

    return records.map((row: any) => {
      const date = this.parseDate(
        row.Date ||
          row.date ||
          row['Date opération'] ||
          row['Date operation'] ||
          row.DATE,
      );
      const montant = Math.abs(
        parseFloat(
          (row.Montant ||
            row.montant ||
            row.Amount ||
            row.amount ||
            row['Montant'] ||
            '0')
            .toString()
            .replace(/\s/g, '')
            .replace(',', '.'),
        ),
      );
      const libelle =
        row.Libellé ||
        row.libelle ||
        row.Libelle ||
        row.Description ||
        row.description ||
        row.Memo ||
        row.memo ||
        '';
      const type = this.determinerType(
        row.Type || row.type || row['Type'],
        row.Montant || row.montant || row.Amount || row.amount,
      );

      return {
        date,
        montant,
        libelle: libelle.toString().substring(0, 500),
        type,
        reference: row.Reference || row.reference || row['Référence'],
        categorie: row.Categorie || row.categorie,
      };
    });
  }

  /**
   * Crée les transactions en base de données
   */
  private async creerTransactions(
    compteBancaireId: string,
    transactions: TransactionImportee[],
  ): Promise<{ creees: number; ignorees: number; erreurs: string[] }> {
    let creees = 0;
    let ignorees = 0;
    const erreurs: string[] = [];

    for (const trans of transactions) {
      try {
        // Vérifier si la transaction existe déjà
        const existing = await this.prisma.transactionBancaire.findFirst({
          where: {
            compteBancaireId,
            date: {
              gte: new Date(
                trans.date.getFullYear(),
                trans.date.getMonth(),
                trans.date.getDate(),
              ),
              lt: new Date(
                trans.date.getFullYear(),
                trans.date.getMonth(),
                trans.date.getDate() + 1,
              ),
            },
            montant: trans.montant,
            libelle: trans.libelle.substring(0, 500),
            type: trans.type,
          },
        });

        if (existing) {
          ignorees++;
          continue;
        }

        await this.prisma.transactionBancaire.create({
          data: {
            compteBancaireId,
            date: trans.date,
            montant: trans.montant,
            libelle: trans.libelle.substring(0, 500),
            type: trans.type,
            reference: trans.reference
              ? trans.reference.substring(0, 100)
              : null,
            categorie: trans.categorie || null,
            rapproche: false,
          },
        });

        creees++;
      } catch (error: any) {
        erreurs.push(
          `Transaction ${trans.date.toLocaleDateString('fr-FR')} ${trans.libelle.substring(0, 30)}: ${error.message}`,
        );
      }
    }

    return { creees, ignorees, erreurs };
  }

  /**
   * Parse une date depuis différents formats
   */
  private parseDate(dateStr: string): Date {
    if (!dateStr) {
      return new Date();
    }

    // Format DD/MM/YYYY ou DD-MM-YYYY
    const match1 = dateStr.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (match1) {
      return new Date(
        parseInt(match1[3]),
        parseInt(match1[2]) - 1,
        parseInt(match1[1]),
      );
    }

    // Format YYYY-MM-DD
    const match2 = dateStr.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/);
    if (match2) {
      return new Date(
        parseInt(match2[1]),
        parseInt(match2[2]) - 1,
        parseInt(match2[3]),
      );
    }

    // Format ISO
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }

    return new Date();
  }

  /**
   * Détermine le type de transaction (DEBIT ou CREDIT)
   */
  private determinerType(typeStr: string | undefined, montantStr: string | number | undefined): 'DEBIT' | 'CREDIT' {
    if (typeStr) {
      const typeUpper = typeStr.toUpperCase();
      if (typeUpper.includes('DEBIT') || typeUpper.includes('DÉBIT') || typeUpper.includes('D')) {
        return 'DEBIT';
      }
      if (typeUpper.includes('CREDIT') || typeUpper.includes('CRÉDIT') || typeUpper.includes('C')) {
        return 'CREDIT';
      }
    }

    // Si montant négatif, c'est un débit
    if (montantStr) {
      const montant = parseFloat(montantStr.toString().replace(/\s/g, '').replace(',', '.'));
      if (montant < 0) {
        return 'DEBIT';
      }
    }

    // Par défaut, considérer comme crédit (entrée d'argent)
    return 'CREDIT';
  }
}
