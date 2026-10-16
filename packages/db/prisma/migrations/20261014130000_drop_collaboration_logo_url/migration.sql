-- Logo uploads are deferred; remove the unused URL placeholder.
-- Keep the earlier migration intact because it has already been applied.
ALTER TABLE "research"."collaborations" DROP COLUMN "logo_url";
