-- DropIndex
DROP INDEX "activity_log_project_id_created_at_idx";

-- AlterTable
ALTER TABLE "activity_log" ADD COLUMN     "in_feed" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "activity_log_project_id_in_feed_created_at_idx" ON "activity_log"("project_id", "in_feed", "created_at" DESC);

-- Per-case entries written by bulk changes, imports and suite archiving
-- (flagged in their changes) leave the project feed.
UPDATE "activity_log" SET "in_feed" = false
WHERE "entity_type" = 'case' AND coalesce("changes"->>'bulk', '') = 'true';
