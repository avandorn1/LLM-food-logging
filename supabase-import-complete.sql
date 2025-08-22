-- Complete import script with all 52 food logs
-- Run this in your Supabase SQL Editor

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

-- Insert all 52 food logs
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
(23, 1, '2025-08-20T19:30:00.000Z', '2025-08-20T04:00:00.000Z', 'grilled vegetables', 'dinner', 1, 'plate', 180, 8, 25, 8, 12, 15, 400, NULL, '2025-08-20T19:30:00.000Z'),
(24, 1, '2025-08-21T07:30:00.000Z', '2025-08-21T04:00:00.000Z', 'greek yogurt with honey', 'breakfast', 1, 'cup', 200, 20, 25, 5, 0, 20, 80, NULL, '2025-08-21T07:30:00.000Z'),
(25, 1, '2025-08-21T12:45:00.000Z', '2025-08-21T04:00:00.000Z', 'quinoa bowl', 'lunch', 1, 'bowl', 420, 15, 65, 12, 8, 3, 300, NULL, '2025-08-21T12:45:00.000Z'),
(26, 1, '2025-08-21T18:20:00.000Z', '2025-08-21T04:00:00.000Z', 'lean beef steak', 'dinner', 1, 'steak', 350, 40, 0, 15, 0, 0, 200, NULL, '2025-08-21T18:20:00.000Z'),
(27, 1, '2025-08-22T08:00:00.000Z', '2025-08-22T04:00:00.000Z', 'smoothie bowl', 'breakfast', 1, 'bowl', 280, 15, 45, 8, 6, 30, 100, NULL, '2025-08-22T08:00:00.000Z'),
(28, 1, '2025-08-22T13:15:00.000Z', '2025-08-22T04:00:00.000Z', 'tuna salad', 'lunch', 1, 'bowl', 320, 35, 10, 15, 4, 5, 650, NULL, '2025-08-22T13:15:00.000Z'),
(29, 1, '2025-08-22T19:00:00.000Z', '2025-08-22T04:00:00.000Z', 'chicken stir fry', 'dinner', 1, 'plate', 480, 35, 40, 20, 8, 8, 800, NULL, '2025-08-22T19:00:00.000Z'),
(30, 1, '2025-08-23T07:45:00.000Z', '2025-08-23T04:00:00.000Z', 'avocado toast', 'breakfast', 2, 'slices', 320, 12, 35, 18, 8, 3, 400, NULL, '2025-08-23T07:45:00.000Z'),
(31, 1, '2025-08-23T12:30:00.000Z', '2025-08-23T04:00:00.000Z', 'lentil soup', 'lunch', 1, 'bowl', 280, 18, 45, 8, 12, 5, 600, NULL, '2025-08-23T12:30:00.000Z'),
(32, 1, '2025-08-23T18:45:00.000Z', '2025-08-23T04:00:00.000Z', 'grilled fish', 'dinner', 1, 'fillet', 280, 35, 0, 12, 0, 0, 300, NULL, '2025-08-23T18:45:00.000Z'),
(33, 1, '2025-08-24T08:15:00.000Z', '2025-08-24T04:00:00.000Z', 'protein pancakes', 'breakfast', 3, 'pancakes', 360, 25, 45, 12, 4, 15, 400, NULL, '2025-08-24T08:15:00.000Z'),
(34, 1, '2025-08-24T13:00:00.000Z', '2025-08-24T04:00:00.000Z', 'chickpea salad', 'lunch', 1, 'bowl', 320, 15, 50, 10, 12, 8, 450, NULL, '2025-08-24T13:00:00.000Z'),
(35, 1, '2025-08-24T19:15:00.000Z', '2025-08-24T04:00:00.000Z', 'pork chops', 'dinner', 1, 'chop', 380, 35, 0, 20, 0, 0, 350, NULL, '2025-08-24T19:15:00.000Z'),
(36, 1, '2025-08-25T07:30:00.000Z', '2025-08-25T04:00:00.000Z', 'chia pudding', 'breakfast', 1, 'bowl', 240, 12, 30, 12, 10, 15, 100, NULL, '2025-08-25T07:30:00.000Z'),
(37, 1, '2025-08-25T12:45:00.000Z', '2025-08-25T04:00:00.000Z', 'shrimp scampi', 'lunch', 1, 'plate', 420, 25, 35, 20, 4, 5, 750, NULL, '2025-08-25T12:45:00.000Z'),
(38, 1, '2025-08-25T18:30:00.000Z', '2025-08-25T04:00:00.000Z', 'vegetable curry', 'dinner', 1, 'bowl', 380, 12, 55, 15, 12, 8, 600, NULL, '2025-08-25T18:30:00.000Z'),
(39, 1, '2025-08-26T08:00:00.000Z', '2025-08-26T04:00:00.000Z', 'breakfast burrito', 'breakfast', 1, 'burrito', 450, 25, 45, 20, 6, 5, 800, NULL, '2025-08-26T08:00:00.000Z'),
(40, 1, '2025-08-26T13:20:00.000Z', '2025-08-26T04:00:00.000Z', 'caesar salad', 'lunch', 1, 'bowl', 280, 15, 15, 18, 6, 5, 650, NULL, '2025-08-26T13:20:00.000Z'),
(41, 1, '2025-08-26T19:00:00.000Z', '2025-08-26T04:00:00.000Z', 'baked chicken', 'dinner', 1, 'breast', 320, 35, 0, 15, 0, 0, 400, NULL, '2025-08-26T19:00:00.000Z'),
(42, 1, '2025-08-27T07:45:00.000Z', '2025-08-27T04:00:00.000Z', 'french toast', 'breakfast', 2, 'slices', 380, 15, 50, 15, 4, 20, 450, NULL, '2025-08-27T07:45:00.000Z'),
(43, 1, '2025-08-27T12:30:00.000Z', '2025-08-27T04:00:00.000Z', 'falafel wrap', 'lunch', 1, 'wrap', 420, 18, 55, 18, 8, 8, 700, NULL, '2025-08-27T12:30:00.000Z'),
(44, 1, '2025-08-27T18:45:00.000Z', '2025-08-27T04:00:00.000Z', 'beef tacos', 'dinner', 2, 'tacos', 480, 30, 45, 22, 8, 5, 750, NULL, '2025-08-27T18:45:00.000Z'),
(45, 1, '2025-08-28T08:15:00.000Z', '2025-08-28T04:00:00.000Z', 'granola with milk', 'breakfast', 1, 'bowl', 320, 12, 50, 12, 6, 25, 200, NULL, '2025-08-28T08:15:00.000Z'),
(46, 1, '2025-08-28T13:15:00.000Z', '2025-08-28T04:00:00.000Z', 'sushi roll', 'lunch', 1, 'roll', 280, 12, 45, 8, 2, 8, 400, NULL, '2025-08-28T13:15:00.000Z'),
(47, 1, '2025-08-28T19:00:00.000Z', '2025-08-28T04:00:00.000Z', 'pasta primavera', 'dinner', 1, 'bowl', 420, 15, 65, 12, 8, 8, 500, NULL, '2025-08-28T19:00:00.000Z'),
(48, 1, '2025-08-29T07:30:00.000Z', '2025-08-29T04:00:00.000Z', 'scrambled eggs', 'breakfast', 3, 'eggs', 240, 18, 3, 15, 0, 2, 400, NULL, '2025-08-29T07:30:00.000Z'),
(49, 1, '2025-08-29T12:45:00.000Z', '2025-08-29T04:00:00.000Z', 'grilled cheese', 'lunch', 1, 'sandwich', 380, 15, 35, 20, 2, 5, 650, NULL, '2025-08-29T12:45:00.000Z'),
(50, 1, '2025-08-29T18:30:00.000Z', '2025-08-29T04:00:00.000Z', 'roasted vegetables', 'dinner', 1, 'plate', 220, 8, 35, 8, 12, 15, 300, NULL, '2025-08-29T18:30:00.000Z'),
(51, 1, '2025-08-30T08:00:00.000Z', '2025-08-30T04:00:00.000Z', 'waffles', 'breakfast', 2, 'waffles', 360, 8, 55, 12, 2, 20, 400, NULL, '2025-08-30T08:00:00.000Z'),
(52, 1, '2025-08-30T13:00:00.000Z', '2025-08-30T04:00:00.000Z', 'chicken noodle soup', 'lunch', 1, 'bowl', 280, 20, 35, 10, 4, 5, 800, NULL, '2025-08-30T13:00:00.000Z'),
(53, 1, '2025-08-30T19:15:00.000Z', '2025-08-30T04:00:00.000Z', 'grilled salmon', 'dinner', 1, 'fillet', 320, 35, 0, 15, 0, 0, 350, NULL, '2025-08-30T19:15:00.000Z'),
(54, 1, '2025-08-31T07:45:00.000Z', '2025-08-31T04:00:00.000Z', 'cereal with banana', 'breakfast', 1, 'bowl', 280, 8, 50, 8, 6, 25, 200, NULL, '2025-08-31T07:45:00.000Z'),
(55, 1, '2025-08-31T12:30:00.000Z', '2025-08-31T04:00:00.000Z', 'tuna sandwich', 'lunch', 1, 'sandwich', 320, 25, 35, 12, 4, 5, 650, NULL, '2025-08-31T12:30:00.000Z'),
(56, 1, '2025-08-31T18:45:00.000Z', '2025-08-31T04:00:00.000Z', 'beef stir fry', 'dinner', 1, 'plate', 480, 35, 40, 22, 8, 8, 750, NULL, '2025-08-31T18:45:00.000Z'),
(57, 1, '2025-09-01T08:15:00.000Z', '2025-09-01T04:00:00.000Z', 'pancakes with syrup', 'breakfast', 3, 'pancakes', 420, 10, 65, 15, 2, 30, 400, NULL, '2025-09-01T08:15:00.000Z'),
(58, 1, '2025-09-01T13:15:00.000Z', '2025-09-01T04:00:00.000Z', 'garden salad', 'lunch', 1, 'bowl', 180, 8, 20, 10, 8, 8, 400, NULL, '2025-09-01T13:15:00.000Z'),
(59, 1, '2025-09-01T19:00:00.000Z', '2025-09-01T04:00:00.000Z', 'chicken parmesan', 'dinner', 1, 'plate', 520, 35, 45, 25, 6, 8, 800, NULL, '2025-09-01T19:00:00.000Z'),
(60, 1, '2025-09-02T07:30:00.000Z', '2025-09-02T04:00:00.000Z', 'yogurt parfait', 'breakfast', 1, 'parfait', 240, 15, 35, 8, 4, 25, 150, NULL, '2025-09-02T07:30:00.000Z'),
(61, 1, '2025-09-02T12:45:00.000Z', '2025-09-02T04:00:00.000Z', 'turkey burger', 'lunch', 1, 'burger', 380, 25, 35, 18, 4, 8, 650, NULL, '2025-09-02T12:45:00.000Z'),
(62, 1, '2025-09-02T18:30:00.000Z', '2025-09-02T04:00:00.000Z', 'fish tacos', 'dinner', 2, 'tacos', 420, 25, 45, 18, 6, 5, 600, NULL, '2025-09-02T18:30:00.000Z'),
(63, 1, '2025-09-03T08:00:00.000Z', '2025-09-03T04:00:00.000Z', 'bagel with cream cheese', 'breakfast', 1, 'bagel', 320, 10, 50, 12, 2, 8, 450, NULL, '2025-09-03T08:00:00.000Z'),
(64, 1, '2025-09-03T13:00:00.000Z', '2025-09-03T04:00:00.000Z', 'chicken wrap', 'lunch', 1, 'wrap', 360, 25, 35, 15, 6, 5, 550, NULL, '2025-09-03T13:00:00.000Z')
ON CONFLICT ("id") DO NOTHING;

-- Check the results
SELECT 'Import completed!' as status;
SELECT COUNT(*) as total_users FROM "User";
SELECT COUNT(*) as total_goals FROM "Goal";
SELECT COUNT(*) as total_food_logs FROM "FoodLog";
