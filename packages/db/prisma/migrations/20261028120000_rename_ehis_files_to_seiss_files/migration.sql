-- The EHIS catalogue becomes the catalogue of every SEISS product the seiss-pipeline ingests.
-- Renamed rather than recreated, so days already ingested are not fetched again.

-- RenameTable
ALTER TABLE "solar"."ehis_files" RENAME TO "seiss_files";

-- RenamePrimaryKey
ALTER TABLE "solar"."seiss_files" RENAME CONSTRAINT "ehis_files_pkey" TO "seiss_files_pkey";

-- RenameIndex
ALTER INDEX "solar"."ehis_files_file_name_key" RENAME TO "seiss_files_file_name_key";

-- RenameIndex
ALTER INDEX "solar"."ehis_files_satellite_product_day_key" RENAME TO "seiss_files_satellite_product_day_key";
