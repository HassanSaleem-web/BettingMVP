const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const modelRoutes = require('./routes/model');
const betsRoutes = require('./routes/bets');
const dataRoutes = require('./routes/data');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/model', modelRoutes);
app.use('/api/bets', betsRoutes);
app.use('/api/data', dataRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}).catch((err) => console.error("❌ MongoDB Error:", err));