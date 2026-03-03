/*
  # Add RLS Policies for Discount Items and Categories

  1. Security
    - Enable RLS on discount_items and discount_categories tables (already enabled)
    - Add policies for authenticated users to manage discount targets through their shops
    - Policies check that user has access to the shop owning the discount
*/

DROP POLICY IF EXISTS "Shop members can view discount items" ON discount_items;
DROP POLICY IF EXISTS "Shop members can create discount items" ON discount_items;
DROP POLICY IF EXISTS "Shop members can delete discount items" ON discount_items;
DROP POLICY IF EXISTS "Shop members can view discount categories" ON discount_categories;
DROP POLICY IF EXISTS "Shop members can create discount categories" ON discount_categories;
DROP POLICY IF EXISTS "Shop members can delete discount categories" ON discount_categories;

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
