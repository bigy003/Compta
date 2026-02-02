-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "budgetRecettes" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "budgetDepenses" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Budget_societeId_idx" ON "Budget"("societeId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_societeId_annee_key" ON "Budget"("societeId", "annee");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
