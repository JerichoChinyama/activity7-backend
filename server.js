require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const recordsRouter = require('./routes/records');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const allowedOrigins = (process.env.CLIENT_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const corsErr = new Error('Not allowed by CORS');
      corsErr.statusCode = 403;
      return callback(corsErr);
    }
  })
);

app.use(express.json());

// Root HTML API guide
app.get('/', (req, res) => {
  res.status(200).type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Study Support Requests API</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 16px; line-height: 1.5; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>Study Support Requests API</h1>
  <p>REST API backed by PostgreSQL for Study Support Requests records.</p>
  <h2>Available Endpoints</h2>
  <ul>
    <li><code>GET /</code> — API documentation page</li>
    <li><code>GET /health</code> — Health and database connectivity check</li>
    <li><code>GET /api/records</code> — List all study support records</li>
    <li><code>GET /api/records/:id</code> — Fetch a single record by ID</li>
    <li><code>POST /api/records</code> — Create a new record</li>
    <li><code>PUT /api/records/:id</code> — Update an existing record</li>
    <li><code>DELETE /api/records/:id</code> — Delete a record by ID</li>
  </ul>
</body>
</html>`);
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('Health check failed:', err);
    return res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Records routes
app.use('/api/records', recordsRouter);

// 404 for unknown routes
app.use((req, res) => {
  return res.status(404).json({ message: 'Route not found.' });
});

// Central error handler (malformed JSON, CORS, and unexpected errors)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Malformed JSON in request body.' });
  }

  if (err && err.statusCode === 403) {
    return res.status(403).json({ message: 'Not allowed by CORS.' });
  }

  console.error('Unhandled server error:', err);
  const status = Number.isInteger(err && err.statusCode) ? err.statusCode : 500;
  return res.status(status).json({ message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});