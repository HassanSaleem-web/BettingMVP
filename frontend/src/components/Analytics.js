import React, { useState } from 'react';

const Analytics = () => {
  const [timeframe, setTimeframe] = useState('all');
  
  // This data would come from API in a real app
  const performanceData = {
    totalBets: 157,
    wonBets: 89,
    lostBets: 68,
    profitLoss: 1247.50,
    roi: 12.3,
    averageOdds: 2.45,
    maxProfit: 350,
    maxLoss: -120,
    streaks: {
      currentStreak: 'W3', // 3 wins in a row
      bestStreak: 'W7',
      worstStreak: 'L4'
    },
    sportBreakdown: [
      { sport: 'Football', bets: 78, winRate: 61, profit: 753.20 },
      { sport: 'Basketball', bets: 42, winRate: 52, profit: 241.80 },
      { sport: 'Tennis', bets: 21, winRate: 57, profit: 328.50 },
      { sport: 'MMA', bets: 12, winRate: 50, profit: -75.00 },
      { sport: 'Hockey', bets: 4, winRate: 75, profit: 120.00 }
    ]
  };
  
  const handleTimeframeChange = (e) => {
    setTimeframe(e.target.value);
    // In a real app, this would trigger an API call to get data for the selected timeframe
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Performance Analytics</h2>
        
        <div className="flex items-center">
          <label htmlFor="timeframe" className="mr-2 text-sm font-medium text-gray-700">Timeframe:</label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={handleTimeframeChange}
            className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="quarter">Past 3 Months</option>
            <option value="year">Past Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>
      
      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Overall Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Bets:</span>
              <span className="text-sm font-medium">{performanceData.totalBets}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Win Rate:</span>
              <span className="text-sm font-medium">{((performanceData.wonBets / performanceData.totalBets) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Profit/Loss:</span>
              <span className={`text-sm font-medium ${performanceData.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {performanceData.profitLoss >= 0 ? '+' : ''}{performanceData.profitLoss.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">ROI:</span>
              <span className={`text-sm font-medium ${performanceData.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {performanceData.roi >= 0 ? '+' : ''}{performanceData.roi.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Avg. Odds:</span>
              <span className="text-sm font-medium">{performanceData.averageOdds.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Streaks & Records</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Current Streak:</span>
              <span className="text-sm font-medium">{performanceData.streaks.currentStreak}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Best Streak:</span>
              <span className="text-sm font-medium text-green-600">{performanceData.streaks.bestStreak}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Worst Streak:</span>
              <span className="text-sm font-medium text-red-600">{performanceData.streaks.worstStreak}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Biggest Win:</span>
              <span className="text-sm font-medium text-green-600">+{performanceData.maxProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Biggest Loss:</span>
              <span className="text-sm font-medium text-red-600">{performanceData.maxLoss.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 shadow-sm flex flex-col">
          <h3 className="text-lg font-medium text-gray-900 mb-4">AI Performance</h3>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                87.3%
              </div>
              <div className="text-sm text-gray-500">AI Prediction Accuracy</div>
              <div className="mt-4 text-xs text-gray-400">
                Based on 500+ predictions
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Profit/Loss Chart */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profit/Loss Over Time</h3>
        <div className="h-64 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
          <p className="text-gray-500">Profit/Loss line chart would appear here</p>
        </div>
      </div>
      
      {/* Sport Breakdown */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance by Sport</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sport
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bets
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Win Rate
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit/Loss
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {performanceData.sportBreakdown.map((sport) => (
                <tr key={sport.sport} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{sport.sport}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{sport.bets}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{sport.winRate}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${sport.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {sport.profit >= 0 ? '+' : ''}{sport.profit.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${sport.profit >= 0 ? 'bg-green-600' : 'bg-red-600'}`} 
                        style={{ width: `${Math.min(100, Math.abs(sport.profit / 10))}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Export Reports */}
      <div className="mt-8 flex justify-end">
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          Export Report
        </button>
      </div>
    </div>
  );
};

export default Analytics; 