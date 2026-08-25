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
const jwt = require("jsonwebtoken");

async function testCargo14() {
  console.log("=================================================");
  console.log("TESTING CARGO 14 MATCHING & DATABASE QUERY");
  console.log("=================================================\n");

  // 1. Inspect Cargo 14 in DB
  const cargoRes = await pool.query("SELECT * FROM cargo WHERE id = 14");
  console.log("Cargo 14 DB Row:", cargoRes.rows[0]);

  if (cargoRes.rows.length === 0) {
    console.log("Cargo 14 does not exist in DB!");
    process.exit(0);
  }

  const cargo = cargoRes.rows[0];

  // 2. Inspect Trucks matching Cargo 14
  const trucksRes = await pool.query(
    `SELECT id, vehicle_number AS "vehicleNumber", vehicle_type AS "vehicleType", max_capacity AS "maxCapacity", available_capacity AS "availableCapacity", current_location AS "currentLocation", destination, status
     FROM trucks
     WHERE status IN ('AVAILABLE', 'RETURN_AVAILABLE')
       AND available_capacity >= $1
     ORDER BY created_at DESC`,
    [cargo.weight]
  );
  console.log(`\nTrucks matching Cargo 14 (weight >= ${cargo.weight}):`, trucksRes.rows);

  // 3. Test API route handler directly
  const matchingHandler = require("../api/matching");
  const JWT_SECRET = process.env.JWT_SECRET || "india_shared_transport_jwt_secret_key_2026_safe";
  const token = jwt.sign({ email: "shashi@gmail.com", role: "BUSINESS", name: "Shashi" }, JWT_SECRET, { subject: "21", expiresIn: "7d" });

  const req = {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    url: "/api/matching/cargo/14",
    query: { cargoId: "14" }
  };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };

  await matchingHandler(req, res);
  console.log(`\nAPI Response for GET /api/matching/cargo/14:`);
  console.log(`Status: ${res.statusCode}`);
  console.log("Body JSON:", JSON.stringify(res.body, null, 2));

  // 4. Test live Vercel deployment
  const domain = "https://cargo-net.vercel.app";
  console.log(`\n--- LIVE VERCEL DEPLOYMENT TEST ON ${domain} ---`);
  const liveRes = await fetch(`${domain}/api/matching/cargo/14`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log(`Live HTTP Status: ${liveRes.status}`);
  console.log(`Live Content-Type: ${liveRes.headers.get("content-type")}`);
  const liveBody = await liveRes.json();
  console.log("Live Response JSON:", JSON.stringify(liveBody, null, 2));

  process.exit(0);
}

testCargo14().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
