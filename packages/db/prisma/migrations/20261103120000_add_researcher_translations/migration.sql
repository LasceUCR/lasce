-- CreateTable
CREATE TABLE "public"."researcher_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "researcher_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "researcher_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "researcher_translations_researcher_id_locale_key" ON "public"."researcher_translations"("researcher_id", "locale");

-- AddForeignKey
ALTER TABLE "public"."researcher_translations" ADD CONSTRAINT "researcher_translations_researcher_id_fkey" FOREIGN KEY ("researcher_id") REFERENCES "public"."researchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
