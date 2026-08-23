const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "india_shared_transport_jwt_secret_key_2026_safe";
process.env.SUPABASE_DB_URL = "postgresql://postgres.mumktyppsrqdiqfnozbi:CargoNetpasswor@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";

const myBookingsHandler = require("../api/bookings/my-bookings.js");
const idHandler = require("../api/bookings/[id].js");

// Generate JWT token for user ID 9 (Shashi - BUSINESS)
const token = jwt.sign(
  { email: "shashi@gmail.com", role: "BUSINESS", name: "Shashi" },
  process.env.JWT_SECRET,
  { subject: "9", expiresIn: "7d" }
);

function mockReqRes(queryId) {
  const req = {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`
    },
    query: queryId ? { id: queryId } : {}
  };

  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.data = body;
      return this;
    }
  };

  return { req, res };
}

async function test() {
  console.log("--- TEST DIRECT CALL TO my-bookings.js ---");
  const { req: req1, res: res1 } = mockReqRes();
  await myBookingsHandler(req1, res1);
  console.log("Status:", res1.statusCode);
  console.log("Response Count:", Array.isArray(res1.data) ? res1.data.length : res1.data);

  console.log("\n--- TEST CALL TO [id].js WITH id='my-bookings' ---");
  const { req: req2, res: res2 } = mockReqRes("my-bookings");
  await idHandler(req2, res2);
  console.log("Status:", res2.statusCode);
  console.log("Response Count:", Array.isArray(res2.data) ? res2.data.length : res2.data);

  console.log("\n--- TEST CALL TO [id].js WITH id='12' (SINGLE BOOKING DETAILS) ---");
  const { req: req3, res: res3 } = mockReqRes("12");
  await idHandler(req3, res3);
  console.log("Status:", res3.statusCode);
  console.log("Single booking response:", res3.data);
}

test();
