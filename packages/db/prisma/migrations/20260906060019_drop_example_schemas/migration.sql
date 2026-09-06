/*
  Warnings:

  - You are about to drop the `daily_rollups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `devices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `file_artifacts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `job_runs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "daily_rollups" DROP CONSTRAINT "daily_rollups_device_id_fkey";

-- DropTable
DROP TABLE "daily_rollups";

-- DropTable
DROP TABLE "devices";

-- DropTable
DROP TABLE "file_artifacts";

-- DropTable
DROP TABLE "job_runs";

-- DropEnum
DROP TYPE "file_artifact_status";

-- DropEnum
DROP TYPE "job_status";
