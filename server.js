// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { getDbConfig } = require('./src/db/db-config');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Initialize database connection pool
const pool = new Pool(getDbConfig());

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.path}`);
  next();
});

// Health Check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server running' });
});

// Helper for async handlers
const asyncHandler = fn => (req, res, next) => 
  Promise.resolve(fn(req, res, next)).catch(next);

// Get all entities
app.get('/api/entities', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM entities ORDER BY name');
  res.json(rows);
}));

// Get all accounts
app.get('/api/accounts', asyncHandler(async (req, res) => {
  const { entityId } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM accounts ${entityId ? 'WHERE entity_id = $1' : ''} ORDER BY code`,
    entityId ? [entityId] : []
  );
  res.json(rows);
}));

// Get all funds
app.get('/api/funds', asyncHandler(async (req, res) => {
  const { entityId } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM funds ${entityId ? 'WHERE entity_id = $1' : ''} ORDER BY code`,
    entityId ? [entityId] : []
  );
  res.json(rows);
}));

// Get all journal entries
app.get('/api/journal-entries', asyncHandler(async (req, res) => {
  const { entityId } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM journal_entries ${entityId ? 'WHERE entity_id = $1' : ''} ORDER BY entry_date DESC`,
    entityId ? [entityId] : []
  );
  res.json(rows);
}));

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
