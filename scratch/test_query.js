const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://postgres.mumktyppsrqdiqfnozbi:CargoNetpasswor@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    const userId = 9;
    const result = await pool.query(
      `
      SELECT
          b.id,
          b.booking_code,
          b.pickup_location,
          b.destination,
          b.weight,
          b.total_cost,
          b.status,
          b.is_return_load,
          b.booking_date,
          c.cargo_name
      FROM bookings b
      LEFT JOIN cargo c
          ON b.cargo_id = c.id
      WHERE b.business_id = $1
      ORDER BY b.booking_date DESC
      `,
      [userId]
    );

    console.log("Query result rows count:", result.rows.length);
    console.log("Query results:", JSON.stringify(result.rows, null, 2));

    pool.end();
  } catch (err) {
    console.error("DB Error:", err);
    pool.end();
  }
}

main();
