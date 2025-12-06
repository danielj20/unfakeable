const cachedResults = new Map();

const saveResults = (subjectId, results) => {
  cachedResults.set(subjectId, results);
  return results;
};

const getCachedResults = (subjectId) => cachedResults.get(subjectId);

const invalidateResults = (subjectId) => {
  if (subjectId) {
    cachedResults.delete(subjectId);
  } else {
    cachedResults.clear();
  }
};

module.exports = {
  saveResults,
  getCachedResults,
  invalidateResults,
};
