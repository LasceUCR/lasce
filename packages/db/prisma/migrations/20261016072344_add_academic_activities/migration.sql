-- CreateTable
CREATE TABLE "news"."academic_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "photo_alt" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_by" UUID NOT NULL,
    "modified_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "academic_activities_start_date_idx" ON "news"."academic_activities"("start_date");

-- AddForeignKey
ALTER TABLE "news"."academic_activities" ADD CONSTRAINT "academic_activities_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
