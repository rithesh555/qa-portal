-- AlterTable
ALTER TABLE "run_cases" ADD COLUMN     "result_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "release_report_snapshots" (
    "release_id" UUID NOT NULL,
    "report" JSONB NOT NULL,
    "taken_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taken_by_id" TEXT NOT NULL,

    CONSTRAINT "release_report_snapshots_pkey" PRIMARY KEY ("release_id")
);

-- CreateIndex
CREATE INDEX "release_report_snapshots_taken_by_id_idx" ON "release_report_snapshots"("taken_by_id");

-- CreateIndex
CREATE INDEX "defects_project_id_found_in_release_id_status_idx" ON "defects"("project_id", "found_in_release_id", "status");

-- CreateIndex
CREATE INDEX "run_cases_case_id_result_at_idx" ON "run_cases"("case_id", "result_at" DESC);

-- AddForeignKey
ALTER TABLE "release_report_snapshots" ADD CONSTRAINT "release_report_snapshots_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_report_snapshots" ADD CONSTRAINT "release_report_snapshots_taken_by_id_fkey" FOREIGN KEY ("taken_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: each tested run case's latest result time.
UPDATE "run_cases" rc
SET "result_at" = COALESCE(
  (SELECT max(tr."recorded_at") FROM "test_results" tr WHERE tr."run_case_id" = rc."id"),
  rc."updated_at"
)
WHERE rc."status" <> 'untested';

-- A run case has a result time exactly when it has a result.
ALTER TABLE "run_cases" ADD CONSTRAINT "run_cases_result_at_consistent"
  CHECK (("status" = 'untested') = ("result_at" IS NULL));
