/*
  # Add category column to items table

  1. Modified Tables
    - `items` - Add category column for organizing items by category
      - `category` (text) - Category name
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'category'
  ) THEN
    ALTER TABLE items ADD COLUMN category text DEFAULT 'General';
  END IF;
END $$;
