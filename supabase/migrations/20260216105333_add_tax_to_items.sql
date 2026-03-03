/*
  # Add tax field to items table

  1. Changes
    - Add `tax` column to items table to store tax information
    - Column is numeric(10, 2) to store tax values with 2 decimal places
    - Default value is 0
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'tax'
  ) THEN
    ALTER TABLE items ADD COLUMN tax numeric(10, 2) DEFAULT 0;
  END IF;
END $$;