import React from 'react';

const BetTable = ({ bets }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match ID</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sport</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teams</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookmaker Odds</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Predicted Win %</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Value</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value Bet</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {bets.map(bet => (
            <tr key={bet.match_id} className={bet.value_bet ? "bg-green-50" : ""}>
              <td className="py-3 px-4 text-sm text-gray-900">{bet.match_id}</td>
              <td className="py-3 px-4 text-sm text-gray-900">{bet.sport}</td>
              <td className="py-3 px-4 text-sm text-gray-900">{bet.team1} vs {bet.team2}</td>
              <td className="py-3 px-4 text-sm text-gray-900">{bet.bookmaker_odds.toFixed(2)}</td>
              <td className="py-3 px-4 text-sm text-gray-900">{(bet.predicted_win_prob * 100).toFixed(1)}%</td>
              <td className={`py-3 px-4 text-sm font-medium ${bet.expected_value > 0 ? 'text-green-700' : 'text-red-700'}`}>
                {bet.expected_value.toFixed(3)}
              </td>
              <td className="py-3 px-4">
                {bet.value_bet ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    YES
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    NO
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BetTable; 