const signingKey = "signkey-prod-ece3e4c390312ad790a8164a7ca1eb866d9d6af070a59ae4be4d229ad1de0e68";

async function testEndpoint(url) {
  console.log(`\nTesting: ${url}`);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${signingKey}`,
      },
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`Response: ${text.slice(0, 500)}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}

async function run() {
  await testEndpoint("https://api.inngest.com/v1/runs");
  await testEndpoint("https://api.inngest.com/runs");
  await testEndpoint("https://api.inngest.com/v1/cancellations");
  await testEndpoint("https://api.inngest.com/cancellations");
  // Also try api.inngest.co or inngest.com domain variations if they exist
  await testEndpoint("https://api.inngest.co/v1/runs");
}

run();
