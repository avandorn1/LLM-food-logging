-- Fix the auto-increment sequence for FoodLog table
-- This will set the next ID to be higher than the highest existing ID

-- Get the highest ID from FoodLog table and set the sequence
SELECT setval('"FoodLog_id_seq"', (SELECT COALESCE(MAX(id), 0) + 1 FROM "FoodLog"));

-- Verify the sequence is set correctly
SELECT currval('"FoodLog_id_seq"') as current_sequence_value;
SELECT MAX(id) as max_food_log_id FROM "FoodLog";

