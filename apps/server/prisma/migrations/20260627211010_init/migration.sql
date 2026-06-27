-- CreateTable
CREATE TABLE "foods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "calories_per_serving" INTEGER NOT NULL,
    "unit_label" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "intake_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "food_id" TEXT,
    "name" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "meal_type" TEXT NOT NULL,
    "consumed_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "intake_records_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "calorie_goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "daily_target" INTEGER NOT NULL,
    "effective_from" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "intake_records_consumed_at_idx" ON "intake_records"("consumed_at");

-- CreateIndex
CREATE INDEX "intake_records_food_id_idx" ON "intake_records"("food_id");

-- CreateIndex
CREATE INDEX "calorie_goals_effective_from_idx" ON "calorie_goals"("effective_from");
