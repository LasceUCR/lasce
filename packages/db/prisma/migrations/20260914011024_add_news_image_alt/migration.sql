/*
  Warnings:

  - Added the required column `image_alt` to the `news_records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "news"."news_records"
ADD COLUMN "image_alt" TEXT NOT NULL DEFAULT '';
