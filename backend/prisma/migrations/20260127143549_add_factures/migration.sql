-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "totalHT" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalTVA" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalTTC" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactureLigne" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DECIMAL(65,30) NOT NULL,
    "tauxTVA" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "montantHT" DECIMAL(65,30) NOT NULL,
    "montantTVA" DECIMAL(65,30) NOT NULL,
    "montantTTC" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "FactureLigne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Facture_numero_key" ON "Facture"("numero");

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactureLigne" ADD CONSTRAINT "FactureLigne_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
