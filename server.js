const fs = require('fs');
const path = require('path');
const express = require('express');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envRaw = fs.readFileSync(envPath, 'utf-8');
  envRaw.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) return;
    const [key, ...rest] = line.split('=');
    const value = rest.join('=').trim();
    if (key && !process.env[key]) {
      process.env[key] = value.replace(/^['"]|['"]$/g, '');
    }
  });
}

const app = express();

const routes = require('./src/routes');
const requestLogger = require('./src/middleware/requestLogger');
const notFound = require('./src/middleware/notFound');
const errorHandler = require('./src/middleware/errorHandler');

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use(express.static(path.join(__dirname, 'public')));

app.use(routes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`The Unfakeable Personality Test server listening on port ${PORT}`);
});

module.exports = app;
