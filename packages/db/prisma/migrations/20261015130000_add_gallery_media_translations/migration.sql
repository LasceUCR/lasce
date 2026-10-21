-- CreateTable
CREATE TABLE "gallery"."gallery_media_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gallery_media_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "alt_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_media_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gallery_media_translations_gallery_media_id_locale_key" ON "gallery"."gallery_media_translations"("gallery_media_id", "locale");

-- AddForeignKey
ALTER TABLE "gallery"."gallery_media_translations" ADD CONSTRAINT "gallery_media_translations_gallery_media_id_fkey" FOREIGN KEY ("gallery_media_id") REFERENCES "gallery"."gallery_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
