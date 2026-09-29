async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/notifications/inbox?userId=test', { redirect: 'manual' });
    console.log("STATUS:", res.status);
    console.log("REDIRECTED:", res.redirected);
    console.log("URL:", res.url);
    console.log("LOCATION HEADER:", res.headers.get('location'));
  } catch (e) {
    console.log(e.message);
  }
}
run();
