const express = require('express');
const router = express.Router();
const controller = require('../controllers/betsController');

router.get('/value-bets', controller.getValueBets);
// router.get('/historical-bets', controller.getHistoricalBets);
router.post('/place-bet', controller.placeBet);
router.get('/user-bets', controller.getUserBets);
router.get('/all-bets', controller.getAllBets);
router.get('/bankroll-growth', controller.getBankrollGrowth);
router.post('/resolve-results', controller.resolveResults);
router.get('/analytics', controller.getAnalytics);
router.post('/simulate-strategy', controller.simulateStrategy);


module.exports = router;