// routes/model.js
const router = require('express').Router();
const { scanUpcoming } = require('../controllers/dataController');
router.get('/live-value-bets', scanUpcoming);
module.exports = router;