/*
  # Create item-images storage bucket

  1. New Storage
    - `item-images` bucket for storing product images
  
  2. Security
    - Enable public read access for images
    - Allow public uploads (for demo purposes)
    - Enable RLS on bucket
*/

INSERT INTO storage.buckets (id, name, public) 
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read item images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'item-images');

CREATE POLICY "Public can upload item images"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'item-images');

CREATE POLICY "Public can update item images"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'item-images')
  WITH CHECK (bucket_id = 'item-images');

CREATE POLICY "Public can delete item images"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'item-images');