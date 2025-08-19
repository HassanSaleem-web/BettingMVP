const fetch = require('node-fetch');
const Fixture = require('../models/Fixture');
const Meta = require('../models/Meta');
require('dotenv').config();
const FALLBACK_TEAM_LOOKUP = require('./../config/teamLookup');

const RAPIDAPI_BASE = process.env.RAPIDAPI_BASE;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

const LEAGUES = [78, 140, 61, 135, 39]; // Bundesliga, La Liga, Ligue 1, Serie A, EPL
const SEASON = 2025;
const BOOKMAKER_IDS = [8, 4]; // 8=Bet365, 4=Pinnacle
const FIXTURE_LOOKAHEAD_DAYS = 2;

// ---- league encoder (Div_enc) ----
const LEAGUE_DIV_ENC = {
  78: 0,   // Bundesliga
  140: 4,  // La Liga
  61: 2,   // Ligue 1
  135: 3,  // Serie A
  39: 1    // EPL
};

// ---- team encoders (from your provided JSON) ----
const TEAM_DATA = [
  { league: 'Premier League', teams: [
    { id: 33, enc: 86 }, // Man United
    { id: 40, enc: 77 }, // Liverpool
    { id: 42, enc: 6 },  // Arsenal
    { id: 49, enc: 31 }, // Chelsea
    { id: 50, enc: 85 }, // Man City
  ]},
  { league: 'Bundesliga', teams: [
    { id: 157, enc: 14 }, // Bayern
    { id: 165, enc: 38 }, // Dortmund
    { id: 168, enc: 75 }, // Leverkusen
  ]},
  { league: 'Ligue 1', teams: [
    { id: 85, enc: 104 }, // PSG
    { id: 91, enc: 91 },  // Monaco
  ]},
  { league: 'Serie A', teams: [
    { id: 489, enc: 90 },  // AC Milan
    { id: 492, enc: 95 },  // Napoli
    { id: 496, enc: 67 },  // Juventus
    { id: 497, enc: 113 }, // Roma
    { id: 505, enc: 66 },  // Inter
  ]},
  { league: 'La Liga', teams: [
    { id: 541, enc: 110 }, // Real Madrid
    { id: 529, enc: 12 },  // Barcelona
    { id: 530, enc: 10 },  // Atletico
    { id: 531, enc: 9 },   // Athletic Club
  ]},
];
//const ALLOWED_TEAM_IDS = new Set(TEAM_DATA.flatMap(l => l.teams.map(t => t.id)));
const TEAM_ID_TO_ENC = new Map(TEAM_DATA.flatMap(l => l.teams.map(t => [t.id, t.enc])));

for (const league of FALLBACK_TEAM_LOOKUP) {
  for (const team of league.teams) {
    const { id, enc } = team;
    if (!TEAM_ID_TO_ENC.has(id) && enc != null) {
      TEAM_ID_TO_ENC.set(id, enc);
    }
  }
}

/* ----------------- shared utils ----------------- */
//const delay = (ms) => new Promise(res => setTimeout(res, ms));
const apiHeaders = { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': RAPIDAPI_HOST };

function getDateRange() {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + FIXTURE_LOOKAHEAD_DAYS);
  const fmt = d => d.toISOString().split('T')[0];
  return { from: fmt(today), to: fmt(endDate) };
}

// extract H/D/A decimal odds from a single bookmaker payload
function extractMatchWinnerDecimals(bookPayload) {
  // structure: { bookmakers: [ { bets: [ { id:1, values:[{value:'Home', odd:'1.80'}, ...] } ] } ] }
  const bm = (bookPayload?.bookmakers || [])[0];
  if (!bm) return null;
  const bet = (bm.bets || []).find(b => b.id === 1);
  if (!bet) return null;

  const getOdd = (label) => {
    const v = (bet.values || []).find(x => x.value === label)?.odd;
    const num = v ? Number(v) : null;
    return Number.isFinite(num) && num > 1 ? num : null;
  };

  const H = getOdd('Home');
  const D = getOdd('Draw');
  const A = getOdd('Away');
  if (!H || !D || !A) return null;

  return { H, D, A };
}

// convert decimals to normalized implied probabilities
function impliedFromDecimals({ H, D, A }) {
  const pH = 1 / H;
  const pD = 1 / D;
  const pA = 1 / A;
  const sum = pH + pD + pA;
  return {
    H: pH / sum,
    D: pD / sum,
    A: pA / sum
  };
}

// average a list of prob triplets
function averageImplied(list) {
  const n = list.length;
  if (!n) return null;
  const sum = list.reduce((acc, x) => ({ H: acc.H + x.H, D: acc.D + x.D, A: acc.A + x.A }), { H: 0, D: 0, A: 0 });
  return { H: sum.H / n, D: sum.D / n, A: sum.A / n };
}

function averageDecimals(list) {
  const n = list.length;
  if (!n) return null;
  const sum = list.reduce((acc, x) => ({
    H: acc.H + x.H,
    D: acc.D + x.D,
    A: acc.A + x.A
  }), { H: 0, D: 0, A: 0 });
  return {
    H: sum.H / n,
    D: sum.D / n,
    A: sum.A / n
  };
}


/* ----------------- 1) fixtures (store minimal) ----------------- */
async function fetchAndStoreFixtures() {
  const { from, to } = getDateRange();
  const ops = [];

  const now = Math.floor(Date.now() / 1000);
  const maxAge = now - 7 * 24 * 3600;

  // STEP 1: Clean up past or invalid fixtures
  const oldFixtures = await Fixture.find({ timestamp: { $lt: now } }, { fixtureId: 1 });

  for (const fx of oldFixtures) {
    const url = new URL(`${RAPIDAPI_BASE}/fixtures`);
    url.searchParams.set('id', fx.fixtureId);
    const res = await fetch(url.toString(), { headers: apiHeaders });
    if (!res.ok) continue;

    const { response } = await res.json();
    const status = response?.[0]?.fixture?.status?.short;

    if (["FT", "AET", "PEN", "CANC", "PST", "ABD"].includes(status)) {
      await Fixture.deleteOne({ fixtureId: fx.fixtureId }); // ❌ remove it
    }

    //await delay(500); // avoid rate limit
  }

  // STEP 2: Fetch new fixtures for allowed teams
  for (const leagueId of LEAGUES) {
    const url = new URL(`${RAPIDAPI_BASE}/fixtures`);
    url.searchParams.set('league', leagueId);
    url.searchParams.set('season', SEASON);
    url.searchParams.set('status', 'NS');
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);

    const res = await fetch(url.toString(), { headers: apiHeaders });
    if (!res.ok) throw new Error(`Fixture fetch failed: ${res.status}`);
    const { response } = await res.json();

    for (const fx of response || []) {
      const homeId = fx.teams.home.id;
      const awayId = fx.teams.away.id;
      //if (!ALLOWED_TEAM_IDS.has(homeId) && !ALLOWED_TEAM_IDS.has(awayId)) continue;

      const div_enc = LEAGUE_DIV_ENC[fx.league.id];
      const HomeTeam_enc = TEAM_ID_TO_ENC.get(homeId) ?? null;
      const AwayTeam_enc = TEAM_ID_TO_ENC.get(awayId) ?? null;

      const minimal = {
        fixtureId: fx.fixture.id,
        date: fx.fixture.date,
        timestamp: fx.fixture.timestamp,
        leagueId: fx.league.id,
        Div_enc: div_enc,
        homeTeam: { id: homeId, name: fx.teams.home.name, enc: HomeTeam_enc },
        awayTeam: { id: awayId, name: fx.teams.away.name, enc: AwayTeam_enc },
        lastRefreshedAt: new Date()
      };

      ops.push({
        updateOne: {
          filter: { fixtureId: fx.fixture.id },
          update: { $set: minimal, $setOnInsert: { createdAt: new Date() } },
          upsert: true
        }
      });
    }

    //await delay(700);
  }

  if (ops.length) await Fixture.bulkWrite(ops);
  return ops.length;
}

/* ----------------- 2) odds -> store implied only ----------------- */
async function fetchOddsForFixtures() {
  const now = Math.floor(Date.now() / 1000);
  const week = now + FIXTURE_LOOKAHEAD_DAYS * 24 * 3600;
  const fixtures = await Fixture.find({ timestamp: { $gte: now, $lte: week } }, { fixtureId: 1 }).lean();

  for (const f of fixtures) {
    const fixtureId = f.fixtureId;
    const perBookImplied = {}; // { '8': {H,D,A}, '4': {H,D,A} }
    const perBookRaw = {};     // { '8': {H,D,A}, '4': {H,D,A} }

    for (const bookmakerId of BOOKMAKER_IDS) {
      const url = new URL(`${RAPIDAPI_BASE}/odds`);
      url.searchParams.set('fixture', fixtureId);
      url.searchParams.set('bookmaker', bookmakerId);
      url.searchParams.set('bet', '1'); // Match Winner

      const res = await fetch(url.toString(), { headers: apiHeaders });
      if (!res.ok) {
        console.warn(`Failed odds fetch for fixture ${fixtureId}, bookmaker ${bookmakerId} (status ${res.status})`);
        continue;
      }

      const { response } = await res.json();
      const raw = extractMatchWinnerDecimals(response?.[0]);
      if (raw) {
        const implied = impliedFromDecimals(raw);
        perBookRaw[String(bookmakerId)] = raw;
        perBookImplied[String(bookmakerId)] = implied;
      }
    }

    const Imp_B365 = perBookImplied['8'] || null;
    const avg = averageImplied(Object.values(perBookImplied));

    if (Imp_B365 || avg) {
      const setDoc = {};

      // Set implied probability fields
      if (Imp_B365) {
        setDoc.Imp_B365H = Imp_B365.H;
        setDoc.Imp_B365D = Imp_B365.D;
        setDoc.Imp_B365A = Imp_B365.A;
      }
      if (avg) {
        setDoc.Imp_BbAvH = avg.H;
        setDoc.Imp_BbAvD = avg.D;
        setDoc.Imp_BbAvA = avg.A;
      }

      // Set raw odds as nested field
      const mappedOdds = {};
      if (perBookRaw['8']) mappedOdds['Bet365'] = perBookRaw['8'];
      if (perBookRaw['4']) mappedOdds['Pinnacle'] = perBookRaw['4'];

      // Average raw odds (optional)
      const avgRaw = averageDecimals(Object.values(perBookRaw));
      if (avgRaw) mappedOdds['avg'] = avgRaw;

      // Add timestamp and set full object
      setDoc.odds = {
        ...mappedOdds,
        fetchedAt: new Date()
      };

      await Fixture.updateOne(
        { fixtureId },
        { $set: setDoc }
      );
    }
  }
}


/* ----------------- 3) last-5 -> store W/D/L and diffs only ----------------- */
function computeForm(teamId, pastFixtures = []) {
  let wins = 0, draws = 0, losses = 0;

  for (const fx of pastFixtures) {
    const homeId = fx.teams?.home?.id;
    const awayId = fx.teams?.away?.id;

    const hg = fx.goals?.home ?? fx.score?.fulltime?.home ?? null;
    const ag = fx.goals?.away ?? fx.score?.fulltime?.away ?? null;
    if (hg == null || ag == null) continue;

    const isHome = teamId === homeId;
    const isAway = teamId === awayId;
    if (!isHome && !isAway) continue;

    if (hg === ag) draws++;
    else if ((isHome && hg > ag) || (isAway && ag > hg)) wins++;
    else losses++;
  }

  return { wins, draws, losses };
}

async function fetchTeamLast5(teamId, leagueId, season = SEASON) {
  const url = new URL(`${RAPIDAPI_BASE}/fixtures`);
  url.searchParams.set('team', teamId);
  url.searchParams.set('league', leagueId);
  // url.searchParams.set('season', season);
  url.searchParams.set('last', '5');

  const res = await fetch(url.toString(), { headers: apiHeaders });
  if (!res.ok) throw new Error(`Last5 fetch failed (team ${teamId}, league ${leagueId}): ${res.status}`);
  const { response } = await res.json();
  return response || [];
}

async function fetchAndStoreLast5ForStoredFixtures({ forceRefresh = false, rateLimitMs = 600 } = {}) {
  // only fixtures in the coming week
  const now = Math.floor(Date.now() / 1000);
  const week = now + 8 * 24 * 3600;
  const fixtures = await Fixture.find(
    { timestamp: { $gte: now, $lte: week } },
    { fixtureId: 1, leagueId: 1, homeTeam: 1, awayTeam: 1 }
  ).lean();

  const cache = new Map(); // key `${leagueId}:${teamId}` -> {wins,draws,losses}

  const getForm = async (leagueId, teamId) => {
    const key = `${leagueId}:${teamId}`;
    if (!forceRefresh && cache.has(key)) return cache.get(key);
    const last5 = await fetchTeamLast5(teamId, leagueId, SEASON);
    const form = computeForm(teamId, last5);
    cache.set(key, form);
    //await delay(rateLimitMs);
    return form;
  };

  for (const fx of fixtures) {
    const leagueId = fx.leagueId;
    const homeId = fx.homeTeam?.id;
    const awayId = fx.awayTeam?.id;
    if (!leagueId || !homeId || !awayId) continue;

    const [homeForm, awayForm] = await Promise.all([
      getForm(leagueId, homeId),
      getForm(leagueId, awayId)
    ]);

    const setDoc = {
      // Existing flat fields
      Home_Wins_Last5: homeForm.wins,
      Home_Draws_Last5: homeForm.draws,
      Home_Losses_Last5: homeForm.losses,
      Away_Wins_Last5: awayForm.wins,
      Away_Draws_Last5: awayForm.draws,
      Away_Losses_Last5: awayForm.losses,
      Wins_Diff_Last5: homeForm.wins - awayForm.wins,
      Draws_Diff_Last5: homeForm.draws - awayForm.draws,
      Losses_Diff_Last5: homeForm.losses - awayForm.losses,
      formFetchedAt: new Date(),

      // ✅ Add this nested form field (which is defined in your schema)
      form: {
        home: {
          wins: homeForm.wins,
          draws: homeForm.draws,
          losses: homeForm.losses
        },
        away: {
          wins: awayForm.wins,
          draws: awayForm.draws,
          losses: awayForm.losses
        },
        formFetchedAt: new Date()
      }
    };


    await Fixture.updateOne(
      { fixtureId: fx.fixtureId },
      { $set: setDoc }
    );
  }
}

async function fetchFixtureResult(fixtureId) {
  try {
    const response = await axios.get(`${RAPIDAPI_BASE}/fixtures`, {
      params: { id: fixtureId },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    const fixture = response.data.response[0];
    const status = fixture?.fixture?.status?.short;
    const winner = fixture?.teams?.home?.winner === true ? 'H' :
                   fixture?.teams?.away?.winner === true ? 'A' :
                   status === 'FT' ? 'D' : null;

    return winner; // 'H', 'A', or 'D'
  } catch (err) {
    console.error(`Error fetching fixture ${fixtureId}:`, err.message);
    return null;
  }
}

// utils/dateTZ.js
function todayString() {
  const d = new Date();
  // format as YYYY-MM-DD in UTC
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function runOncePerDay(taskKey, fn) {
  const today = todayString();
  const key = `daily:${taskKey}:utc`;

  const doc = await Meta.findOneAndUpdate(
    {
      key,
      $or: [{ value: { $ne: today } }, { value: { $exists: false } }]
    },
    { $set: { value: today, updatedAt: new Date() } },
    { upsert: true, new: false }
  );

  const alreadyRanToday = doc && doc.value === today;
  if (alreadyRanToday) return false;

  await fn();
  return true;
}




/* ----------------- exports ----------------- */
module.exports = {
  fetchAndStoreFixtures,
  fetchOddsForFixtures,
  fetchAndStoreLast5ForStoredFixtures,
  fetchFixtureResult,
  runOncePerDay
};
