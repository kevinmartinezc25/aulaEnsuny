async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/notifications/inbox?userId=test');
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("BODY:", text.substring(0, 300));
  } catch (e) {
    console.log(e.message);
  }
}
run();
