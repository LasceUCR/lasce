/*
  Warnings:

  - You are about to drop the column `image_alt` on the `news_records` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `news_records` table. All the data in the column will be lost.

  News cards no longer show images (LASCE-PUB-002-272), so the news form stopped collecting them.
  Objects already uploaded to MinIO for news items are not deleted here; they are left in the
  bucket with nothing referencing them.
*/
-- AlterTable
ALTER TABLE "news"."news_records" DROP COLUMN "image_alt",
DROP COLUMN "image_url";
