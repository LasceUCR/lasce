-- Initiatives and their translations are saved atomically by the CMS.
CREATE TABLE research.initiatives (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  position SERIAL NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT initiatives_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX initiatives_position_key ON research.initiatives(position);
CREATE TABLE research.initiative_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  initiative_id UUID NOT NULL,
  locale VARCHAR(5) NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT initiative_translations_pkey PRIMARY KEY (id),
  CONSTRAINT initiative_translations_initiative_id_fkey FOREIGN KEY (initiative_id)
    REFERENCES research.initiatives(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX initiative_translations_initiative_id_locale_key
  ON research.initiative_translations(initiative_id, locale);

-- Snapshot of the existing Spanish and English catalogues, preserving paragraph boundaries.
-- Runs once on deployment; later CMS edits and deletions are never reseeded.
INSERT INTO research.initiatives(id, title, description, logo_url, website_url)
VALUES ('01200000-0000-4000-8000-000000000001', 'Iniciativa Internacional de Clima Espacial (ISWI)', 'La Iniciativa Internacional de Clima Espacial (ISWI, por sus siglas en inglés) del Comité de las Naciones Unidas sobre la Utilización del Espacio Ultraterrestre con Fines Pacíficos se puso en marcha en 2009 y concluyó formalmente como tema de la agenda del Comité en 2012. Sin embargo, las actividades de la ISWI continuaron y, desde 2013, se tratan en el nuevo tema permanente de la agenda sobre clima espacial de la Subcomisión de Asuntos Científicos y Técnicos del Comité.', '/brand/logo-ISWI.png', 'https://www.unoosa.org/oosa/en/ourwork/psa/bssi/iswi.html');
INSERT INTO research.initiative_translations(initiative_id, locale, title, description)
VALUES ('01200000-0000-4000-8000-000000000001', 'en', 'International Space Weather Initiative (ISWI)', 'The International Space Weather Initiative (ISWI) of the United Nations Committee on the Peaceful Uses of Outer Space was launched in 2009 and formally concluded as an item on the Committee''s agenda in 2012. However, ISWI activities continued and, since 2013, they have been addressed under the new permanent agenda item on space weather of the Committee''s Scientific and Technical Subcommittee.');
INSERT INTO research.initiatives(id, title, description, logo_url, website_url)
VALUES ('01200000-0000-4000-8000-000000000002', 'Iniciativa VLBI Iberoamericana (IVIA)', 'En 2019 surgió la Iniciativa VLBI Iberoamericana (IVIA), una instancia de trabajo conjunto orientada al desarrollo de la radioastronomía en Iberoamérica, tomando como eje conceptual el desarrollo de la radioastronomía en la región y la implementación de una red VLBI en Latinoamérica, en colaboración con España y Portugal.

En su conformación actual hay representantes de instituciones de Argentina, Brasil, Colombia, Costa Rica, Ecuador, México, Perú y Uruguay. Asimismo, se propone promover la participación de los demás países de la región. Participan también el Instituto Conjunto para VLBI (JIVE, con sede en Países Bajos, organización que centraliza el procesamiento de datos de la red europea de VLBI, llamada EVN), el Instituto Geográfico Nacional de España y el Instituto de Telecomunicações de Portugal.

La iniciativa implica un trabajo colaborativo en la conversión de antenas de telecomunicación en radiotelescopios y su adecuación para VLBI, y el desarrollo de todas las tecnologías relacionadas. Con la unión de los recursos de las instituciones participantes, se pretende alcanzar una masa crítica para aprovechar al máximo los recursos e infraestructura existente en cada país.

De esta forma, el objetivo final es crear un proyecto de colaboración internacional que tenga un gran impacto en el desarrollo integral de la región.

La iniciativa contribuye fuertemente a disminuir la brecha existente entre el número de observatorios radioastronómicos del Hemisferio Sur y los existentes en el Hemisferio Norte.', '/brand/logo-Iniciativa-VLBI-Ibero-Americana.png', 'https://oaq.epn.edu.ec/ivia-net/index.php/es/');
INSERT INTO research.initiative_translations(initiative_id, locale, title, description)
VALUES ('01200000-0000-4000-8000-000000000002', 'en', 'Ibero-American VLBI Initiative (IVIA)', 'The Ibero-American VLBI Initiative (IVIA) emerged in 2019 as a joint working body aimed at developing radio astronomy in Ibero-America. Its guiding ideas are the development of radio astronomy in the region and the implementation of a VLBI network in Latin America, in collaboration with Spain and Portugal.

It currently includes representatives of institutions from Argentina, Brazil, Colombia, Costa Rica, Ecuador, Mexico, Peru and Uruguay, and it aims to promote the participation of the other countries in the region. The Joint Institute for VLBI (JIVE, based in the Netherlands, the organisation that centralises data processing for the European VLBI Network, EVN), the Instituto Geográfico Nacional of Spain and the Instituto de Telecomunicações of Portugal also take part.

The initiative involves collaborative work on converting telecommunication antennas into radio telescopes and adapting them for VLBI, and on developing all the related technologies. By pooling the resources of the participating institutions, it aims to reach a critical mass that makes the most of the resources and infrastructure existing in each country.

The final goal is therefore to create an international collaboration project with a large impact on the overall development of the region.

The initiative contributes strongly to narrowing the gap between the number of radio astronomy observatories in the Southern Hemisphere and those in the Northern Hemisphere.');
