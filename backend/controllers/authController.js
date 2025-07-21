const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // adjust path as needed

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

exports.register = async(req, res) => {
    const { username, password } = req.body;
    console.log('📥 Registration request received');
    console.log('➡️ Username:', username);

    try {
        console.log('🔐 Hashing password...');
        const hashed = await bcrypt.hash(password, 10);
        console.log('✅ Password hashed successfully');

        console.log('📦 Creating new user object...');
        const newUser = new User({ username, password: hashed });

        console.log('💾 Saving user to database...');
        await newUser.save();
        console.log('✅ User saved successfully');

        // Generate JWT token
        const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, {
            expiresIn: '1d',
        });

        res.status(201).json({ token }); // ✅ Return token
    } catch (err) {
        console.error('❌ Registration error:', err);
        res.status(500).json({ error: '❌ Registration failed' });
    }
};



exports.login = async(req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: '❌ User not found' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: '❌ Invalid password' });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: '❌ Login error' });
    }
};