require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { initDb, findUserByEmail, createUser, getAllUsers } = require('./db');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost dev, Vercel deployments, Railway, and custom domains
    const allowed = [
      /^http:\/\/localhost/,
      /^http:\/\/127\.0\.0\.1/,
      /\.vercel\.app$/,
      /\.railway\.app$/,
      /\.up\.railway\.app$/,
    ];
    if (!origin || allowed.some(re => re.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Initialize Database on startup
initDb();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: process.env.PGDATABASE || 'ASPEN Log' });
});

// Register user endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, role, organization, phone, roleDetails } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'Please provide full name, email, password, and role.' });
    }

    const validRoles = ['buyer', 'seller', 'admin'];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid role specified. Must be buyer, seller, or admin.' });
    }

    // Check if user already exists
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: `User with email '${email}' is already registered.` });
    }

    // Register user in PostgreSQL database 'ASPEN Log'
    const newUser = await createUser({
      fullName,
      email,
      password,
      role: role.toLowerCase(),
      organization,
      phone,
      roleDetails: roleDetails || {}
    });

    console.log(`[DB SUCCESS] New ${newUser.role.toUpperCase()} registered: ${newUser.email} (${newUser.full_name})`);

    res.status(201).json({
      message: `Account registered successfully in PostgreSQL 'ASPEN Log' database as ${newUser.role.toUpperCase()}!`,
      user: {
        id: newUser.id,
        fullName: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        organization: newUser.organization,
        phone: newUser.phone,
        roleDetails: newUser.role_details,
        createdAt: newUser.created_at
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: `Database Error: ${err.message}` });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter your registered email and password.' });
    }

    // Authenticate user against registered data in PostgreSQL database
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: `No account found for '${email}' in PostgreSQL database. Please register first.` });
    }

    // Verify password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
    }

    // Verify role if specified
    if (role && user.role.toLowerCase() !== role.toLowerCase()) {
      return res.status(403).json({
        error: `Account '${email}' is registered as a ${user.role.toUpperCase()}, not as a ${role.toUpperCase()}. Please select the correct role option.`
      });
    }

    console.log(`[AUTH SUCCESS] User logged in: ${user.email} as ${user.role.toUpperCase()}`);

    res.json({
      message: `Authentication successful! Welcome ${user.full_name}.`,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        phone: user.phone,
        roleDetails: user.role_details,
        createdAt: user.created_at
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: `Database Authentication Error: ${err.message}` });
  }
});

// Get registered users (for verification / admin view)
app.get('/api/auth/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`ASPEN Express Backend Server running on port ${PORT}`);
  console.log(`Connected to PostgreSQL Database: "${process.env.PGDATABASE || 'ASPEN Log'}"`);
  console.log(`====================================================`);
});
