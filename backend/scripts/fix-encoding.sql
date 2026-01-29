-- Script SQL pour corriger l'encodage du nom de la société
-- Exécutez cette commande dans psql ou via un client PostgreSQL

UPDATE "Societe" 
SET nom = 'Ma Première PME' 
WHERE id = 'cmkwot1mi000311msi1frh7d5';

-- Vérifier le résultat
SELECT id, nom FROM "Societe" WHERE id = 'cmkwot1mi000311msi1frh7d5';
