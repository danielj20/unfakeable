const quizService = require('../services/quizService');
const userService = require('../services/userService');

const TOTAL_ITEMS = quizService.getItems().length;

const buildInviteUrl = (req, subjectId) => `${req.protocol}://${req.get('host')}/quiz/rater/${subjectId}`;

const normalizeWordMaps = (wordMaps = {}) => {
  const normalized = {};
  const availableWordMaps = quizService.getWordMaps();

  availableWordMaps.forEach((wordMap) => {
    const picks = Array.isArray(wordMaps[wordMap.id])
      ? wordMaps[wordMap.id].map((value) => String(value))
      : [];

    const validOptions = new Set(wordMap.options.map((option) => option.id));
    const filtered = [];

    picks.forEach((pick) => {
      if (validOptions.has(pick) && !filtered.includes(pick)) {
        filtered.push(pick);
      }
    });

    normalized[wordMap.id] = filtered.slice(0, wordMap.max_choices);
  });

  return normalized;
};

const normalizeItems = (items = {}) => {
  const normalized = {};
  const validItems = quizService.getItems();

  validItems.forEach((item) => {
    const rawValue = Number(items[item.id]);
    if (!Number.isFinite(rawValue)) {
      return;
    }

    const clampedValue = Math.min(5, Math.max(1, rawValue));
    normalized[item.id] = clampedValue;
  });

  return normalized;
};

const getQuizConfig = (req, res) => {
  res.json({ quiz: quizService.getQuizConfig() });
};

const createSelfProfile = (req, res, next) => {
  try {
    const { name, wordMaps, items } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'Display name is required.' });
    }

    const normalizedItems = normalizeItems(items);
    if (Object.keys(normalizedItems).length !== TOTAL_ITEMS) {
      return res.status(400).json({ message: 'Please answer every statement.' });
    }

    const subject = userService.createSubject({
      name: name.trim(),
      selfAnswers: {
        wordMaps: normalizeWordMaps(wordMaps),
        items: normalizedItems,
      },
    });

    return res.status(201).json({
      subjectId: subject.id,
      inviteCode: subject.id,
      inviteUrl: buildInviteUrl(req, subject.id),
      minRaters: quizService.MIN_RATERS,
      targetRaters: quizService.TARGET_RATERS,
    });
  } catch (error) {
    return next(error);
  }
};

const submitRaterResponse = (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const subject = userService.getSubject(subjectId);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const normalizedItems = normalizeItems(req.body.items);
    if (Object.keys(normalizedItems).length !== TOTAL_ITEMS) {
      return res.status(400).json({ message: 'Please answer every statement.' });
    }

    userService.addRaterResponse(subjectId, {
      wordMaps: normalizeWordMaps(req.body.wordMaps),
      items: normalizedItems,
    });

    return res.status(201).json({
      success: true,
      subjectName: subject.name,
      message: `Thanks for rating ${subject.name}!`,
    });
  } catch (error) {
    return next(error);
  }
};

const getProgress = (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const subject = userService.getSubject(subjectId);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const currentRatersCount = userService.getRaterCount(subjectId);

    return res.json({
      subjectId,
      subjectName: subject.name,
      currentRatersCount,
      minRaters: quizService.MIN_RATERS,
      targetRaters: quizService.TARGET_RATERS,
      inviteCode: subject.id,
      inviteUrl: buildInviteUrl(req, subjectId),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getQuizConfig,
  createSelfProfile,
  submitRaterResponse,
  getProgress,
};
