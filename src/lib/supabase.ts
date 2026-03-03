import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const NEXT_PUBLIC_SUPABASE_URL="https://azvivzfoyslvzgsuxszp.supabase.co"
const NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="sb_publishable_SuZH4QqZwyqBuJvlNOXopA_Hotc08Mg"

if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
