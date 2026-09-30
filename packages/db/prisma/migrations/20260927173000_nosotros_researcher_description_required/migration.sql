-- `description` is now required for every researcher, ROSAC and Nosotros
-- alike — matches `researchers.description`, which was never nullable.
-- Backfill any existing NULL first so the NOT NULL constraint can apply.
UPDATE "nosotros_researchers" SET "description" = 'Información pendiente.' WHERE "description" IS NULL;

ALTER TABLE "nosotros_researchers" ALTER COLUMN "description" SET NOT NULL;
