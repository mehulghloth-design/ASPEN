require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Use DATABASE_URL (Railway format) if available, otherwise fall back to individual vars
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432'),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '/.,ml',
      database: process.env.PGDATABASE || 'ASPEN Log',
    });

// Initialize table in PostgreSQL database 'ASPEN Log'
async function initDb() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      organization VARCHAR(255),
      phone VARCHAR(50),
      role_details JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    const client = await pool.connect();
    await client.query(createTableQuery);
    console.log('PostgreSQL "users" table initialized in database "ASPEN Log".');

    // Check if table is empty and seed initial sample accounts for testing
    const countRes = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(countRes.rows[0].count) === 0) {
      console.log('Seeding initial test users into ASPEN Log database...');
      
      const passBuyer = await bcrypt.hash('buyer123', 10);
      const passSeller = await bcrypt.hash('seller123', 10);
      const passAdmin = await bcrypt.hash('admin123', 10);

      await client.query(
        `INSERT INTO users (full_name, email, password_hash, role, organization, phone, role_details) VALUES
        ($1, $2, $3, $4, $5, $6, $7),
        ($8, $9, $10, $11, $12, $13, $14),
        ($15, $16, $17, $18, $19, $20, $21)`,
        [
          'Procurement Officer Alpha', 'buyer@aspen.gov', passBuyer, 'buyer', 'Ministry of Infrastructure', '+91 98765 43210', JSON.stringify({ dept: 'Central Procurement', authority: 'Level 3' }),
          'Apex Industrial Supplies', 'seller@aspen.gov', passSeller, 'seller', 'Apex Tech Corp', '+91 91234 56789', JSON.stringify({ gstin: '07AAAAA0000A1Z5', category: 'Raw Materials & Hardware' }),
          'System Administrator', 'admin@aspen.gov', passAdmin, 'admin', 'ASPEN Central Authority', '+91 90000 11111', JSON.stringify({ empId: 'ADM-8801', accessLevel: 'SuperAdmin' })
        ]
      );
      console.log('Initial accounts seeded: buyer@aspen.gov, seller@aspen.gov, admin@aspen.gov');
    }

    client.release();
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
}

async function findUserByEmail(email) {
  const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return res.rows[0];
}

async function createUser({ fullName, email, password, role, organization, phone, roleDetails }) {
  const hash = await bcrypt.hash(password, 10);
  const res = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, organization, phone, role_details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, full_name, email, role, organization, phone, role_details, created_at`,
    [fullName, email, hash, role, organization || '', phone || '', JSON.stringify(roleDetails || {})]
  );
  return res.rows[0];
}

async function getAllUsers() {
  const res = await pool.query('SELECT id, full_name, email, role, organization, phone, role_details, created_at FROM users ORDER BY created_at DESC');
  return res.rows;
}

module.exports = {
  pool,
  initDb,
  findUserByEmail,
  createUser,
  getAllUsers,
};
