import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ValueBets from './components/ValueBets';
import MyBets from './components/MyBets';
import Analytics from './components/Analytics';
import Simulation from './components/Simulation';
import Navigation from './components/Navigation';
import LoadingSpinner from './components/LoadingSpinner';
import Notifications from './components/Notifications';
import Login from './components/Login';
import SignUp from './components/SignUp';

function App() {
  const [loading, setLoading] = useState(false);
  const [bets, setBets] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  const handleLogin = (user) => {
    setIsLoggedIn(true);
    setUsername(user);
    fetchData();
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setBets([]);
    setNotifications([]);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await fetch('/data/sample_odds.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch odds data: ${response.status} ${response.statusText}`);
      }

      const sampleBets = await response.json();
      if (!Array.isArray(sampleBets)) {
        throw new Error('Invalid data format: expected an array of bets');
      }

      const predictedBets = await Promise.all(
        sampleBets.map(async (bet) => {
          try {
            const mockResponse = await simulatePredictionAPI(bet);
            return {
              ...bet,
              ...mockResponse
            };
          } catch (err) {
            console.error(`Error predicting for match ${bet.match_id}:`, err);
            return null;
          }
        })
      );

      const validBets = predictedBets.filter(bet => bet !== null);
      setBets(validBets);

      const valueBets = validBets.filter(bet => bet.value_bet);
      if (valueBets.length > 0) {
        valueBets.forEach(bet => {
          const msg = `Value Bet Found: ${bet.team1} vs ${bet.team2} (${bet.sport}) with EV: ${bet.expected_value.toFixed(3)}`;
          setNotifications(prev => [...prev, msg]);
        });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Failed to load betting data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      console.log('Data would refresh here in a real app');
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const simulatePredictionAPI = async (bet) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const impliedProb = 1.0 / bet.bookmaker_odds;
    const noise = (Math.random() - 0.4) * 0.15;
    const predictedProb = Math.max(0.05, Math.min(0.95, impliedProb + noise));
    const expectedValue = (predictedProb * bet.bookmaker_odds) - 1;
    return {
      predicted_win_prob: predictedProb,
      expected_value: expectedValue,
      value_bet: expectedValue > 0
    };
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <AppContent
          isLoggedIn={isLoggedIn}
          username={username}
          onLogin={handleLogin}
          onLogout={handleLogout}
          loading={loading}
          error={error}
          fetchData={fetchData}
          bets={bets}
          notifications={notifications}
        />
      </div>
    </Router>
  );
}

const AppContent = ({
  isLoggedIn,
  username,
  onLogin,
  onLogout,
  loading,
  error,
  fetchData,
  bets,
  notifications
}) => {
  const location = useLocation();

  const isAuthPage = location.pathname === '/' || location.pathname === '/signup';

  return (
    <>
      {!isAuthPage && isLoggedIn && <Navigation username={username} onLogout={onLogout} />}
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <button
              className="mt-2 bg-red-200 text-red-800 px-3 py-1 rounded-md hover:bg-red-300"
              onClick={fetchData}
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <LoadingSpinner />
        ) : (
          <Routes>
            {!isLoggedIn ? (
              <>
                <Route path="/" element={<Login onLogin={onLogin} />} />
                <Route path="/signup" element={<SignUp onLogin={onLogin} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              <>
                <Route path="/dashboard" element={<Dashboard username={username} />} />
                <Route path="/value-bets" element={<ValueBets bets={bets} />} />
                <Route path="/my-bets" element={<MyBets username={username}/>} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/simulation" element={<Simulation />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </>
            )}
          </Routes>
        )}
      </main>

      {isLoggedIn && <Notifications notifications={notifications} />}

      <footer className="max-w-6xl mx-auto mt-12 text-center text-gray-500 text-sm p-4">
        <p>© 2023 AI Sports Betting System</p>
      </footer>
    </>
  );
};

export default App;
