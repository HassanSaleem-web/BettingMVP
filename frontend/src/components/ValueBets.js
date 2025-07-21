import React, { useEffect, useState } from 'react';

const ValueBets = ({username}) => {
  const [bets, setBets] = useState([]);
  const [filters, setFilters] = useState({
    sport: 'all',
    minEV: 0,
    maxOdds: 10
  });

  useEffect(() => {
    const fetchBets = async () => {
      try {
        const res = await fetch(`${process.env.API_URL}/bets/all-bets`);
        const data = await res.json();
        setBets(data);
      } catch (err) {
        console.error('Error fetching value bets:', err);
      }
    };
    fetchBets();
  }, []);

  const valueBets = bets.filter(bet => 
    bet.isValueBet &&
    (filters.sport === 'all' || bet.sport === filters.sport) &&
    bet.expected_value >= filters.minEV &&
    bet.odds <= filters.maxOdds
  );

  const sports = ['all', ...new Set(bets.map(bet => bet.sport))];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: name === 'sport' ? value : parseFloat(value)
    }));
  };

  const handlePlaceBet = async (bet) => {
  const stakeInput = prompt(`Enter stake amount for ${bet.team1} vs ${bet.team2}:`, "100");
  const stake = parseFloat(stakeInput);

  if (isNaN(stake) || stake <= 0) {
    alert("Invalid stake amount.");
    return;
  }

  try {
    const res = await fetch(`${process.env.API_URL}/bets/place-bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: username,
        match_id: bet.match_id,
        stake: stake
      })
    });
    const result = await res.json();
    alert(`✅ Bet placed on ${bet.team1} vs ${bet.team2} with stake $${stake}`);
  } catch (err) {
    console.error('Error placing bet:', err);
    alert('❌ Failed to place bet.');
  }
};


  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Value Bets</h2>
        <p className="text-gray-600 mb-4">
          These bets have positive expected value (EV) based on our AI predictions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
            <select
              name="sport"
              value={filters.sport}
              onChange={handleFilterChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {sports.map(sport => (
                <option key={sport} value={sport}>
                  {sport === 'all' ? 'All Sports' : sport}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min EV</label>
            <input
              type="range"
              name="minEV"
              min="0"
              max="0.5"
              step="0.01"
              value={filters.minEV}
              onChange={handleFilterChange}
              className="block w-full"
            />
            <span className="text-xs text-gray-500">{filters.minEV.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Odds</label>
            <input
              type="range"
              name="maxOdds"
              min="1"
              max="10"
              step="0.5"
              value={filters.maxOdds}
              onChange={handleFilterChange}
              className="block w-full"
            />
            <span className="text-xs text-gray-500">{filters.maxOdds.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sport</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Odds</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Our Probability</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EV</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {valueBets.length > 0 ? (
              valueBets.map((bet) => (
                <tr key={bet.match_id} className="hover:bg-blue-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bet.team1} vs {bet.team2}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{bet.sport}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{bet.odds.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{(bet.predicted_win_prob * 100).toFixed(1)}%</td>
                  <td className="px-6 py-4 text-sm text-green-700 font-semibold">+{(bet.expected_value * 100).toFixed(1)}%</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handlePlaceBet(bet)}
                      className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md text-sm"
                    >
                      Place Bet
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  No value bets found with the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ValueBets;
