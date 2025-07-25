import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ValueChart from './ValueChart';

const Dashboard = ({username}) => {
  const [activeView, setActiveView] = useState('table');
  const [refreshTimer, setRefreshTimer] = useState(30);
  const [liveTicker, setLiveTicker] = useState([]);
  const [bets, setBets] = useState([]);
  const location = useLocation();

  const [filters, setFilters] = useState({
  date: '',
  league: '',
  team: '',
  valueOnly: false
});

  const filteredBets = bets.filter(b => {
    const matchDate = b.date?.slice(0, 10); // YYYY-MM-DD
    const leagueMatch = filters.league ? b.league === filters.league : true;
    const teamMatch = filters.team
      ? b.team1.toLowerCase().includes(filters.team) || b.team2.toLowerCase().includes(filters.team)
      : true;
    const dateMatch = filters.date ? matchDate === filters.date : true;
    const valueMatch = filters.valueOnly ? b.isValueBet : true;

    return leagueMatch && teamMatch && dateMatch && valueMatch;
  });


  useEffect(() => {
    const fetchBets = async () => {
      try {
        const res = await fetch( `${process.env.REACT_APP_API_URL}/bets/all-bets`);
        const data = await res.json();
        setBets(data);
      } catch (err) {
        console.error('Failed to fetch bets:', err);
      }
    };

    fetchBets();
  }, [location.key]);

  // ✅ Place a bet
  const placeBet = async (bet) => {
    const stakeInput = prompt(`Enter stake amount for ${bet.team1} vs ${bet.team2}:`, "100");
    const stake = parseFloat(stakeInput);

    if (isNaN(stake) || stake <= 0) {
      alert("Invalid stake amount.");
      return;
    }
    console.log("user", username);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/bets/place-bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: username, // Replace with actual auth ID
          match_id: bet.match_id,
          stake: stake
        })
      });
      const result = await res.json();
      alert(`✅ Bet placed on ${bet.team1} vs ${bet.team2}`);
    } catch (err) {
      console.error('❌ Error placing bet:', err);
      alert('Failed to place bet.');
    }
  };

  // ✅ Stats
  const totalBets = bets.length;
  const valueBets = bets.filter(b => b.isValueBet);

  const valueBetsCount = valueBets.length;
  const valueBetsPercentage = totalBets ? (valueBetsCount / totalBets) * 100 : 0;
  const avgEV = valueBets.length > 0
    ? valueBets.reduce((sum, b) => sum + b.expected_value, 0) / valueBets.length
    : 0;

  // ✅ Live Ticker
  useEffect(() => {
    const sports = ['Football', 'Basketball', 'Tennis', 'Hockey', 'MMA'];
    const teams = [
      ['Liverpool', 'Arsenal'],
      ['Lakers', 'Celtics'],
      ['Nadal', 'Djokovic'],
      ['Bruins', 'Flyers'],
      ['Jones', 'Cormier']
    ];
    const generate = () => Array.from({ length: 5 }).map((_, i) => {
      const s = Math.floor(Math.random() * sports.length);
      return {
        id: Date.now() + i,
        sport: sports[s],
        team1: teams[s][0],
        team2: teams[s][1],
        odds: (1.5 + Math.random() * 2).toFixed(2),
        movement: Math.random() > 0.5 ? '↑' : '↓'
      };
    });
    setLiveTicker(generate());
    const interval = setInterval(() => setLiveTicker(generate()), 10000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Refresh countdown
  useEffect(() => {
    if (refreshTimer <= 0) {
      setRefreshTimer(30);
      return;
    }
    const timer = setTimeout(() => setRefreshTimer(refreshTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [refreshTimer]);

  const getStatusColor = (bet) => bet.isValueBet
    ? 'bg-green-100 text-green-800'
    : 'bg-gray-100 text-gray-800';

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Bets Analyzed" value={totalBets} icon="📊" color="blue" />
        <StatCard title="Value Bets Found" value={valueBetsCount} suffix={`(${valueBetsPercentage.toFixed(1)}%)`} icon="✅" color="green" />
        <StatCard title="Avg. Expected Value" value={`${(avgEV * 100).toFixed(2)}%`} suffix="for value bets" icon="📈" color="purple" />
      </div>

      {/* Live Odds Ticker */}
      <div className="bg-gray-800 text-white p-3 rounded-lg shadow-md overflow-hidden">
        <div className="flex items-center space-x-4 animate-marquee">
          <div className="text-yellow-400 font-medium">LIVE ODDS</div>
          {liveTicker.map(item => (
            <div key={item.id} className="flex items-center space-x-2 whitespace-nowrap">
              <span className="text-gray-400">{item.sport}</span>
              <span className="font-medium">{item.team1} vs {item.team2}</span>
              <span className={`font-bold ${item.movement === '↑' ? 'text-green-400' : 'text-red-400'}`}>
                {item.odds} {item.movement}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
<div className="bg-white rounded-lg shadow p-4 space-y-4">
  <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {/* Date Filter */}
    <input
      type="date"
      className="border border-gray-300 rounded px-3 py-2"
      value={filters.date}
      onChange={(e) => setFilters({ ...filters, date: e.target.value })}
    />

    {/* League Filter */}
    <select
      className="border border-gray-300 rounded px-3 py-2"
      value={filters.league}
      onChange={(e) => setFilters({ ...filters, league: e.target.value })}
    >
      <option value="">All Leagues</option>
      {Array.from(new Set(bets.map(b => b.league))).map((lg, i) => (
        <option key={i} value={lg}>{lg}</option>
      ))}
    </select>

    {/* Team Filter */}
    <input
      type="text"
      placeholder="Search team"
      className="border border-gray-300 rounded px-3 py-2"
      value={filters.team}
      onChange={(e) => setFilters({ ...filters, team: e.target.value.toLowerCase() })}
    />

      {/* Value Bet Toggle */}
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={filters.valueOnly}
          onChange={(e) => setFilters({ ...filters, valueOnly: e.target.checked })}
        />
        <span className="text-sm text-gray-700">Only Value Bets</span>
      </label>
    </div>
  </div>


      {/* View Toggle */}
      <div className="flex justify-between items-center">
        <div className="bg-white rounded-lg shadow p-1 inline-flex">
          <button onClick={() => setActiveView('table')} className={`px-4 py-2 text-sm font-medium rounded ${activeView === 'table' ? 'bg-blue-100 text-blue-800' : 'text-gray-500 hover:text-gray-700'}`}>
            Table View
          </button>
          <button onClick={() => setActiveView('chart')} className={`px-4 py-2 text-sm font-medium rounded ${activeView === 'chart' ? 'bg-blue-100 text-blue-800' : 'text-gray-500 hover:text-gray-700'}`}>
            Chart View
          </button>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <span className="mr-1">⏱</span> Refreshing in {refreshTimer}s
        </div>
      </div>

      {/* Table View */}
      {activeView === 'table' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Match', 'Sport', 'League', 'Bookmaker Odds', 'Home Win', 'Draw', 'Away Win', 'Our Probability', 'Expected Value', 'Value Bet', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBets.map((bet) => (
                  <tr key={bet.match_id} className={bet.isValueBet ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 text-sm text-gray-500">{bet.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bet.team1} vs {bet.team2}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{bet.sport}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{bet.league}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{bet.odds?.toFixed(2)??'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{bet.home_win_odds?.toFixed(2) ?? 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{bet.draw_odds?.toFixed(2) ?? 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{bet.away_win_odds?.toFixed(2) ?? 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{(bet.predicted_win_prob * 100)?.toFixed(1)??'N/A'}%</td>
                    <td className={`px-6 py-4 text-sm font-medium ${bet.expected_value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(bet.expected_value * 100)?.toFixed(2)??'N/A'}%
                  </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${getStatusColor(bet)}`}>
                        {bet.isValueBet ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {bet.isValueBet && (
                        <button
                          onClick={() => placeBet(bet)}
                          className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md text-sm whitespace-nowrap"
                        >
                          Place Bet
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart View */}
      {activeView === 'chart' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <ValueChart bets={bets} />
        </div>
      )}

      {/* How It Works */}
      <section className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-blue-500 text-xl font-bold mb-2">1. Data Collection</div>
            <p className="text-gray-700">The system continuously collects odds data from major bookmakers and historical sports statistics.</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-blue-500 text-xl font-bold mb-2">2. AI Prediction</div>
            <p className="text-gray-700">Our ML models analyze the data and predict true probabilities for each outcome, finding discrepancies with bookmaker odds.</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-blue-500 text-xl font-bold mb-2">3. Value Detection</div>
            <p className="text-gray-700">The system identifies value bets (positive EV) and notifies users in real-time of profitable betting opportunities.</p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <div className="bg-blue-50 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-blue-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link to="/value-bets" className="bg-white p-4 rounded-lg shadow border border-blue-100 hover:border-blue-300 transition-colors">
            <div className="font-medium text-blue-700">View Value Bets</div>
            <div className="text-sm text-gray-500 mt-1">Check all positive EV betting opportunities</div>
          </Link>
          <Link to="/my-bets" className="bg-white p-4 rounded-lg shadow border border-blue-100 hover:border-blue-300 transition-colors">
            <div className="font-medium text-blue-700">My Bet History</div>
            <div className="text-sm text-gray-500 mt-1">Review your past betting performance</div>
          </Link>
          <Link to="/analytics" className="bg-white p-4 rounded-lg shadow border border-blue-100 hover:border-blue-300 transition-colors">
            <div className="font-medium text-blue-700">Performance Analytics</div>
            <div className="text-sm text-gray-500 mt-1">Analyze detailed statistics and trends</div>
          </Link>
          <Link to="/simulation" className="bg-white p-4 rounded-lg shadow border border-blue-100 hover:border-blue-300 transition-colors">
            <div className="font-medium text-blue-700">Run Simulation</div>
            <div className="text-sm text-gray-500 mt-1">Test your betting strategy with historical data</div>
          </Link>
        </div>
      </div>
    </div>
  );
};

// ✅ Stat Card Component
const StatCard = ({ title, value, suffix, icon, color }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center">
      <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="ml-4">
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {suffix && <div className="text-sm text-gray-500">{suffix}</div>}
      </div>
    </div>
  </div>
);

export default Dashboard;
