import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const ValueChart = ({ bets }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && bets.length > 0) {
      // Destroy previous chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Prepare data for the chart
      const matchIds = bets.map(bet => `Match ${bet.match_id}`);
      const expectedValues = bets.map(bet => bet.expected_value);
      const colors = bets.map(bet => bet.value_bet ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)');
      const borderColors = bets.map(bet => bet.value_bet ? 'rgb(22, 163, 74)' : 'rgb(220, 38, 38)');

      // Create new chart
      const ctx = chartRef.current.getContext('2d');
      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: matchIds,
          datasets: [{
            label: 'Expected Value (EV)',
            data: expectedValues,
            backgroundColor: colors,
            borderColor: borderColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                afterLabel: function(context) {
                  const index = context.dataIndex;
                  const bet = bets[index];
                  return [
                    `Sport: ${bet.sport}`,
                    `Teams: ${bet.team1} vs ${bet.team2}`,
                    `Bookmaker Odds: ${bet.bookmaker_odds.toFixed(2)}`,
                    `Predicted Win Probability: ${(bet.predicted_win_prob * 100).toFixed(1)}%`,
                    `Value Bet: ${bet.value_bet ? 'YES' : 'NO'}`
                  ];
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Expected Value'
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Match ID'
              },
              grid: {
                display: false
              }
            }
          }
        }
      });
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [bets]);

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Expected Value by Match</h3>
      <div className="h-80">
        <canvas ref={chartRef}></canvas>
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Green bars represent positive EV (value bets), red bars represent negative EV.
      </p>
    </div>
  );
};

export default ValueChart; 