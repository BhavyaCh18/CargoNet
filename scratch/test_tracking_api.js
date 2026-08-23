const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "india_shared_transport_jwt_secret_key_2026_safe";
process.env.SUPABASE_DB_URL = "postgresql://postgres.mumktyppsrqdiqfnozbi:CargoNetpasswor@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";

const trackingHandler = require("../api/tracking/[bookingId].js");

// Token 1: Business User (Shashi, ID 9) - owns booking 12
const tokenBusinessOwner = jwt.sign(
  { email: "shashi@gmail.com", role: "BUSINESS", name: "Shashi" },
  process.env.JWT_SECRET,
  { subject: "9", expiresIn: "7d" }
);

// Token 2: Other Business User (ID 99) - does NOT own booking 12
const tokenOtherBusiness = jwt.sign(
  { email: "other@gmail.com", role: "BUSINESS", name: "Other" },
  process.env.JWT_SECRET,
  { subject: "99", expiresIn: "7d" }
);

// Token 3: Truck Owner (Amar, ID 10) - owns truck ID 7 (assigned to booking 13)
const tokenTruckOwner = jwt.sign(
  { email: "amar@gmail.com", role: "TRUCK_OWNER", name: "Amar" },
  process.env.JWT_SECRET,
  { subject: "10", expiresIn: "7d" }
);

// Token 4: Other Truck Owner (ID 88) - does NOT own truck
const tokenOtherTruckOwner = jwt.sign(
  { email: "othertruck@gmail.com", role: "TRUCK_OWNER", name: "Other Trucker" },
  process.env.JWT_SECRET,
  { subject: "88", expiresIn: "7d" }
);

// Token 5: Admin User (ID 8)
const tokenAdmin = jwt.sign(
  { email: "admin@cargonet.in", role: "ADMIN", name: "System Admin" },
  process.env.JWT_SECRET,
  { subject: "8", expiresIn: "7d" }
);

function mockReqRes(bookingId, token) {
  const headers = {};
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const req = {
    method: "GET",
    headers,
    query: bookingId !== undefined ? { bookingId } : {}
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

async function runTests() {
  console.log("=========================================");
  console.log("TESTING SHIPMENT TRACKING API ENDPOINT");
  console.log("=========================================\n");

  // Case 1: Valid business booking
  console.log("1. Valid business booking (User 9 accessing Booking 12)");
  const { req: r1, res: res1 } = mockReqRes("12", tokenBusinessOwner);
  await trackingHandler(r1, res1);
  console.log("Status:", res1.statusCode);
  console.log("Payload:", JSON.stringify(res1.data, null, 2));

  // Case 2: Unauthorized business user
  console.log("\n2. Unauthorized business user (User 99 accessing Booking 12)");
  const { req: r2, res: res2 } = mockReqRes("12", tokenOtherBusiness);
  await trackingHandler(r2, res2);
  console.log("Status:", res2.statusCode);
  console.log("Payload:", res2.data);

  // Case 3: Assigned truck owner accessing booking 13
  console.log("\n3. Truck owner accessing assigned booking (User 10 accessing Booking 13)");
  const { req: r3, res: res3 } = mockReqRes("13", tokenTruckOwner);
  await trackingHandler(r3, res3);
  console.log("Status:", res3.statusCode);
  console.log("Payload:", JSON.stringify(res3.data, null, 2));

  // Case 4: Unrelated truck owner accessing booking 12
  console.log("\n4. Unrelated truck owner accessing booking (User 88 accessing Booking 12)");
  const { req: r4, res: res4 } = mockReqRes("12", tokenOtherTruckOwner);
  await trackingHandler(r4, res4);
  console.log("Status:", res4.statusCode);
  console.log("Payload:", res4.data);

  // Case 5: Admin accessing booking 12
  console.log("\n5. Admin accessing booking 12");
  const { req: r5, res: res5 } = mockReqRes("12", tokenAdmin);
  await trackingHandler(r5, res5);
  console.log("Status:", res5.statusCode);
  console.log("Payload:", JSON.stringify(res5.data, null, 2));

  // Case 6: Non-existent booking ID
  console.log("\n6. Non-existent booking ID (Booking 99999)");
  const { req: r6, res: res6 } = mockReqRes("99999", tokenAdmin);
  await trackingHandler(r6, res6);
  console.log("Status:", res6.statusCode);
  console.log("Payload:", res6.data);

  // Case 7: Invalid booking ID parameter
  console.log("\n7. Invalid booking ID parameter (abc)");
  const { req: r7, res: res7 } = mockReqRes("abc", tokenAdmin);
  await trackingHandler(r7, res7);
  console.log("Status:", res7.statusCode);
  console.log("Payload:", res7.data);

  // Case 8: Missing JWT
  console.log("\n8. Missing JWT Authorization header");
  const { req: r8, res: res8 } = mockReqRes("12", null);
  await trackingHandler(r8, res8);
  console.log("Status:", res8.statusCode);
  console.log("Payload:", res8.data);
}

runTests();
