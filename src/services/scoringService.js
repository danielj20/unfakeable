const quizResultModel = require('../models/quizResultModel');
const quizService = require('./quizService');

const LIKERT_MIN = 1;
const LIKERT_MAX = 5;
const GAP_SCALE = LIKERT_MAX - LIKERT_MIN;
const TOP_RATER_WORDS = 3;

const reverseScore = (value, isReverseScored) => {
  if (value == null) {
    return null;
  }

  if (!isReverseScored) {
    return Number(value);
  }

  return LIKERT_MAX + LIKERT_MIN - Number(value);
};

const average = (values = []) => {
  const filtered = values.filter((value) => typeof value === 'number');
  if (!filtered.length) {
    return null;
  }

  const sum = filtered.reduce((total, value) => total + value, 0);
  return Number((sum / filtered.length).toFixed(2));
};

const getAxisComparisons = (subject) => {
  const axes = quizService.getAxes();
  const items = quizService.getItems();

  return axes.map((axis) => {
    const axisItems = items.filter((item) => item.axis_id === axis.id);
    const selfScores = axisItems
      .map((item) => reverseScore(subject.selfAnswers.items?.[item.id], item.reverse_scored))
      .filter((value) => typeof value === 'number');

    const raterScores = subject.raters.flatMap((rater) =>
      axisItems
        .map((item) => reverseScore(rater.items?.[item.id], item.reverse_scored))
        .filter((value) => typeof value === 'number'),
    );

    const selfAvg = average(selfScores);
    const othersAvg = average(raterScores);
    const gap = selfAvg != null && othersAvg != null ? Number((othersAvg - selfAvg).toFixed(2)) : null;
    const gapPercent = gap != null ? Number(((gap / GAP_SCALE) * 100).toFixed(2)) : null;

    return {
      axisId: axis.id,
      axisName: axis.name,
      description: axis.description,
      selfAvg,
      othersAvg,
      gap,
      gapPercent,
    };
  });
};

const getWordLabel = (wordMap, wordId) =>
  wordMap.options.find((option) => option.id === wordId)?.label || wordId;

const formatWordList = (wordMap, wordIds = []) =>
  wordIds.map((wordId) => ({ id: wordId, label: getWordLabel(wordMap, wordId) }));

const getWordMapComparisons = (subject) => {
  const wordMaps = quizService.getWordMaps();

  return wordMaps.map((wordMap) => {
    const selfWords = subject.selfAnswers.wordMaps?.[wordMap.id] || [];
    const counts = new Map();

    subject.raters.forEach((rater) => {
      (rater.wordMaps?.[wordMap.id] || []).forEach((wordId) => {
        counts.set(wordId, (counts.get(wordId) || 0) + 1);
      });
    });

    const sortedCounts = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const topRaterWords = sortedCounts.slice(0, TOP_RATER_WORDS).map(([wordId, count]) => ({
      id: wordId,
      label: getWordLabel(wordMap, wordId),
      count,
    }));

    const sharedWords = topRaterWords.filter((word) => selfWords.includes(word.id));
    const selfWordDetails = formatWordList(wordMap, selfWords);
    const selfOnlyWords = selfWordDetails.filter(
      (word) => !sharedWords.find((shared) => shared.id === word.id),
    );
    const othersOnlyWords = topRaterWords.filter((word) => !selfWords.includes(word.id));

    return {
      id: wordMap.id,
      title: wordMap.title,
      descriptionSelf: wordMap.description_self,
      descriptionRater: wordMap.description_rater,
      selfWords: selfWordDetails,
      topRaterWords,
      sharedWords,
      selfOnlyWords,
      othersOnlyWords,
    };
  });
};

const buildResultsPayload = (subject) => {
  const cached = quizResultModel.getCachedResults(subject.id);
  if (cached) {
    return cached;
  }

  const axisComparisons = getAxisComparisons(subject);
  const wordMapComparisons = getWordMapComparisons(subject);

  const underestimatedTraits = axisComparisons
    .filter((axis) => axis.gap != null && axis.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  const overestimatedTraits = axisComparisons
    .filter((axis) => axis.gap != null && axis.gap < 0)
    .sort((a, b) => a.gap - b.gap);

  const payload = {
    subject: {
      id: subject.id,
      name: subject.name,
    },
    raterCount: subject.raters.length,
    axisComparisons,
    wordMapComparisons,
    underestimatedTraits,
    overestimatedTraits,
  };

  return quizResultModel.saveResults(subject.id, payload);
};

module.exports = {
  buildResultsPayload,
};
