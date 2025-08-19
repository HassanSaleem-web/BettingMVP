const mongoose = require('mongoose');

const UserBetSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    fixture_id: String,
    stake: Number,
    sport: String,
    odds: Number,
    ev: Number,
    result: { type: String, enum: ["won", "lost", "pending"], default: "pending" },
    status: { type: String, enum: ["FT", "AET", "PEN", "NS"], default: "NS" },
    profit: Number,
    payout: Number,
    placed_at: Date,
    isValueBet: String,
    isDeleted: { type: Boolean, default: false }
});


module.exports = mongoose.model('UserBet', UserBetSchema);