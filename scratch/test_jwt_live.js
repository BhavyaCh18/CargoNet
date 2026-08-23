const jwt = require("jsonwebtoken");

const JWT_SECRET = "india_shared_transport_jwt_secret_key_2026_safe";

// User ID 9 (Shashi - BUSINESS owner of booking 12)
const tokenBusiness = jwt.sign(
  { email: "shashi@gmail.com", role: "BUSINESS", name: "Shashi" },
  JWT_SECRET,
  { subject: "9", expiresIn: "7d" }
);

async function testWithToken() {
  const domain = "https://cargo-net.vercel.app";

  console.log("3. Authenticated GET /api/tracking/12");
  const trackingRes = await fetch(`${domain}/api/tracking/12`, {
    headers: {
      "Authorization": `Bearer ${tokenBusiness}`
    }
  });

  console.log(`Status: ${trackingRes.status}`);
  console.log(`Content-Type: ${trackingRes.headers.get("content-type")}`);
  const trackingText = await trackingRes.text();
  console.log(`Response Body:\n${trackingText}\n`);

  console.log("4. Authenticated GET /api/bookings/12");
  const bookingRes = await fetch(`${domain}/api/bookings/12`, {
    headers: {
      "Authorization": `Bearer ${tokenBusiness}`
    }
  });
  console.log(`Status: ${bookingRes.status}`);
  console.log(`Content-Type: ${bookingRes.headers.get("content-type")}`);
  console.log(`Response Body:\n${await bookingRes.text()}\n`);

  console.log("5. Authenticated GET /api/bookings/my-bookings");
  const myBookingsRes = await fetch(`${domain}/api/bookings/my-bookings`, {
    headers: {
      "Authorization": `Bearer ${tokenBusiness}`
    }
  });
  console.log(`Status: ${myBookingsRes.status}`);
  console.log(`Content-Type: ${myBookingsRes.headers.get("content-type")}`);
  console.log(`Response Body:\n${await myBookingsRes.text()}\n`);
}

testWithToken();
