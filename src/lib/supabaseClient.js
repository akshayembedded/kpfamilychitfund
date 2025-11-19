import { createClient } from '@supabase/supabase-js';

// Get the variables from Astro's .env system
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// Create and export the one-and-only Supabase client for our frontend
export const supabase = createClient(supabaseUrl, supabaseKey);