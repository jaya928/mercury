const express = require('express');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const { Pool } = require('pg'); // Import pg to connect to PostgreSQL
const cors = require('cors'); // Import CORS
const app = express();
const port = process.env.PORT || 3000; // Use environment port or default to 3000

// Log the absolute path to the 'images' folder
console.log('Images directory:', path.join(__dirname, 'images'));

// Middleware to enable CORS
app.use(cors()); // Allow cross-origin requests from the frontend

// Configure multer for file uploads (set destination to 'uploads' folder)
const upload = multer({ dest: 'uploads/' });

// Middleware for handling form data (after multer)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the 'images' folder
app.use('/images', express.static(path.join(__dirname, 'images')));

// Serve static files from the 'uploads' folder (for uploaded images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the HTML file on the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the Admin portal page
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// PostgreSQL setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Use DATABASE_URL from environment variable
  ssl: {
    rejectUnauthorized: false, // Add SSL configuration for secure connection (needed for cloud-hosted PostgreSQL)
  },
});

// Handle form submission and file upload to /upload route
app.post('/upload', upload.single('image'), async (req, res) => {
  // Log the form data and file info
  console.log('Form Data:', req.body);
  console.log('Uploaded Image:', req.file);

  // Extract form data
  const { name, age, gender, location } = req.body;
  const image = req.file; // This contains the uploaded file details

  // If no image was uploaded
  if (!image) {
    console.error('No image uploaded');
    return res.status(400).send('No image uploaded');
  }

  // Insert data into PostgreSQL database
  try {
    const query = `
      INSERT INTO users (name, age, gender, location, image_name, image_path)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
    `;
    const values = [
      name,
      age,
      gender,
      location,
      image.filename,            // Image file name
      path.join(__dirname, 'uploads', image.filename) // Image file path
    ];

    // Execute the query and log the result
    const result = await pool.query(query, values);
    console.log('Insertion result:', result.rows[0]);

    // Respond to the client
    res.send('Form data and image uploaded successfully!');
  } catch (error) {
    console.error('Error inserting data into PostgreSQL:', error.message); // Log the error message
    res.status(500).send(`Error uploading data: ${error.message}`);
  }
});

// Get user data for admin portal
app.get('/admin/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows); // Return user data as JSON
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).send('Error fetching user data');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
