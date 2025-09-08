// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8081;

app.use(express.json());

// --- DATABASE CONNECTION WITH RETRY ---
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
      console.log('Location-Service successfully connected to the PostgreSQL database!');
      client.release();
      return; // Exit the loop on successful connection
    } catch (err) {
      console.log('Location-Service failed to connect to database. Retrying...');
      retries -= 1;
      // Wait for 5 seconds before retrying
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  console.error('Location-Service could not connect to the database after multiple retries. Exiting.');
  process.exit(1); // Exit if connection fails after all retries
};

// Function to create the location history table
const createLocationTable = async () => {
  const client = await pool.connect();
  try {
    // Using simple FLOAT columns for simplicity in local dev
    await client.query(`
      CREATE TABLE IF NOT EXISTS location_history (
        id SERIAL PRIMARY KEY,
        tourist_id INT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('"location_history" table is successfully initialized.');
  } catch (err) {
    console.error('Error creating location_history table', err.stack);
    process.exit(1);
  } finally {
    client.release();
  }
};

// --- API ROUTES ---
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: "Location Service is running!",
    status: "OK"
  });
});

app.post('/location', async (req, res) => {
  const { touristId, latitude, longitude, timestamp } = req.body;
  if (touristId === undefined || latitude === undefined || longitude === undefined || timestamp === undefined) {
    return res.status(400).json({ message: 'Missing required location data.' });
  }

  const client = await pool.connect();
  try {
    // Step 1: Insert the new location into the history table (as before)
    const insertQuery = `
      INSERT INTO location_history (tourist_id, latitude, longitude, timestamp)
      VALUES ($1, $2, $3, $4)
    `;
    await client.query(insertQuery, [touristId, latitude, longitude, timestamp]);
    
    // --- NEW: Step 2: Check if the location is within any geofence ---
    const geofenceCheckQuery = `
      SELECT name FROM geofences
      WHERE ST_Covers(area, ST_MakePoint($1, $2)::geography)
    `;
    const geofenceResult = await client.query(geofenceCheckQuery, [longitude, latitude]);

    // Step 3: If the query returns 0 rows, the user is outside all safe zones
    if (geofenceResult.rows.length === 0) {
      console.log(`ALERT! Tourist ID ${touristId} is outside of any defined safe zone.`);
      // In a real application, you would make an API call here.
      // For example: await axios.post('https://notification-service-xxxx.onrender.com/notifications', ...);
    } else {
      console.log(`Tourist ID ${touristId} is safe inside ${geofenceResult.rows[0].name}.`);
    }

    res.status(201).json({ message: 'Location data received successfully.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while storing location data.' });
  } finally {
    client.release();
  }
});

// Main function to start the server
const startServer = async () => {
  await connectWithRetry();
  await createLocationTable();
  app.listen(PORT, () => {
    console.log(`Location Service is running on http://localhost:${PORT}`);
  });
};

startServer();

