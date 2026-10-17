-- CreateTable
CREATE TABLE "solar_physics_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solar_physics_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solar_physics_section_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "section_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solar_physics_section_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solar_physics_sections_key_key" ON "solar_physics_sections"("key");

-- CreateIndex
CREATE UNIQUE INDEX "solar_physics_section_translations_section_id_locale_key" ON "solar_physics_section_translations"("section_id", "locale");

-- AddForeignKey
ALTER TABLE "solar_physics_section_translations" ADD CONSTRAINT "solar_physics_section_translations_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "solar_physics_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: the section's text as the page showed it before it became editable. Spanish is the
-- source text on the base row; English goes in a translation row, so the section starts complete.
-- Paragraphs are separated by a blank line.
WITH section AS (
    INSERT INTO "solar_physics_sections" ("key", "title", "body")
    VALUES (
        'lasce',
        'El trabajo de LASCE en Física Solar',
        'El Laboratorio de Astrofísica Solar y Clima Espacial reúne investigación en astrofísica solar, observaciones astronómicas y desarrollo computacional para estudiar la actividad solar y su interacción con el entorno terrestre.

Su trabajo integra datos de diferentes instrumentos, longitudes de onda y plataformas para observar distintos eslabones de una misma cadena: desde el origen magnético de una erupción solar hasta sus manifestaciones cerca de la Tierra.

Desde la Universidad de Costa Rica, LASCE busca fortalecer capacidades científicas nacionales para analizar la relación Sol-Tierra, formar talento e impulsar colaboraciones en el estudio del clima espacial.'
    )
    RETURNING "id"
)
INSERT INTO "solar_physics_section_translations" ("section_id", "locale", "title", "body")
SELECT
    section."id",
    'en',
    'LASCE''s work in solar astrophysics',
    'The Solar Astrophysics and Space Weather Laboratory brings together research in solar astrophysics, astronomical observations and computational development to study solar activity and its interaction with the Earth''s environment.

Its work combines data from different instruments, wavelengths and platforms to observe different links of a single chain: from the magnetic origin of a solar eruption to its manifestations near the Earth.

From the University of Costa Rica, LASCE seeks to strengthen national scientific capabilities for analysing the Sun-Earth relationship, to train talent and to foster collaborations in the study of space weather.'
FROM section;
