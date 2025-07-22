const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const UserBet = require('../models/UserBet');
const moment = require('moment');

// Helper to read and parse the value bets CSV
const loadValueBetsCSV = async () => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(__dirname, '..', 'ai_model', 'ValueBets_Deployable.csv');
        const rows = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
};

function filterByTimeframe(bets, timeframe) {
  if (timeframe === 'all') return bets;
  const now = moment();
  const cutoff = {
    week: now.clone().subtract(7, 'days'),
    month: now.clone().subtract(1, 'month'),
    quarter: now.clone().subtract(3, 'months'),
    year: now.clone().subtract(1, 'year'),
  }[timeframe];

  return bets.filter(b => moment(b.placed_at).isAfter(cutoff));
}

function calculateStreaks(bets) {
  let maxWin = 0, maxLoss = 0;
  let cur = 0, bestStreak = 0, worstStreak = 0, lastResult = null;

  for (let b of bets) {
    if (b.profit > maxWin) maxWin = b.profit;
    if (b.profit < maxLoss) maxLoss = b.profit;
  }

  for (let b of bets) {
    const isWin = b.status === 'won';
    if (isWin === lastResult) {
      cur++;
    } else {
      cur = 1;
      lastResult = isWin;
    }
    if (isWin) bestStreak = Math.max(bestStreak, cur);
    else worstStreak = Math.max(worstStreak, cur);
  }

  let recent = [];
  for (let i = bets.length - 1; i >= 0; i--) {
    const res = bets[i].status === 'won' ? 'W' : 'L';
    if (recent.length === 0 || recent[0][0] === res) {
      if (recent.length === 0) recent.push([res, 1]);
      else recent[0][1]++;
    } else break;
  }

  return {
    currentStreak: recent.length ? `${recent[0][0]}${recent[0][1]}` : '',
    bestStreak: `W${bestStreak}`,
    worstStreak: `L${worstStreak}`,
    maxWin,
    maxLoss
  };
}

function aggregateByDate(bets) {
  const map = {};
  for (let b of bets) {
    const d = moment(b.placed_at).format('YYYY-MM-DD');
    if (!map[d]) map[d] = 0;
    map[d] += b.profit;
  }
  return Object.entries(map).map(([date, profit]) => ({ date, profit }));
}


// Match ID generator based on unique key (team names + date)
const matchIdMap = {};
const generateMatchId = (home, away, date = '') => {
    const key = `${home}-${away}-${date}`;
    if (!matchIdMap[key]) {
        const id = Math.floor(100000 + Math.random() * 900000); // 6-digit
        matchIdMap[key] = `${id}-${home}-${away}`;
    }
    return matchIdMap[key];
};

// ✅ 1. Read value bets
exports.getValueBets = async (req, res) => {
    try {
        const rows = await loadValueBetsCSV();
        const valueBets = rows
            .filter(r => r.isValueBet === 'True' || r.isValueBet === 'TRUE')
            .map(r => ({
                match_id: generateMatchId(r.HomeTeam, r.AwayTeam, r.Date || ''),
                team1: r.HomeTeam,
                team2: r.AwayTeam,
                sport: r.Sport || 'Football',
                odds: parseFloat(r.chosen_odds),
                predicted_win_prob: parseFloat(r.chosen_prob),
                expected_value: parseFloat(r.Expected_Value),
                isValueBet: true
            }))
            .slice(0, 10);
        res.json(valueBets);
    } catch (err) {
        console.error('Error loading value bets:', err.message);
        res.status(500).json({ error: 'Failed to load value bets' });
    }
};

// // ✅ 2. Historical bets
// exports.getHistoricalBets = async (req, res) => {
//     try {
//         const rows = await loadValueBetsCSV();
//         const result = rows
//             .filter(r => r.FTR && r.FTR_pred)
//             .map(r => {
//                 const profit = r.FTR === r.FTR_pred ? (parseFloat(r.chosen_odds) - 1).toFixed(2) : "-1.00";
//                 return {
//                     match_id: generateMatchId(r.HomeTeam, r.AwayTeam, r.Date || ''),
//                     match: `${r.HomeTeam} vs ${r.AwayTeam}`,
//                     predicted: r.FTR_pred,
//                     actual: r.FTR,
//                     odds: parseFloat(r.chosen_odds).toFixed(2),
//                     probability: (parseFloat(r.chosen_prob) * 100).toFixed(1) + '%',
//                     ev: (parseFloat(r.Expected_Value) * 100).toFixed(1) + '%',
//                     profitLoss: profit
//                 };
//             })
//             .slice(0, 50);
//         res.json(result);
//     } catch (err) {
//         res.status(500).json({ error: 'Failed to load historical bets' });
//     }
// };

// ✅ 3. Place a bet
exports.placeBet = async (req, res) => {
  try {
    const { username, match_id, stake } = req.body;
    const rows = await loadValueBetsCSV();

    const match = rows.find(r =>
      generateMatchId(r.HomeTeam, r.AwayTeam, r.Date || '') === match_id
    );

    if (!match) {
      return res.status(404).json({ error: 'Match not found in CSV' });
    }

    const actualResult = match.FTR?.trim();
    const predictedResult = match.FTR_pred?.trim();

    const isCorrect = actualResult && predictedResult && actualResult === predictedResult;
    const odds = parseFloat(match.chosen_odds);
    const profit = isCorrect ? (odds * stake - stake) : -stake;

    const bet = new UserBet({
      user_id: username,
      match_id,
      stake,
      sport: "Football",
      odds,
      ev: parseFloat(match.Expected_Value),
      placed_at: new Date(),
      result: actualResult || "N/A",
      status: isCorrect ? "won" : "lost",
      payout: isCorrect ? odds * stake : 0,
      profit
    });

    await bet.save();
    res.json({ message: 'Bet placed successfully', bet });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to place bet' });
  }
};


// ✅ 4. User bet history
exports.getUserBets = async (req, res) => {
    try {
        const { user_id } = req.query;
        const bets = await UserBet.find({ user_id }).sort({ placed_at: -1 });
        res.json(bets);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load user bets' });
    }
};

// ✅ 5. All model-evaluated bets
exports.getAllBets = async (req, res) => {
    try {
        const rows = await loadValueBetsCSV();

        const filtered = rows.filter(r =>
            r.HomeTeam && r.AwayTeam &&
            r.chosen_odds && r.chosen_prob && r.Expected_Value &&
            parseFloat(r.Expected_Value) <= 0.5
        );


        // ✅ Daily Offset Calculation
        const dayOffset = new Date().getDate(); // e.g. 1 to 31
        const startIndex = (dayOffset * 20) % filtered.length;
        const endIndex = startIndex + 20;

        const sliced = filtered.slice(startIndex, endIndex);

        const allBets = sliced.map(r => ({
            match_id: generateMatchId(r.HomeTeam, r.AwayTeam, r.Date || ''),
            team1: r.HomeTeam,
            team2: r.AwayTeam,
            sport: r.Sport || 'Football',
            odds: parseFloat(r.chosen_odds),
            predicted_win_prob: parseFloat(r.chosen_prob),
            expected_value: parseFloat(r.Expected_Value),
            isValueBet: r.isValueBet === 'True' || r.isValueBet === 'TRUE'
        }));

        res.json(allBets);
    } catch (err) {
        console.error('Error loading all bets:', err.message);
        res.status(500).json({ error: 'Failed to load all bets' });
    }
};



exports.getBankrollGrowth = async (req, res) => {
  try {
    const { user_id } = req.query;
    const bets = await UserBet.find({ user_id, status: { $ne: 'pending' } }).sort({ placed_at: 1 });

    let bankroll = 1000;
    const growth = [];

    for (const bet of bets) {
      bankroll += bet.profit || 0;
      growth.push({
        date: new Date(bet.placed_at).toISOString().split('T')[0],
        bankroll: parseFloat(bankroll.toFixed(2))
      });
    }

    res.json(growth);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to calculate bankroll growth' });
  }
};

// Dummy version for now (actual version would check real match results)
exports.resolveResults = async (req, res) => {
  try {
    const pendingBets = await UserBet.find({ status: 'pending' });

    for (const bet of pendingBets) {
      // Dummy logic: mark as won if odds > 2, else lost
      const isWin = bet.odds > 2;

      bet.status = isWin ? 'won' : 'lost';
      bet.profit = isWin ? (bet.odds * bet.stake - bet.stake) : -bet.stake;
      await bet.save();
    }

    res.json({ message: 'Bet results resolved', count: pendingBets.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to resolve bet results' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { user_id, timeframe = 'all' } = req.query;
    const bets = await UserBet.find({ user_id, status: { $ne: 'pending' } }).sort({ placed_at: 1 });

    const filtered = filterByTimeframe(bets, timeframe);
    const totalBets = filtered.length;
    const wonBets = filtered.filter(b => b.status === 'won').length;
    const lostBets = totalBets - wonBets;

    const profitLoss = filtered.reduce((sum, b) => sum + (b.profit || 0), 0);
    const totalStake = filtered.reduce((sum, b) => sum + (b.stake || 0), 0);
    const roi = totalStake > 0 ? (profitLoss / totalStake) * 100 : 0;

    const averageOdds = totalBets > 0 ? filtered.reduce((sum, b) => sum + (b.odds || 0), 0) / totalBets : 0;

    const maxProfit = filtered.length > 0 ? Math.max(...filtered.map(b => b.profit || 0)) : 0;
    const maxLoss = filtered.length > 0 ? Math.min(...filtered.map(b => b.profit || 0)) : 0;

    const streaks = calculateStreaks(filtered);

    // ✅ Corrected AI Accuracy block
    const aiBets = filtered.filter(bet => bet.isValueBet === true);
    const correctAIPredictions = aiBets.filter(bet => bet.status === 'won').length;
    const aiAccuracy = aiBets.length > 0 ? (correctAIPredictions / aiBets.length) * 100 : null;

    // ✅ Sport Breakdown
    const sportMap = {};
    for (const b of filtered) {
      if (!sportMap[b.sport]) sportMap[b.sport] = { bets: 0, wins: 0, profit: 0 };
      sportMap[b.sport].bets++;
      if (b.status === 'won') sportMap[b.sport].wins++;
      sportMap[b.sport].profit += b.profit || 0;
    }
    const sportBreakdown = Object.entries(sportMap).map(([sport, d]) => ({
      sport,
      bets: d.bets,
      winRate: d.bets > 0 ? ((d.wins / d.bets) * 100).toFixed(0) : '0',
      profit: parseFloat(d.profit.toFixed(2))
    }));

    const dailyProfitLoss = aggregateByDate(filtered);

    res.json({
      totalBets,
      wonBets,
      lostBets,
      profitLoss: parseFloat(profitLoss.toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      averageOdds: parseFloat(averageOdds.toFixed(2)),
      maxProfit: parseFloat(maxProfit.toFixed(2)),
      maxLoss: parseFloat(maxLoss.toFixed(2)),
      streaks,
      aiAccuracy: aiAccuracy !== null ? parseFloat(aiAccuracy.toFixed(2)) : null,
      sportBreakdown,
      dailyProfitLoss
    });

  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ error: 'Failed to calculate analytics' });
  }
};


exports.simulateStrategy = async (req, res) => {
  try {
    const {
      bankroll = 1000,
      stake_type = "fixed",
      fixed_stake = 50,
      percent = 5,
      ev_threshold = 0,
      min_odds = 1.01,
      max_odds = 100,
      timeframe = "year"
    } = req.body;

    console.log("🧪 Simulation params received:", {
      bankroll,
      stake_type,
      fixed_stake,
      percent,
      ev_threshold,
      min_odds,
      max_odds,
      timeframe
    });

    const rows = await loadValueBetsCSV();
    console.log("📊 Total rows loaded from CSV:", rows.length);

    const latestDate = moment.max(
      rows.map(r => moment(r.Date, ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]))
    );
    console.log("The latest date is:", latestDate);
    

    const filtered = rows.filter(r => {
      const ev = parseFloat(r.Expected_Value);
      const odds = parseFloat(r.chosen_odds);
      const isValue = r.isValueBet === 'True' || r.isValueBet === 'TRUE' || r.Value_Bet === 'True';
      if (!odds || isNaN(ev) || isNaN(odds)) return false;
      if (ev < ev_threshold || odds < min_odds || odds > max_odds || !isValue) return false;
      // console.log("timeframe", timeframe);
      if (timeframe !== "all") {
        let cutoff = null;
        switch (timeframe.toLowerCase()) {
          case '1month': cutoff = latestDate.clone().subtract(1, 'month'); break;
          case 'quarter':
          case '3months': cutoff = latestDate.clone().subtract(3, 'months'); break;
          case '6months': cutoff = latestDate.clone().subtract(6, 'months'); break;
          case '1year': cutoff = latestDate.clone().subtract(1, 'year'); break;
        }
        const parsedDate = moment(r.Date, ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]);
        //console.log("parsedDate", parsedDate)
        if (cutoff && !parsedDate.isAfter(cutoff)) return false;
      }

      return true;
    });

    

    console.log("✅ Filtered rows after applying criteria:", filtered.length);
    const filteredDates = filtered
      .map(r => moment(r.Date, ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]))
      .filter(d => d.isValid());

    const oldestDate = moment.min(filteredDates);
    console.log("📅 Oldest date used in simulation:", oldestDate.format("YYYY-MM-DD"));


    let currentBankroll = parseFloat(bankroll);
    const timeline = [];
    let wins = 0, losses = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let peak = bankroll;
    let maxDrawdown = 0;

    for (const r of filtered) {
      const odds = parseFloat(r.chosen_odds);
      const prob = parseFloat(r.chosen_prob);
      const ev = parseFloat(r.Expected_Value);
      const date = moment(r.Date, ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]).format("YYYY-MM-DD");

      let stake = stake_type === "fixed" ? fixed_stake
                : stake_type === "percent" ? currentBankroll * (percent / 100)
                : ((prob * odds - 1) / (odds - 1)) * currentBankroll;

      if (stake > currentBankroll || stake <= 0 || isNaN(stake)) continue;

      const isWin = r.FTR === r.FTR_pred;
      const profit = isWin ? stake * (odds - 1) : -stake;
      currentBankroll += profit;
      isWin ? (wins++, totalProfit += profit) : (losses++, totalLoss += -profit);

      peak = Math.max(peak, currentBankroll);
      const drawdown = ((peak - currentBankroll) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);

      timeline.push({ date, bankroll: parseFloat(currentBankroll.toFixed(2)) });
    }

    const finalBankroll = parseFloat(currentBankroll.toFixed(2));
    const roi = ((finalBankroll - bankroll) / bankroll) * 100;
    const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : null;

    const dateToBankroll = {};
    timeline.forEach(({ date, bankroll }) => {
      dateToBankroll[date] = bankroll;
    });

    const sortedDates = Object.keys(dateToBankroll).sort();
    const dailyData = sortedDates.map((date, i) => ({
      day: i + 1,
      date,
      bankroll: dateToBankroll[date]
    }));

    const monthlyReturns = [];
    let currentMonth = null;
    let start = null;
    let end = null;

    dailyData.forEach(({ date, bankroll }) => {
      const m = moment(date).format("YYYY-MM");
      if (currentMonth !== m) {
        if (start && end && currentMonth) {
          const ret = ((end - start) / start) * 100;
          monthlyReturns.push(parseFloat(ret.toFixed(2)));
        }
        currentMonth = m;
        start = bankroll;
      }
      end = bankroll;
    });

    res.json({
      startingBankroll: parseFloat(bankroll),
      finalBankroll,
      totalBets: wins + losses,
      wonBets: wins,
      lostBets: losses,
      winRate: parseFloat(winRate.toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      profitFactor: profitFactor ? parseFloat(profitFactor.toFixed(2)) : null,
      dailyData,
      monthlyReturns
    });
  } catch (err) {
    console.error("❌ Simulation error:", err.message);
    res.status(500).json({ error: "Simulation failed" });
  }
};






