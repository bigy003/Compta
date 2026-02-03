-- CreateTable
CREATE TABLE IF NOT EXISTS "EcheanceFiscale" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "periode" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'A_FAIRE',
    "montantEstime" DECIMAL(65,30),
    "dateRealisation" TIMESTAMP(3),
    "reference" TEXT,
    "notes" TEXT,
    "rappel7Jours" BOOLEAN NOT NULL DEFAULT false,
    "rappel3Jours" BOOLEAN NOT NULL DEFAULT false,
    "rappelJourJ" BOOLEAN NOT NULL DEFAULT false,
    "rappelRetard" BOOLEAN NOT NULL DEFAULT false,
    "declarationTVAId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcheanceFiscale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EcheanceFiscale_societeId_statut_idx" ON "EcheanceFiscale"("societeId", "statut");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EcheanceFiscale_societeId_type_idx" ON "EcheanceFiscale"("societeId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EcheanceFiscale_dateEcheance_idx" ON "EcheanceFiscale"("dateEcheance");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EcheanceFiscale_societeId_dateEcheance_idx" ON "EcheanceFiscale"("societeId", "dateEcheance");

-- AddForeignKey
ALTER TABLE "EcheanceFiscale" ADD CONSTRAINT "EcheanceFiscale_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcheanceFiscale" ADD CONSTRAINT "EcheanceFiscale_declarationTVAId_fkey" FOREIGN KEY ("declarationTVAId") REFERENCES "DeclarationTVA"("id") ON DELETE SET NULL ON UPDATE CASCADE;
