-- CreateTable
CREATE TABLE "areas"."research_area_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "research_area_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_area_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "research_area_translations_research_area_id_locale_key" ON "areas"."research_area_translations"("research_area_id", "locale");

-- AddForeignKey
ALTER TABLE "areas"."research_area_translations" ADD CONSTRAINT "research_area_translations_research_area_id_fkey" FOREIGN KEY ("research_area_id") REFERENCES "areas"."research_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
