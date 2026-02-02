-- CreateTable
CREATE TABLE "Produit" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "unite" TEXT NOT NULL DEFAULT 'PIECE',
    "quantiteEnStock" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "seuilAlerte" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementStock" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantite" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "libelle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventaire" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "dateInventaire" TIMESTAMP(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneInventaire" (
    "id" TEXT NOT NULL,
    "inventaireId" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "quantiteComptee" DECIMAL(65,30) NOT NULL,
    "quantiteSysteme" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "LigneInventaire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Produit_societeId_reference_key" ON "Produit"("societeId", "reference");
CREATE INDEX "Produit_societeId_idx" ON "Produit"("societeId");

-- CreateIndex
CREATE INDEX "MouvementStock_societeId_idx" ON "MouvementStock"("societeId");
CREATE INDEX "MouvementStock_produitId_idx" ON "MouvementStock"("produitId");

-- CreateIndex
CREATE INDEX "Inventaire_societeId_idx" ON "Inventaire"("societeId");

-- CreateIndex
CREATE UNIQUE INDEX "LigneInventaire_inventaireId_produitId_key" ON "LigneInventaire"("inventaireId", "produitId");
CREATE INDEX "LigneInventaire_inventaireId_idx" ON "LigneInventaire"("inventaireId");

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventaire" ADD CONSTRAINT "Inventaire_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneInventaire" ADD CONSTRAINT "LigneInventaire_inventaireId_fkey" FOREIGN KEY ("inventaireId") REFERENCES "Inventaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LigneInventaire" ADD CONSTRAINT "LigneInventaire_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
