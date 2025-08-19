import React, { useState, useEffect } from 'react';

const MyBets = ({ username }) => {
  const [bets, setBets] = useState([]);
  const [growth, setGrowth] = useState([]);

  const handleDeleteBet = async (betId) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/bets/delete-bet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bet_id: betId })
      });

      if (res.ok) {
        setBets(prev => prev.filter(b => b._id !== betId));
      } else {
        alert("❌ Failed to delete bet.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Error deleting bet.");
    }
  };

  useEffect(() => {
    const fetchUserBets = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/bets/user-bets?user_id=${username}`);
        const data = await res.json();
        console.log("user bets", data);
        setBets(data);
      } catch (err) {
        console.error("Failed to fetch user bets", err);
      }
    };

    const fetchGrowth = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/bets/bankroll-growth?user_id=${username}`);
        const data = await res.json();
        setGrowth(data);
      } catch (err) {
        console.error("Failed to fetch bankroll growth", err);
      }
    };

    if (username) {
      fetchUserBets();
      fetchGrowth();

      // MVP: trigger result update every 15 minutes
      const intervalId = setInterval(async () => {
        try {
          await fetch(`${process.env.REACT_APP_API_URL}/bets/update-results`, { method: "POST" });
          console.log("✅ Results updated");
          fetchUserBets();
          fetchGrowth();
        } catch (err) {
          console.error("Failed to update results", err);
        }
      }, 15 * 60 * 1000);

      return () => clearInterval(intervalId);
    }
  }, [username]);

  const completedBets = bets.filter(bet => bet.result !== "pending").length;
  const wonBets = bets.filter(bet => bet.result === "won").length;
  const winRate = completedBets ? (wonBets / completedBets) * 100 : 0;
  const totalProfit = bets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
  const totalStaked = bets.reduce((sum, bet) => sum + bet.stake, 0);
  const roi = totalStaked ? (totalProfit / totalStaked) * 100 : 0;

  const resultColors = {
    won: "bg-green-100 text-green-800",
    lost: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800"
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Bets</h2>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-blue-500 uppercase font-medium mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-blue-800">{winRate.toFixed(1)}%</div>
          <div className="text-xs text-blue-400 mt-1">{wonBets} of {completedBets} bets</div>
        </div>

        <div className={`${totalProfit >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-4 shadow-sm`}>
          <div className={`text-sm ${totalProfit >= 0 ? 'text-green-500' : 'text-red-500'} uppercase font-medium mb-1`}>Total Profit</div>
          <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
          </div>
          <div className={`text-xs ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'} mt-1`}>
            ROI: {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500 uppercase font-medium mb-1">Active Bets</div>
          <div className="text-2xl font-bold text-gray-800">{bets.filter(bet => bet.status === "NS").length}</div>
          <div className="text-xs text-gray-400 mt-1">
            Total Stake: {bets.filter(bet => bet.status === "NS").reduce((sum, bet) => sum + bet.stake, 0)}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 shadow-sm">
          <div className="text-sm text-purple-500 uppercase font-medium mb-1">Total Wagered</div>
          <div className="text-2xl font-bold text-purple-800">{totalStaked.toFixed(2)}</div>
          <div className="text-xs text-purple-400 mt-1">Across {bets.length} bets</div>
        </div>
      </div>

      {/* Bankroll Growth */}
      <div className="mb-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Bankroll Growth</h3>
        <div className="h-48 bg-white rounded border border-gray-200 flex items-center justify-center">
          {growth.length > 0 ? (
            <p className="text-gray-500">[Integrate charting lib here]</p>
          ) : (
            <p className="text-gray-400">No data available yet</p>
          )}
        </div>
      </div>

      {/* Bet History */}
      <h3 className="text-lg font-medium text-gray-800 mb-4">Bet History</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sport</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Odds</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stake</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fixture Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P/L</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bets.map(bet => (
              <tr key={bet._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(bet.placed_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {bet.match}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{bet.sport}</td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {bet.odds !== undefined ? bet.odds.toFixed(2) : '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{bet.stake}</td>

                {/* Fixture status (NS, FT, etc.) */}
                <td className="px-6 py-4 text-sm">
                  <span className="px-2 inline-flex text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    {bet.status}
                  </span>
                </td>

                {/* Result (won/lost/pending) */}
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${resultColors[bet.result]}`}>
                    {bet.result}
                  </span>
                </td>

                {/* Profit/Loss */}
                <td className="px-6 py-4 text-sm">
                  {bet.result !== "pending" && (
                    <span className={`${bet.profit >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                      {bet.profit !== undefined ? `${bet.profit >= 0 ? '+' : ''}${bet.profit.toFixed(2)}` : '—'}
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => handleDeleteBet(bet._id)}
                    className={`text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-sm whitespace-nowrap ${
                      bet.result === "pending" ? "cursor-not-allowed opacity-50" : ""
                    }`}
                    title={bet.result === "pending" ? "Cannot delete pending bets" : "Delete this bet"}
                    disabled={bet.result === "pending"}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyBets;
