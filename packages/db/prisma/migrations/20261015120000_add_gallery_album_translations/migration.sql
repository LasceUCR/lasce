-- CreateTable
CREATE TABLE "gallery"."gallery_album_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "album_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_album_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gallery_album_translations_album_id_locale_key" ON "gallery"."gallery_album_translations"("album_id", "locale");

-- AddForeignKey
ALTER TABLE "gallery"."gallery_album_translations" ADD CONSTRAINT "gallery_album_translations_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "gallery"."gallery_albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
