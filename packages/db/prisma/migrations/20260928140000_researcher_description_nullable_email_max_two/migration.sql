-- `description` is optional again for every researcher, ROSAC and Nosotros
-- alike — an admin can leave it blank in the edit form.
ALTER TABLE "researchers" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "nosotros_researchers" ALTER COLUMN "description" DROP NOT NULL;

-- Caps `email` at 2 addresses. Prisma's schema language has no array-length
-- attribute, so this is enforced with a plain CHECK constraint instead.
ALTER TABLE "researchers"
  ADD CONSTRAINT "researchers_email_max_two" CHECK (array_length("email", 1) IS NULL OR array_length("email", 1) <= 2);
ALTER TABLE "nosotros_researchers"
  ADD CONSTRAINT "nosotros_researchers_email_max_two" CHECK (array_length("email", 1) IS NULL OR array_length("email", 1) <= 2);
