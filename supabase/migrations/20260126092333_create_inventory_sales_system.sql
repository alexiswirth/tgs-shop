/*
  # Inventory and Sales Management System

  ## Overview
  Complete e-commerce inventory and sales management system with shops, items, 
  discounts, and comprehensive sales tracking with reporting capabilities.

  ## New Tables
  
  ### 1. shops
  Stores shop/store information
  - `id` (uuid, primary key) - Unique shop identifier
  - `name` (text, required) - Shop name
  - `description` (text) - Shop description
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 2. items
  Stores product/inventory items
  - `id` (uuid, primary key) - Unique item identifier
  - `shop_id` (uuid, foreign key) - References shops table
  - `name` (text, required) - Item name
  - `description` (text) - Item description
  - `buying_price` (numeric, required) - Cost/purchase price
  - `selling_price` (numeric, required) - Retail/selling price
  - `quantity` (integer, default 0) - Current stock quantity
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 3. discounts
  Stores discount configurations
  - `id` (uuid, primary key) - Unique discount identifier
  - `shop_id` (uuid, foreign key) - References shops table
  - `name` (text, required) - Discount name
  - `discount_type` (text, required) - Type: 'percentage' or 'fixed'
  - `discount_value` (numeric, required) - Discount amount or percentage
  - `is_active` (boolean, default true) - Active status
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 4. sales
  Stores sale transactions
  - `id` (uuid, primary key) - Unique sale identifier
  - `shop_id` (uuid, foreign key) - References shops table
  - `total_amount` (numeric, required) - Total before discount
  - `discount_id` (uuid, nullable, foreign key) - Applied discount
  - `discount_amount` (numeric, default 0) - Discount amount applied
  - `final_amount` (numeric, required) - Final amount after discount
  - `sale_date` (timestamptz, default now()) - Sale timestamp
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 5. sale_items
  Stores line items for each sale
  - `id` (uuid, primary key) - Unique line item identifier
  - `sale_id` (uuid, foreign key) - References sales table
  - `item_id` (uuid, foreign key) - References items table
  - `item_name` (text, required) - Item name snapshot
  - `quantity` (integer, required) - Quantity sold
  - `unit_price` (numeric, required) - Price per unit at sale time
  - `subtotal` (numeric, required) - Line item total

  ## Security
  - RLS enabled on all tables
  - Public access for reading (for demo purposes)
  - Public access for insert/update/delete (for demo purposes)
  
  ## Notes
  1. All monetary values use numeric type for precision
  2. Item quantities are tracked and should be decremented on sales
  3. Sale items store snapshots to preserve historical data
  4. Discounts can be percentage-based or fixed amount
  5. All tables include proper timestamps for auditing
*/

-- Create shops table
CREATE TABLE IF NOT EXISTS shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  buying_price numeric(10, 2) NOT NULL,
  selling_price numeric(10, 2) NOT NULL,
  quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create discounts table
CREATE TABLE IF NOT EXISTS discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric(10, 2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  total_amount numeric(10, 2) NOT NULL,
  discount_id uuid REFERENCES discounts(id) ON DELETE SET NULL,
  discount_amount numeric(10, 2) DEFAULT 0,
  final_amount numeric(10, 2) NOT NULL,
  sale_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  paidBy text NOT NULL
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  item_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(10, 2) NOT NULL,
  subtotal numeric(10, 2) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_shop_id ON items(shop_id);
CREATE INDEX IF NOT EXISTS idx_discounts_shop_id ON discounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_shop_id ON sales(shop_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);

-- Enable RLS
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for demo - adjust for production)
CREATE POLICY "Public can view shops"
  ON shops FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert shops"
  ON shops FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update shops"
  ON shops FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete shops"
  ON shops FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Public can view items"
  ON items FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert items"
  ON items FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update items"
  ON items FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete items"
  ON items FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Public can view discounts"
  ON discounts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert discounts"
  ON discounts FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update discounts"
  ON discounts FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete discounts"
  ON discounts FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Public can view sales"
  ON sales FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert sales"
  ON sales FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can view sale_items"
  ON sale_items FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert sale_items"
  ON sale_items FOR INSERT
  TO public
  WITH CHECK (true);