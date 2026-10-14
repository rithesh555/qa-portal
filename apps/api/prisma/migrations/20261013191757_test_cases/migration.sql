-- CreateEnum
CREATE TYPE "case_priority" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "case_type" AS ENUM ('functional', 'security', 'performance', 'usability', 'other');

-- CreateEnum
CREATE TYPE "case_status" AS ENUM ('draft', 'ready');

-- CreateTable
CREATE TABLE "project_counters" (
    "project_id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_counters_pkey" PRIMARY KEY ("project_id","scope")
);

-- CreateTable
CREATE TABLE "suites" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "import_batch_id" UUID,
    "created_by_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "suites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "suite_id" UUID,
    "title" TEXT NOT NULL,
    "preconditions" TEXT NOT NULL DEFAULT '',
    "steps" JSONB NOT NULL,
    "priority" "case_priority" NOT NULL,
    "type" "case_type" NOT NULL,
    "status" "case_status" NOT NULL DEFAULT 'draft',
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "references" TEXT NOT NULL DEFAULT '',
    "archived_at" TIMESTAMPTZ(3),
    "archive_reason" TEXT NOT NULL DEFAULT '',
    "archived_suite_id" UUID,
    "import_batch_id" UUID,
    "duplicated_from_id" UUID,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" TEXT NOT NULL,
    "updated_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "case_count" INTEGER NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suites_project_id_archived_at_idx" ON "suites"("project_id", "archived_at");

-- CreateIndex
CREATE INDEX "suites_parent_id_idx" ON "suites"("parent_id");

-- CreateIndex
CREATE INDEX "suites_import_batch_id_idx" ON "suites"("import_batch_id");

-- CreateIndex
CREATE INDEX "suites_created_by_id_idx" ON "suites"("created_by_id");

-- CreateIndex
CREATE INDEX "test_cases_project_id_archived_at_suite_id_idx" ON "test_cases"("project_id", "archived_at", "suite_id");

-- CreateIndex
CREATE INDEX "test_cases_project_id_updated_at_idx" ON "test_cases"("project_id", "updated_at");

-- CreateIndex
CREATE INDEX "test_cases_suite_id_idx" ON "test_cases"("suite_id");

-- CreateIndex
CREATE INDEX "test_cases_archived_suite_id_idx" ON "test_cases"("archived_suite_id");

-- CreateIndex
CREATE INDEX "test_cases_import_batch_id_idx" ON "test_cases"("import_batch_id");

-- CreateIndex
CREATE INDEX "test_cases_duplicated_from_id_idx" ON "test_cases"("duplicated_from_id");

-- CreateIndex
CREATE INDEX "test_cases_created_by_id_idx" ON "test_cases"("created_by_id");

-- CreateIndex
CREATE INDEX "test_cases_updated_by_id_idx" ON "test_cases"("updated_by_id");

-- CreateIndex
CREATE INDEX "test_cases_labels_idx" ON "test_cases" USING GIN ("labels");

-- CreateIndex
CREATE UNIQUE INDEX "test_cases_project_id_number_key" ON "test_cases"("project_id", "number");

-- CreateIndex
CREATE INDEX "import_batches_created_by_id_idx" ON "import_batches"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "import_batches_project_id_number_key" ON "import_batches"("project_id", "number");

-- AddForeignKey
ALTER TABLE "project_counters" ADD CONSTRAINT "project_counters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suites" ADD CONSTRAINT "suites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suites" ADD CONSTRAINT "suites_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "suites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suites" ADD CONSTRAINT "suites_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suites" ADD CONSTRAINT "suites_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_suite_id_fkey" FOREIGN KEY ("suite_id") REFERENCES "suites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_archived_suite_id_fkey" FOREIGN KEY ("archived_suite_id") REFERENCES "suites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_duplicated_from_id_fkey" FOREIGN KEY ("duplicated_from_id") REFERENCES "test_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written guards (not expressible in the Prisma schema).
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_number_positive" CHECK ("number" > 0);
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_steps_array" CHECK (jsonb_typeof("steps") = 'array');
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_number_positive" CHECK ("number" > 0);
ALTER TABLE "suites" ADD CONSTRAINT "suites_not_own_parent" CHECK ("parent_id" IS NULL OR "parent_id" <> "id");
