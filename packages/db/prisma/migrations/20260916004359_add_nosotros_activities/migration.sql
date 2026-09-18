-- CreateEnum
CREATE TYPE "nosotros_activity_icon" AS ENUM ('sun', 'waves', 'satellite', 'code', 'collaboration', 'education');

-- AlterTable
ALTER TABLE "news"."news_records" ALTER COLUMN "image_alt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "nosotros_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "icon" "nosotros_activity_icon" NOT NULL,
    "title" TEXT NOT NULL,
    "paragraph" TEXT NOT NULL,
    "modified_by" UUID NOT NULL,
    "modified_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nosotros_activities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "nosotros_activities" ADD CONSTRAINT "nosotros_activities_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
