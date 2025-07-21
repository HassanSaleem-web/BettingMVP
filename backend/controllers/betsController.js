const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const UserBet = require('../models/UserBet');

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

// ✅ 2. Historical bets
exports.getHistoricalBets = async (req, res) => {
    try {
        const rows = await loadValueBetsCSV();
        const result = rows
            .filter(r => r.FTR && r.FTR_pred)
            .map(r => {
                const profit = r.FTR === r.FTR_pred ? (parseFloat(r.chosen_odds) - 1).toFixed(2) : "-1.00";
                return {
                    match_id: generateMatchId(r.HomeTeam, r.AwayTeam, r.Date || ''),
                    match: `${r.HomeTeam} vs ${r.AwayTeam}`,
                    predicted: r.FTR_pred,
                    actual: r.FTR,
                    odds: parseFloat(r.chosen_odds).toFixed(2),
                    probability: (parseFloat(r.chosen_prob) * 100).toFixed(1) + '%',
                    ev: (parseFloat(r.Expected_Value) * 100).toFixed(1) + '%',
                    profitLoss: profit
                };
            })
            .slice(0, 50);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load historical bets' });
    }
};

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
        const allBets = rows
            .filter(r =>
                r.HomeTeam && r.AwayTeam &&
                r.chosen_odds && r.chosen_prob && r.Expected_Value
            )
            .map(r => ({
                match_id: generateMatchId(r.HomeTeam, r.AwayTeam, r.Date || ''),
                team1: r.HomeTeam,
                team2: r.AwayTeam,
                sport: r.Sport || 'Football',
                odds: parseFloat(r.chosen_odds),
                predicted_win_prob: parseFloat(r.chosen_prob),
                expected_value: parseFloat(r.Expected_Value),
                isValueBet: r.isValueBet === 'True' || r.isValueBet === 'TRUE'
            }))
            .slice(0, 20);

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


