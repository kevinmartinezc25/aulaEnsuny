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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function inspect() {
  console.log("=== ACADEMIC PERIODS ===");
  const { data: periods, error: pError } = await adminClient.from('academic_periods').select('*');
  console.log("Periods error:", pError);
  console.log("Periods count:", periods ? periods.length : 0);
  console.log("Periods data:", JSON.stringify(periods, null, 2));

  console.log("=== TEST POSTGREST OR QUERY ===");
  const testPeriodId = '8a89b873-5671-41cc-a90e-a32d73f36756';
  const { data: grades, error: gError } = await adminClient
    .from('student_lesson_grades')
    .select('id, student_id, lesson_id, grade, score, academic_period_id, grade_type')
    .or(`academic_period_id.eq.${testPeriodId},academic_period_id.is.null`);
  console.log("Grades error:", gError);
  console.log("Grades count:", grades ? grades.length : 0);
  console.log("Grades data:", JSON.stringify(grades, null, 2));
}

inspect();
