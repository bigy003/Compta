-- CreateTable
CREATE TABLE IF NOT EXISTS "DeclarationFiscale" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "dateDeclaration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "donnees" JSONB NOT NULL,
    "validee" BOOLEAN NOT NULL DEFAULT false,
    "dateValidation" TIMESTAMP(3),
    "validateurId" TEXT,
    "fichierPDF" TEXT,
    "fichierXML" TEXT,
    "referenceDGI" TEXT,
    "notes" TEXT,
    "erreurs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeclarationFiscale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DeclarationFiscale_societeId_type_idx" ON "DeclarationFiscale"("societeId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DeclarationFiscale_societeId_periode_idx" ON "DeclarationFiscale"("societeId", "periode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DeclarationFiscale_societeId_statut_idx" ON "DeclarationFiscale"("societeId", "statut");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DeclarationFiscale_type_periode_idx" ON "DeclarationFiscale"("type", "periode");

-- AddForeignKey
ALTER TABLE "DeclarationFiscale" ADD CONSTRAINT "DeclarationFiscale_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
