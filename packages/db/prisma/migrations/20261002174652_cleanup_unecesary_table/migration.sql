/*
  Warnings:

  - You are about to drop the column `section_id` on the `gallery_albums` table. All the data in the column will be lost.
  - You are about to drop the `gallery_sections` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "gallery"."gallery_albums" DROP CONSTRAINT "gallery_albums_section_id_fkey";

-- AlterTable
ALTER TABLE "gallery"."gallery_albums" DROP COLUMN "section_id";

-- DropTable
DROP TABLE "gallery"."gallery_sections";
