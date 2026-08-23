async function testLiveProduction() {
  const domain = "https://cargo-net.vercel.app";
  console.log(`=================================================`);
  console.log(`LIVE PRODUCTION TEST ON: ${domain}`);
  console.log(`=================================================\n`);

  // 1. Unauthenticated request to /api/tracking/12
  console.log("1. Unauthenticated GET /api/tracking/12");
  const res1 = await fetch(`${domain}/api/tracking/12`);
  console.log(`Status: ${res1.status}`);
  console.log(`Content-Type: ${res1.headers.get("content-type")}`);
  const body1 = await res1.text();
  console.log(`Response Body: ${body1}\n`);

  // 2. Log in as Business User Shashi
  console.log("2. Logging in via POST /api/auth/login...");
  const loginRes = await fetch(`${domain}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "shashi@gmail.com",
      password: "password123"
    })
  });

  console.log(`Login Status: ${loginRes.status}`);
  const loginData = await loginRes.json();
  console.log(`Logged in as: ${loginData.user ? loginData.user.email : "Error"}`);
  const token = loginData.token;
  console.log(`JWT Token received: ${token ? token.substring(0, 30) + "..." : "NONE"}\n`);

  if (!token) {
    console.error("Login failed. Cannot proceed with authenticated tracking request.");
    return;
  }

  // 3. Authenticated request to /api/tracking/12
  console.log("3. Authenticated GET /api/tracking/12");
  const trackingRes = await fetch(`${domain}/api/tracking/12`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  console.log(`Status: ${trackingRes.status}`);
  console.log(`Content-Type: ${trackingRes.headers.get("content-type")}`);
  const trackingText = await trackingRes.text();
  console.log(`Response Body:\n${trackingText}\n`);

  // 4. Test /api/bookings/12
  console.log("4. Authenticated GET /api/bookings/12");
  const bookingRes = await fetch(`${domain}/api/bookings/12`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  console.log(`Status: ${bookingRes.status}`);
  console.log(`Content-Type: ${bookingRes.headers.get("content-type")}`);
  console.log(`Response Body:\n${await bookingRes.text()}\n`);

  // 5. Test /api/bookings/my-bookings
  console.log("5. Authenticated GET /api/bookings/my-bookings");
  const myBookingsRes = await fetch(`${domain}/api/bookings/my-bookings`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  console.log(`Status: ${myBookingsRes.status}`);
  console.log(`Content-Type: ${myBookingsRes.headers.get("content-type")}`);
  console.log(`Response Body:\n${await myBookingsRes.text()}\n`);
}

testLiveProduction();
