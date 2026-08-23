const jwt = require("jsonwebtoken");

const JWT_SECRET = "india_shared_transport_jwt_secret_key_2026_safe";

// Token for User ID 9 (Shashi - BUSINESS owner of booking 12)
const token = jwt.sign(
  { email: "shashi@gmail.com", role: "BUSINESS", name: "Shashi" },
  JWT_SECRET,
  { subject: "9", expiresIn: "7d" }
);

async function poll() {
  console.log("Polling deployed Vercel endpoints...");

  // Try fetching tracking endpoint with Bearer token
  const url = "https://cargo-rxnymw3ba-bhavya-302b.vercel.app/api/tracking/12";
  
  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    console.log(`URL: ${url}`);
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get("content-type")}`);
    const body = await res.text();
    console.log("Body:", body);
  } catch (err) {
    console.error("Fetch error:", err.message);
  }

  // Also try unauthenticated call to confirm 401 instead of 404/HTML
  try {
    const resNoAuth = await fetch(url);
    console.log("\nUnauthenticated Call:");
    console.log(`Status: ${resNoAuth.status}`);
    console.log(`Content-Type: ${resNoAuth.headers.get("content-type")}`);
    const bodyNoAuth = await resNoAuth.text();
    console.log("Body:", bodyNoAuth);
  } catch (err) {
    console.error("NoAuth Fetch error:", err.message);
  }
}

poll();
