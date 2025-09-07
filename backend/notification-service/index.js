// Load environment variables
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Database connection with SSL and retry logic
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const connectWithRetry = async (retries = 5) => {
  while (retries) {
    try {
      const client = await pool.connect();
      console.log('Notification-Service successfully connected to the database!');
      client.release();
      return;
    } catch (err) {
      console.log('Notification-Service failed to connect. Retrying...');
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  console.error('Notification-Service could not connect to the database. Exiting.');
  process.exit(1);
};

// Function to create the notifications table
const createNotificationsTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('"notifications" table is successfully initialized.');
  } catch (err) {
    console.error('Error creating notifications table', err.stack);
  } finally {
    client.release();
  }
};


// --- API ROUTES ---
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: "Notification Service is running!",
    status: "OK"
  });
});

// --- NEW: Route to create a new notification ---
app.post('/notifications', async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message) {
    return res.status(400).json({ message: 'userId and message are required.' });
  }

  try {
    const client = await pool.connect();
    const query = 'INSERT INTO notifications (user_id, message) VALUES ($1, $2) RETURNING *';
    const result = await client.query(query, [userId, message]);
    client.release();
    res.status(201).json({
      message: 'Notification created successfully!',
      notification: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating notification.' });
  }
});

// --- NEW: Route to fetch notifications for a specific user ---
app.get('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const client = await pool.connect();
    const query = 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await client.query(query, [userId]);
    client.release();
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching notifications.' });
  }
});


// Main function to start the server
const startServer = async () => {
  await connectWithRetry();
  await createNotificationsTable(); // Ensure the table exists
  app.listen(PORT, () => {
    console.log(`Notification Service is running on port ${PORT}`);
  });
};

startServer();