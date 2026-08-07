-- CreateEnum
CREATE TYPE "IndicatorDesiredDirection" AS ENUM ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'RANGE_IS_BETTER');

-- AlterTable: adicionar novos campos ao Indicator (todos opcionais para preservar dados existentes)
ALTER TABLE "Indicator"
  ADD COLUMN "desiredDirection" "IndicatorDesiredDirection" NOT NULL DEFAULT 'HIGHER_IS_BETTER',
  ADD COLUMN "minimumGoalValue" DECIMAL(18,2),
  ADD COLUMN "maximumGoalValue" DECIMAL(18,2);

-- CreateTable: histórico de medições
CREATE TABLE "IndicatorMeasurement" (
  "id"            TEXT         NOT NULL,
  "indicatorId"   TEXT         NOT NULL,
  "value"         DECIMAL(18,2) NOT NULL,
  "referenceDate" TIMESTAMP(3) NOT NULL,
  "periodStart"   TIMESTAMP(3),
  "periodEnd"     TIMESTAMP(3),
  "source"        TEXT,
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IndicatorMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IndicatorMeasurement_indicatorId_referenceDate_key"
  ON "IndicatorMeasurement"("indicatorId", "referenceDate");

CREATE INDEX "IndicatorMeasurement_indicatorId_referenceDate_idx"
  ON "IndicatorMeasurement"("indicatorId", "referenceDate");

CREATE INDEX "IndicatorMeasurement_referenceDate_idx"
  ON "IndicatorMeasurement"("referenceDate");

-- AddForeignKey
ALTER TABLE "IndicatorMeasurement"
  ADD CONSTRAINT "IndicatorMeasurement_indicatorId_fkey"
  FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
