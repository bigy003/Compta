-- CreateTable
CREATE TABLE "Immobilisation" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "dateAcquisition" TIMESTAMP(3) NOT NULL,
    "valeurOrigine" DECIMAL(65,30) NOT NULL,
    "dureeAnnees" INTEGER NOT NULL,
    "methode" TEXT NOT NULL DEFAULT 'LINEAIRE',
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Immobilisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Immobilisation_societeId_idx" ON "Immobilisation"("societeId");

-- AddForeignKey
ALTER TABLE "Immobilisation" ADD CONSTRAINT "Immobilisation_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
