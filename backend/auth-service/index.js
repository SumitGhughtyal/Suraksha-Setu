// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// --- DATABASE CONNECTION WITH RETRY ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const connectWithRetry = async (retries = 5) => {
  while (retries) {
    try {
      const client = await pool.connect();
      console.log('Auth-Service successfully connected to the PostgreSQL database!');
      client.release();
      return; // Exit the loop on successful connection
    } catch (err) {
      console.log('Auth-Service failed to connect to database. Retrying...');
      retries -= 1;
      // Wait for 5 seconds before retrying
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  console.error('Auth-Service could not connect to the database after multiple retries. Exiting.');
  process.exit(1); // Exit if connection fails after all retries
};


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
    process.exit(1);
  } finally {
    client.release();
  }
};

// --- API ROUTES ---
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: "Auth Service is running!",
    status: "OK"
  });
});

app.post('/register', async (req, res) => {
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
    res.status(201).json({ 
      message: 'User registered successfully!',
      user: result.rows[0] 
    });
  } catch (err) {
    if (err.code === '23505') {
        return res.status(409).json({ message: 'Email already exists.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    client.release();
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ message: 'Logged in successfully!', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT id, email, created_at FROM users WHERE id = $1', [req.user.userId]);
    client.release();
    res.json({ 
      message: "Welcome to the protected profile route!",
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving profile.' });
  }
});


// Main function to start the server
const startServer = async () => {
  await connectWithRetry();
  await createUsersTable();
  app.listen(PORT, () => {
    console.log(`Auth Service is running on http://localhost:${PORT}`);
  });
};

startServer();

