const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(supabaseUrl, serviceKey);

async function check() {
  console.log("Fetching one row from quiz_attempts...");
  const { data, error } = await client.from('quiz_attempts').select('*').limit(1);
  if (error) {
    console.error("quiz_attempts error:", error);
  } else {
    console.log("quiz_attempts columns/keys:", data.length > 0 ? Object.keys(data[0]) : "Empty table");
  }
  
  // Try querying pg_attribute or standard SQL to see columns of quiz_attempts
  // We can select a dummy object from pg_catalog or query using a RPC if we have one.
  // Wait, let's see if we can do an insert into quiz_attempts to see if it works,
  // or query columns if there is a row. In the previous run of scratch/test-attempts.js:
  // Attempts count: 1
  // Sample attempt: { id, score, is_passed, completed_at, student_id, quiz_id }
  // Wait! In that run, the returned columns were: id, score, is_passed, completed_at, student_id, quiz_id!
  // And it had:
  //   "id": "fa5bcad6-3b52-4d40-a95a-baa0d20010b2",
  //   "score": 5,
  //   "is_passed": true,
  //   "completed_at": "2026-06-04T13:23:36.972228+00:00",
  //   "student_id": "4ae04a8f-36df-4d91-b7fe-ff53abec2349",
  //   "quiz_id": "2867a191-9711-4ff9-8d90-6ecd99669b27"
  // So there is NO status, max_score, course_id, or lesson_id column in the quiz_attempts table!
}

check();
