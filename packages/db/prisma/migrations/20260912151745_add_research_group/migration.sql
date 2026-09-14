/*
  Warnings:

  - Added the required column `research_group` to the `research_records` table.
    Existing records are assigned to ROSAC before the column is made required.
*/

-- CreateEnum
CREATE TYPE "research"."ResearchGroup" AS ENUM ('LASCE', 'ROSAC');

-- AlterTable
ALTER TABLE "research"."research_records"
ADD COLUMN "research_group" "research"."ResearchGroup";

-- Assign a group to existing records
UPDATE "research"."research_records"
SET "research_group" = 'ROSAC'
WHERE "research_group" IS NULL;

-- Make the column required
ALTER TABLE "research"."research_records"
ALTER COLUMN "research_group" SET NOT NULL;

-- CreateIndex
CREATE INDEX "research_records_research_group_idx"
ON "research"."research_records"("research_group");
