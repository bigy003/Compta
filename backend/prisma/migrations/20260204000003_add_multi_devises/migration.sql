-- CreateTable
CREATE TABLE IF NOT EXISTS "Devise" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "symbole" TEXT NOT NULL,
    "estParDefaut" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TauxChange" (
    "id" TEXT NOT NULL,
    "deviseId" TEXT NOT NULL,
    "deviseBase" TEXT NOT NULL DEFAULT 'XOF',
    "taux" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'BCEAO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TauxChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Devise_code_key" ON "Devise"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TauxChange_deviseId_date_idx" ON "TauxChange"("deviseId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TauxChange_date_idx" ON "TauxChange"("date");

-- AddForeignKey
ALTER TABLE "TauxChange" ADD CONSTRAINT "TauxChange_deviseId_fkey" FOREIGN KEY ("deviseId") REFERENCES "Devise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddColumn to Facture
ALTER TABLE "Facture" ADD COLUMN IF NOT EXISTS "deviseId" TEXT;
ALTER TABLE "Facture" ADD COLUMN IF NOT EXISTS "tauxChange" DECIMAL(65,30);
ALTER TABLE "Facture" ADD COLUMN IF NOT EXISTS "montantDeviseEtrangere" DECIMAL(65,30);

-- Insert default devises
INSERT INTO "Devise" ("id", "code", "nom", "symbole", "estParDefaut", "actif", "createdAt", "updatedAt")
VALUES 
  ('dev_xof', 'XOF', 'Franc CFA', 'FCFA', true, true, NOW(), NOW()),
  ('dev_eur', 'EUR', 'Euro', '€', false, true, NOW(), NOW()),
  ('dev_usd', 'USD', 'Dollar US', '$', false, true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
