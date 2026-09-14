-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "news";

-- CreateTable
CREATE TABLE "news"."news_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news"."news_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "published_at" DATE NOT NULL,
    "source_id" UUID NOT NULL,
    "abstract" TEXT NOT NULL,
    "external_url" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news"."news_authors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news"."news_cross_authors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "news_id" UUID NOT NULL,
    "news_author_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "news_cross_authors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_sources_name_key" ON "news"."news_sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "news_records_external_url_key" ON "news"."news_records"("external_url");

-- CreateIndex
CREATE INDEX "news_records_published_at_idx" ON "news"."news_records"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "news_authors_name_key" ON "news"."news_authors"("name");

-- CreateIndex
CREATE INDEX "news_cross_authors_news_id_position_idx" ON "news"."news_cross_authors"("news_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "news_cross_authors_news_id_news_author_id_key" ON "news"."news_cross_authors"("news_id", "news_author_id");

-- AddForeignKey
ALTER TABLE "news"."news_records" ADD CONSTRAINT "news_records_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "news"."news_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news"."news_cross_authors" ADD CONSTRAINT "news_cross_authors_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"."news_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news"."news_cross_authors" ADD CONSTRAINT "news_cross_authors_news_author_id_fkey" FOREIGN KEY ("news_author_id") REFERENCES "news"."news_authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
