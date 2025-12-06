const express = require('express');
const quizController = require('../controllers/quizController');

const router = express.Router();

router.get('/quiz', quizController.getQuizConfig);
router.post('/self', quizController.createSelfProfile);
router.post('/rater/:subjectId', quizController.submitRaterResponse);
router.get('/progress/:subjectId', quizController.getProgress);

module.exports = router;
