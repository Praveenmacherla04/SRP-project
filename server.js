require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { networkInterfaces } = require('os');

const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'public/uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'));
    }
  }
});

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
console.log('Static directory path:', path.join(__dirname, 'public'));

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
};

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Routes
// Register user
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
  db.query(sql, [username, email, hashedPassword], (err, result) => {
    if (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Error registering user' });
      return;
    }
    res.json({ message: 'User registered successfully' });
  });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for email:', email);
  
  const sql = 'SELECT id, username, email, profile_photo, theme_preference FROM users WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error('Database error during login:', err);
      res.status(500).json({ error: 'Error during login' });
      return;
    }
    
    if (results.length === 0) {
      console.log('No user found with email:', email);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    console.log('User found:', results[0].username);

    // Get password separately to avoid sending it in the response
    const passwordSql = 'SELECT password FROM users WHERE id = ?';
    db.query(passwordSql, [results[0].id], async (err, passwordResults) => {
      if (err || passwordResults.length === 0) {
        console.error('Error fetching password:', err);
        res.status(500).json({ error: 'Error during login' });
        return;
      }

      const validPassword = await bcrypt.compare(password, passwordResults[0].password);
      console.log('Password validation result:', validPassword);
      
      if (!validPassword) {
        console.log('Invalid password for user:', results[0].username);
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const user = results[0];
      req.session.userId = user.id;
      console.log('Login successful for user:', user.username);
      res.json({ 
        message: 'Logged in successfully',
        user: user
      });
    });
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// Get all jobs
app.get('/api/jobs', (req, res) => {
  const sql = 'SELECT jobs.*, users.username FROM jobs JOIN users ON jobs.user_id = users.id ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching jobs:', err);
      res.status(500).json({ error: 'Error fetching jobs' });
      return;
    }
    res.json(results);
  });
});

// Create job (authenticated users only)
app.post('/api/jobs', isAuthenticated, (req, res) => {
  const { title, description, company, location } = req.body;
  const userId = req.session.userId;
  
  const sql = 'INSERT INTO jobs (title, description, company, location, user_id) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [title, description, company, location, userId], (err, result) => {
    if (err) {
      console.error('Error creating job:', err);
      res.status(500).json({ error: 'Error creating job' });
      return;
    }
    res.json({ message: 'Job created successfully', jobId: result.insertId });
  });
});

// Delete job (authenticated users can only delete their own jobs)
app.delete('/api/jobs/:id', isAuthenticated, (req, res) => {
  const jobId = req.params.id;
  const userId = req.session.userId;
  
  const sql = 'DELETE FROM jobs WHERE id = ? AND user_id = ?';
  db.query(sql, [jobId, userId], (err, result) => {
    if (err) {
      console.error('Error deleting job:', err);
      res.status(500).json({ error: 'Error deleting job' });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(403).json({ error: 'Not authorized to delete this job' });
      return;
    }
    res.json({ message: 'Job deleted successfully' });
  });
});

// Profile photo upload
app.post('/api/profile/photo', isAuthenticated, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const photoUrl = `/uploads/${req.file.filename}`;
  const sql = 'UPDATE users SET profile_photo = ? WHERE id = ?';
  
  db.query(sql, [photoUrl, req.session.userId], (err, result) => {
    if (err) {
      console.error('Error updating profile photo:', err);
      res.status(500).json({ error: 'Error updating profile photo' });
      return;
    }
    res.json({ photoUrl });
  });
});

// Update theme preference
app.put('/api/settings/theme', isAuthenticated, (req, res) => {
  const { theme } = req.body;
  const sql = 'UPDATE users SET theme_preference = ? WHERE id = ?';
  
  db.query(sql, [theme, req.session.userId], (err, result) => {
    if (err) {
      console.error('Error updating theme:', err);
      res.status(500).json({ error: 'Error updating theme' });
      return;
    }
    res.json({ message: 'Theme updated successfully' });
  });
});

// Change password
app.put('/api/settings/password', isAuthenticated, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  // Get user's current password
  const sql = 'SELECT password FROM users WHERE id = ?';
  db.query(sql, [req.session.userId], async (err, results) => {
    if (err || results.length === 0) {
      res.status(500).json({ error: 'Error verifying password' });
      return;
    }

    const validPassword = await bcrypt.compare(currentPassword, results[0].password);
    if (!validPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const updateSql = 'UPDATE users SET password = ? WHERE id = ?';
    
    db.query(updateSql, [hashedNewPassword, req.session.userId], (err, result) => {
      if (err) {
        console.error('Error updating password:', err);
        res.status(500).json({ error: 'Error updating password' });
        return;
      }
      res.json({ message: 'Password updated successfully' });
    });
  });
});

// Update profile
app.put('/api/profile', isAuthenticated, (req, res) => {
  const { username, whatsapp_number, skills } = req.body;
  
  const sql = 'UPDATE users SET username = ?, whatsapp_number = ?, skills = ? WHERE id = ?';
  db.query(sql, [username, whatsapp_number, skills, req.session.userId], (err, result) => {
    if (err) {
      console.error('Error updating profile:', err);
      res.status(500).json({ error: 'Error updating profile' });
      return;
    }
    res.json({ message: 'Profile updated successfully' });
  });
});

// Get user's jobs
app.get('/api/user/jobs', isAuthenticated, (req, res) => {
  const sql = 'SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC';
  db.query(sql, [req.session.userId], (err, results) => {
    if (err) {
      console.error('Error fetching user jobs:', err);
      res.status(500).json({ error: 'Error fetching jobs' });
      return;
    }
    res.json(results);
  });
});

// Get user profile
app.get('/api/profile', isAuthenticated, (req, res) => {
  const sql = 'SELECT id, username, email, profile_photo, theme_preference FROM users WHERE id = ?';
  db.query(sql, [req.session.userId], (err, results) => {
    if (err) {
      console.error('Error fetching profile:', err);
      res.status(500).json({ error: 'Error fetching profile' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(results[0]);
  });
});

// Get user contact information
app.get('/api/users/:userId/contact', async (req, res) => {
  const userId = req.params.userId;
  console.log('Fetching contact info for user ID:', userId);
  
  const sql = 'SELECT username, whatsapp_number, skills FROM users WHERE id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Database error while fetching user contact:', err);
      res.status(500).json({ error: 'Error fetching user contact information' });
      return;
    }
    
    if (results.length === 0) {
      console.log('No user found with ID:', userId);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('Found user contact info:', results[0]);
    res.json(results[0]);
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Get your local IP address
function getLocalIP() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '0.0.0.0'; // Fallback
}

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Allow connections from any IP
const localIP = getLocalIP();

app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access the application at:`);
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- On Your Network: http://${localIP}:${PORT}`);
}); 