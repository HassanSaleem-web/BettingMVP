const express = require('express');
const auth = require('../middleware/authMiddleware');
const modelController = require('../controllers/modelController');
const router = express.Router();

router.post('/run-model', modelController.runModel);

module.exports = router;