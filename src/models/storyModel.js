const db = require('../db');

const saveStory = (subjectId, cards = []) => {
  if (!subjectId || !Array.isArray(cards) || !cards.length) return null;
  const payload = db.escape(JSON.stringify({ cards }));
  db.run(
    `INSERT INTO stories (subject_id, cards_json)
     VALUES (${db.escape(subjectId)}, ${payload}::jsonb)
     ON CONFLICT(subject_id)
     DO UPDATE SET cards_json = ${payload}::jsonb, created_at = NOW();`,
  );
  return { subjectId, cards };
};

const getStory = (subjectId) => {
  if (!subjectId) return null;
  const rows = db.query(
    `SELECT subject_id AS "subjectId", cards_json AS "cardsJson", created_at AS "createdAt"
     FROM stories WHERE subject_id = ${db.escape(subjectId)} LIMIT 1`,
  );

  if (!rows.length) return null;
  const row = rows[0];
  const cards = (row.cardsJson && row.cardsJson.cards) || [];
  return { subjectId: row.subjectId, cards, createdAt: row.createdAt };
};

module.exports = {
  saveStory,
  getStory,
};
