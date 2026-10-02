/*
  Warnings:

  - Added the required column `section_id` to the `gallery_albums` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "gallery"."gallery_albums" ADD COLUMN     "section_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "gallery"."gallery_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_sections_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "gallery"."gallery_albums" ADD CONSTRAINT "gallery_albums_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "gallery"."gallery_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
