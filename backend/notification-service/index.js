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

// --- API ROUTES ---
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: "Notification Service is running!",
    status: "OK"
  });
});

// You can add routes for creating/fetching notifications here later

// Main function to start the server
const startServer = async () => {
  await connectWithRetry();
  app.listen(PORT, () => {
    console.log(`Notification Service is running on port ${PORT}`);
  });
};

startServer();