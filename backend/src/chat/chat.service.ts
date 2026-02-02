import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  /**
   * Répond au message de l'utilisateur (réponses basées sur des mots-clés - ComptaCI / SYSCOHADA).
   * Vous pouvez plus tard brancher une API OpenAI ou autre en ajoutant OPENAI_API_KEY dans .env.
   */
  async reply(message: string): Promise<string> {
    const m = message.trim().toLowerCase();
    if (!m) return "Posez-moi une question sur la comptabilité, les factures, la TVA, le stock, etc.";

    // Salutations
    if (/^(bonjour|salut|hello|bonsoir|coucou)/.test(m)) {
      return "Bonjour ! Je suis l'assistant ComptaCI. Comment puis-je vous aider ? (factures, TVA, déclarations, stock, immobilisations, notes de frais...)";
    }
    if (/^(merci|thanks)/.test(m)) {
      return "Avec plaisir ! N'hésitez pas si vous avez d'autres questions.";
    }
    if (/^(aide|help|\?)$/.test(m)) {
      return "Je peux vous aider sur : **Factures** (création, envoi, PDF), **Déclarations TVA**, **Stock et inventaires**, **Immobilisations et amortissements**, **Notes de frais**, **Comptes bancaires et rapprochement**, **Plan comptable SYSCOHADA**. Posez une question précise !";
    }

    // Factures
    if (/facture|devis/.test(m)) {
      if (/créer|création|nouvelle|ajouter/.test(m)) return "Pour créer une facture : allez dans **Devis | Facturation** > **Factures**, puis créez une nouvelle facture en choisissant le client et en ajoutant des lignes (désignation, quantité, prix, TVA).";
      if (/envoyer|envoy|email/.test(m)) return "Pour envoyer une facture par email : dans la liste des factures, cliquez sur **📧 Email** à côté de la facture. Le client doit avoir une adresse email renseignée.";
      if (/pdf/.test(m)) return "Chaque facture peut être téléchargée en PDF via le bouton **PDF** dans la liste. Le PDF respecte les mentions SYSCOHADA.";
      return "Les factures sont dans **Devis | Facturation** > **Factures**. Vous pouvez créer, modifier, envoyer par email et télécharger en PDF.";
    }

    // TVA / Déclarations
    if (/tva|déclaration|déclarations/.test(m)) {
      return "Les **déclarations TVA** sont dans le menu **Déclarations TVA**. Vous pouvez générer une déclaration à partir des écritures sur la période, puis l'éditer, l'envoyer ou la marquer comme validée.";
    }

    // Stock
    if (/stock|inventaire|produit/.test(m)) {
      return "Le **Stock et inventaire** est dans le menu **Stock**. Vous pouvez : créer des produits (référence, désignation, unité, seuil d'alerte), enregistrer des entrées/sorties, créer des inventaires physiques et clôturer pour ajuster les stocks.";
    }

    // Immobilisations
    if (/immobilisation|amortissement/.test(m)) {
      return "Les **Immobilisations** sont dans le menu **Immobilisations**. Enregistrez un bien (véhicule, matériel, etc.) avec sa valeur d'origine et sa durée d'utilisation ; le plan d'amortissement (linéaire, prorata temporis) est calculé automatiquement (SYSCOHADA).";
    }

    // Notes de frais
    if (/note de frais|notes de frais/.test(m)) {
      return "Les **notes de frais** sont dans le menu **Notes de frais**. Créez une note avec montant, catégorie et justificatif (upload). Les statuts : brouillon, en attente, validé, refusé.";
    }

    // Comptes bancaires / Rapprochement
    if (/banque|compte bancaire|rapprochement/.test(m)) {
      return "Les **comptes bancaires** et le **rapprochement** sont dans **Comptes bancaires** (liste des comptes, transactions) et **Rapprochement**. Vous pouvez importer des relevés (CSV/TXT) et lier les transactions aux recettes/dépenses.";
    }

    // Plan comptable / SYSCOHADA
    if (/plan comptable|syscohada|compte/.test(m)) {
      return "Le **plan comptable SYSCOHADA** est accessible dans le menu **Plan comptable**. Les écritures comptables sont générées automatiquement à partir des factures et transactions.";
    }

    // Audit / Contrôles
    if (/audit|contrôle/.test(m)) {
      return "L'**Audit et contrôles** est dans le menu **Audit**. Des contrôles automatiques détectent : factures non payées, rapprochements à valider, documents manquants, doublons.";
    }

    // Budget
    if (/budget/.test(m)) {
      return "Le **Budget** est dans le menu **Budget**. Vous pouvez définir des budgets annuels (recettes/dépenses) et comparer avec le réel.";
    }

    // Fallback
    return "Je n'ai pas bien compris. Vous pouvez demander de l'aide sur : factures, TVA, déclarations, stock, immobilisations, notes de frais, comptes bancaires, plan comptable SYSCOHADA. Tapez **aide** pour la liste.";
  }
}
