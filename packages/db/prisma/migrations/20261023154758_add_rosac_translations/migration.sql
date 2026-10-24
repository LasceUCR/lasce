-- CreateTable
CREATE TABLE "researcher_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "researcher_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "researcher_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rosac_characteristic_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "characteristic_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rosac_characteristic_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rosac_activity_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rosac_activity_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rosac_stage_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stage_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rosac_stage_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rosac_instrument_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "instrument_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "name" TEXT NOT NULL,
    "consultation_label" TEXT,
    "consultation_notice" TEXT,
    "pending_message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rosac_instrument_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rosac_acknowledgment_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "acknowledgment_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rosac_acknowledgment_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "researcher_translations_researcher_id_locale_key" ON "researcher_translations"("researcher_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "rosac_characteristic_translations_characteristic_id_locale_key" ON "rosac_characteristic_translations"("characteristic_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "rosac_activity_translations_activity_id_locale_key" ON "rosac_activity_translations"("activity_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "rosac_stage_translations_stage_id_locale_key" ON "rosac_stage_translations"("stage_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "rosac_instrument_translations_instrument_id_locale_key" ON "rosac_instrument_translations"("instrument_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "rosac_acknowledgment_translations_acknowledgment_id_locale_key" ON "rosac_acknowledgment_translations"("acknowledgment_id", "locale");

-- AddForeignKey
ALTER TABLE "researcher_translations" ADD CONSTRAINT "researcher_translations_researcher_id_fkey" FOREIGN KEY ("researcher_id") REFERENCES "researchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosac_characteristic_translations" ADD CONSTRAINT "rosac_characteristic_translations_characteristic_id_fkey" FOREIGN KEY ("characteristic_id") REFERENCES "rosac_characteristics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosac_activity_translations" ADD CONSTRAINT "rosac_activity_translations_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "rosac_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosac_stage_translations" ADD CONSTRAINT "rosac_stage_translations_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "rosac_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosac_instrument_translations" ADD CONSTRAINT "rosac_instrument_translations_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "rosac_instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosac_acknowledgment_translations" ADD CONSTRAINT "rosac_acknowledgment_translations_acknowledgment_id_fkey" FOREIGN KEY ("acknowledgment_id") REFERENCES "rosac_acknowledgments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
