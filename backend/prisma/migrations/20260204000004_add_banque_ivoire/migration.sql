-- CreateTable
CREATE TABLE IF NOT EXISTS "BanqueIvoire" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "codeBIC" TEXT,
    "codeGuichet" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BanqueIvoire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RegleLettrage" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priorite" INTEGER NOT NULL DEFAULT 0,
    "criteres" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegleLettrage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RapprochementComptable" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "transactionBancaireId" TEXT NOT NULL,
    "ecritureComptableId" TEXT,
    "compteComptableId" TEXT,
    "montant" DECIMAL(65,30) NOT NULL,
    "dateRapprochement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'PENDING',
    "scoreConfiance" DECIMAL(65,30),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RapprochementComptable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EcartRapprochement" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "compteBancaireId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "soldeComptable" DECIMAL(65,30) NOT NULL,
    "soldeBancaire" DECIMAL(65,30) NOT NULL,
    "ecart" DECIMAL(65,30) NOT NULL,
    "typeEcart" TEXT NOT NULL,
    "description" TEXT,
    "resolu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcartRapprochement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BanqueIvoire_code_key" ON "BanqueIvoire"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RegleLettrage_societeId_active_idx" ON "RegleLettrage"("societeId", "active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RapprochementComptable_societeId_statut_idx" ON "RapprochementComptable"("societeId", "statut");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RapprochementComptable_transactionBancaireId_idx" ON "RapprochementComptable"("transactionBancaireId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RapprochementComptable_ecritureComptableId_idx" ON "RapprochementComptable"("ecritureComptableId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EcartRapprochement_societeId_compteBancaireId_date_idx" ON "EcartRapprochement"("societeId", "compteBancaireId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EcartRapprochement_societeId_resolu_idx" ON "EcartRapprochement"("societeId", "resolu");

-- AddForeignKey
ALTER TABLE "CompteBancaire" ADD COLUMN IF NOT EXISTS "banqueIvoireId" TEXT;

-- AddForeignKey
ALTER TABLE "CompteBancaire" ADD CONSTRAINT "CompteBancaire_banqueIvoireId_fkey" FOREIGN KEY ("banqueIvoireId") REFERENCES "BanqueIvoire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegleLettrage" ADD CONSTRAINT "RegleLettrage_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapprochementComptable" ADD CONSTRAINT "RapprochementComptable_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapprochementComptable" ADD CONSTRAINT "RapprochementComptable_transactionBancaireId_fkey" FOREIGN KEY ("transactionBancaireId") REFERENCES "TransactionBancaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapprochementComptable" ADD CONSTRAINT "RapprochementComptable_ecritureComptableId_fkey" FOREIGN KEY ("ecritureComptableId") REFERENCES "EcritureComptable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapprochementComptable" ADD CONSTRAINT "RapprochementComptable_compteComptableId_fkey" FOREIGN KEY ("compteComptableId") REFERENCES "CompteComptable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcartRapprochement" ADD CONSTRAINT "EcartRapprochement_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcartRapprochement" ADD CONSTRAINT "EcartRapprochement_compteBancaireId_fkey" FOREIGN KEY ("compteBancaireId") REFERENCES "CompteBancaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert banques ivoiriennes par défaut
INSERT INTO "BanqueIvoire" ("id", "code", "nom", "codeBIC", "codeGuichet", "actif", "createdAt", "updatedAt")
VALUES 
  ('banq_sgbci', 'SGBCI', 'Société Générale de Banques en Côte d''Ivoire', 'SGCIXCIX', '01001', true, NOW(), NOW()),
  ('banq_bicici', 'BICICI', 'Banque Internationale pour le Commerce et l''Industrie de la Côte d''Ivoire', 'BICIYCIX', '01002', true, NOW(), NOW()),
  ('banq_uba', 'UBA', 'United Bank for Africa Côte d''Ivoire', 'UNAFCIAB', '01003', true, NOW(), NOW()),
  ('banq_ecobank', 'ECOBANK', 'Ecobank Côte d''Ivoire', 'ECOCCICI', '01004', true, NOW(), NOW()),
  ('banq_attijari', 'ATTIJARI', 'Attijariwafa Bank Côte d''Ivoire', 'AWAFCIAB', '01005', true, NOW(), NOW()),
  ('banq_nsia', 'NSIA', 'NSIA Banque Côte d''Ivoire', 'NSIACICI', '01006', true, NOW(), NOW()),
  ('banq_coris', 'CORIS', 'Coris Bank Côte d''Ivoire', 'CORICIAB', '01007', true, NOW(), NOW()),
  ('banq_boa', 'BOA', 'Bank of Africa Côte d''Ivoire', 'AFRCCICI', '01008', true, NOW(), NOW()),
  ('banq_oca', 'OCA', 'Orabank Côte d''Ivoire', 'ORABCIAB', '01009', true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
