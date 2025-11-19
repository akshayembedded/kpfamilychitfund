import React, { useState, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabaseClient.js'; // Import our client

export default function AuthComponent() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="w-full max-w-md mx-auto p-4">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          
          // --- THIS IS THE FIX ---
          // This tells Supabase to return to the current page
          // instead of the default Site URL (the home page).
          redirectTo={window.location.href}
          // --- END OF FIX ---
        />
      </div>
    );
  } 
  else {
    return (
      <div className="w-full max-w-md mx-auto text-center p-4">
        <p className="text-lg text-emerald-800">
          Logged in as: <strong>{session.user.email}</strong>
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-4 px-4 py-2 bg-yellow-400 text-emerald-900 font-bold rounded-md"
          style={{backgroundColor: '#FDCB6E'}}
        >
          Log Out
        </button>
      </div>
    );
  }
}