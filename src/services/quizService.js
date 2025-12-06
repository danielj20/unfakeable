const fs = require('fs');
const path = require('path');

const QUIZ_CONFIG_PATH = path.join(__dirname, '../../quiz.json');
const MIN_RATERS = 5;
const TARGET_RATERS = 5;

let cachedQuizConfig = null;

const loadQuizFile = () => {
  const fileContents = fs.readFileSync(QUIZ_CONFIG_PATH, 'utf-8');
  const parsed = JSON.parse(fileContents);
  return parsed.quiz || parsed;
};

const getQuizConfig = () => {
  if (!cachedQuizConfig) {
    cachedQuizConfig = loadQuizFile();
  }

  return cachedQuizConfig;
};

const getWordMaps = () => getQuizConfig().word_maps || [];

const getAxes = () => getQuizConfig().axes || [];

const getItems = () => getQuizConfig().items || [];

const getItemsByAxis = (axisId) => getItems().filter((item) => item.axis_id === axisId);

const getWordMapById = (wordMapId) =>
  getWordMaps().find((wordMap) => wordMap.id === wordMapId);

const getScale = () => getQuizConfig().scale;

module.exports = {
  getQuizConfig,
  getWordMaps,
  getAxes,
  getItems,
  getItemsByAxis,
  getWordMapById,
  getScale,
  MIN_RATERS,
  TARGET_RATERS,
};
