import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
  // 1. Only allow POST requests.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 2. Connect to Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 3. Get the new participant's data from the request.
    // The frontend will send us a JSON string, e.g., {"name":"Test", "month":"December"}
    const { name, month } = JSON.parse(event.body);

    // 4. Validate the data
    if (!name || !month) {
      return { statusCode: 400, body: 'Name and month are required.' };
    }

    // 5. Insert the new row into the "participants" table
    const { data, error } = await supabase
      .from('participants')
      .insert([
        { name: name, draw_month: month }
      ])
      .select() // This '.select()' makes Supabase return the new row we just added
      .single(); // We only added one, so get a single object back

    if (error) {
      throw error;
    }

    // 6. Success! Send the newly created participant back to the frontend.
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}