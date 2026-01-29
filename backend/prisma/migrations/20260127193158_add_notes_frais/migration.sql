-- CreateTable
CREATE TABLE "NoteFrais" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montant" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "categorie" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "justificatifUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteFrais_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NoteFrais" ADD CONSTRAINT "NoteFrais_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
