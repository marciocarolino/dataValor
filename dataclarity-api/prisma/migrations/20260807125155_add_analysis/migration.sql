-- CreateEnum
CREATE TYPE "AnalysisChartType" AS ENUM ('LINE', 'BAR', 'AREA', 'PIE', 'DONUT', 'TABLE', 'KPI');

-- CreateEnum
CREATE TYPE "AnalysisAggregation" AS ENUM ('SUM', 'COUNT', 'AVG', 'MAX', 'MIN', 'DISTINCT');

-- CreateEnum
CREATE TYPE "AnalysisCategory" AS ENUM ('FINANCIAL', 'COMMERCIAL', 'CUSTOMER', 'MARKETING', 'OPERATIONAL', 'CUSTOM');

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "chartType" "AnalysisChartType" NOT NULL,
    "category" "AnalysisCategory" NOT NULL,
    "dataset" TEXT,
    "metric" TEXT,
    "aggregation" "AnalysisAggregation" NOT NULL,
    "groupBy" TEXT,
    "dateField" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "filters" JSONB,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Analysis_category_idx" ON "Analysis"("category");

-- CreateIndex
CREATE INDEX "Analysis_chartType_idx" ON "Analysis"("chartType");

-- CreateIndex
CREATE INDEX "Analysis_isFavorite_idx" ON "Analysis"("isFavorite");

-- CreateIndex
CREATE INDEX "Analysis_isPublic_idx" ON "Analysis"("isPublic");

-- CreateIndex
CREATE INDEX "Analysis_createdBy_idx" ON "Analysis"("createdBy");

-- CreateIndex
CREATE INDEX "Analysis_createdAt_idx" ON "Analysis"("createdAt");
