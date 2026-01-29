import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSocieteNames() {
  try {
    // Récupérer toutes les sociétés
    const societes = await prisma.societe.findMany();
    
    console.log('Sociétés trouvées:');
    societes.forEach((s) => {
      console.log(`- ID: ${s.id}, Nom actuel: "${s.nom}"`);
    });

    // Corriger spécifiquement la société avec l'ID connu
    const targetId = 'cmkwot1mi000311msi1frh7d5';
    const societe = societes.find(s => s.id === targetId);
    
    if (societe) {
      // Forcer la correction avec le bon encodage UTF-8
      const correctedName = 'Ma Première PME';
      
      await prisma.societe.update({
        where: { id: targetId },
        data: { nom: correctedName },
      });
      
      console.log(`\n✓ Corrigé: "${societe.nom}" → "${correctedName}"`);
      
      // Vérifier
      const updated = await prisma.societe.findUnique({
        where: { id: targetId },
      });
      console.log(`\nVérification: "${updated?.nom}"`);
    } else {
      console.log(`\nSociété avec ID ${targetId} non trouvée`);
    }

    console.log('\nCorrection terminée!');
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSocieteNames();
