import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
  // 1. Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 2. Connect to Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 3. Get the winner's data from the frontend
    const { winnerId, winnerName, drawMonth } = JSON.parse(event.body);

    // 4. Validate the data
    if (!winnerId || !winnerName || !drawMonth) {
      return { statusCode: 400, body: 'Missing winner information.' };
    }

    // 5. --- DATABASE OPERATION 1: UPDATE PARTICIPANT ---
    // Find the participant by their ID and set is_winner to true
    const { error: updateError } = await supabase
      .from('participants')
      .update({ is_winner: true })
      .eq('id', winnerId);
    
    if (updateError) {
      throw updateError; // Send this error to the catch block
    }

    // 6. --- DATABASE OPERATION 2: INSERT INTO ARCHIVE ---
    // Get the current year
    const currentYear = new Date().getFullYear();

    // Insert into the 'winners' table for our archive
    const { error: insertError } = await supabase
      .from('winners')
      .insert([
        { 
          winner_name: winnerName, 
          draw_month: drawMonth,
          draw_year: currentYear 
        }
      ]);

    if (insertError) {
      throw insertError; // Send this error to the catch block
    }

    // 7. Success!
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Winner saved successfully!' }),
    };

  } catch (error) {
    // 8. Handle any errors from our database operations
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}