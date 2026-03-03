/*
  # Add applies_to column to discounts table

  1. Modified Tables
    - `discounts` - Add applies_to column to track whether discount applies to all, specific items, or specific categories
      - `applies_to` (text) - Values: 'all', 'item', or 'category'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discounts' AND column_name = 'applies_to'
  ) THEN
    ALTER TABLE discounts ADD COLUMN applies_to text DEFAULT 'all';
  END IF;
END $$;
