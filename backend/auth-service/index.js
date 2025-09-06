// Load environment variables from .env file at the very top
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 8080;

// Middleware to parse incoming JSON requests
app.use(express.json());

// Create a new pool of database clients
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to create the users table
const createUsersTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('"users" table is successfully initialized.');
  } catch (err) {
    console.error('Error creating users table', err.stack);
  } finally {
    client.release();
  }
};

// Check DB connection and initialize the table on startup
pool.connect((err) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Successfully connected to the PostgreSQL database!');
  createUsersTable();
});


// --- NEW: Authentication Middleware ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Forbidden
    }
    req.user = user;
    next();
  });
}


// --- API ROUTES ---

app.get('/', (req, res) => {
  res.status(200).json({ 
    message: "Auth Service is running!",
    status: "OK"
  });
});

app.post('/register', async (req, res) => {
  // ... (register code remains the same)
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash]
    );
    client.release();
    res.status(201).json({ message: 'User registered successfully!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Email already exists.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

app.post('/login', async (req, res) => {
  // ... (login code remains the same)
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    client.release();
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const payload = { userId: user.id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Logged in successfully!', token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});


/**
 * @route   GET /profile
 * @desc    Get the current user's profile (Protected Route)
 * @access  Private
 */
app.get('/profile', authenticateToken, (req, res) => {
  // Thanks to the middleware, we have access to req.user
  res.json({
    message: "Welcome to the protected profile route!",
    user: req.user
  });
});


app.listen(PORT, () => {
  console.log(`Auth Service is running on http://localhost:${PORT}`);
});

