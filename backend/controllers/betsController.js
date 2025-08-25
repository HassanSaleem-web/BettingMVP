const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const UserBet = require('../models/UserBet');
const moment = require('moment');
const Fixture = require('../models/Fixture');
const fetchFixtureResult = require('../utils/fetchData');



// Helper to read and parse the value bets CSV
const loadValueBetsCSV = async() => {
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
    let maxWin = 0,
        maxLoss = 0;
    let cur = 0,
        bestStreak = 0,
        worstStreak = 0,
        lastResult = null;

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


// ✅ 1. Read value bets
exports.getValueBets = async(req, res) => {
    try {
        const rows = await loadValueBetsCSV();
        const valueBets = rows
            .filter(r => r.isValueBet === 'True' || r.isValueBet === 'TRUE')
            .map(r => ({
                match_id: r.fixtureId,
                team1: r.HomeTeam,
                team2: r.AwayTeam,
                sport: r.Sport || 'Football',
                odds: parseFloat(r.chosen_odds),
                predicted_win_prob: parseFloat(r.chosen_prob),
                expected_value: parseFloat(r.Expected_Value),
                isValueBet: true
            }));
        res.json(valueBets);
    } catch (err) {
        console.error('Error loading value bets:', err.message);
        res.status(500).json({ error: 'Failed to load value bets' });
    }
};

// ✅ 3. Place a bet
exports.placeBet = async(req, res) => {
    console.log("Bet placed");
    try {
        const { user_id, fixture_id, stake } = req.body;
        console.log(user_id, fixture_id, stake)

        const rows = await loadValueBetsCSV();
        const match = rows.find(r => r.fixtureId ?.toString() === fixture_id);

        if (!match) {
            return res.status(404).json({ error: 'Match not found in CSV' });
        }

        const existingBet = await UserBet.findOne({ user_id, fixture_id });
        if (existingBet) {
            return res.status(400).json({ message: 'You already placed a bet on this match.' });
        }

        const odds = parseFloat(match.chosen_odds);
        const isValueBet = match.isValueBet ?.trim();

        const bet = new UserBet({
            user_id,
            fixture_id,
            stake,
            sport: "Football",
            odds,
            ev: parseFloat(match.Expected_Value),
            placed_at: new Date(),
            payout: 0,
            profit: 0,
            isValueBet
        });

        await bet.save();
        res.json({ message: 'Bet placed successfully', bet });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to place bet' });
    }
};


exports.getBankrollGrowth = async(req, res) => {
    try {
        const { user_id } = req.query;
        const bets = await UserBet.find({ user_id, status: { $ne: 'pending' } }).sort({ placed_at: 1 });
        let bankroll = 1000;
        const growth = [];
        for (const bet of bets) {
            bankroll += bet.profit || 0;
            growth.push({ date: new Date(bet.placed_at).toISOString().split('T')[0], bankroll: parseFloat(bankroll.toFixed(2)) });
        }
        res.json(growth);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to calculate bankroll growth' });
    }
};


// ✅ 4. User bet history
exports.getUserBets = async(req, res) => {
    try {
        const { user_id } = req.query;
        console.log('user id', user_id);

        // Get user bets
        const bets = await UserBet.find({ user_id }).sort({ placed_at: -1 });

        if (!bets.length) {
            return res.json([]);
        }

        // Extract all fixtureIds from bets
        const fixtureIds = bets.map(b => b.fixture_id);
        // Fetch corresponding fixtures
        const fixtures = await Fixture.find({ fixtureId: { $in: fixtureIds } });

        // Attach home vs away info to each bet
        const betsWithTeams = bets.map(bet => {
            const fixture = fixtures.find(
                f => f.fixtureId.toString() === bet.fixture_id.toString()
            );
            return {
                ...bet.toObject(),
                match: fixture ?
                    `${fixture.homeTeam?.name} vs ${fixture.awayTeam?.name}` :
                    "Fixture not found"
            };
        });


        res.json(betsWithTeams);
    } catch (err) {
        console.error("Error in getUserBets:", err);
        res.status(500).json({ error: "Failed to load user bets" });
    }
};


exports.deleteUserBet = async(req, res) => {
    try {
        const { bet_id } = req.body;
        const bet = await UserBet.findByIdAndUpdate(bet_id, { isDeleted: true }, { new: true });
        if (!bet) return res.status(404).json({ error: "Bet not found" });
        res.json({ message: "Bet marked as deleted", bet });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete bet" });
    }
};

// ✅ 5. All model-evaluated bets
exports.getAllBets = async(req, res) => {
    try {
        const rows = await loadValueBetsCSV();
        //console.log(`[getAllBets] total_rows_loaded=${rows.length}`);

        // Filter out rows that have missing features only
        const usable = rows.filter(r => String(r.reason || '').trim().toLowerCase() !== 'missing_features');
        //console.log(`[getAllBets] removed_missing_features=${rows.length - usable.length} usable=${usable.length}`);

        const leagueMap = {
            '0': 'Bundesliga',
            '1': 'Premier League',
            '2': 'Ligue 1',
            '3': 'Serie A',
            '4': 'La Liga'
        };

        // No slicing; map over all usable rows
        const allBets = usable.map(r => {
            const odds = parseFloat(r.chosen_odds);
            const prob = parseFloat(r.chosen_prob);
            const ev = parseFloat(r.Expected_Value);

            let selection = 'N/A';
            const pred = r.FTR_pred ?.trim ?.();
            if (pred === 'H') selection = 'Home Win';
            else if (pred === 'A') selection = 'Away Win';
            else if (pred === 'D') selection = 'Draw';

            // Prefer CSV-provided reason; otherwise compute if possible; else fallback
            let reason = String(r.reason || '').trim();
            if (!reason) {
                if (Number.isFinite(odds) && odds > 0 && Number.isFinite(prob) && Number.isFinite(ev)) {
                    const impliedProb = 1 / odds;
                    reason = `Model predicts ${(prob * 100).toFixed(1)}% win probability, but implied odds only ${(impliedProb * 100).toFixed(1)}% → EV: ${(ev * 100).toFixed(1)}%`;
                } else {
                    reason = 'odds_unavailable';
                }
            }

            return {
                date: r.Date,
                match_id: r.fixtureId, // using fixtureId as match_id
                team1: r.HomeTeam,
                team2: r.AwayTeam,
                sport: r.Sport || 'Football',
                league: leagueMap[r.Div_enc ?.trim ?.()] || 'Unknown',
                odds: Number.isFinite(odds) ? odds : null,
                predicted_win_prob: Number.isFinite(prob) ? prob : null,
                expected_value: Number.isFinite(ev) ? ev : null,
                isValueBet: r.isValueBet === 'True' || r.isValueBet === 'TRUE',
                selection,
                reason,
                home_win_odds: Number.isFinite(parseFloat(r.Est_BbAvH)) ? parseFloat(r.Est_BbAvH) : null,
                draw_odds: Number.isFinite(parseFloat(r.Est_BbAvD)) ? parseFloat(r.Est_BbAvD) : null,
                away_win_odds: Number.isFinite(parseFloat(r.Est_BbAvA)) ? parseFloat(r.Est_BbAvA) : null
            };
        });

        //console.log(`[getAllBets] returned_rows=${allBets.length}`);
        res.json(allBets);
    } catch (err) {
        //console.error('Error loading all bets:', err.message);
        res.status(500).json({ error: 'Failed to load all bets' });
    }
};



exports.updateResults = async(req, res) => {
    try {
        const { user_id } = req.query;

        if (!user_id) {
            return res.status(400).json({ message: "user_id is required." });
        }

        // find pending bets for that user only
        const pendingBets = await UserBet.find({
            user_id,
            result: 'pending',
            isDeleted: false
        });

        if (!pendingBets.length) {
            return res.status(200).json({ message: "No pending bets found for this user." });
        }

        const fixtureIds = pendingBets.map(b => b.fixture_id);

        const fixtures = await Fixture.find({ fixtureId: { $in: fixtureIds } });

        let updates = 0;

        for (const bet of pendingBets) {
            // const fixture = fixtures.find(f => f.fixtureId === bet.fixture_id);

            // fetch actual result from external API / DB
            const actual = await fetchFixtureResult(bet.fixture_id);
            console.log(actual);
            if (!actual) continue;

            let outcome;
            if (actual === 'H') outcome = 'home';
            else if (actual === 'A') outcome = 'away';
            else if (actual === 'D') outcome = 'draw';
            else continue;

            // update bet result
            bet.result = outcome === bet.selectedOutcome ? 'won' : 'lost';
            bet.status = 'FT'; // mark fixture finished
            await bet.save();
            updates++;
        }

        res.status(200).json({ message: `${updates} bets updated.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update bet results.' });
    }
};


// Dummy version for now (actual version would check real match results)
exports.resolveResults = async(req, res) => {
    try {
        const userId = req.user.id;
        const userBets = await UserBet.find({ userId });
        const pendingBets = userBets.filter(b => b.result === 'pending');

        const fixtureIds = pendingBets.map(b => b.fixtureId);
        const fixtures = await Fixture.find({ fixtureId: { $in: fixtureIds } });

        for (const bet of pendingBets) {
            const fixture = fixtures.find(f => f.fixtureId === bet.fixtureId);

            if (!fixture || !fixture.result || !fixture.result.FTR) continue;

            const actual = fixture.result.FTR;
            let outcome;
            if (actual === 'H') outcome = 'home';
            else if (actual === 'A') outcome = 'away';
            else if (actual === 'D') outcome = 'draw';
            else continue;

            bet.result = outcome === bet.selectedOutcome ? 'won' : 'lost';
            await bet.save();
        }

        const updatedBets = await Bet.find({ userId });
        res.status(200).json(updatedBets);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to retrieve bets.' });
    }
};

exports.getAnalytics = async(req, res) => {
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

        console.log("filtered", filtered);

        // ✅ Corrected AI Accuracy block
        const aiBets = filtered.filter(
            bet => bet.isValueBet === true || bet.isValueBet === 'True' || bet.isValueBet === 'TRUE'
        );
        console.log("aiBets", aiBets);
        const correctAIPredictions = aiBets.filter(bet => bet.status === 'won').length;
        const aiAccuracy = aiBets.length > 0 ? (correctAIPredictions / aiBets.length) * 100 : 0;


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
            aiAccuracy: aiAccuracy !== null ? parseFloat(aiAccuracy.toFixed(2)) : 0,
            sportBreakdown,
            dailyProfitLoss
        });

    } catch (err) {
        console.error('Analytics error:', err.message);
        res.status(500).json({ error: 'Failed to calculate analytics' });
    }
};


exports.updateResults = async(req, res) => {
    try {
        const pendingBets = await UserBet.find({ status: 'pending', isDeleted: { $ne: true } });

        if (!pendingBets.length) {
            return res.json({ message: 'No pending bets found.' });
        }

        let updated = 0;

        for (const bet of pendingBets) {
            const [, home, away] = bet.match_id.split('-');

            const fixture = await Fixture.findOne({
                'homeTeam.name': home,
                'awayTeam.name': away,
                timestamp: { $lt: Math.floor(Date.now() / 1000) }, // already kicked off
                status: 'FT', // match finished
                FTR: { $in: ['H', 'D', 'A'] } // result present
            });

            if (!fixture) continue;

            const actual = fixture.FTR ?.trim();
            const predicted = bet.result ?.trim() || fixture.FTR_pred ?.trim();
            const isWin = actual === predicted;
            const profit = isWin ? (bet.odds * bet.stake - bet.stake) : -bet.stake;

            bet.status = isWin ? 'won' : 'lost';
            bet.result = actual;
            bet.payout = isWin ? bet.odds * bet.stake : 0;
            bet.profit = profit;

            await bet.save();
            updated++;
        }

        return res.json({
            message: `✅ Updated ${updated} bets with real match results.`,
            updated
        });

    } catch (err) {
        console.error('❌ Error in updateResults:', err.message);
        return res.status(500).json({ error: 'Failed to update results' });
    }
};


exports.simulateStrategy = async(req, res) => {
    try {
        const {
            bankroll = 1000,
                stake_type = "fixed",
                fixed_stake = 50,
                percent = 5,
                kelly_fraction = 0.1,
                ev_threshold = 0.02,
                min_odds = 1.5,
                max_odds = 5.0,
                timeframe = "3months"
        } = req.body;

        console.log("🧪 Simulation params received:", {
            bankroll,
            stake_type,
            fixed_stake,
            percent,
            kelly_fraction,
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

        const filtered = rows.filter(r => {
            const ev = parseFloat(r.Expected_Value);
            const odds = parseFloat(r.chosen_odds);
            const isValue = r.isValueBet === 'True' || r.isValueBet === 'TRUE';
            if (!odds || isNaN(ev) || isNaN(odds)) return false;
            if (ev < ev_threshold || odds < min_odds || odds > max_odds || !isValue) return false;

            if (timeframe !== "all") {
                let cutoff;
                switch (timeframe.toLowerCase()) {
                    case '1month':
                        cutoff = latestDate.clone().subtract(1, 'month');
                        break;
                    case '3months':
                    case 'quarter':
                        cutoff = latestDate.clone().subtract(3, 'months');
                        break;
                    case '6months':
                        cutoff = latestDate.clone().subtract(6, 'months');
                        break;
                    case '1year':
                        cutoff = latestDate.clone().subtract(1, 'year');
                        break;
                }
                const parsedDate = moment(r.Date, ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]);
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
        let wins = 0,
            losses = 0;
        let totalProfit = 0;
        let totalLoss = 0;
        let peak = currentBankroll;
        let maxDrawdown = 0;

        for (const r of filtered) {
            const odds = parseFloat(r.chosen_odds);
            const prob = parseFloat(r.chosen_prob) || 0.5;
            const date = moment(r.Date, ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]).format("YYYY-MM-DD");

            let stake;
            if (stake_type === "fixed") {
                stake = fixed_stake;
            } else if (stake_type === "percentage" || stake_type === "percent") {
                stake = currentBankroll * (percent / 100);
            } else if (stake_type === "kelly") {
                const b = odds - 1;
                const q = 1 - prob;
                const fullKelly = ((b * prob - q) / b) * currentBankroll;
                stake = fullKelly * kelly_fraction;
            }

            if (stake > currentBankroll || stake <= 0 || isNaN(stake)) continue;

            const isWin = r.FTR === r.FTR_pred;
            const profit = isWin ? stake * (odds - 1) : -stake;
            currentBankroll += profit;

            if (isWin) {
                wins++;
                totalProfit += profit;
            } else {
                losses++;
                totalLoss += -profit;
            }

            peak = Math.max(peak, currentBankroll);
            const drawdown = ((peak - currentBankroll) / peak) * 100;
            maxDrawdown = Math.max(maxDrawdown, drawdown);

            timeline.push({ date, bankroll: parseFloat(currentBankroll.toFixed(2)) });
        }

        const safe = (n, digits = 2) => (typeof n === 'number' && !isNaN(n) ? parseFloat(n.toFixed(digits)) : 0);

        const finalBankroll = safe(currentBankroll);
        const roi = safe(((finalBankroll - bankroll) / bankroll) * 100);
        const winRate = safe(wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0);
        const profitFactor = safe(totalLoss > 0 ? totalProfit / totalLoss : 0);

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
                if (start !== null && end !== null && currentMonth) {
                    const ret = ((end - start) / start) * 100;
                    monthlyReturns.push(safe(ret));
                }
                currentMonth = m;
                start = bankroll;
            }
            end = bankroll;
        });

        if (start !== null && end !== null) {
            const ret = ((end - start) / start) * 100;
            monthlyReturns.push(safe(ret));
        }

        res.json({
            startingBankroll: safe(bankroll),
            finalBankroll,
            totalBets: wins + losses,
            wonBets: wins,
            lostBets: losses,
            winRate,
            roi,
            maxDrawdown: safe(maxDrawdown),
            profitFactor,
            dailyData,
            monthlyReturns
        });

    } catch (err) {
        console.error("❌ Simulation error:", err.message);
        res.status(500).json({ error: "Simulation failed" });
    }
};