const userModel = require('../models/userModel');
const quizResultModel = require('../models/quizResultModel');

const createSubject = ({ name, selfAnswers }) => {
  const subject = userModel.createSubject({ name, selfAnswers });
  quizResultModel.invalidateResults(subject.id);
  return subject;
};

const getSubject = (subjectId) => userModel.getSubject(subjectId);

const addRaterResponse = (subjectId, raterAnswers) => {
  const response = userModel.addRaterResponse(subjectId, raterAnswers);
  if (response) {
    quizResultModel.invalidateResults(subjectId);
  }
  return response;
};

const getRaterCount = (subjectId) => userModel.getRaterCount(subjectId);

module.exports = {
  createSubject,
  getSubject,
  addRaterResponse,
  getRaterCount,
};
