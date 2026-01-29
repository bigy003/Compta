-- CreateTable
CREATE TABLE "Recette" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montant" DECIMAL(65,30) NOT NULL,
    "description" TEXT,

    CONSTRAINT "Recette_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Depense" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montant" DECIMAL(65,30) NOT NULL,
    "description" TEXT,

    CONSTRAINT "Depense_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Recette" ADD CONSTRAINT "Recette_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
