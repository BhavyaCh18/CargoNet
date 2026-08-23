async function checkDeployed() {
  const urls = [
    'https://cargo-rxnymw3ba-bhavya-302b.vercel.app/api/tracking/12',
    'https://cargo-rxnymw3ba-bhavya-302b.vercel.app/api/bookings/12',
    'https://cargo-rxnymw3ba-bhavya-302b.vercel.app/api/bookings/my-bookings',
    'https://cargo-rxnymw3ba-bhavya-302b.vercel.app/api/cargo',
    'https://cargo-rxnymw3ba-bhavya-302b.vercel.app/api/trucks'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(`URL: ${url}`);
      console.log(`Status: ${res.status}`);
      console.log(`Content-Type: ${res.headers.get('content-type')}`);
      const text = await res.text();
      console.log(`Body (first 200 chars): ${text.substring(0, 200)}\n---`);
    } catch (err) {
      console.error(`Error fetching ${url}:`, err.message);
    }
  }
}

checkDeployed();
