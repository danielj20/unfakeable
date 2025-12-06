const express = require('express');
const resultsController = require('../controllers/resultsController');

const router = express.Router();

router.get('/results/:subjectId', resultsController.getResults);
router.post('/results/:subjectId/story', resultsController.generateStoryCards);
router.get('/results/:subjectId/story', resultsController.getStoryCards);
router.post('/results/:subjectId/story/save', resultsController.saveStoryCards);

module.exports = router;
