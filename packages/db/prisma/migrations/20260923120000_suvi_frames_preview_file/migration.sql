-- AlterTable
ALTER TABLE "solar"."suvi_frames"
DROP COLUMN "block_file",
DROP COLUMN "block_offset",
DROP COLUMN "block_size",
DROP COLUMN "is_keyframe",
ADD COLUMN "preview_file" TEXT;
