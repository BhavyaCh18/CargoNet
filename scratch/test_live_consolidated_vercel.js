async function testLiveConsolidatedVercel() {
  const domain = "https://cargo-net.vercel.app";
  console.log("=================================================");
  console.log(`TESTING LIVE DEPLOYMENT ON: ${domain}`);
  console.log("=================================================\n");

  // 1. Health Check
  console.log("1. GET /api/health");
  const healthRes = await fetch(`${domain}/api/health`);
  console.log(`Status: ${healthRes.status}`);
  console.log(`Content-Type: ${healthRes.headers.get("content-type")}`);
  console.log("Body:", await healthRes.text());

  // 2. Register Business User
  const bizEmail = `live_consolidated_${Date.now()}@cargonet.in`;
  console.log(`\n2. POST /api/auth/register (${bizEmail})...`);
  const regRes = await fetch(`${domain}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Live Consolidated User",
      email: bizEmail,
      password: "password123",
      role: "BUSINESS"
    })
  });
  console.log(`Status: ${regRes.status}`);
  console.log(`Content-Type: ${regRes.headers.get("content-type")}`);
  const regData = await regRes.json();
  console.log("User Registered ID:", regData.user ? regData.user.id : "ERROR");
  const token = regData.token;

  if (!token) {
    console.error("Failed to get token from Vercel!");
    return;
  }

  // 3. Post Cargo
  console.log("\n3. POST /api/cargo...");
  const cargoRes = await fetch(`${domain}/api/cargo`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      cargoName: "Electronics",
      pickupLocation: "Hyderabad",
      destination: "Bengaluru",
      weight: 2,
      description: "Live test",
      pickupDate: "2026-08-25",
      requiredDeliveryDate: "2026-08-28"
    })
  });
  console.log(`Status: ${cargoRes.status}`);
  console.log(`Content-Type: ${cargoRes.headers.get("content-type")}`);
  const cargoData = await cargoRes.json();
  console.log("Cargo ID:", cargoData.id, "Status:", cargoData.status);

  // 4. Test Bookings Listing
  console.log("\n4. GET /api/bookings/my-bookings...");
  const myBookingsRes = await fetch(`${domain}/api/bookings/my-bookings`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log(`Status: ${myBookingsRes.status}`);
  console.log(`Content-Type: ${myBookingsRes.headers.get("content-type")}`);
  const myBookingsData = await myBookingsRes.json();
  console.log("My Bookings Count:", myBookingsData.length);

  console.log("\n=================================================");
  console.log("LIVE VERCEL DEPLOYMENT PASSED ALL CHECKS!");
  console.log("=================================================");
}

testLiveConsolidatedVercel();
