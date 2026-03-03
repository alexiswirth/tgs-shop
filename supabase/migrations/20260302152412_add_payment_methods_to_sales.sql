/*
  # Add Payment Method and Cash Handling to Sales

  1. Modified Tables
    - `sales` - Add payment tracking columns
      - `payment_method` (text) - 'cash', 'credit_card', 'debit_card', 'other'
      - `cash_given` (numeric) - Amount of cash provided by customer
      - `change_amount` (numeric) - Amount of change to return to customer

  2. Data Integrity
    - Payment method defaults to 'cash'
    - cash_given and change_amount default to 0
    - Allows NULL values for non-cash transactions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE sales ADD COLUMN payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'other'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'cash_given'
  ) THEN
    ALTER TABLE sales ADD COLUMN cash_given numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'change_amount'
  ) THEN
    ALTER TABLE sales ADD COLUMN change_amount numeric DEFAULT 0;
  END IF;
END $$;
