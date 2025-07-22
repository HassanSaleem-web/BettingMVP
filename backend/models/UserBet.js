const mongoose = require('mongoose');

const UserBetSchema = new mongoose.Schema({
    user_id: String,
    match_id: String,
    stake: Number,
    sport: String,
    odds: Number,
    ev: Number,
    result: { type: String, default: "PENDING" }, // actual match result (FTR)
    status: { type: String, enum: ["won", "lost", "pending"], default: "pending" }, // win/loss
    profit: Number, // net profit/loss from this bet
    payout: Number, // total return (stake * odds if won, else 0)
    placed_at: Date,
    isValueBet: String,
});

module.exports = mongoose.model('UserBet', UserBetSchema);