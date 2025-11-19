import React, { useState, useEffect } from 'react';
// --- NEW ---
// Import the confetti library we just installed
import Confetti from 'react-confetti';

//
// --- Form Component (No Changes) ---
//
function AddParticipantForm({ onParticipantAdded }) {
  const [name, setName] = useState('');
  const [month, setMonth] = useState('November 2025');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!name || !month) {
      setFormError('Name and month are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/.netlify/functions/add-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, month }),
      });
      if (!response.ok) {
        throw new Error('Failed to add participant');
      }
      const newParticipant = await response.json();
      onParticipantAdded(newParticipant);
      setName('');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // The form JSX is unchanged...
  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-6 mb-8 border border-emerald-200">
      <h3 className="text-xl font-bold text-emerald-800 mb-4">Join This Month's Draw</h3>
      {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-grow">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Participant Name</label>
          <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500" placeholder="e.g., Akshay P Kumar" />
        </div>
        <div className="flex-grow">
          <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">Draw Month</label>
          <input type="text" id="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500" />
        </div>
        <div className="md:self-end">
          <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-6 py-2 bg-emerald-600 text-white font-semibold rounded-md shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-gray-400">
            {isSubmitting ? 'Adding...' : 'Add Participant'}
          </button>
        </div>
      </div>
    </form>
  );
}


//
// --- Main Participant List (Lots of NEW code) ---
//
export default function ParticipantList() {
  // Existing states
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- NEW STATES FOR THE SPINNER ---
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningName, setSpinningName] = useState(''); // The name that flashes
  const [finalWinner, setFinalWinner] = useState(null); // The actual winner
  const [drawMonth, setDrawMonth] = useState('November 2025'); // The current month

  // This is our animation loop
  let spinInterval = null;

  // --- Existing useEffect (No change) ---
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await fetch('/.netlify/functions/get-participants');
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        setParticipants(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, []);

  // --- NEW: Function to start the spin ---
 // --- NEW: Function to start the spin ---
 const handlePickWinner = () => {
  if (participants.length === 0) return;

  setIsSpinning(true);
  setFinalWinner(null);

  // Start the "spinning"
  spinInterval = setInterval(() => {
    // Pick a random name from the list just for show
    const random_index = Math.floor(Math.random() * participants.length);
    setSpinningName(participants[random_index].name);
  }, 100); // Flash a new name every 100ms

  // After 3 seconds (3000ms), stop the spin and pick the REAL winner
  // This is the ONE AND ONLY setTimeout block
  setTimeout(async () => { // <-- 1. Make this function 'async'
    clearInterval(spinInterval); // Stop the flashing

    // Pick the actual winner
    const winner_index = Math.floor(Math.random() * participants.length);
    const winner = participants[winner_index];
    
    setFinalWinner(winner); // Set the final winner
    setIsSpinning(false); // Stop the spinning state
    setSpinningName(''); // Clear the flashing name

    // 
    // 2. --- THIS IS THE NEW PART ---
    // Save the winner to our database
    try {
      await fetch('/.netlify/functions/set-winner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winnerId: winner.id,
          winnerName: winner.name,
          drawMonth: winner.draw_month
        })
      });
      console.log("Winner saved to database!");
    } catch (err) {
      // If this fails, the user won't know, but we'll see it
      // in the console. We could add an error message UI here.
      console.error("Failed to save winner to database:", err);
    }
    // --- END OF NEW PART ---
    
  }, 3000); // The 3-second delay
};

  // --- Existing participant add function (No change) ---
  const handleParticipantAdded = (newParticipant) => {
    setParticipants(currentParticipants => [...currentParticipants, newParticipant]);
  };

  // --- Existing loading/error states (No change) ---
  if (loading) return <div className="p-4 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;

  return (
    <>
      {/* Show confetti if we have a winner! */}
      {finalWinner && <Confetti />}

      {/* --- NEW: The Winner Picker UI --- */}
      <div className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg p-6 mb-8 text-center">
        <h2 className="text-3xl font-bold text-emerald-800 mb-4">
          {drawMonth} Lucky Draw
        </h2>
        
        {/* The "Spinner" Display Box */}
        <div className="min-h-[120px] p-4 bg-gray-100 rounded-lg flex items-center justify-center mb-6">
          {isSpinning && (
            <h3 className="text-4xl font-bold text-gray-700 animate-pulse">
              {spinningName}
            </h3>
          )}

          {finalWinner && (
            <div className="text-center">
              <p className="text-lg text-gray-700">The winner is...</p>
              <h3 className="text-5xl font-bold text-emerald-600" style={{color: '#00B894'}}>
                {finalWinner.name}!
              </h3>
              <p className="text-gray-500 mt-1">(ID: {finalWinner.id})</p>
            </div>
          )}

          {!isSpinning && !finalWinner && (
            <p className="text-2xl text-gray-500">Ready to draw a winner?</p>
          )}
        </div>

        {/* The "Pick Winner" Button */}
        <button
          onClick={handlePickWinner}
          disabled={isSpinning || finalWinner} // Disable if spinning or if winner is already picked
          className="w-full px-6 py-4 bg-emerald-600 text-white text-xl font-semibold rounded-md shadow-sm hover:bg-emerald-700 focus:outline-none disabled:bg-gray-400"
          style={{backgroundColor: '#00B894'}}
        >
          {finalWinner ? 'Draw Complete!' : 'PICK A WINNER'}
        </button>
      </div>

      {/* --- This is your existing code --- */}
      <AddParticipantForm onParticipantAdded={handleParticipantAdded} />

      <div className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg">
        <div className="bg-emerald-600 text-white p-4 rounded-t-lg">
          <h2 className="text-2xl font-bold">This Month's Participants</h2>
        </div>
        <ul className="divide-y divide-emerald-200">
          {participants.length === 0 ? (
            <li className="p-4 text-gray-500 text-center">No participants have joined yet.</li>
          ) : (
            participants.map(person => (
              <li key={person.id} className="p-4 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-lg text-emerald-900">{person.name}</span>
                  <p className="text-sm text-gray-600">Draw Month: {person.draw_month}</p>

                  {/* --- NEW: Show a "Winner" tag on the winner --- */}
                  {finalWinner && finalWinner.id === person.id && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-400 text-emerald-900" style={{backgroundColor: '#FDCB6E'}}>
                      WINNER
                    </span>
                  )}

                </div>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                  ID: {person.id}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );
}