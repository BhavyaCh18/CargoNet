const jwt = require("jsonwebtoken");

const JWT_SECRET = "india_shared_transport_jwt_secret_key_2026_safe";
const token = jwt.sign(
  { email: "shashi@gmail.com", role: "BUSINESS", name: "Shashi" },
  JWT_SECRET,
  { subject: "9", expiresIn: "7d" }
);

async function testDomains() {
  const domains = [
    "https://cargo-net.vercel.app",
    "https://cargonet.vercel.app",
    "https://cargo-net-five.vercel.app",
    "https://cargo-rxnymw3ba-bhavya-302b.vercel.app"
  ];

  for (const domain of domains) {
    try {
      const url = `${domain}/api/tracking/12`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      console.log(`Domain: ${domain}`);
      console.log(`Status: ${res.status}`);
      console.log(`Content-Type: ${res.headers.get("content-type")}`);
      const text = await res.text();
      console.log(`Body (first 200 chars): ${text.substring(0, 200)}\n---`);
    } catch (err) {
      console.log(`Error testing ${domain}: ${err.message}\n---`);
    }
  }
}

testDomains();
