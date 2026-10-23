-- "Not deactivated" filters (NOT banned) silently dropped rows where banned
-- was NULL. Treat unknown as active, then never allow NULL again.
UPDATE "users" SET "banned" = false WHERE "banned" IS NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "banned" SET NOT NULL;
