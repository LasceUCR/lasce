-- CreateTable
CREATE TABLE "news"."academic_activity_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "academic_activity_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photo_alt" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_activity_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_activity_translations_academic_activity_id_locale_key" ON "news"."academic_activity_translations"("academic_activity_id", "locale");

-- AddForeignKey
ALTER TABLE "news"."academic_activity_translations" ADD CONSTRAINT "academic_activity_translations_academic_activity_id_fkey" FOREIGN KEY ("academic_activity_id") REFERENCES "news"."academic_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
