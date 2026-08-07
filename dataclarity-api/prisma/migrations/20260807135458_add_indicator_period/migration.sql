-- CreateEnum
CREATE TYPE "IndicatorPeriod" AS ENUM ('PREVIOUS_MONTH', 'PREVIOUS_QUARTER', 'PREVIOUS_SEMESTER', 'PREVIOUS_YEAR', 'CUSTOM');

-- AlterTable
ALTER TABLE "Indicator" ADD COLUMN     "previousPeriod" "IndicatorPeriod";
