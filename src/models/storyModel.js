const db = require('../db');

const saveStory = (subjectId, cards = []) => {
  if (!subjectId || !Array.isArray(cards) || !cards.length) return null;
  const payload = db.escape(JSON.stringify({ cards }));
  db.run(
    `INSERT INTO stories (subject_id, cards_json)
     VALUES (${db.escape(subjectId)}, ${payload})
     ON CONFLICT(subject_id)
     DO UPDATE SET cards_json = ${payload}, created_at = datetime('now');`,
  );
  return { subjectId, cards };
};

const getStory = (subjectId) => {
  if (!subjectId) return null;
  const rows = db.query(
    `SELECT cards_json AS cardsJson, created_at AS createdAt
     FROM stories WHERE subject_id = ${db.escape(subjectId)} LIMIT 1;`,
  );

  if (!rows.length) return null;
  try {
    const data = JSON.parse(rows[0].cardsJson || '{}');
    return { subjectId, cards: data.cards || [], createdAt: rows[0].createdAt };
  } catch (error) {
    return null;
  }
};

module.exports = {
  saveStory,
  getStory,
};
