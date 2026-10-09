-- CreateTable
CREATE TABLE "research"."research_record_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "research_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_record_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "research_record_translations_research_id_locale_key" ON "research"."research_record_translations"("research_id", "locale");

-- AddForeignKey
ALTER TABLE "research"."research_record_translations" ADD CONSTRAINT "research_record_translations_research_id_fkey" FOREIGN KEY ("research_id") REFERENCES "research"."research_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
