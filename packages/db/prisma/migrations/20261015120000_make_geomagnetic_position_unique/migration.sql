-- DropIndex
DROP INDEX "geomagnetic_indices_position_idx";

-- AlterTable
CREATE SEQUENCE geomagnetic_indices_position_seq;
ALTER TABLE "geomagnetic_indices" ALTER COLUMN "position" SET DEFAULT nextval('geomagnetic_indices_position_seq');
ALTER SEQUENCE geomagnetic_indices_position_seq OWNED BY "geomagnetic_indices"."position";

-- CreateIndex
CREATE UNIQUE INDEX "geomagnetic_indices_position_key" ON "geomagnetic_indices"("position");

-- The seeded indices already hold positions 0 to 3: start the sequence after the highest one, so
-- a row inserted without a position lands last instead of colliding with an existing one.
SELECT setval(
  'geomagnetic_indices_position_seq',
  COALESCE((SELECT MAX("position") FROM "geomagnetic_indices") + 1, 0),
  false
);
