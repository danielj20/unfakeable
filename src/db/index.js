const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'unfakeable.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const exec = (args, input) => {
  const result = spawnSync('sqlite3', args, {
    encoding: 'utf-8',
    input,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || 'SQLite command failed');
  }

  return result.stdout;
};

const run = (sql) => {
  exec([DB_PATH, sql]);
};

const query = (sql) => {
  const output = exec(['-json', DB_PATH, sql]);
  if (!output || !output.trim()) {
    return [];
  }

  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Failed to parse SQLite JSON output: ${error.message}`);
  }
};

const escape = (value) => {
  if (value == null) {
    return 'NULL';
  }

  return `'${String(value).replace(/'/g, "''")}'`;
};

const init = () => {
  run(
    `CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      self_word_maps TEXT NOT NULL,
      self_items TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,
  );

  run(
    `CREATE TABLE IF NOT EXISTS raters (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      word_maps TEXT NOT NULL,
      items TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );`,
  );

  run('PRAGMA journal_mode=WAL;');

  run(
    `CREATE TABLE IF NOT EXISTS stories (
      subject_id TEXT PRIMARY KEY,
      cards_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );`,
  );
};

init();

module.exports = {
  run,
  query,
  escape,
};
