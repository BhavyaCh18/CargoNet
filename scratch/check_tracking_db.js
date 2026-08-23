const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgresql://postgres.mumktyppsrqdiqfnozbi:CargoNetpasswor@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    console.log("--- TRACKING TABLE ---");
    const tracking = await pool.query("SELECT * FROM tracking");
    console.log(JSON.stringify(tracking.rows, null, 2));

    console.log("--- TRUCKS TABLE ---");
    const trucks = await pool.query("SELECT id, vehicle_number, current_location, original_pickup_location, destination, owner_id FROM trucks");
    console.log(JSON.stringify(trucks.rows, null, 2));

    console.log("--- BOOKINGS TABLE ---");
    const bookings = await pool.query("SELECT id, booking_code, business_id, truck_id, cargo_id, pickup_location, destination, weight, status, is_return_load FROM bookings");
    console.log(JSON.stringify(bookings.rows, null, 2));

    pool.end();
  } catch (err) {
    console.error("DB Error:", err);
    pool.end();
  }
}

main();
