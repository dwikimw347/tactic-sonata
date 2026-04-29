const express = require('express');
const gameController = require('../controllers/gameController');

const router = express.Router();

router.get('/status', gameController.getStatus);
router.post('/start', gameController.startGame);
router.post('/move', gameController.makeMove);
router.post('/reset', gameController.resetGame);
router.get('/score', gameController.getScore);
router.post('/match-mode', gameController.setMatchMode);
router.post('/difficulty', gameController.setDifficulty);
router.get('/skills', gameController.getSkills);
router.post('/skill/insight', gameController.useInsight);
router.post('/skill/undo', gameController.useUndo);
router.post('/skill/shield', gameController.useShield);

module.exports = router;
