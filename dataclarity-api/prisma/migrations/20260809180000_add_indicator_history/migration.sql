-- Migration: Add IndicatorHistory table
-- Representa resultados consolidados por período de um Indicador.
-- Diferente de IndicatorMeasurement (medição pontual), IndicatorHistory armazena
-- o resultado CONSOLIDADO de um período completo (ex: mês de agosto/2026).

-- Step 1: Create IndicatorHistory table
CREATE TABLE "IndicatorHistory" (
  "id"              TEXT        NOT NULL,
  "indicatorId"     TEXT        NOT NULL,
  "periodStart"     TIMESTAMP(3) NOT NULL,
  "periodEnd"       TIMESTAMP(3) NOT NULL,
  "value"           DECIMAL(18, 2),
  "goalValue"       DECIMAL(18, 2),
  "previousValue"   DECIMAL(18, 2),
  "variationPercent" DECIMAL(10, 4),
  "status"          "IndicatorStatus" NOT NULL DEFAULT 'NEUTRAL',
  "notes"           TEXT,
  "calculatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IndicatorHistory_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add foreign key to Indicator
ALTER TABLE "IndicatorHistory"
  ADD CONSTRAINT "IndicatorHistory_indicatorId_fkey"
    FOREIGN KEY ("indicatorId")
    REFERENCES "Indicator"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- Step 3: Unique constraint: same period cannot have two records for the same indicator
ALTER TABLE "IndicatorHistory"
  ADD CONSTRAINT "IndicatorHistory_indicatorId_periodStart_periodEnd_key"
    UNIQUE ("indicatorId", "periodStart", "periodEnd");

-- Step 4: Indexes for common queries
CREATE INDEX "IndicatorHistory_indicatorId_idx" ON "IndicatorHistory"("indicatorId");
CREATE INDEX "IndicatorHistory_periodStart_idx" ON "IndicatorHistory"("periodStart");
CREATE INDEX "IndicatorHistory_indicatorId_periodStart_idx" ON "IndicatorHistory"("indicatorId", "periodStart" DESC);
