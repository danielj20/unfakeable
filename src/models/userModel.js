const { randomUUID, randomInt } = require('crypto');
const db = require('../db');

const CODE_LENGTH = 7;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateCode = () => {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_CHARS[randomInt(0, CODE_CHARS.length)];
  }
  return code;
};

const getSubjectRow = (subjectId) => {
  const rows = db.query(
    `SELECT id, name, self_word_maps AS selfWordMaps, self_items AS selfItems, created_at AS createdAt
     FROM subjects WHERE id = ${db.escape(subjectId)} LIMIT 1;`,
  );
  return rows[0];
};

const getRaterRows = (subjectId) =>
  db.query(
    `SELECT id, word_maps AS wordMaps, items, created_at AS createdAt
     FROM raters WHERE subject_id = ${db.escape(subjectId)} ORDER BY created_at ASC;`,
  );

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const hydrateSubject = (row) => {
  if (!row) return undefined;
  const raters = getRaterRows(row.id).map((rater) => ({
    id: rater.id,
    wordMaps: parseJson(rater.wordMaps, {}),
    items: parseJson(rater.items, {}),
    createdAt: rater.createdAt,
  }));

  return {
    id: row.id,
    name: row.name,
    selfAnswers: {
      wordMaps: parseJson(row.selfWordMaps, {}),
      items: parseJson(row.selfItems, {}),
    },
    raters,
    createdAt: row.createdAt,
  };
};

const getUniqueCode = () => {
  let code = generateCode();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = getSubjectRow(code);
    if (!existing) {
      break;
    }
    code = generateCode();
  }
  return code;
};

const createSubject = ({ name, selfAnswers }) => {
  const subjectId = getUniqueCode();
  const wordMaps = (selfAnswers && selfAnswers.wordMaps) || {};
  const items = (selfAnswers && selfAnswers.items) || {};
  db.run(
    `INSERT INTO subjects (id, name, self_word_maps, self_items)
     VALUES (${db.escape(subjectId)}, ${db.escape(name)}, ${db.escape(JSON.stringify(wordMaps))},
       ${db.escape(JSON.stringify(items))});`,
  );

  return hydrateSubject(getSubjectRow(subjectId));
};

const getSubject = (subjectId) => hydrateSubject(getSubjectRow(subjectId));

const addRaterResponse = (subjectId, raterAnswers = {}) => {
  const raterId = randomUUID();
  db.run(
    `INSERT INTO raters (id, subject_id, word_maps, items)
     VALUES (${db.escape(raterId)}, ${db.escape(subjectId)},
       ${db.escape(JSON.stringify(raterAnswers.wordMaps || {}))},
       ${db.escape(JSON.stringify(raterAnswers.items || {}))});`,
  );

  return {
    id: raterId,
    wordMaps: raterAnswers.wordMaps || {},
    items: raterAnswers.items || {},
  };
};

const getRaterCount = (subjectId) => {
  const rows = db.query(
    `SELECT COUNT(*) AS count FROM raters WHERE subject_id = ${db.escape(subjectId)};`,
  );
  return Number(rows[0]?.count || 0);
};

const clearSubjects = () => {
  db.run('DELETE FROM raters;');
  db.run('DELETE FROM subjects;');
};

module.exports = {
  createSubject,
  getSubject,
  addRaterResponse,
  getRaterCount,
  clearSubjects,
};
