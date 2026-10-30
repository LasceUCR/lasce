-- Backfill English translations for existing Nosotros researchers.
-- Only inserts the English translation for researchers who do not have one yet,
-- ensuring that existing data, photos, custom additions or editor changes are preserved.

INSERT INTO "public"."nosotros_researcher_translations" ("researcher_id", "locale", "role", "description")
SELECT nr."id", 'en', t.role, t.description
FROM "public"."nosotros_researchers" nr
JOIN (VALUES
    (
        'Dra. Carolina Salas Matamoros',
        'Principal investigator',
        'Besides serving as principal investigator, she guides the definition of the research lines and coordinates the integration of solar astrophysics, radio astronomy, space weather, data analysis and artificial intelligence; she also links the scientific work to the development of infrastructure and our own observation capabilities, particularly through the ROSAC radio telescope. Her experience in the joint study of flares, X-ray emissions, coronal mass ejections and the prediction of ICME arrival times at Earth provides the scientific basis to drive monitoring and forecasting tools adapted to Costa Rica. She also promotes interdisciplinary and international collaboration, the training of students and young researchers, and the transfer of scientific knowledge into applications that help understand and anticipate the effects of solar activity on the terrestrial environment and technological systems.'
    ),
    (
        'Dr. Allan Francisco Berrocal Rojas',
        'Collaborating researcher',
        'Design, development and implementation of LASCE''s computing platform. The specific tasks cover capturing massive data from different sources with space weather information, storing the processed data of interest to the project in database systems suited to the domain, and finally providing a query interface through web services. He also supports the data analysis objectives on space weather alongside specialist researchers such as solar astrophysicists.'
    ),
    (
        'Dr. Luis Gustavo Esquivel Quirós',
        'Collaborating researcher',
        NULL
    ),
    (
        'MSc. Ivannia Calvo',
        'Collaborating researcher',
        'Technical and computing support, and in charge of the San José Astronomical Observatory (OAS).'
    ),
    (
        'Dr. Felipe Meza Obando',
        'Collaborating researcher',
        'Development of intelligent models for the analysis, interpretation and prediction of signals associated with space weather phenomena, integrating artificial intelligence, signal processing and solar radio astronomy.'
    ),
    (
        'MSc. Alonso Vega',
        'Collaborating researcher',
        'Processing and analysis of GNSS data from continuously operating stations co-located with the ROSAC radio telescope, as well as stations of the SIRGAS-CON network, to characterize variations in the ionospheric electron content and their possible relation to solar activity.'
    ),
    (
        'Dra. Graciela Molina',
        'Collaborating researcher',
        'Her contribution focuses on the analysis and modeling of large volumes of data through machine learning, time series and high-performance computing, with special emphasis on monitoring and predicting the state of the ionosphere under different solar and geomagnetic conditions. She also contributes her experience in ionospheric instrumentation and in developing software for the automatic detection of signals from geophysical radars, strengthening the integration of observations, advanced data processing and predictive tools within the laboratory.'
    ),
    (
        'Dra. Yenca Migoya',
        'Collaborating researcher',
        'Her contribution includes the development and implementation of physical and computational models, including machine learning techniques, to analyze, interpret, predict and classify space phenomena. She also takes part in processing and studying observational data and simulations, strengthening the laboratory''s capacity to turn large volumes of information into scientific knowledge. Her experience also contributes to consolidating LASCE as a space for interdisciplinary research and scientific cooperation with a Latin American reach.'
    ),
    (
        'MSc. Johanna Pamela Camacho Garbanzo',
        'Collaborating researcher',
        'She is an exploration geophysicist at the Costa Rican Electricity Institute (ICE), with more than 17 years of experience applying geophysical methods to characterize the subsurface and to develop applied research projects. She also has 8 years of experience as a university lecturer at the School of Physics of the University of Costa Rica, teaching General Physics laboratories. She is currently a doctoral student and researcher at the Space Weather Laboratory (LASCE), where she carries out research on geomagnetism, the ionosphere and space weather using real-time records of the Earth''s magnetic field. Her work focuses on analyzing the interaction between geomagnetic activity and the ionosphere, and on its applications to the study of space weather in Costa Rica. Throughout her career she has taken part in numerous geophysical research studies and reports applied to infrastructure, subsurface exploration, energy and engineering, using techniques such as ground-penetrating radar (GPR), electrical resistivity tomography and other geophysical methods. Her main areas of interest include applied geophysics, geomagnetism, space weather and the training of new generations of scientists and engineers.'
    )
) AS t(name, role, description) ON nr."name" = t.name
WHERE NOT EXISTS (
    SELECT 1 FROM "public"."nosotros_researcher_translations" nrt
    WHERE nrt."researcher_id" = nr."id" AND nrt."locale" = 'en'
);

