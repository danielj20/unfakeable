const { spawnSync } = require('child_process');

const CONNECTION_STRING =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_CONNECTION_STRING ||
  process.env.PG_CONNECTION_STRING;

if (!CONNECTION_STRING) {
  throw new Error('DATABASE_URL (or POSTGRES_URL) must be configured in your environment.');
}

const execPsql = (args = [], input) => {
  const result = spawnSync('psql', ['-X', ...args, CONNECTION_STRING], {
    encoding: 'utf-8',
    input,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || 'psql command failed');
  }

  return result.stdout;
};

const normalizeSql = (sql = '') => sql.trim().replace(/;$/, '');

const run = (sql) => {
  execPsql(['-qAt', '-v', 'ON_ERROR_STOP=1', '-c', `${normalizeSql(sql)};`]);
};

const query = (sql) => {
  const wrapped = `WITH result AS (${normalizeSql(sql)}) SELECT COALESCE(json_agg(result), '[]'::json) FROM result;`;
  const output = execPsql(['-qAt', '-v', 'ON_ERROR_STOP=1', '-c', wrapped]).trim();
  if (!output) return [];
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Failed to parse Postgres JSON output: ${error.message}`);
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
      self_word_maps JSONB NOT NULL,
      self_items JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );

  run(
    `CREATE TABLE IF NOT EXISTS raters (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      word_maps JSONB NOT NULL,
      items JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );

  run(
    `CREATE TABLE IF NOT EXISTS stories (
      subject_id TEXT PRIMARY KEY REFERENCES subjects(id) ON DELETE CASCADE,
      cards_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );
};

try {
  init();
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('Failed to initialize database schema:', error);
  throw error;
}

module.exports = {
  run,
  query,
  escape,
};
