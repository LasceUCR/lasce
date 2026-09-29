-- Widen `email` from a single optional address to zero-or-more, so a
-- researcher with several public addresses (e.g. an institutional and a
-- personal one) can have all of them, each rendered as its own `mailto:` link.
ALTER TABLE "researchers"
  ALTER COLUMN "email" DROP DEFAULT,
  ALTER COLUMN "email" TYPE TEXT[] USING (
    CASE WHEN "email" IS NULL THEN ARRAY[]::TEXT[] ELSE ARRAY["email"] END
  ),
  ALTER COLUMN "email" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "email" SET NOT NULL;

ALTER TABLE "nosotros_researchers"
  ALTER COLUMN "email" DROP DEFAULT,
  ALTER COLUMN "email" TYPE TEXT[] USING (
    CASE WHEN "email" IS NULL THEN ARRAY[]::TEXT[] ELSE ARRAY["email"] END
  ),
  ALTER COLUMN "email" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "email" SET NOT NULL;
