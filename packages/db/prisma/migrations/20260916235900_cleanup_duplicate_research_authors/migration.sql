-- Remove historical duplicate author relations created with alternate author names.

DELETE FROM "research"."research_cross_authors" AS rca
WHERE EXISTS (
  SELECT 1
  FROM "research"."research_authors" AS a
  JOIN "research"."research_records" AS r
    ON r.id = rca.research_id
  WHERE a.id = rca.research_author_id
    AND (
      (
        a.name = 'David M. Gale'
        AND r.title = 'The Santa Cruz Radio Observatory (ROSAC): the first radio astronomy facility in Costa Rica'
      )
      OR (
        a.name = 'Carolina Salas-Matamoros'
        AND r.title IN (
          'The Santa Cruz Radio Observatory (ROSAC): the first radio astronomy facility in Costa Rica',
          'Improving Space Weather Forecasting with GESD: A Generative-Evolutionary Synthetic Data Approach'
        )
      )
      OR (
        a.name = 'Felipe Meza-Obando'
        AND r.title = 'Improving Space Weather Forecasting with GESD: A Generative-Evolutionary Synthetic Data Approach'
      )
      OR (
        a.name = 'Jeaustin Calderón-Quesada'
        AND r.title = 'Improving Space Weather Forecasting with GESD: A Generative-Evolutionary Synthetic Data Approach'
      )
      OR (
        a.name = 'Jorge Ruiz-Murillo'
        AND r.title = 'Improving Space Weather Forecasting with GESD: A Generative-Evolutionary Synthetic Data Approach'
      )
      OR (
        a.name = 'Juan Luis Crespo-Mariño'
        AND r.title = 'Improving Space Weather Forecasting with GESD: A Generative-Evolutionary Synthetic Data Approach'
      )
    )
);

-- Remove alternate author records once they are no longer referenced.

DELETE FROM "research"."research_authors" AS a
WHERE a.name IN (
  'David M. Gale',
  'Carolina Salas-Matamoros',
  'Felipe Meza-Obando',
  'Jeaustin Calderón-Quesada',
  'Jorge Ruiz-Murillo',
  'Juan Luis Crespo-Mariño'
)
AND NOT EXISTS (
  SELECT 1
  FROM "research"."research_cross_authors" AS rca
  WHERE rca.research_author_id = a.id
);
