-- Backfill English translations for the original ROSAC roster.
-- That English lived in the message catalogue (rosac.team.people) and the public
-- page overlaid it, so the editor treated every profile as having no translation.
-- Only inserts a row when the researcher does not already have one.

INSERT INTO "public"."researcher_translations" ("researcher_id", "locale", "role", "description")
SELECT r."id", 'en', t.role, t.description
FROM "public"."researchers" r
JOIN (VALUES
    (
        'Dra. Carolina Salas Matamoros',
        'Principal Investigator',
        'Responsible for strategic planning of the resources needed for proper assembly and installation of the radio telescope, as well as lead in the management and analysis of data obtained through this instrument.'
    ),
    (
        'Dr. Miguel Velázquez',
        'Researcher',
        'In charge of instrumentation development at ROSAC.'
    ),
    (
        'Dr. David Gale',
        'Researcher',
        'Installation and alignment of telescope reflectors. Mechanical systems, motion testing, lightning protection. General support.'
    ),
    (
        'Dr. Óscar Núñez',
        'Researcher',
        'In charge of the electrical system and technical support for gear motors.'
    ),
    (
        'Dr. Federico Ruiz',
        'Researcher',
        'In charge of the implementation and commissioning of sensors and actuators, as well as the development of the controller and software systems associated with the ROSAC radio telescope.'
    ),
    (
        'MSc. Gustavo Lara',
        'Researcher',
        'In charge of technical and geodetic control, performing base leveling, angular calibration, dish deformation monitoring, and control network design. Provides parametric data for the configuration and operation of the radio telescope control and tracking software.'
    ),
    (
        'Ing. Andrés Fallas',
        'Researcher',
        'In charge of technical and geodetic control, performing base leveling, angular calibration, dish deformation monitoring, and control network design. Provides parametric data for the configuration and operation of the radio telescope control and tracking software.'
    ),
    (
        'MSc. Wagner Mejías',
        'Researcher',
        'Mechanical installation of the structure, preventive and corrective maintenance, adaptations and improvements to the general structure.'
    ),
    (
        'Dr. Eduardo Ibarra',
        'External collaborator',
        'Collaborator in the development and testing of the reception stage in the 100 MHz to 1.1 GHz range, receiver sensitivity analysis, radio telescope design, and electrical installation and antenna guidance system control tasks.'
    ),
    (
        'Ing. Andrés Corrales',
        'External collaborator',
        'Designer, developer, and maintainer of the radio telescope control software and end-user software.'
    ),
    (
        'Ing. Andrés Gamboa',
        'External collaborator',
        'Support in radio telescope maintenance tasks, as well as electromechanical work related to instrument assembly.'
    ),
    (
        'Jelmuth Rojas',
        'External collaborator',
        'Support in structure leveling tasks.'
    ),
    (
        'Barnald Bocker',
        'Assistant',
        'Support in the development and maintenance of ROSAC control software and communication protocols.'
    ),
    (
        'MSc. Fabián Chaverri',
        'Prospective doctoral student',
        'Prospective doctoral student with a thesis in astronomical instrumentation linked to the project.'
    )
) AS t(name, role, description) ON r."name" = t.name
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."researcher_translations" rt
    WHERE rt."researcher_id" = r."id" AND rt."locale" = 'en'
);
