-- Create User table
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "email" TEXT UNIQUE,
    "age" INTEGER,
    "biologicalSex" TEXT,
    "height" INTEGER,
    "weight" INTEGER,
    "activityLevel" TEXT
);

-- Create Goal table
CREATE TABLE "Goal" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL UNIQUE,
    "targetCalories" INTEGER,
    "targetProtein" INTEGER,
    "targetCarbs" INTEGER,
    "targetFat" INTEGER,
    "macroSplit" TEXT,
    "goalSettings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create FoodLog table
CREATE TABLE "FoodLog" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "day" TIMESTAMP(3) NOT NULL,
    "item" TEXT NOT NULL,
    "mealType" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "calories" INTEGER,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX "FoodLog_userId_day_idx" ON "FoodLog"("userId", "day");

-- Insert default user
INSERT INTO "User" ("id", "name") VALUES (1, 'Default User');
