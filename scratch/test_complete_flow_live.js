async function testCompleteLiveFlow() {
  const domain = "https://cargo-net.vercel.app";
  const email = `live_shipper_${Date.now()}@cargonet.in`;

  console.log("=================================================");
  console.log("COMPLETE LIVE VERCEL DEPLOYMENT END-TO-END TEST");
  console.log("=================================================\n");

  // 1. Register a new Business User
  console.log(`1. Registering Business User: ${email}...`);
  const regRes = await fetch(`${domain}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Live Shipper",
      email: email,
      password: "password123",
      role: "BUSINESS"
    })
  });

  const regData = await regRes.json();
  const token = regData.token;
  const userId = regData.user.id;
  console.log(`Registered User ID: ${userId}`);
  console.log(`JWT Token: ${token.substring(0, 35)}...\n`);

  const authHeaders = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  // 2. Create Cargo
  console.log("2. Creating Cargo via POST /api/cargo...");
  const cargoRes = await fetch(`${domain}/api/cargo`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      cargoName: "Steel Pipes",
      pickupLocation: "Hyderabad",
      destination: "Bengaluru",
      weight: 5,
      description: "Live test shipment",
      pickupDate: "2026-08-25",
      requiredDeliveryDate: "2026-08-28",
      preferredVehicleType: "Open Body",
      specialHandling: "Fragile"
    })
  });

  const cargoData = await cargoRes.json();
  console.log("Cargo created:", cargoData);
  const cargoId = cargoData.id;

  // 3. Create Booking
  console.log("\n3. Creating Booking via POST /api/bookings...");
  const bookingRes = await fetch(`${domain}/api/bookings`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      cargoId: cargoId,
      truckId: 7
    })
  });

  const bookingData = await bookingRes.json();
  console.log("Booking created:", bookingData);
  const bookingId = bookingData.id;

  // 4. Test GET /api/tracking/<bookingId>
  console.log(`\n4. Testing GET /api/tracking/${bookingId} on Live Vercel...`);
  const trackingRes = await fetch(`${domain}/api/tracking/${bookingId}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  console.log(`Status: ${trackingRes.status}`);
  console.log(`Content-Type: ${trackingRes.headers.get("content-type")}`);
  const trackingData = await trackingRes.json();
  console.log("Tracking API Response JSON:\n", JSON.stringify(trackingData, null, 2));

  // 5. Test GET /api/bookings/my-bookings
  console.log("\n5. Testing GET /api/bookings/my-bookings on Live Vercel...");
  const myBookingsRes = await fetch(`${domain}/api/bookings/my-bookings`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  console.log(`Status: ${myBookingsRes.status}`);
  console.log(`Content-Type: ${myBookingsRes.headers.get("content-type")}`);
  const myBookingsData = await myBookingsRes.json();
  console.log("My Bookings Response Count:", myBookingsData.length);
  console.log("First Booking:", JSON.stringify(myBookingsData[0], null, 2));
}

testCompleteLiveFlow();
