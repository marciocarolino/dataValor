-- AlterTable: adiciona campos de verificação de e-mail no modelo User
ALTER TABLE "User"
  ADD COLUMN "emailVerified"              BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN "emailVerificationToken"     TEXT,
  ADD COLUMN "emailVerificationExpiresAt" TIMESTAMP(3);

-- CreateIndex: índice único no token de verificação
CREATE UNIQUE INDEX "User_emailVerificationToken_key"
  ON "User"("emailVerificationToken");

-- CreateIndex: índice de busca rápida pelo token
CREATE INDEX "User_emailVerificationToken_idx"
  ON "User"("emailVerificationToken");
