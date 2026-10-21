-- CreateTable
CREATE TABLE "news"."news_record_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "news_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_record_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "news_record_translations_news_id_locale_key" ON "news"."news_record_translations"("news_id", "locale");

-- AddForeignKey
ALTER TABLE "news"."news_record_translations" ADD CONSTRAINT "news_record_translations_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"."news_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
