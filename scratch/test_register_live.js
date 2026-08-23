async function registerAndTest() {
  const domain = "https://cargo-net.vercel.app";
  const email = `testuser_${Date.now()}@cargonet.in`;

  console.log(`Registering new user on live Vercel: ${email}...`);
  const regRes = await fetch(`${domain}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Live Test User",
      email: email,
      password: "password123",
      role: "BUSINESS"
    })
  });

  console.log(`Register Status: ${regRes.status}`);
  const regData = await regRes.json();
  console.log("Register Response:", JSON.stringify(regData, null, 2));

  const token = regData.token;
  const userId = regData.user ? regData.user.id : null;

  if (!token) {
    console.error("Failed to register and obtain Vercel JWT token");
    return;
  }

  console.log(`\nUsing live Vercel Token for User ${userId}...`);

  // Test GET /api/tracking/12 with live token
  console.log("\n--- TEST GET /api/tracking/12 ---");
  const trackingRes = await fetch(`${domain}/api/tracking/12`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log(`Status: ${trackingRes.status}`);
  console.log(`Content-Type: ${trackingRes.headers.get("content-type")}`);
  console.log("Body:", await trackingRes.text());

  // Test GET /api/bookings/my-bookings with live token
  console.log("\n--- TEST GET /api/bookings/my-bookings ---");
  const myBookingsRes = await fetch(`${domain}/api/bookings/my-bookings`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log(`Status: ${myBookingsRes.status}`);
  console.log(`Content-Type: ${myBookingsRes.headers.get("content-type")}`);
  console.log("Body:", await myBookingsRes.text());
}

registerAndTest();
