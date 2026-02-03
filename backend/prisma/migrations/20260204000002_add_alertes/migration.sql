-- CreateTable
CREATE TABLE IF NOT EXISTS "Alerte" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severite" TEXT NOT NULL DEFAULT 'MOYENNE',
    "statut" TEXT NOT NULL DEFAULT 'NON_LUE',
    "dateAlerte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLecture" TIMESTAMP(3),
    "dateResolution" TIMESTAMP(3),
    "lien" TEXT,
    "elementId" TEXT,
    "elementType" TEXT,
    "metadata" JSONB,
    "emailEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "smsEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "inAppAffichee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alerte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Alerte_societeId_statut_idx" ON "Alerte"("societeId", "statut");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Alerte_societeId_type_idx" ON "Alerte"("societeId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Alerte_userId_statut_idx" ON "Alerte"("userId", "statut");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Alerte_dateAlerte_idx" ON "Alerte"("dateAlerte");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Alerte_societeId_dateAlerte_idx" ON "Alerte"("societeId", "dateAlerte");

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "Societe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
