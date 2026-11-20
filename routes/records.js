const express = require('express');
const pool = require('../db');

const router = express.Router();

const ALLOWED_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

function parsePositiveId(rawId) {
  if (!/^\d+$/.test(String(rawId))) {
    return null;
  }
  const num = Number(rawId);
  return Number.isSafeInteger(num) && num > 0 ? num : null;
}

function validateRecordPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a valid JSON object.';
  }

  if (Object.prototype.hasOwnProperty.call(body, 'id')) {
    return 'Do not supply id; it is generated automatically.';
  }

  const { title, category, description, status } = body;

  if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120) {
    return 'Title must be a string between 3 and 120 characters.';
  }

  if (typeof category !== 'string' || category.trim().length < 2 || category.trim().length > 60) {
    return 'Category must be a string between 2 and 60 characters.';
  }

  if (typeof description !== 'string' || description.trim().length < 5 || description.trim().length > 1000) {
    return 'Description must be a string between 5 and 1000 characters.';
  }

  if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status.trim())) {
    return `Status must be one of: ${ALLOWED_STATUSES.join(', ')}.`;
  }

  return null;
}

// GET /api/records
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, title, category, description, status FROM records ORDER BY id ASC'
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    return next(err);
  }
});

// GET /api/records/:id
router.get('/:id', async (req, res, next) => {
  const id = parsePositiveId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Invalid record ID. ID must be a positive integer.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, title, category, description, status FROM records WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Record with ID ${id} not found.` });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// POST /api/records
router.post('/', async (req, res, next) => {
  const validationError = validateRecordPayload(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const title = req.body.title.trim();
  const category = req.body.category.trim();
  const description = req.body.description.trim();
  const status = req.body.status.trim();

  try {
    const result = await pool.query(
      `INSERT INTO records (title, category, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, category, description, status`,
      [title, category, description, status]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// PUT /api/records/:id
router.put('/:id', async (req, res, next) => {
  const id = parsePositiveId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Invalid record ID. ID must be a positive integer.' });
  }

  const validationError = validateRecordPayload(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const title = req.body.title.trim();
  const category = req.body.category.trim();
  const description = req.body.description.trim();
  const status = req.body.status.trim();

  try {
    const result = await pool.query(
      `UPDATE records
       SET title = $1, category = $2, description = $3, status = $4
       WHERE id = $5
       RETURNING id, title, category, description, status`,
      [title, category, description, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Record with ID ${id} not found.` });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
});

// DELETE /api/records/:id
router.delete('/:id', async (req, res, next) => {
  const id = parsePositiveId(req.params.id);
  if (!id) {
    return res.status(400).json({ message: 'Invalid record ID. ID must be a positive integer.' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM records WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Record with ID ${id} not found.` });
    }

    return res.status(200).json({ message: 'Record deleted.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;