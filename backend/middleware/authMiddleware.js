const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) return res.status(401).json({ error: '❌ No token provided' });

    try {
        const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(403).json({ error: '❌ Invalid or expired token' });
    }
};

module.exports = authMiddleware;