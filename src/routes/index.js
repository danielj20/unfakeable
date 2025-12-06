const path = require('path');
const express = require('express');

const quizRoutes = require('./quizRoutes');
const resultsRoutes = require('./resultsRoutes');
const userService = require('../services/userService');

const router = express.Router();

const viewPath = (view) => path.join(__dirname, '../../views', view);

const ensureSubjectExists = (req, res, next) => {
  const subject = userService.getSubject(req.params.subjectId);
  if (!subject) {
    return res.status(404).send('<h1>Subject not found.</h1>');
  }

  req.subject = subject;
  return next();
};

router.get('/', (_req, res) => res.sendFile(viewPath('index.html')));
router.get('/quiz/self', (_req, res) => res.sendFile(viewPath('quiz.html')));
router.get('/quiz/rater/:subjectId', ensureSubjectExists, (_req, res) =>
  res.sendFile(viewPath('quiz.html')),
);
router.get('/invite/:subjectId', ensureSubjectExists, (_req, res) =>
  res.sendFile(viewPath('invite.html')),
);
router.get('/results/:subjectId', ensureSubjectExists, (_req, res) =>
  res.sendFile(viewPath('results.html')),
);
router.get('/waiting/:subjectId', ensureSubjectExists, (_req, res) =>
  res.sendFile(viewPath('waiting.html')),
);

router.use('/api', quizRoutes);
router.use('/api', resultsRoutes);

module.exports = router;
