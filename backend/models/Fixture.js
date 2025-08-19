const mongoose = require('mongoose');

const FixtureSchema = new mongoose.Schema({
  // Identity
  fixtureId: { type: Number, unique: true, index: true },

  // Minimal fixture data we store
  date: String,          // ISO date from API
  timestamp: Number,     // unix seconds
  leagueId: Number,
  Div_enc: Number,

  homeTeam: {
    id: Number,
    name: String,
    enc: Number
  },
  awayTeam: {
    id: Number,
    name: String,
    enc: Number
  },

  // Implied probabilities we compute & store
  Imp_B365H: Number,
  Imp_B365D: Number,
  Imp_B365A: Number,
  Imp_BbAvH: Number,
  Imp_BbAvD: Number,
  Imp_BbAvA: Number,

  // Last-5 form + diffs
  Home_Wins_Last5: Number,
  Home_Draws_Last5: Number,
  Home_Losses_Last5: Number,
  Away_Wins_Last5: Number,
  Away_Draws_Last5: Number,
  Away_Losses_Last5: Number,
  Wins_Diff_Last5: Number,
  Draws_Diff_Last5: Number,
  Losses_Diff_Last5: Number,
  formFetchedAt: Date,

  // Optional legacy fields (keep if you still have older docs)
  data: { type: Object },                             // <-- no longer required
  odds: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  form: {
    home: { wins: { type: Number, default: 0 }, draws: { type: Number, default: 0 }, losses: { type: Number, default: 0 } },
    away: { wins: { type: Number, default: 0 }, draws: { type: Number, default: 0 }, losses: { type: Number, default: 0 } },
    formFetchedAt: { type: Date }
  },

  createdAt: { type: Date, default: Date.now }
}, { strict: true });

module.exports = mongoose.model('Fixture', FixtureSchema);
