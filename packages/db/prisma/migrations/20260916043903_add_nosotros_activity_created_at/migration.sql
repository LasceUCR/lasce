-- AlterTable
ALTER TABLE "nosotros_activities" ADD COLUMN     "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
