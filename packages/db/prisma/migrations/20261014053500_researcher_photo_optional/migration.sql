-- The profile photo is optional for every researcher, ROSAC and Nosotros alike: an admin can
-- create or edit a researcher without one. `NULL` means the researcher has no photo.
ALTER TABLE "researchers" ALTER COLUMN "photo_url" DROP NOT NULL;
ALTER TABLE "nosotros_researchers" ALTER COLUMN "photo_url" DROP NOT NULL;
