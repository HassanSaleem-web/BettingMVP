// controllers/indataController.js  (your existing file)

const {
  fetchAndStoreFixtures,
  fetchOddsForFixtures,
  fetchAndStoreLast5ForStoredFixtures
} = require('../utils/fetchData');
const Fixture = require('../models/Fixture');

// ✅ Reusable core (no req/res)
exports.runScanUpcoming = async ({ source = 'db', withOdds = false, withForm = false } = {}) => {
  // STEP 1: fixtures
  if (source === 'api') {
    await fetchAndStoreFixtures(); // upserts minimal docs
  }

  const now = Math.floor(Date.now() / 1000);
  const week = now + 8 * 24 * 3600; // keep as-is (your lookahead)
  let fixtures = await Fixture.find({ timestamp: { $gte: now, $lte: week } })
    .sort({ timestamp: 1 })
    .lean();

  // STEP 2: odds (optional)
  if (withOdds && fixtures.length) {
    await fetchOddsForFixtures(); // updates implied probs
    fixtures = await Fixture.find().sort({ timestamp: 1 }).lean(); // refresh
  }

  // STEP 3: last-5 form (optional)
  if (withForm && fixtures.length) {
    await fetchAndStoreLast5ForStoredFixtures();
    fixtures = await Fixture.find().sort({ timestamp: 1 }).lean(); // refresh
  }

  return {
    count: fixtures.length,
    saved: source === 'api',
    oddsFetched: withOdds,
    formFetched: withForm,
    fixtures,
  };
};

// ✅ Your existing HTTP handler now just calls the helper
exports.scanUpcoming = async (req, res) => {
  try {
    const source   = (req.query.source || 'db').toLowerCase();   // "api" or "db"
    const withOdds = String(req.query.withOdds || 'false') === 'true';
    const withForm = String(req.query.withForm || 'false') === 'true';

    const summary = await exports.runScanUpcoming({ source, withOdds, withForm });
    return res.json(summary);

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Fetching fixtures/odds/form failed', detail: e.message });
  }
};
