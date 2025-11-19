import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
  // 1. Get the secret keys from the environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  // 2. Create the Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 3. Fetch all rows from the "participants" table
    const { data, error } = await supabase
      .from('participants')
      .select('*');

    // Handle any errors
    if (error) {
      throw error;
    }

    // 4. Success! Send the data back as JSON
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };

  } catch (error) {
    // 5. Handle any errors
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}