/*
  Warnings:

  - Made the column `src` on table `research_areas` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "areas"."research_areas" ALTER COLUMN "src" SET NOT NULL;
