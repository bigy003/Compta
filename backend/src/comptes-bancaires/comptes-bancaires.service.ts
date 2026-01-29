import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateCompteBancaireDto {
  nom: string;
  banque?: string;
  numeroCompte?: string;
  iban?: string;
  devise?: string;
  soldeInitial?: number;
}

interface CreateTransactionDto {
  date: string;
  montant: number;
  libelle: string;
  type: 'DEBIT' | 'CREDIT';
  categorie?: string;
  reference?: string;
}

@Injectable()
export class ComptesBancairesService {
  constructor(private readonly prisma: PrismaService) {}

  listBySociete(societeId: string) {
    return this.prisma.compteBancaire.findMany({
      where: { societeId },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 10, // Dernières 10 transactions
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCompte(societeId: string, dto: CreateCompteBancaireDto) {
    const societe = await this.prisma.societe.findUnique({
      where: { id: societeId },
    });
    if (!societe) {
      throw new NotFoundException('Société introuvable');
    }

    return this.prisma.compteBancaire.create({
      data: {
        societeId,
        nom: dto.nom,
        banque: dto.banque,
        numeroCompte: dto.numeroCompte,
        iban: dto.iban,
        devise: dto.devise || 'FCFA',
        soldeInitial: dto.soldeInitial || 0,
      },
    });
  }

  async updateCompte(
    societeId: string,
    compteId: string,
    dto: Partial<CreateCompteBancaireDto>,
  ) {
    const compte = await this.prisma.compteBancaire.findFirst({
      where: { id: compteId, societeId },
    });

    if (!compte) {
      throw new NotFoundException('Compte bancaire introuvable');
    }

    return this.prisma.compteBancaire.update({
      where: { id: compteId },
      data: dto,
    });
  }

  async deleteCompte(societeId: string, compteId: string) {
    const compte = await this.prisma.compteBancaire.findFirst({
      where: { id: compteId, societeId },
      include: { transactions: true },
    });

    if (!compte) {
      throw new NotFoundException('Compte bancaire introuvable');
    }

    if (compte.transactions.length > 0) {
      throw new Error('Impossible de supprimer un compte avec des transactions');
    }

    return this.prisma.compteBancaire.delete({
      where: { id: compteId },
    });
  }

  async getSolde(societeId: string, compteId: string) {
    const compte = await this.prisma.compteBancaire.findFirst({
      where: { id: compteId, societeId },
    });

    if (!compte) {
      throw new NotFoundException('Compte bancaire introuvable');
    }

    const transactions = await this.prisma.transactionBancaire.findMany({
      where: { compteBancaireId: compteId },
    });

    const totalCredits = transactions
      .filter((t) => t.type === 'CREDIT')
      .reduce((sum, t) => sum + Number(t.montant), 0);

    const totalDebits = transactions
      .filter((t) => t.type === 'DEBIT')
      .reduce((sum, t) => sum + Number(t.montant), 0);

    const solde = Number(compte.soldeInitial) + totalCredits - totalDebits;

    return {
      soldeInitial: Number(compte.soldeInitial),
      totalCredits,
      totalDebits,
      solde,
    };
  }

  // Transactions
  listTransactions(compteBancaireId: string, from?: string, to?: string) {
    const where: any = { compteBancaireId };

    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    return this.prisma.transactionBancaire.findMany({
      where,
      include: {
        recette: true,
        depense: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async createTransaction(
    societeId: string,
    compteBancaireId: string,
    dto: CreateTransactionDto,
  ) {
    const compte = await this.prisma.compteBancaire.findFirst({
      where: { id: compteBancaireId, societeId },
    });

    if (!compte) {
      throw new NotFoundException('Compte bancaire introuvable');
    }

    return this.prisma.transactionBancaire.create({
      data: {
        compteBancaireId,
        date: new Date(dto.date),
        montant: dto.montant,
        libelle: dto.libelle,
        type: dto.type,
        categorie: dto.categorie,
        reference: dto.reference,
      },
    });
  }

  async updateTransaction(
    societeId: string,
    compteBancaireId: string,
    transactionId: string,
    dto: Partial<CreateTransactionDto>,
  ) {
    const compte = await this.prisma.compteBancaire.findFirst({
      where: { id: compteBancaireId, societeId },
    });

    if (!compte) {
      throw new NotFoundException('Compte bancaire introuvable');
    }

    const transaction = await this.prisma.transactionBancaire.findFirst({
      where: { id: transactionId, compteBancaireId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    const updateData: any = {};
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.montant !== undefined) updateData.montant = dto.montant;
    if (dto.libelle !== undefined) updateData.libelle = dto.libelle;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.categorie !== undefined) updateData.categorie = dto.categorie;
    if (dto.reference !== undefined) updateData.reference = dto.reference;

    return this.prisma.transactionBancaire.update({
      where: { id: transactionId },
      data: updateData,
    });
  }

  async deleteTransaction(
    societeId: string,
    compteBancaireId: string,
    transactionId: string,
  ) {
    const compte = await this.prisma.compteBancaire.findFirst({
      where: { id: compteBancaireId, societeId },
    });

    if (!compte) {
      throw new NotFoundException('Compte bancaire introuvable');
    }

    const transaction = await this.prisma.transactionBancaire.findFirst({
      where: { id: transactionId, compteBancaireId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    return this.prisma.transactionBancaire.delete({
      where: { id: transactionId },
    });
  }

  // Rapprochement bancaire
  async rapprocherAvecRecette(
    societeId: string,
    compteBancaireId: string,
    transactionId: string,
    recetteId: string,
  ) {
    const compte = await this.prisma.compteBancaire.findFirst({
      where: { id: compteBancaireId, societeId },
    });

    if (!compte) {
      throw new NotFoundException('Compte bancaire introuvable');
    }

    const transaction = await this.prisma.transactionBancaire.findFirst({
      where: { id: transactionId, compteBancaireId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    const recette = await this.prisma.recette.findFirst({
      where: { id: recetteId, societeId },
    });

    if (!recette) {
      throw new NotFoundException('Recette introuvable');
    }

    // Vérifier que la transaction n'est pas déjà rapprochée
    if (transaction.rapproche) {
      throw new Error('Cette transaction est déjà rapprochée');
    }

    // Vérifier que la recette n'est pas déjà rapprochée
    const existingRapprochement = await this.prisma.transactionBancaire.findFirst({
      where: { recetteId },
    });

    if (existingRapprochement) {
      throw new Error('Cette recette est déjà rapprochée avec une autre transaction');
    }

    return this.prisma.transactionBancaire.update({
      where: { id: transactionId },
      data: {
        rapproche: true,
        recetteId,
      },
      include: {
        recette: true,
        compteBancaire: true,
      },
    });
  }

  async rapprocherAvecDepense(
    societeId: string,
    compteBancaireId: string,
    transactionId: string,
    depenseId: string,
  ) {
    const compte = await this.prisma.compteBancaire.findFirst({
      where: { id: compteBancaireId, societeId },
    });

    if (!compte) {
      throw new NotFoundException('Compte bancaire introuvable');
    }

    const transaction = await this.prisma.transactionBancaire.findFirst({
      where: { id: transactionId, compteBancaireId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    const depense = await this.prisma.depense.findFirst({
      where: { id: depenseId, societeId },
    });

    if (!depense) {
      throw new NotFoundException('Dépense introuvable');
    }

    // Vérifier que la transaction n'est pas déjà rapprochée
    if (transaction.rapproche) {
      throw new Error('Cette transaction est déjà rapprochée');
    }

    // Vérifier que la dépense n'est pas déjà rapprochée
    const existingRapprochement = await this.prisma.transactionBancaire.findFirst({
      where: { depenseId },
    });

    if (existingRapprochement) {
      throw new Error('Cette dépense est déjà rapprochée avec une autre transaction');
    }

    return this.prisma.transactionBancaire.update({
      where: { id: transactionId },
      data: {
        rapproche: true,
        depenseId,
      },
      include: {
        depense: true,
        compteBancaire: true,
      },
    });
  }

  async annulerRapprochement(
    societeId: string,
    compteBancaireId: string,
    transactionId: string,
  ) {
    const compte = await this.prisma.compteBancaire.findFirst({
      where: { id: compteBancaireId, societeId },
    });

    if (!compte) {
      throw new NotFoundException('Compte bancaire introuvable');
    }

    const transaction = await this.prisma.transactionBancaire.findFirst({
      where: { id: transactionId, compteBancaireId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }

    return this.prisma.transactionBancaire.update({
      where: { id: transactionId },
      data: {
        rapproche: false,
        recetteId: null,
        depenseId: null,
      },
    });
  }

  // Obtenir les recettes/dépenses non rapprochées pour une société
  async getRecettesNonRapprochees(societeId: string, from?: string, to?: string) {
    const where: any = { societeId };
    
    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    const allRecettes = await this.prisma.recette.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const rapprochees = await this.prisma.transactionBancaire.findMany({
      where: {
        recetteId: { not: null },
        compteBancaire: { societeId },
      },
      select: { recetteId: true },
    });

    const idsRapprochees = new Set(
      rapprochees.map((t) => t.recetteId).filter((id): id is string => id !== null),
    );

    return allRecettes.filter((r) => !idsRapprochees.has(r.id));
  }

  async getDepensesNonRapprochees(societeId: string, from?: string, to?: string) {
    const where: any = { societeId };
    
    if (from || to) {
      where.date = {};
      if (from) {
        where.date.gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.date.lte = toDate;
      }
    }

    const allDepenses = await this.prisma.depense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const rapprochees = await this.prisma.transactionBancaire.findMany({
      where: {
        depenseId: { not: null },
        compteBancaire: { societeId },
      },
      select: { depenseId: true },
    });

    const idsRapprochees = new Set(
      rapprochees.map((t) => t.depenseId).filter((id): id is string => id !== null),
    );

    return allDepenses.filter((d) => !idsRapprochees.has(d.id));
  }

  // Import de relevés bancaires (CSV/TXT uniquement)
  async importReleveBancaire(
    societeId: string,
    compteBancaireId: string,
    fileContent: string,
    format: 'CSV' | 'TXT' = 'CSV',
  ) {
    // Vérifier que le compte appartient à la société
    const compte = await this.prisma.compteBancaire.findFirst({
      where: { id: compteBancaireId, societeId },
    });

    if (!compte) {
      throw new NotFoundException('Compte bancaire introuvable');
    }

    // Nettoyer les doublons existants avant l'import
    console.log('[Import] Nettoyage des doublons existants...');
    const nettoyageResult = await this.nettoyerDoublons(societeId, compteBancaireId);
    if (nettoyageResult.supprimees > 0) {
      console.log(`[Import] ${nettoyageResult.supprimees} doublon(s) supprimé(s) avant l'import`);
    }

    type TransactionData = {
      date: string;
      montant: number;
      libelle: string;
      type: 'DEBIT' | 'CREDIT';
      reference?: string;
    };
    
    let transactions: TransactionData[] = [];

    if (format === 'CSV') {
      // Parser CSV flexible - supporte virgule et point-virgule comme séparateurs
      // Format attendu: Date,Montant,Libellé,Référence (ou Date;Montant;Libellé;Référence)
      if (typeof fileContent !== 'string') {
        throw new Error('Le contenu CSV doit être une chaîne de caractères');
      }

      // Nettoyer le BOM UTF-8 si présent
      const cleanedContent = fileContent.replace(/^\uFEFF/, '');
      
      // Détecter le séparateur (virgule ou point-virgule)
      const firstLine = cleanedContent.split('\n')[0];
      const hasSemicolon = firstLine.includes(';');
      const separator = hasSemicolon ? ';' : ',';

      const lines = cleanedContent
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      console.log(`[Import CSV] Total lignes: ${lines.length}, Séparateur: "${separator}"`);

      if (lines.length <= 1) {
        // seulement l'entête ou vide
        console.log('[Import CSV] Fichier vide ou seulement en-tête');
        transactions = [];
      } else {
        // La première ligne est l'entête
        const header = lines[0].split(separator).map((h) => h.trim().toLowerCase());
        console.log(`[Import CSV] En-tête détecté:`, header);

        const idxDate = header.indexOf('date');
        const idxMontant = header.indexOf('montant');
        const idxLibelle =
          header.indexOf('libellé') !== -1
            ? header.indexOf('libellé')
            : header.indexOf('libelle');
        const idxReference = header.indexOf('référence') !== -1
          ? header.indexOf('référence')
          : header.indexOf('reference');

        console.log(`[Import CSV] Indices - Date: ${idxDate}, Montant: ${idxMontant}, Libellé: ${idxLibelle}, Référence: ${idxReference}`);

        if (idxDate === -1 || idxMontant === -1 || idxLibelle === -1) {
          throw new Error(
            `En-tête CSV invalide. Colonnes trouvées: ${header.join(', ')}. Attendu au minimum: Date, Montant, Libellé`,
          );
        }

        const dataLines = lines.slice(1);
        const parsed: TransactionData[] = [];

        console.log(`[Import CSV] ${dataLines.length} lignes de données à parser`);

        for (let i = 0; i < dataLines.length; i++) {
          const line = dataLines[i];
          // Parser en tenant compte des guillemets qui peuvent contenir le séparateur
          const parts: string[] = [];
          let currentPart = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if ((char === separator) && !inQuotes) {
              parts.push(currentPart.trim());
              currentPart = '';
            } else {
              currentPart += char;
            }
          }
          parts.push(currentPart.trim()); // Dernière partie

          // Nettoyer les guillemets des parties
          const cleanedParts = parts.map((p) => p.replace(/^"|"$/g, '').trim());

          if (cleanedParts.length < Math.max(idxDate, idxMontant, idxLibelle) + 1) {
            console.warn(`[Import CSV] Ligne ${i + 2} ignorée: pas assez de colonnes (${cleanedParts.length})`);
            continue;
          }

          const date = cleanedParts[idxDate];
          const montantStr = cleanedParts[idxMontant]
            .replace(/\s/g, '')
            .replace(',', '.')
            .replace(/[^\d.-]/g, ''); // Garder seulement chiffres, point, tiret
          const libelle = cleanedParts[idxLibelle] || '';
          const reference =
            idxReference !== -1 && cleanedParts[idxReference]
              ? cleanedParts[idxReference]
              : undefined;

          const montant = parseFloat(montantStr);
          
          if (!date || date.length === 0) {
            console.warn(`[Import CSV] Ligne ${i + 2} ignorée: date vide`);
            continue;
          }
          
          if (isNaN(montant) || montant === 0) {
            console.warn(`[Import CSV] Ligne ${i + 2} ignorée: montant invalide "${montantStr}" -> ${montant}`);
            continue;
          }

          const transactionType: 'CREDIT' | 'DEBIT' =
            montant >= 0 ? 'CREDIT' : 'DEBIT';

          parsed.push({
            date,
            montant: Math.abs(montant),
            libelle: libelle || 'Transaction importée',
            type: transactionType,
            reference,
          });
        }

        console.log(`[Import CSV] ${parsed.length} transactions parsées avec succès`);
        transactions = parsed;
      }
    } else {
      // Parser TXT - format simple ligne par ligne
      // Format attendu: Date | Montant | Libellé | Référence (optionnel)
      // Le libellé peut contenir des |, donc on prend les 2 premiers champs (date, montant) et le reste est le libellé/référence
      if (typeof fileContent !== 'string') {
        throw new Error('Le contenu TXT doit être une chaîne de caractères');
      }
      
      // Nettoyer le BOM UTF-8 si présent
      const cleanedContent = fileContent.replace(/^\uFEFF/, '');
      const lines = cleanedContent.split('\n').filter((line) => line.trim());
      
      console.log(`[Import TXT] Total lignes: ${lines.length}`);
      
      transactions = lines
        .map((line, index) => {
          try {
            // Utiliser une regex pour séparer proprement : Date | Montant | Libellé (peut contenir |) | Référence (optionnel)
            // On cherche au moins 2 séparateurs | pour avoir Date, Montant et au moins un libellé
            const pipeCount = (line.match(/\|/g) || []).length;

            console.log(`[Import TXT] Ligne ${index + 1}: "${line.substring(0, 80)}..." - ${pipeCount} pipe(s)`);

            if (pipeCount < 2) {
              // Si moins de 2 pipes, ce n'est probablement pas une ligne de transaction valide
              // On ignore les lignes qui n'ont pas le format attendu
              console.warn(`[Import TXT] Ligne ${index + 1} ignorée: moins de 2 pipes (${pipeCount})`);
              return null;
            }

            const parts = line.split('|').map((p) => p.trim());
            console.log(`[Import TXT] Ligne ${index + 1}: ${parts.length} parties -`, parts);

            // Les 2 premiers champs sont toujours Date et Montant
            const date = parts[0];
            const montantStr = parts[1]?.replace(/\s/g, '').replace(',', '.') || '';
            const montant = parseFloat(montantStr);

            if (!date || date.length === 0) {
              console.warn(`[Import TXT] Ligne ${index + 1} ignorée: date vide`);
              return null;
            }
            
            if (isNaN(montant) || montant === 0) {
              console.warn(`[Import TXT] Ligne ${index + 1} ignorée: montant invalide "${montantStr}" -> ${montant}`);
              return null;
            }

            // Le reste peut être libellé seul ou libellé + référence
            // Si 3 parties: Date | Montant | Libellé
            // Si 4+ parties: Date | Montant | Libellé (peut contenir des |) | Référence
            let libelle = '';
            let reference: string | undefined = undefined;

            if (parts.length === 3) {
              libelle = parts[2];
            } else if (parts.length >= 4) {
              // Le libellé est tout ce qui est entre le montant et la dernière partie (qui est la référence)
              libelle = parts.slice(2, -1).join(' | ');
              reference = parts[parts.length - 1];
            }

            const transactionType: 'CREDIT' | 'DEBIT' =
              montant >= 0 ? 'CREDIT' : 'DEBIT';

            const transaction: TransactionData = {
              date,
              montant: Math.abs(montant),
              libelle: libelle || 'Transaction importée',
              type: transactionType,
              reference,
            };

            console.log(`[Import TXT] Ligne ${index + 1}: ✅ Transaction parsée -`, transaction);
            return transaction;
          } catch (error: any) {
            // Si une ligne échoue, on la logue mais on continue avec les autres
            const linePreview =
              line.length > 50 ? line.substring(0, 50) + '...' : line;
            console.warn(`[Import TXT] Ligne ${index + 1} ignorée (erreur): ${linePreview}`, error);
            return null;
          }
        })
        .filter((trans): trans is TransactionData => trans !== null);
      
      console.log(`[Import TXT] ${transactions.length} transaction(s) parsée(s) avec succès`);
    }

    // Valider qu'on a au moins une transaction à créer
    console.log(`[Import] Validation: ${transactions.length} transactions parsées`);
    if (transactions.length === 0) {
      throw new Error('Aucune transaction valide trouvée dans le fichier');
    }

    // Créer les transactions
    const createdTransactions: any[] = [];
    const errors: string[] = [];
    
    console.log(`[Import] Début création de ${transactions.length} transactions`);
    
    for (let i = 0; i < transactions.length; i++) {
      const trans = transactions[i];
      console.log(`[Import] Transaction ${i + 1}/${transactions.length}:`, {
        date: trans.date,
        montant: trans.montant,
        libelle: trans.libelle?.substring(0, 50),
        type: trans.type,
      });
      
      try {
        // Valider les champs requis
        if (!trans.date || !trans.libelle || trans.montant === undefined || trans.montant === null) {
          const missingFields: string[] = [];
          if (!trans.date) missingFields.push('date');
          if (!trans.libelle) missingFields.push('libelle');
          if (trans.montant === undefined || trans.montant === null) missingFields.push('montant');
          const errorMsg = `Transaction ${i + 1}: champs manquants (${missingFields.join(', ')})`;
          console.warn(`[Import] ${errorMsg}`);
          errors.push(errorMsg);
          continue;
        }

        // Parser la date - supporte plusieurs formats
        let date: Date;
        if (trans.date.includes('/')) {
          // Format DD/MM/YYYY ou DD/MM/YY
          const parts = trans.date.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Mois 0-indexed
            const year = parseInt(parts[2], 10);
            const fullYear = year < 100 ? 2000 + year : year;
            date = new Date(fullYear, month, day);
            console.log(`[Import] Transaction ${i + 1}: Date parsée ${trans.date} -> ${date.toISOString()}`);
          } else {
            date = new Date(trans.date);
            console.log(`[Import] Transaction ${i + 1}: Date parsée (format alternatif) ${trans.date} -> ${date.toISOString()}`);
          }
        } else {
          date = new Date(trans.date);
          console.log(`[Import] Transaction ${i + 1}: Date parsée (format ISO) ${trans.date} -> ${date.toISOString()}`);
        }

        if (isNaN(date.getTime())) {
          const errorMsg = `Transaction ${i + 1}: date invalide "${trans.date}"`;
          console.warn(`[Import] ${errorMsg}`);
          errors.push(errorMsg);
          continue;
        }

        // Valider le montant
        if (isNaN(trans.montant) || trans.montant <= 0) {
          const errorMsg = `Transaction ${i + 1}: montant invalide "${trans.montant}"`;
          console.warn(`[Import] ${errorMsg}`);
          errors.push(errorMsg);
          continue;
        }

        // Valider le type
        if (trans.type !== 'CREDIT' && trans.type !== 'DEBIT') {
          const errorMsg = `Transaction ${i + 1}: type invalide "${trans.type}"`;
          console.warn(`[Import] ${errorMsg}`);
          errors.push(errorMsg);
          continue;
        }

        // Vérifier si une transaction similaire existe déjà (même date, montant, libellé)
        const existingTransaction = await this.prisma.transactionBancaire.findFirst({
          where: {
            compteBancaireId,
            date: {
              gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
              lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
            },
            montant: trans.montant,
            libelle: trans.libelle.substring(0, 500),
            type: trans.type,
          },
        });

        if (existingTransaction) {
          console.log(`[Import] Transaction ${i + 1}: ⚠️ Déjà existante (ID: ${existingTransaction.id}), ignorée`);
          continue; // Ignorer les doublons
        }

        console.log(`[Import] Transaction ${i + 1}: Création en base de données...`);
        const transaction = await this.prisma.transactionBancaire.create({
          data: {
            compteBancaireId,
            date,
            montant: trans.montant,
            libelle: trans.libelle.substring(0, 500), // Limiter la longueur du libellé
            type: trans.type,
            reference: trans.reference ? trans.reference.substring(0, 100) : null, // Limiter la longueur de la référence
            rapproche: false,
          },
        });
        console.log(`[Import] Transaction ${i + 1}: ✅ Créée avec succès (ID: ${transaction.id})`);
        createdTransactions.push(transaction);
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || 'Erreur inconnue';
        console.error(`[Import] Transaction ${i + 1}: ❌ Erreur - ${errorMsg}`, error);
        errors.push(`Transaction ${i + 1}: ${errorMsg}`);
      }
    }
    
    console.log(`[Import] Résultat: ${createdTransactions.length} créées, ${errors.length} erreurs`);

    // Compter combien de transactions ont été ignorées car déjà existantes
    const ignorees = transactions.length - createdTransactions.length - errors.length;

    // Si aucune transaction n'a été créée mais qu'il n'y a pas d'erreurs, c'est que toutes existaient déjà
    if (createdTransactions.length === 0 && errors.length === 0) {
      return {
        message: `⚠️ Ce fichier a déjà été importé. Toutes les transactions existent déjà.${nettoyageResult.supprimees > 0 ? ` ${nettoyageResult.supprimees} doublon(s) supprimé(s) avant l'import.` : ''}`,
        transactions: [],
        total: 0,
        ignorees: transactions.length,
        doublonsSupprimes: nettoyageResult.supprimees,
        dejaImporte: true,
      };
    }

    // Si aucune transaction n'a pu être créée à cause d'erreurs
    if (createdTransactions.length === 0 && errors.length > 0) {
      throw new Error(`Aucune transaction n'a pu être créée. Erreurs: ${errors.join('; ')}`);
    }

    // Cas normal : certaines transactions ont été créées
    let message = `✅ Fichier importé avec succès : ${createdTransactions.length} transaction(s) importée(s)`;
    if (ignorees > 0) {
      message += `, ${ignorees} transaction(s) déjà existante(s) ignorée(s)`;
    }
    if (nettoyageResult.supprimees > 0) {
      message += `, ${nettoyageResult.supprimees} doublon(s) supprimé(s)`;
    }
    if (errors.length > 0) {
      message += `, ${errors.length} erreur(s)`;
    }

    return {
      message,
      transactions: createdTransactions,
      total: createdTransactions.length,
      ignorees: ignorees > 0 ? ignorees : undefined,
      doublonsSupprimes: nettoyageResult.supprimees,
      errors: errors.length > 0 ? errors : undefined,
      dejaImporte: false,
    };
  }

  // Nettoyer les doublons pour un compte bancaire
  async nettoyerDoublons(societeId: string, compteBancaireId: string) {
    const compte = await this.prisma.compteBancaire.findFirst({
      where: { id: compteBancaireId, societeId },
    });

    if (!compte) {
      throw new NotFoundException('Compte bancaire introuvable');
    }

    // Récupérer toutes les transactions du compte
    const allTransactions = await this.prisma.transactionBancaire.findMany({
      where: { compteBancaireId },
      orderBy: { createdAt: 'asc' }, // Garder les plus anciennes
    });

    const seen = new Map<string, string>(); // Clé: date+montant+libellé+type, Valeur: ID à garder
    const toDelete: string[] = [];

    for (const trans of allTransactions) {
      const dateStr = trans.date.toISOString().split('T')[0]; // Format YYYY-MM-DD
      const key = `${dateStr}|${trans.montant}|${trans.libelle}|${trans.type}`;
      
      if (seen.has(key)) {
        // Doublon trouvé, marquer pour suppression
        toDelete.push(trans.id);
        console.log(`[Nettoyage] Doublon détecté: ${trans.id} (identique à ${seen.get(key)})`);
      } else {
        // Première occurrence, garder
        seen.set(key, trans.id);
      }
    }

    if (toDelete.length === 0) {
      return {
        message: 'Aucun doublon trouvé',
        supprimees: 0,
      };
    }

    // Supprimer les doublons
    await this.prisma.transactionBancaire.deleteMany({
      where: {
        id: { in: toDelete },
      },
    });

    return {
      message: `${toDelete.length} transaction(s) dupliquée(s) supprimée(s)`,
      supprimees: toDelete.length,
    };
  }
}
