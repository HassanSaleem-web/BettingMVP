import React, { useState } from 'react';

const Simulation = () => {
  const [simulationSettings, setSimulationSettings] = useState({
    initialBankroll: 1000,
    betSize: 'fixed', // 'fixed', 'percentage', 'kelly'
    fixedAmount: 50,
    percentageAmount: 5,
    kellyFraction: 50,
    minOdds: 1.5,
    maxOdds: 5.0,
    minEv: 0.02,
    sports: ['Football'],
    timeframe: '3months' // '1month', '3months', '6months', '1year'
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  
  // Available sports for simulation
  const availableSports = [
    'Football', 'Basketball', 'Tennis', 'Hockey', 'Baseball', 'MMA', 'Boxing', 'Golf'
  ];
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      // For sports selection checkboxes
      if (checked) {
        setSimulationSettings(prev => ({
          ...prev,
          sports: [...prev.sports, name]
        }));
      } else {
        setSimulationSettings(prev => ({
          ...prev,
          sports: prev.sports.filter(sport => sport !== name)
        }));
      }
    } else if (name === 'betSize') {
      // For bet sizing strategy radio buttons
      setSimulationSettings(prev => ({
        ...prev,
        betSize: value
      }));
    } else {
      // For numeric inputs
      setSimulationSettings(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) : value
      }));
    }
  };
  
  const runSimulation = async () => {
  setIsRunning(true);
  setProgress(0);

  // Progress bar animation
  const interval = setInterval(() => {
    setProgress(prev => {
      if (prev >= 95) {
        clearInterval(interval); // Prevent from going over while waiting for real API
        return prev;
      }
      return prev + 5;
    });
  }, 150);

  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/bets/simulate-strategy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankroll: simulationSettings.initialBankroll,
        stake_type: simulationSettings.betSize,
        fixed_stake: simulationSettings.fixedAmount,
        percent: simulationSettings.percentageAmount,
        kelly_fraction: simulationSettings.kellyFraction,
        min_odds: simulationSettings.minOdds,
        max_odds: simulationSettings.maxOdds,
        ev_threshold: simulationSettings.minEv,
        sports: simulationSettings.sports,
        timeframe: simulationSettings.timeframe
      })
    });

    const data = await response.json();

    console.log("simulation", data);
    clearInterval(interval);
    setResults(data);
    setProgress(100);
    setIsRunning(false);
  } catch (error) {
    clearInterval(interval);
    setIsRunning(false);
    setProgress(0);
    console.error("Simulation error:", error);
    alert("Failed to simulate strategy. Please try again.");
  }
};

  
  // const generateMockResults = () => {
  //   // In a real app, this would come from the backend
  //   const mockResults = {
  //     startingBankroll: simulationSettings.initialBankroll,
  //     finalBankroll: simulationSettings.initialBankroll * 1.37, // 37% growth
  //     totalBets: 235,
  //     wonBets: 132,
  //     lostBets: 103,
  //     winRate: 56.2,
  //     roi: 37.0,
  //     maxDrawdown: 12.4,
  //     profitFactor: 1.52,
  //     dailyData: Array(30).fill().map((_, i) => ({
  //       day: i + 1,
  //       bankroll: simulationSettings.initialBankroll * (1 + 0.012 * i + (Math.random() * 0.03 - 0.015))
  //     })),
  //     monthlyReturns: [5.2, 8.7, -3.1, 7.5, 12.3, 6.8]
  //   };
    
  //   setResults(mockResults);
  // };
  
  const resetSimulation = () => {
    setResults(null);
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Strategy Simulation</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Bankroll Settings */}
        <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bankroll Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="initialBankroll" className="block text-sm font-medium text-gray-700 mb-1">
                Initial Bankroll
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="initialBankroll"
                  id="initialBankroll"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                  value={simulationSettings.initialBankroll}
                  onChange={handleInputChange}
                  min="100"
                  max="1000000"
                  disabled={isRunning}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bet Sizing Strategy
              </label>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="fixed"
                    name="betSize"
                    type="radio"
                    value="fixed"
                    checked={simulationSettings.betSize === 'fixed'}
                    onChange={handleInputChange}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    disabled={isRunning}
                  />
                  <label htmlFor="fixed" className="ml-2 block text-sm text-gray-700">
                    Fixed Amount
                  </label>
                  
                  {simulationSettings.betSize === 'fixed' && (
                    <div className="ml-4 w-20">
                      <input
                        type="number"
                        name="fixedAmount"
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={simulationSettings.fixedAmount}
                        onChange={handleInputChange}
                        min="1"
                        disabled={isRunning}
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center">
                  <input
                    id="percentage"
                    name="betSize"
                    type="radio"
                    value="percentage"
                    checked={simulationSettings.betSize === 'percentage'}
                    onChange={handleInputChange}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    disabled={isRunning}
                  />
                  <label htmlFor="percentage" className="ml-2 block text-sm text-gray-700">
                    Bankroll %
                  </label>
                  
                  {simulationSettings.betSize === 'percentage' && (
                    <div className="ml-4 w-20">
                      <input
                        type="number"
                        name="percentageAmount"
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={simulationSettings.percentageAmount}
                        onChange={handleInputChange}
                        min="0.1"
                        max="25"
                        step="0.1"
                        disabled={isRunning}
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center">
                  <input
                    id="kelly"
                    name="betSize"
                    type="radio"
                    value="kelly"
                    checked={simulationSettings.betSize === 'kelly'}
                    onChange={handleInputChange}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    disabled={isRunning}
                  />
                  <label htmlFor="kelly" className="ml-2 block text-sm text-gray-700">
                    Kelly Criterion
                  </label>
                  
                  {simulationSettings.betSize === 'kelly' && (
                    <div className="ml-4 w-20">
                      <input
                        type="number"
                        name="kellyFraction"
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={simulationSettings.kellyFraction}
                        onChange={handleInputChange}
                        min="1"
                        max="100"
                        disabled={isRunning}
                      />
                      <div className="text-xs text-gray-500">% of Kelly</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bet Filters */}
        <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bet Filters</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="minOdds" className="block text-sm font-medium text-gray-700 mb-1">
                  Min Odds
                </label>
                <input
                  type="number"
                  name="minOdds"
                  id="minOdds"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={simulationSettings.minOdds}
                  onChange={handleInputChange}
                  min="1.01"
                  max="10"
                  step="0.1"
                  disabled={isRunning}
                />
              </div>
              
              <div>
                <label htmlFor="maxOdds" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Odds
                </label>
                <input
                  type="number"
                  name="maxOdds"
                  id="maxOdds"
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={simulationSettings.maxOdds}
                  onChange={handleInputChange}
                  min="1.5"
                  max="100"
                  step="0.5"
                  disabled={isRunning}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="minEv" className="block text-sm font-medium text-gray-700 mb-1">
                Minimum EV (%)
              </label>
              <input
                type="number"
                name="minEv"
                id="minEv"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={simulationSettings.minEv * 100}
                onChange={(e) => handleInputChange({
                  target: {
                    name: 'minEv',
                    value: parseFloat(e.target.value) / 100,
                    type: 'number'
                  }
                })}
                min="0"
                max="50"
                step="0.5"
                disabled={isRunning}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sports to Include
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Array.isArray(availableSports) && availableSports.map(sport => (
                  <div key={sport} className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id={sport}
                        name={sport}
                        type="checkbox"
                        checked={simulationSettings.sports.includes(sport)}
                        onChange={handleInputChange}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        disabled={isRunning}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor={sport} className="text-gray-700">{sport}</label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Time Settings */}
        <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Time Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Simulation Timeframe
              </label>
              <select
                name="timeframe"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={simulationSettings.timeframe}
                onChange={handleInputChange}
                disabled={isRunning}
              >
                <option value="1month">Past Month</option>
                <option value="3months">Past 3 Months</option>
                <option value="6months">Past 6 Months</option>
                <option value="1year">Past Year</option>
              </select>
            </div>
            
            <div className="pt-5">
              {!results ? (
                <button
                  type="button"
                  onClick={runSimulation}
                  disabled={isRunning}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {isRunning ? 'Running Simulation...' : 'Run Simulation'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetSimulation}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Reset Simulation
                </button>
              )}
            </div>
            
            {isRunning && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-center mt-1 text-gray-500">
                  Processing {progress}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Simulation Results */}
      {results && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Simulation Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-blue-500 uppercase font-medium mb-1">Final Bankroll</div>
              <div className="text-2xl font-bold text-blue-800">${results.finalBankroll?.toFixed(2) ?? 'N/A'}</div>
              <div className="text-xs text-blue-400 mt-1">Start: ${results.startingBankroll?.toFixed(2) ?? 'N/A'}</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-green-500 uppercase font-medium mb-1">Total Return</div>
              <div className="text-2xl font-bold text-green-800">+{results.roi?.toFixed(1) ?? '0.0'}%</div>
              <div className="text-xs text-green-400 mt-1">{results.totalBets} bets placed</div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-500 uppercase font-medium mb-1">Win Rate</div>
              <div className="text-2xl font-bold text-gray-800">{results.winRate?.toFixed(1) ?? '0.0'}%</div>
              <div className="text-xs text-gray-400 mt-1">{results.wonBets}W - {results.lostBets}L</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 shadow-sm">
              <div className="text-sm text-purple-500 uppercase font-medium mb-1">Max Drawdown</div>
              <div className="text-2xl font-bold text-purple-800">{results.maxDrawdown?.toFixed(1) ?? '0.0'}%</div>
              <div className="text-xs text-purple-400 mt-1">Profit Factor: {results.profitFactor?.toFixed(2) ?? '1.00'}</div>
            </div>
          </div>
          
          {/* Bankroll Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Bankroll Growth</h4>
            <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
              <p className="text-gray-500">Bankroll growth chart would appear here</p>
            </div>
          </div>
          
          {/* Monthly Returns */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Monthly Returns</h4>
            <div className="grid grid-cols-6 gap-2">
              {Array.isArray(results.monthlyReturns) && results.monthlyReturns.map((returnValue, index) => (
                <div key={index} className="text-center">
                  <div className="h-24 flex flex-col justify-end">
                    <div 
                      className={`w-full mx-auto ${returnValue >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ height: `${Math.abs(returnValue) * 4}px` }}
                    ></div>
                  </div>
                  <div className={`text-sm font-medium mt-1 ${returnValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {returnValue >= 0 ? '+' : ''}{returnValue.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Month {index + 1}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Simulation; 