import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { db, auth, googleProvider } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, setDoc, getDoc, where, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, signOut } from 'firebase/auth';

// ==================================================================
// 🔐 SECURITY & CONFIGURATION
// ==================================================================

const ADMIN_EMAILS = (import.meta.env.PUBLIC_ADMIN_EMAILS || '').split(',');
const ALLOWED_EDITORS = (import.meta.env.PUBLIC_ALLOWED_EDITORS || '').split(',');

const CYCLES = ["2025-2026", "2026-2027"];
const MONTHS = [
  "November 2025", "December 2025", "January 2026", "February 2026",
  "March 2026", "April 2026", "May 2026", "June 2026",
  "July 2026", "August 2026", "September 2026", "October 2026"
];

// ==================================================================

export default function ParticipantList() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // ROLES
  const [isAdmin, setIsAdmin] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [isGuestSpinner, setIsGuestSpinner] = useState(false);

  // SELECTIONS
  const [selectedCycle, setSelectedCycle] = useState("2025-2026");
  const [selectedMonth, setSelectedMonth] = useState("November 2025");

  // STATE
  const [newName, setNewName] = useState('');
  const [winner, setWinner] = useState(null); // The winner for the SELECTED month

  // ANIMATION STATE
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningName, setSpinningName] = useState('');
  const [copyMsg, setCopyMsg] = useState('');
  const [intervalId, setIntervalId] = useState(null);

  // GUEST LINK MANAGEMENT
  const [guestToken, setGuestToken] = useState(null);
  const [guestLinkValid, setGuestLinkValid] = useState(false);
  const [activeGuestLinks, setActiveGuestLinks] = useState([]);
  const [showGuestLinks, setShowGuestLinks] = useState(false);

  // CYCLE MANAGEMENT
  const [availableCycles, setAvailableCycles] = useState(CYCLES);
  const [newCycleName, setNewCycleName] = useState('');
  const [showAddCycle, setShowAddCycle] = useState(false);

  // 1. CHECK LOGIN & URL PARAMETERS + VALIDATE GUEST TOKEN
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      // Validate guest token
      const tokenRef = doc(db, "guestTokens", token);
      getDoc(tokenRef).then((docSnap) => {
        if (docSnap.exists()) {
          const tokenData = docSnap.data();
          const expiresAt = tokenData.expiresAt?.seconds * 1000;
          const now = Date.now();

          if (expiresAt && now < expiresAt) {
            setGuestToken(token);
            setIsGuestSpinner(true);
            setGuestLinkValid(true);
          } else {
            alert('This guest link has expired. Please request a new one from the admin.');
            setGuestLinkValid(false);
          }
        } else {
          alert('Invalid guest link. Please request a new one from the admin.');
          setGuestLinkValid(false);
        }
      });
    } else if (urlParams.get('guest') === 'true') {
      // Old style guest link (for backward compatibility)
      setIsGuestSpinner(true);
      setGuestLinkValid(true);
    }

    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (ADMIN_EMAILS.includes(currentUser.email)) setIsAdmin(true);
        else setIsAdmin(false);

        if (ALLOWED_EDITORS.includes(currentUser.email)) setCanAdd(true);
        else setCanAdd(false);
      } else {
        setIsAdmin(false);
        setCanAdd(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. FETCH PARTICIPANTS (Filtered by CYCLE)
  useEffect(() => {
    setLoading(true);
    // Note: Removed orderBy("createdAt") to avoid needing a composite index immediately.
    // We sort client-side instead.
    const q = query(
      collection(db, "participants"),
      where("cycle_id", "==", selectedCycle)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sort client-side: Newest first
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setParticipants(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching participants:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedCycle]);

  // 3. FETCH WINNER FOR SELECTED MONTH
  useEffect(() => {
    const drawId = `${selectedCycle}_${selectedMonth.replace(/\s/g, '')}`;
    const drawRef = doc(db, "draws", drawId);

    const unsubscribe = onSnapshot(drawRef, (docSnap) => {
      if (docSnap.exists()) {
        setWinner(docSnap.data());
      } else {
        setWinner(null);
      }
    });
    return () => unsubscribe();
  }, [selectedCycle, selectedMonth]);

  // 4. FETCH ACTIVE GUEST LINKS (Admin only)
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, "guestTokens"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const links = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter out expired links
      const now = Date.now();
      const validLinks = links.filter(link => {
        const expiresAt = link.expiresAt?.seconds * 1000;
        return expiresAt && now < expiresAt;
      });
      setActiveGuestLinks(validLinks);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  // 5. REALTIME LISTENER FOR "SPINNING STATE"
  useEffect(() => {
    const gameStateRef = doc(db, "config", "gameState");

    const unsubscribe = onSnapshot(gameStateRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const state = docSnapshot.data();

        // Only spin if the active spin matches our current view context (optional, but good for safety)
        // For now, global spin is fine.
        if (state.isSpinning) {
          setIsSpinning(true);
          // Don't hide winner immediately here, UI handles it
          if (!intervalId) {
            const id = setInterval(() => {
              setSpinningName(prev => "Spinning...");
            }, 100);
            setIntervalId(id);
          }
        } else {
          setIsSpinning(false);
          if (intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 6. LOAD CYCLES FROM FIRESTORE
  useEffect(() => {
    const cyclesRef = doc(db, "config", "cycles");
    const unsubscribe = onSnapshot(cyclesRef, (docSnap) => {
      if (docSnap.exists()) {
        setAvailableCycles(docSnap.data().cycles || CYCLES);
      }
    });
    return () => unsubscribe();
  }, []);

  // Flash names animation
  useEffect(() => {
    if (isSpinning && participants.length > 0) {
      const id = setInterval(() => {
        const randomIdx = Math.floor(Math.random() * participants.length);
        setSpinningName(participants[randomIdx].name);
      }, 80);
      return () => clearInterval(id);
    }
  }, [isSpinning, participants]);


  // ACTIONS
  const handleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (error) { console.error("Login failed", error); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName || !canAdd) return;

    await addDoc(collection(db, "participants"), {
      name: newName,
      cycle_id: selectedCycle,
      createdAt: new Date()
    });
    setNewName('');
  };

  const handleDelete = async (id) => {
    if ((!isAdmin && !canAdd) || !confirm("Are you sure you want to delete this participant?")) return;
    await deleteDoc(doc(db, "participants", id));
  };

  const handlePickWinner = async () => {
    if ((!isAdmin && !isGuestSpinner) || participants.length === 0) return;
    if (winner) return; // Already has a winner

    await setDoc(doc(db, "config", "gameState"), { isSpinning: true });

    setTimeout(async () => {
      // Pick a random winner
      const randomIdx = Math.floor(Math.random() * participants.length);
      const winnerData = participants[randomIdx];

      // Save to 'draws' collection
      const drawId = `${selectedCycle}_${selectedMonth.replace(/\s/g, '')}`;
      await setDoc(doc(db, "draws", drawId), {
        cycle_id: selectedCycle,
        month: selectedMonth,
        winner_id: winnerData.id,
        winner_name: winnerData.name,
        timestamp: new Date()
      });

      await setDoc(doc(db, "config", "gameState"), { isSpinning: false });

    }, 3000);
  };

  const handleReset = async () => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to RESET this month's draw?")) {
      const drawId = `${selectedCycle}_${selectedMonth.replace(/\s/g, '')}`;
      await deleteDoc(doc(db, "draws", drawId));
    }
  };

  const copyGuestLink = async () => {
    // Generate a unique token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Store token in Firestore
    await setDoc(doc(db, "guestTokens", token), {
      createdAt: new Date(),
      expiresAt: expiresAt,
      createdBy: user.email,
      cycle: selectedCycle,
      month: selectedMonth
    });

    const link = `${window.location.origin}${window.location.pathname}?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopyMsg('Link Copied! (Expires in 30 min)');
    setTimeout(() => setCopyMsg(''), 5000);
  };

  const revokeGuestLink = async (token) => {
    if (confirm('Are you sure you want to revoke this guest link?')) {
      await deleteDoc(doc(db, "guestTokens", token));
    }
  };

  const handleCreateCycle = async (e) => {
    e.preventDefault();
    if (!newCycleName.trim() || !isAdmin) return;

    const cyclePattern = /^\d{4}-\d{4}$/;
    if (!cyclePattern.test(newCycleName)) {
      alert('Please use format: YYYY-YYYY (e.g., 2027-2028)');
      return;
    }

    if (availableCycles.includes(newCycleName)) {
      alert('This cycle already exists!');
      return;
    }

    const newCycles = [...availableCycles, newCycleName].sort();
    setAvailableCycles(newCycles);

    // Store in Firestore
    await setDoc(doc(db, "config", "cycles"), {
      cycles: newCycles,
      updatedAt: new Date()
    });

    setNewCycleName('');
    setShowAddCycle(false);
    alert(`Cycle ${newCycleName} created successfully!`);
  };

  const formatTimeRemaining = (expiresAt) => {
    const now = Date.now();
    const expiry = expiresAt?.seconds * 1000;
    const diff = expiry - now;
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 font-sans text-gray-800">
      {winner && !isSpinning && <Confetti />}

      {/* HEADER & CONTROLS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">

          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">KP Family Chit Fund</h2>
            {!isGuestSpinner && (
              <div className="flex gap-2 mt-2">
                {/* CYCLE SELECTOR */}
                <select
                  value={selectedCycle}
                  onChange={(e) => setSelectedCycle(e.target.value)}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 font-bold"
                >
                  {availableCycles.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* MONTH SELECTOR */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 font-bold"
                >
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}

            {/* Guest users see current selection only */}
            {isGuestSpinner && (
              <p className="text-teal-600 font-semibold mt-2">
                {selectedCycle} - {selectedMonth}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-emerald-700">
                    {isAdmin ? 'ADMIN' : (canAdd ? 'EDITOR' : 'VIEWER')}
                  </p>
                </div>
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-gray-300" />
                <button onClick={() => signOut(auth)} className="text-xs text-red-500 hover:underline">Sign Out</button>
              </div>
            ) : (
              !isGuestSpinner && (
                <button onClick={handleLogin} className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-6 py-2.5 rounded-full font-bold shadow-lg hover:shadow-xl hover:from-teal-600 hover:to-emerald-600 text-sm transform hover:scale-105 transition-all">
                  Login
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-4 rounded-xl mb-6 border border-teal-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-teal-600 font-bold text-xs">{copyMsg}</span>
            <div className="flex gap-2">
              <button
                onClick={copyGuestLink}
                className="bg-white border-2 border-teal-300 px-4 py-2 rounded-lg hover:bg-teal-50 text-teal-700 font-semibold shadow-sm hover:shadow-md transition-all text-sm"
              >
                🔗 Generate Guest Link
              </button>
              <button
                onClick={() => setShowGuestLinks(!showGuestLinks)}
                className="bg-white border-2 border-teal-300 px-4 py-2 rounded-lg hover:bg-teal-50 text-teal-700 font-semibold shadow-sm hover:shadow-md transition-all text-sm"
              >
                {showGuestLinks ? '▼' : '▶'} Active Links ({activeGuestLinks.length})
              </button>
              <button
                onClick={() => setShowAddCycle(!showAddCycle)}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-4 py-2 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all text-sm"
              >
                ➕ New Cycle
              </button>
            </div>
          </div>

          {showGuestLinks && activeGuestLinks.length > 0 && (
            <div className="mt-3 bg-white rounded-lg p-3 space-y-2">
              {activeGuestLinks.map((link) => (
                <div key={link.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="text-xs">
                    <span className="font-semibold text-gray-700">{link.cycle} - {link.month}</span>
                    <span className="text-gray-500 ml-2">• Expires in {formatTimeRemaining(link.expiresAt)}</span>
                  </div>
                  <button
                    onClick={() => revokeGuestLink(link.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded hover:bg-red-50"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddCycle && (
            <form onSubmit={handleCreateCycle} className="mt-3 bg-white rounded-lg p-4 border-2 border-teal-300">
              <label className="block text-sm font-bold text-teal-800 mb-2">Create New Cycle</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCycleName}
                  onChange={(e) => setNewCycleName(e.target.value)}
                  placeholder="e.g., 2027-2028"
                  className="border-2 border-teal-200 bg-white p-2 rounded-lg flex-grow focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none text-sm"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:from-teal-700 hover:to-emerald-700 shadow-md hover:shadow-lg transition-all text-sm"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddCycle(false); setNewCycleName(''); }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all text-sm"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Format: YYYY-YYYY (e.g., 2027-2028)</p>
            </form>
          )}
        </div>
      )}

      {/* LUCKY DRAW AREA */}
      <div className="bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 rounded-3xl p-8 text-center shadow-xl mb-8 border-2 border-teal-200 min-h-[250px] flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-100/20 to-transparent"></div>

        <h3 className="text-teal-700 font-bold uppercase tracking-widest mb-4 opacity-80 relative z-10">
          {selectedMonth} Draw
        </h3>

        {/* VIEW 1: SPINNING (Priority View) */}
        {isSpinning ? (
          <div>
            <p className="text-emerald-600 font-bold mb-4 animate-pulse relative z-10">DRUM ROLL...</p>
            <h1 className="text-5xl font-black text-emerald-600 mt-2 relative z-10">{spinningName}</h1>
          </div>
        ) : (
          /* VIEW 2: WINNER or WAITING */
          winner ? (
            <div className="animate-bounce relative z-10">
              <h3 className="text-xl text-emerald-600 font-semibold uppercase tracking-wide">The Winner Is</h3>
              <h1 className="text-5xl font-black text-emerald-900 mt-2">{winner.winner_name}</h1>
              {isAdmin && (
                <button onClick={handleReset} className="mt-6 text-xs text-gray-400 underline hover:text-red-500">
                  Reset Draw
                </button>
              )}
            </div>
          ) : (
            <div className="relative z-10">
              <h1 className="text-4xl font-bold text-gray-300 mt-2">?</h1>
              <p className="text-gray-400 mb-6">No winner selected yet.</p>

              {(isAdmin || isGuestSpinner) && participants.length > 0 && (
                <button
                  onClick={handlePickWinner}
                  className="bg-emerald-500 text-white px-8 py-4 rounded-full font-bold text-xl shadow-xl hover:bg-emerald-600 transform hover:scale-105 transition"
                >
                  {isGuestSpinner ? '✨ SPIN THE WHEEL ✨' : 'PICK WINNER'}
                </button>
              )}

              {!isAdmin && !isGuestSpinner && (
                <p className="text-sm text-gray-400 italic">Wait for the Admin to start!</p>
              )}
            </div>
          )
        )}
      </div>

      {/* ADD FORM */}
      {canAdd && (
        <form onSubmit={handleAdd} className="flex gap-3 mb-8 bg-white p-4 rounded-xl shadow-sm border">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder={`✨ Add Participant to ${selectedCycle}`}
            className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white p-3 rounded-xl flex-grow focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none transition-all"
          />
          <button type="submit" className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
            Add
          </button>
        </form>
      )}

      {/* LIST */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-teal-100 to-emerald-100 p-4 border-b-2 border-teal-200 flex justify-between text-sm font-bold text-teal-800">
          <span>PARTICIPANTS ({participants.length})</span>
          <span>CYCLE: {selectedCycle}</span>
        </div>
        <ul className="divide-y divide-gray-100">
          {participants.map((p, index) => (
            <li key={p.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition group">
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-br from-teal-400 to-emerald-400 text-white text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full shadow-md">
                  {index + 1}
                </span>
                <span className="font-medium text-gray-800">{p.name}</span>
                {/* Highlight if they are the winner of THIS month */}
                {winner && winner.winner_id === p.id && (
                  <span className="bg-yellow-300 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">WINNER</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Active</span>
                {(isAdmin || canAdd) && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition px-2"
                    title="Delete Participant"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
          {participants.length === 0 && (
            <li className="p-8 text-center text-gray-400 italic">
              No participants found for {selectedCycle}. <br />
              <span className="text-xs">Add some above!</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}