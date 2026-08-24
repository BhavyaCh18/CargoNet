const { Pool } = require("pg");

const connectionString =
  process.env.SUPABASE_DB_URL ||
  (process.env.SUPABASE_DB_USER
    ? `postgres://${encodeURIComponent(process.env.SUPABASE_DB_USER)}:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@${process.env.SUPABASE_DB_HOST}:${process.env.SUPABASE_DB_PORT || 5432}/${process.env.SUPABASE_DB_NAME || "postgres"}`
    : undefined);

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000
});

// Auto-initialize otp_verifications table if it does not exist
let initialized = false;
const originalQuery = pool.query.bind(pool);

async function ensureOtpTable() {
  if (initialized) return;
  try {
    await originalQuery(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        purpose VARCHAR(50) NOT NULL,
        attempts INTEGER DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL,
        verification_token_hash VARCHAR(255),
        token_expires_at TIMESTAMPTZ,
        token_used_at TIMESTAMPTZ NULL,
        verified_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    initialized = true;
  } catch (err) {
    console.error("Error creating otp_verifications table:", err.message);
  }
}

// Intercept query method to ensure table exists before executing queries
pool.query = async (...args) => {
  await ensureOtpTable();
  return originalQuery(...args);
};

module.exports = pool;