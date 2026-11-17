-- Backfill the English translation for the academic activity the seed created before
-- translations existed (the 2026 Machine Learning workshop). Only inserts when the activity
-- has no English row yet, so this is safe to run again and never overwrites an edit an admin
-- already made through the CMS.

INSERT INTO "news"."academic_activity_translations" ("academic_activity_id", "locale", "title", "category", "description", "photo_alt")
SELECT aa."id", 'en', t.title, t.category, t.description, t.photo_alt
FROM "news"."academic_activities" aa
JOIN (VALUES (
    '2026 Workshop on Machine Learning Applied to Space Weather and GNSS',
    'Workshop',
    'As part of the LASCE project, the Workshop on Machine Learning Applied to Space Weather and Global Navigation Satellite Systems (GNSS) was held from 16 to 20 February 2026 in San José, Costa Rica. For five days the activity brought together students, early-career researchers and specialists to strengthen their skills in the study of the Sun-Earth relationship, scientific data analysis and the application of artificial intelligence and machine learning techniques to space weather.

The programme combined lectures, discussion sessions and computational practice devoted to ionospheric processes, the effects of space weather on GNSS systems, scientific computing and data analysis with machine learning tools. This approach made it possible to combine the physical understanding of solar and terrestrial phenomena with modern methods of processing, modelling and prediction, while also promoting the use of open data and reproducible procedures.

The workshop had 52 in-person participants from 17 countries; 37.2% were women and 70% came from developing countries. It was organised with the participation of the Space Research Center of the University of Costa Rica, the United Nations Office for Outer Space Affairs, the International Committee on GNSS, COSPAR, INGV and SCOSTEP, together with contributions from the National University of Tucumán and the Abdus Salam International Centre for Theoretical Physics.

This activity strengthened the international profile of LASCE, widened its networks of scientific collaboration and contributed to building regional capabilities for researching, monitoring and predicting the effects of space weather on the ionosphere and on technological systems. It also created a space for identifying new scientific challenges, opportunities for cooperation and future initiatives that combine space weather physics with advanced data analysis tools.',
    'Committee and participants beside the official poster of the Machine Learning and space weather workshop'
)) AS t(title, category, description, photo_alt) ON aa."title" = t.title
WHERE NOT EXISTS (
    SELECT 1 FROM "news"."academic_activity_translations" aat
    WHERE aat."academic_activity_id" = aa."id" AND aat."locale" = 'en'
);
