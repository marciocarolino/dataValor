-- CreateEnum
CREATE TYPE "IndicatorCategory" AS ENUM ('FINANCIAL', 'COMMERCIAL', 'OPERATIONAL', 'MARKETING', 'CUSTOMER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IndicatorChartType" AS ENUM ('LINE', 'BAR', 'AREA', 'DONUT', 'PIE', 'GAUGE', 'NUMBER');

-- CreateEnum
CREATE TYPE "IndicatorStatus" AS ENUM ('SUCCESS', 'WARNING', 'DANGER', 'NEUTRAL');

-- CreateTable
CREATE TABLE "Indicator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "IndicatorCategory" NOT NULL,
    "formula" TEXT,
    "unit" TEXT,
    "goalValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "previousValue" DOUBLE PRECISION,
    "variation" DOUBLE PRECISION,
    "status" "IndicatorStatus" NOT NULL DEFAULT 'NEUTRAL',
    "color" TEXT,
    "icon" TEXT,
    "chartType" "IndicatorChartType" NOT NULL DEFAULT 'NUMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showOnDashboard" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Indicator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Indicator_category_idx" ON "Indicator"("category");

-- CreateIndex
CREATE INDEX "Indicator_status_idx" ON "Indicator"("status");

-- CreateIndex
CREATE INDEX "Indicator_isActive_idx" ON "Indicator"("isActive");

-- CreateIndex
CREATE INDEX "Indicator_showOnDashboard_idx" ON "Indicator"("showOnDashboard");

-- CreateIndex
CREATE INDEX "Indicator_createdAt_idx" ON "Indicator"("createdAt");
