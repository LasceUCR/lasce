-- CreateTable
CREATE TABLE "space_weather_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_weather_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_weather_section_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "section_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_weather_section_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "space_weather_sections_key_key" ON "space_weather_sections"("key");

-- CreateIndex
CREATE UNIQUE INDEX "space_weather_section_translations_section_id_locale_key" ON "space_weather_section_translations"("section_id", "locale");

-- AddForeignKey
ALTER TABLE "space_weather_section_translations" ADD CONSTRAINT "space_weather_section_translations_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "space_weather_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the "¿Por qué estudiarlo desde Costa Rica?" card as the page showed it from
-- apps/web/messages/ until now: Spanish on the base row, English in a translation row, so
-- the page reads the same right after migrating. Paragraphs are separated by a blank line.
WITH section AS (
    INSERT INTO "space_weather_sections" ("key", "title", "body")
    VALUES (
        'costa-rica',
        '¿Por qué estudiarlo desde Costa Rica?',
        'La respuesta de la ionosfera y el desempeño de sistemas tecnológicos pueden depender de la ubicación geográfica y geomagnética. Contar con observaciones y análisis realizados desde Costa Rica permite caracterizar mejor el entorno regional, aportar datos a redes globales y formar capacidades científicas propias. Para un país cada vez más dependiente de navegación satelital, telecomunicaciones e infraestructura digital, comprender el clima espacial es una inversión en conocimiento.'
    )
    RETURNING "id"
)
INSERT INTO "space_weather_section_translations" ("section_id", "locale", "title", "body")
SELECT
    section."id",
    'en',
    'Why study it from Costa Rica?',
    'The response of the ionosphere and the performance of technological systems can depend on geographic and geomagnetic location. Having observations and analyses made from Costa Rica makes it possible to characterise the regional environment better, to contribute data to global networks and to build local scientific capabilities. For a country that depends more and more on satellite navigation, telecommunications and digital infrastructure, understanding space weather is an investment in knowledge.'
FROM section;
