-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "gallery";

-- CreateTable
CREATE TABLE "gallery"."gallery_albums" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "years_label" TEXT,
    "parent_album_id" UUID,
    "cover_object_key" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery"."gallery_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "album_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "alt_text" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "is_video" BOOLEAN NOT NULL DEFAULT false,
    "col_span" INTEGER NOT NULL DEFAULT 1,
    "row_span" INTEGER NOT NULL DEFAULT 1,
    "captured_at" DATE NOT NULL,
    "uploader_name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gallery_albums_slug_key" ON "gallery"."gallery_albums"("slug");

-- CreateIndex
CREATE INDEX "gallery_albums_parent_album_id_idx" ON "gallery"."gallery_albums"("parent_album_id");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_media_object_key_key" ON "gallery"."gallery_media"("object_key");

-- CreateIndex
CREATE INDEX "gallery_media_album_id_idx" ON "gallery"."gallery_media"("album_id");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_media_album_id_position_key" ON "gallery"."gallery_media"("album_id", "position");

-- AddForeignKey
ALTER TABLE "gallery"."gallery_albums" ADD CONSTRAINT "gallery_albums_parent_album_id_fkey" FOREIGN KEY ("parent_album_id") REFERENCES "gallery"."gallery_albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery"."gallery_media" ADD CONSTRAINT "gallery_media_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "gallery"."gallery_albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
