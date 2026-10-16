BEGIN;

CREATE TYPE "research"."collaboration_scope" AS ENUM ('national', 'international');

CREATE TABLE "research"."collaborations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "acronym" TEXT,
    "country" TEXT NOT NULL,
    "scope" "research"."collaboration_scope" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaborations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "research"."collaboration_translations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collaboration_id" UUID NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "country" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_translations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "collaboration_translations_collaboration_id_locale_key"
    ON "research"."collaboration_translations"("collaboration_id", "locale");

ALTER TABLE "research"."collaboration_translations"
    ADD CONSTRAINT "collaboration_translations_collaboration_id_fkey"
    FOREIGN KEY ("collaboration_id") REFERENCES "research"."collaborations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the existing public directory when the route switches from code to PostgreSQL.
-- These are the existing es/en country labels from the message catalogues.
INSERT INTO "research"."collaborations" ("name", "acronym", "country", "scope", "position") VALUES
    ('Instituto Tecnológico de Costa Rica', 'TEC', 'Costa Rica', 'national', 0),
    ('Instituto Costarricense de Electricidad', 'ICE', 'Costa Rica', 'national', 1),
    ('Facultad de Ciencias Exactas y Tecnología', 'FACET, UNT', 'Argentina', 'international', 2),
    ('Istituto Nazionale di Geofisica e Vulcanologia', 'INGV', 'Italia', 'international', 3),
    ('Science, Technology and Innovation Unit, The Abdus Salam International Centre for Theoretical Physics', 'ICTP', 'Italia', 'international', 4),
    ('Observatoire de Paris, Meudon', 'OPM', 'Francia', 'international', 5),
    ('Servicio de Clima Espacial México', 'SCiESMEX', 'México', 'international', 6),
    ('Instituto Nacional de Astrofísica, Óptica y Electrónica', 'INAOE', 'México', 'international', 7);

INSERT INTO "research"."collaboration_translations" ("collaboration_id", "locale", "country")
SELECT c."id", 'en', t.country_en
FROM "research"."collaborations" c
JOIN (VALUES
    ('Costa Rica', 'Costa Rica'),
    ('Argentina', 'Argentina'),
    ('Italia', 'Italy'),
    ('Francia', 'France'),
    ('México', 'Mexico')
) AS t(country_es, country_en) ON c."country" = t.country_es;

COMMIT;
