const fs = require("fs");
const path = require("path");

try {
  const envContent = fs.readFileSync(path.join(__dirname, "../backend/.env"), "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...vals] = trimmed.split("=");
      process.env[key.trim()] = vals.join("=").trim();
    }
  }
} catch (e) {}

const pool = require("../lib/db");

async function inspectDb() {
  console.log("=================================================");
  console.log("READ-ONLY DATABASE AUDIT");
  console.log("=================================================\n");

  // 1. Users
  console.log("--- USERS TABLE ---");
  const usersRes = await pool.query("SELECT id, name, email, role, status, created_at FROM users ORDER BY id DESC LIMIT 10");
  console.table(usersRes.rows);

  // 2. Trucks
  console.log("\n--- TRUCKS TABLE ---");
  const trucksRes = await pool.query(`
    SELECT
      t.id,
      t.vehicle_number,
      t.vehicle_type,
      t.max_capacity,
      t.available_capacity,
      t.current_location,
      t.destination,
      t.status,
      t.owner_id,
      u.email AS owner_email,
      u.role AS owner_role
    FROM trucks t
    LEFT JOIN users u ON t.owner_id = u.id
    ORDER BY t.id DESC LIMIT 10
  `);
  console.table(trucksRes.rows);

  // 3. Cargo
  console.log("\n--- CARGO TABLE ---");
  const cargoRes = await pool.query("SELECT id, cargo_name, pickup_location, destination, weight, status, business_id FROM cargo ORDER BY id DESC LIMIT 10");
  console.table(cargoRes.rows);

  process.exit(0);
}

inspectDb().catch(err => {
  console.error("Db inspection error:", err);
  process.exit(1);
});
