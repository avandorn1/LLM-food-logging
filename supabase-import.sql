-- Import your local data into Supabase
-- Run this in your Supabase SQL Editor

-- First, let's clear any existing data (optional)
-- DELETE FROM "FoodLog";
-- DELETE FROM "Goal";
-- DELETE FROM "User";

-- Insert your user data
INSERT INTO "User" ("id", "createdAt", "name", "email", "age", "biologicalSex", "height", "weight", "activityLevel") 
VALUES (1, '2025-08-18T15:14:20.880Z', NULL, NULL, 31, 'male', 70, 166, 'lightly active')
ON CONFLICT ("id") DO UPDATE SET
  "createdAt" = EXCLUDED."createdAt",
  "name" = EXCLUDED."name",
  "email" = EXCLUDED."email",
  "age" = EXCLUDED."age",
  "biologicalSex" = EXCLUDED."biologicalSex",
  "height" = EXCLUDED."height",
  "weight" = EXCLUDED."weight",
  "activityLevel" = EXCLUDED."activityLevel";

-- Insert your goal data
INSERT INTO "Goal" ("id", "userId", "targetCalories", "targetProtein", "targetCarbs", "targetFat", "macroSplit", "goalSettings", "createdAt", "updatedAt")
VALUES (1, 1, 2195, 192, 220, 61, 'high-protein', NULL, '2025-08-18T15:27:26.967Z', '2025-08-21T00:37:16.434Z')
ON CONFLICT ("userId") DO UPDATE SET
  "targetCalories" = EXCLUDED."targetCalories",
  "targetProtein" = EXCLUDED."targetProtein",
  "targetCarbs" = EXCLUDED."targetCarbs",
  "targetFat" = EXCLUDED."targetFat",
  "macroSplit" = EXCLUDED."macroSplit",
  "goalSettings" = EXCLUDED."goalSettings",
  "createdAt" = EXCLUDED."createdAt",
  "updatedAt" = EXCLUDED."updatedAt";

-- Insert your food logs (first 10 as example)
INSERT INTO "FoodLog" ("id", "userId", "loggedAt", "day", "item", "mealType", "quantity", "unit", "calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium", "notes", "createdAt")
VALUES 
(13, 1, '2025-08-18T17:00:50.176Z', '2025-08-18T04:00:00.000Z', 'muffin', 'snack', NULL, NULL, 300, 4, 50, 12, NULL, NULL, NULL, NULL, '2025-08-18T17:00:50.176Z'),
(15, 1, '2025-08-18T20:40:51.666Z', '2025-08-18T04:00:00.000Z', 'mushroom pasta', 'lunch', 1, 'bowl', 600, 15, 80, 20, NULL, NULL, NULL, NULL, '2025-08-18T20:40:51.666Z'),
(16, 1, '2025-08-18T20:54:48.847Z', '2025-08-18T04:00:00.000Z', 'protein shake', 'snack', 1, 'shake', 340, 30, 30, 8, NULL, NULL, NULL, NULL, '2025-08-18T20:54:48.847Z'),
(17, 1, '2025-08-18T22:18:13.718Z', '2025-08-18T04:00:00.000Z', 'can of trout', NULL, NULL, NULL, 140, 30, 0, 3, NULL, NULL, NULL, NULL, '2025-08-18T22:18:13.718Z'),
(18, 1, '2025-08-18T22:20:13.718Z', '2025-08-18T04:00:00.000Z', 'apple', 'snack', 1, 'medium', 95, 0, 25, 0, 4, 19, 2, NULL, '2025-08-18T22:20:13.718Z'),
(19, 1, '2025-08-19T12:30:00.000Z', '2025-08-19T04:00:00.000Z', 'chicken salad', 'lunch', 1, 'bowl', 450, 35, 15, 25, 8, 5, 800, NULL, '2025-08-19T12:30:00.000Z'),
(20, 1, '2025-08-19T18:45:00.000Z', '2025-08-19T04:00:00.000Z', 'salmon with rice', 'dinner', 1, 'plate', 650, 45, 60, 25, 6, 2, 600, NULL, '2025-08-19T18:45:00.000Z'),
(21, 1, '2025-08-20T08:15:00.000Z', '2025-08-20T04:00:00.000Z', 'oatmeal with berries', 'breakfast', 1, 'bowl', 320, 12, 55, 8, 8, 20, 150, NULL, '2025-08-20T08:15:00.000Z'),
(22, 1, '2025-08-20T13:00:00.000Z', '2025-08-20T04:00:00.000Z', 'turkey sandwich', 'lunch', 1, 'sandwich', 380, 25, 35, 15, 4, 8, 750, NULL, '2025-08-20T13:00:00.000Z'),
(23, 1, '2025-08-20T19:30:00.000Z', '2025-08-20T04:00:00.000Z', 'grilled vegetables', 'dinner', 1, 'plate', 180, 8, 25, 8, 12, 15, 400, NULL, '2025-08-20T19:30:00.000Z')
ON CONFLICT ("id") DO NOTHING;

-- Check the results
SELECT 'Import completed!' as status;
SELECT COUNT(*) as total_users FROM "User";
SELECT COUNT(*) as total_goals FROM "Goal";
SELECT COUNT(*) as total_food_logs FROM "FoodLog";
