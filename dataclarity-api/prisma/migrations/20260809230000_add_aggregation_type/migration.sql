-- Migration: Add AggregationType enum and aggregationType column to Indicator
-- AggregationType define COMO o resultado de um período é obtido.
-- Usado em conjunto com frequency (QUANDO apurar).

-- Step 1: Create the AggregationType enum
CREATE TYPE "AggregationType" AS ENUM (
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'LAST',
  'COUNT',
  'FORMULA'
);

-- Step 2: Add aggregationType column to Indicator with default SUM
ALTER TABLE "Indicator"
  ADD COLUMN "aggregationType" "AggregationType" NOT NULL DEFAULT 'SUM';
