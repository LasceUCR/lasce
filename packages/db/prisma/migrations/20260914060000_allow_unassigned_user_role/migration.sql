-- Keep VISITOR as the registration default; NULL represents a removed assignment.
ALTER TABLE "auth"."users" ALTER COLUMN "role" DROP NOT NULL;
