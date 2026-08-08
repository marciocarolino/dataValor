-- Migration: Remove INACTIVE from IndicatorStatus enum
-- Converts existing INACTIVE records to NEUTRAL (status operacional via isActive=false)

-- Step 1: Convert all INACTIVE status records to NEUTRAL, keep isActive=false
UPDATE "Indicator"
SET status = 'NEUTRAL', "isActive" = false
WHERE status = 'INACTIVE';

-- Step 2: Drop the DEFAULT constraint temporarily (required to change column type)
ALTER TABLE "Indicator" ALTER COLUMN status DROP DEFAULT;

-- Step 3: Recreate the enum without INACTIVE
-- PostgreSQL does not support DROP VALUE from an enum, so we rename + recreate
ALTER TYPE "IndicatorStatus" RENAME TO "IndicatorStatus_old";

CREATE TYPE "IndicatorStatus" AS ENUM ('SUCCESS', 'WARNING', 'DANGER', 'NEUTRAL');

-- Step 4: Change column type to use new enum
ALTER TABLE "Indicator"
  ALTER COLUMN status TYPE "IndicatorStatus"
  USING status::text::"IndicatorStatus";

-- Step 5: Restore the DEFAULT constraint with new type
ALTER TABLE "Indicator" ALTER COLUMN status SET DEFAULT 'NEUTRAL'::"IndicatorStatus";

-- Step 6: Drop old enum type
DROP TYPE "IndicatorStatus_old";
