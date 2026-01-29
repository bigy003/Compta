-- CreateTable
CREATE TABLE "CompteBancaire" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "banque" TEXT,
    "numeroCompte" TEXT,
    "iban" TEXT,
    "devise" TEXT NOT NULL DEFAULT 'FCFA',
    "soldeInitial" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompteBancaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionBancaire" (
    "id" TEXT NOT NULL,
    "compteBancaireId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montant" DECIMAL(65,30) NOT NULL,
    "libelle" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "categorie" TEXT,
    "reference" TEXT,
    "rapproche" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionBancaire_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompteBancaire" ADD CONSTRAINT "CompteBancaire_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionBancaire" ADD CONSTRAINT "TransactionBancaire_compteBancaireId_fkey" FOREIGN KEY ("compteBancaireId") REFERENCES "CompteBancaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
