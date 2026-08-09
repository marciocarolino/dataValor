-- Migration: Add "Periodicidade de Apuração" (IndicatorFrequency) to Indicator
-- Define com que frequência o indicador gera um novo resultado.
-- Não confundir com previousPeriod (Período de Referência), que permanece inalterado.

-- Step 1: Create the new enum type
CREATE TYPE "IndicatorFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMESTERLY', 'YEARLY', 'CUSTOM');

-- Step 2: Add the column with a default value (MONTHLY), NOT NULL
ALTER TABLE "Indicator" ADD COLUMN "frequency" "IndicatorFrequency" NOT NULL DEFAULT 'MONTHLY';
