async function testLiveCargo14() {
  const domain = "https://cargo-net.vercel.app";
  console.log("1. Logging in / registering user on live Vercel...");

  const regRes = await fetch(`${domain}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Business Cargo 14 Tester",
      email: `cargo14_tester_${Date.now()}@cargonet.in`,
      password: "password123",
      role: "BUSINESS"
    })
  });

  const regData = await regRes.json();
  const token = regData.token;
  console.log("Got token from Vercel production:", token ? token.substring(0, 30) + "..." : "NONE");

  console.log("\n2. Fetching GET /api/matching/cargo/14 from Live Vercel...");
  const matchingRes = await fetch(`${domain}/api/matching/cargo/14`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  console.log(`Live HTTP Status: ${matchingRes.status}`);
  console.log(`Live Content-Type: ${matchingRes.headers.get("content-type")}`);
  const data = await matchingRes.json();
  console.log("Live Response Data:", JSON.stringify(data, null, 2));

  // Test frontend processing logic
  const rawMatches = data.matches || data.matchingTrucks || data.matching_trucks || [];
  const matches = rawMatches.map(m => m.truck ? m : {
    truck: m,
    matchScore: 100,
    bestMatch: true,
    routeScore: 40,
    capacityScore: 30,
    dateScore: 20
  });

  console.log(`\nFrontend processed matches.length = ${matches.length}`);
  console.log("Matches array:", JSON.stringify(matches, null, 2));
}

testLiveCargo14();
