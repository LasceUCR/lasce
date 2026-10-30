BEGIN;

-- Bundled public assets, not editor-supplied URLs or uploads.
ALTER TABLE "research"."collaborations" ADD COLUMN "logo_path" TEXT;

-- Match the original directory once, then keep media attached to each record's UUID.
-- Preserve editor-provided websites, names, countries, classifications and display order.
UPDATE "research"."collaborations" AS c
SET "logo_path" = p.logo_path,
    "website_url" = COALESCE(NULLIF(BTRIM(c."website_url"), ''), p.website_url),
    "updated_at" = CURRENT_TIMESTAMP
FROM (VALUES
    ('Instituto Tecnológico de Costa Rica', 'TEC', 'national', '/brand/collaborations/tec.png', 'https://www.tec.ac.cr/'),
    ('Instituto Costarricense de Electricidad', 'ICE', 'national', '/brand/collaborations/ice.png', 'https://www.grupoice.com/'),
    ('Facultad de Ciencias Exactas y Tecnología', 'FACET, UNT', 'international', '/brand/collaborations/facet-unt.png', 'https://www.facet.unt.edu.ar/'),
    ('Istituto Nazionale di Geofisica e Vulcanologia', 'INGV', 'international', '/brand/collaborations/ingv.png', 'https://www.ingv.it/'),
    ('Science, Technology and Innovation Unit, The Abdus Salam International Centre for Theoretical Physics', 'ICTP', 'international', '/brand/collaborations/ictp.png', 'https://www.ictp.it/'),
    ('Observatoire de Paris, Meudon', 'OPM', 'international', '/brand/collaborations/observatoire-de-paris.png', 'https://observatoiredeparis.psl.eu/'),
    ('Servicio de Clima Espacial México', 'SCiESMEX', 'international', '/brand/collaborations/sciesmex.png', 'https://www.sciesmex.unam.mx/'),
    ('Instituto Nacional de Astrofísica, Óptica y Electrónica', 'INAOE', 'international', '/brand/collaborations/inaoe.png', 'https://www.inaoep.mx/')
) AS p(name, acronym, scope, logo_path, website_url)
WHERE c."name" = p.name AND c."acronym" = p.acronym AND c."scope"::text = p.scope;

COMMIT;
