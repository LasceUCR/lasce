-- CreateTable
CREATE TABLE "solar"."exis_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "satellite" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "file_name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_modified_at" TIMESTAMPTZ(3),
    "first_observed_at" TIMESTAMPTZ(3),
    "last_observed_at" TIMESTAMPTZ(3),
    "point_count" JSONB NOT NULL,
    "attributes" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exis_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exis_files_file_name_key" ON "solar"."exis_files"("file_name");

-- CreateIndex
CREATE UNIQUE INDEX "exis_files_satellite_product_day_key" ON "solar"."exis_files"("satellite", "product", "day");

