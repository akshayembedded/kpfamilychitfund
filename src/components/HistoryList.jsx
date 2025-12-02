import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

export default function HistoryList() {
    const [winners, setWinners] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWinners = async () => {
            try {
                // Fetch from the new 'draws' collection
                const q = query(
                    collection(db, "draws"),
                    orderBy("timestamp", "desc")
                );
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setWinners(list);
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWinners();
    }, []);

    if (loading) return <div className="text-center p-10">Loading history...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-6 text-center">🏆 Hall of Fame</h2>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gradient-to-r from-teal-100 to-emerald-100 text-teal-900 uppercase text-sm font-bold">
                            <tr>
                                <th className="p-4">Cycle</th>
                                <th className="p-4">Month</th>
                                <th className="p-4">Winner Name</th>
                                <th className="p-4">Date Won</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {winners.map((winner) => (
                                <tr key={winner.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4 text-gray-500 text-sm">{winner.cycle_id}</td>
                                    <td className="p-4 font-medium text-gray-700">{winner.month}</td>
                                    <td className="p-4 font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent text-lg">{winner.winner_name}</td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        {winner.timestamp?.seconds ? new Date(winner.timestamp.seconds * 1000).toLocaleDateString() : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                            {winners.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-400 italic">
                                        No winners recorded in the new system yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
