-- Nullable shared fields preserve all existing organizations and their translations.
ALTER TABLE "research"."collaborations"
  ADD COLUMN "logo_url" TEXT,
  ADD COLUMN "website_url" TEXT;
