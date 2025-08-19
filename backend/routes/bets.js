const express = require('express');
const router = express.Router();
const controller = require('../controllers/betsController');

router.get('/value-bets', controller.getValueBets);
router.post('/place-bet', controller.placeBet);
router.post('/update-results', controller.updateResults);
router.get('/user-bets', controller.getUserBets);
router.post('/delete-bet', controller.deleteUserBet);
router.get('/all-bets', controller.getAllBets);
router.get('/bankroll-growth', controller.getBankrollGrowth);
router.post('/resolve-results', controller.resolveResults);
router.get('/analytics', controller.getAnalytics);
router.post('/simulate-strategy', controller.simulateStrategy);


module.exports = router;