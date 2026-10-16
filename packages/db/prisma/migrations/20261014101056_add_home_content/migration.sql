-- CreateEnum
CREATE TYPE "geomagnetic_index_source" AS ENUM ('manual', 'automatic');

-- CreateTable
CREATE TABLE "home_hero" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "lead" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_hero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_hero_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "home_hero_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "lead" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_hero_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geomagnetic_indices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(8) NOT NULL,
    "value" VARCHAR(15) NOT NULL,
    "description" VARCHAR(15) NOT NULL,
    "position" INTEGER NOT NULL,
    "source" "geomagnetic_index_source" NOT NULL DEFAULT 'manual',
    "observed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geomagnetic_indices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geomagnetic_index_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "geomagnetic_index_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "description" VARCHAR(15) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geomagnetic_index_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "home_hero_translations_home_hero_id_locale_key" ON "home_hero_translations"("home_hero_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "geomagnetic_indices_code_key" ON "geomagnetic_indices"("code");

-- CreateIndex
CREATE INDEX "geomagnetic_indices_position_idx" ON "geomagnetic_indices"("position");

-- CreateIndex
CREATE UNIQUE INDEX "geomagnetic_index_translations_geomagnetic_index_id_locale_key" ON "geomagnetic_index_translations"("geomagnetic_index_id", "locale");

-- AddForeignKey
ALTER TABLE "home_hero_translations" ADD CONSTRAINT "home_hero_translations_home_hero_id_fkey" FOREIGN KEY ("home_hero_id") REFERENCES "home_hero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geomagnetic_index_translations" ADD CONSTRAINT "geomagnetic_index_translations_geomagnetic_index_id_fkey" FOREIGN KEY ("geomagnetic_index_id") REFERENCES "geomagnetic_indices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the content the home page showed from apps/web/messages/ until now, in
-- Spanish (base rows) and English (translation rows), so the page reads the
-- same right after migrating. The indices keep their manual source.
WITH hero AS (
  INSERT INTO "home_hero" ("title", "lead")
  VALUES (
    'Exploramos el Sol para comprender el clima espacial',
    'Investigamos la actividad solar y sus efectos en el medio interplanetario y la Tierra, mediante observaciones, instrumentación, análisis de datos y desarrollo científico.'
  )
  RETURNING "id"
)
INSERT INTO "home_hero_translations" ("home_hero_id", "locale", "title", "lead")
SELECT
  "id",
  'en',
  'We explore the Sun to understand space weather',
  'We study solar activity and its effects on the interplanetary medium and the Earth through observations, instrumentation, data analysis and scientific development.'
FROM hero;

WITH seed ("code", "value", "description", "position", "description_en") AS (
  VALUES
    ('kp', '2', 'Tranquilo', 0, 'Quiet'),
    ('dst', '-12 nT', 'Estable', 1, 'Stable'),
    ('ae', '75 nT', 'Actividad baja', 2, 'Low activity'),
    ('ap', '7', 'Tranquilo', 3, 'Quiet')
),
indices AS (
  INSERT INTO "geomagnetic_indices" ("code", "value", "description", "position")
  SELECT "code", "value", "description", "position" FROM seed
  RETURNING "id", "code"
)
INSERT INTO "geomagnetic_index_translations" ("geomagnetic_index_id", "locale", "description")
SELECT indices."id", 'en', seed."description_en"
FROM indices
JOIN seed ON seed."code" = indices."code";
