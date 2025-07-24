import React, { useEffect, useState } from 'react';

const ValueBets = ({ username }) => {
  const [bets, setBets] = useState([]);
  const [filters, setFilters] = useState({
    sport: 'all',
    minEV: 0,
    maxOdds: 10,
    date: '',
    league: '',
    team: '',
  });

  useEffect(() => {
    const fetchBets = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/bets/all-bets`);
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
    bet.odds <= filters.maxOdds &&
    (!filters.date || bet.date === filters.date) &&
    (!filters.league || bet.league?.toLowerCase().includes(filters.league.toLowerCase())) &&
    (!filters.team || `${bet.team1} ${bet.team2}`.toLowerCase().includes(filters.team.toLowerCase()))
  );

  const sports = ['all', ...new Set(bets.map(bet => bet.sport))];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: ['sport', 'date', 'league', 'team'].includes(name) ? value : parseFloat(value)
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
      const res = await fetch(`${process.env.REACT_APP_API_URL}/bets/place-bet`, {
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
          {/* Sport Filter */}
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

          {/* Min EV Filter */}
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

          {/* Max Odds Filter */}
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

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={filters.date}
              onChange={handleFilterChange}
              className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
            />
          </div>

          {/* League Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">League</label>
            <input
              type="text"
              name="league"
              value={filters.league}
              onChange={handleFilterChange}
              placeholder="Enter league name"
              className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
            />
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
            <input
              type="text"
              name="team"
              value={filters.team}
              onChange={handleFilterChange}
              placeholder="Enter team name"
              className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* TABLE OMITTED — remains the same as before */}
       <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sport</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">League</th>

              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookmaker Odds</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Home Win</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Draw</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Away Win</th>
              
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Our Probability</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EV</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {valueBets.length > 0 ? (
              valueBets.map((bet) => (
                <tr key={bet.match_id} className="hover:bg-blue-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{bet.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bet.team1} vs {bet.team2}</td>

                  <td className="px-6 py-4 text-sm text-gray-500">{bet.sport}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{bet.league}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{bet.odds.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{bet.home_win_odds?.toFixed(2) ?? 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{bet.draw_odds?.toFixed(2) ?? 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{bet.away_win_odds?.toFixed(2) ?? 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{(bet.predicted_win_prob * 100).toFixed(1)}%</td>
                  <td className="px-6 py-4 text-sm text-green-700 font-semibold">+{(bet.expected_value * 100).toFixed(1)}%</td>
                  <td className="px-6 py-4">
                   
                  <button
                    onClick={() => handlePlaceBet(bet)}
                    className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md text-sm whitespace-nowrap"
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
