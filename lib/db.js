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

module.exports = pool;