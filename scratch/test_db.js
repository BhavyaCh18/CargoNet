const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://postgres.mumktyppsrqdiqfnozbi:CargoNetpasswor@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    console.log("--- USERS ---");
    const users = await pool.query("SELECT id, name, email, role FROM users");
    console.log(JSON.stringify(users.rows, null, 2));

    console.log("--- CARGO ---");
    const cargo = await pool.query("SELECT id, cargo_name, business_id, status FROM cargo");
    console.log(JSON.stringify(cargo.rows, null, 2));

    console.log("--- BOOKINGS ---");
    const bookings = await pool.query("SELECT * FROM bookings");
    console.log(JSON.stringify(bookings.rows, null, 2));

    pool.end();
  } catch (err) {
    console.error("DB Error:", err);
    pool.end();
  }
}

main();
