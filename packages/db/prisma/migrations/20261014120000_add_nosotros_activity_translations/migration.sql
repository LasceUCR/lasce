-- CreateTable
CREATE TABLE "public"."nosotros_activity_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "paragraph" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nosotros_activity_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nosotros_activity_translations_activity_id_locale_key" ON "public"."nosotros_activity_translations"("activity_id", "locale");

-- AddForeignKey
ALTER TABLE "public"."nosotros_activity_translations" ADD CONSTRAINT "nosotros_activity_translations_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."nosotros_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
