/*
  # Create discount_items and discount_categories tables

  1. New Tables
    - `discount_items` - Links discounts to specific items
      - `id` (uuid, primary key) - Unique identifier
      - `discount_id` (uuid, foreign key) - References discounts table
      - `item_id` (uuid, foreign key) - References items table
      - `created_at` (timestamptz) - Creation timestamp
    
    - `discount_categories` - Links discounts to item categories
      - `id` (uuid, primary key) - Unique identifier
      - `discount_id` (uuid, foreign key) - References discounts table
      - `category` (text, required) - Category name
      - `created_at` (timestamptz) - Creation timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create discount_items table
CREATE TABLE IF NOT EXISTS discount_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(discount_id, item_id)
);

-- Create discount_categories table
CREATE TABLE IF NOT EXISTS discount_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id uuid NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(discount_id, category)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_discount_items_discount_id ON discount_items(discount_id);
CREATE INDEX IF NOT EXISTS idx_discount_items_item_id ON discount_items(item_id);
CREATE INDEX IF NOT EXISTS idx_discount_categories_discount_id ON discount_categories(discount_id);
CREATE INDEX IF NOT EXISTS idx_discount_categories_category ON discount_categories(category);

-- Enable RLS
ALTER TABLE discount_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for discount_items
CREATE POLICY "Anyone can view discount items"
  ON discount_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can create discount items"
  ON discount_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can delete discount items"
  ON discount_items FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for discount_categories
CREATE POLICY "Anyone can view discount categories"
  ON discount_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can create discount categories"
  ON discount_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can delete discount categories"
  ON discount_categories FOR DELETE
  TO authenticated
  USING (true);
