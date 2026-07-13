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
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testActionLogic() {
  try {
    const courseId = '45c26bca-06e8-4d47-9dc3-3bb5da189c57'; // Fisica General

    // 1c. Enrollments (using student_courses table)
    const { data: enrollments, error: enrollError } = await adminClient
      .from('student_courses')
      .select('student_id, profiles!student_id(id, first_name, last_name)')
      .eq('course_id', courseId);
    
    if (enrollError) {
      console.error("Enrollments error:", enrollError);
      return;
    }
    console.log("Enrollments retrieved:", enrollments ? enrollments.length : 0);
    console.log("Enrollments data:", JSON.stringify(enrollments, null, 2));

    const students = (enrollments || []).map((e) => {
      const p = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
      return { id: p?.id ?? e.student_id, firstName: p?.first_name ?? '', lastName: p?.last_name ?? '' };
    }).sort((a, b) => a.lastName.localeCompare(b.lastName));

    console.log("Mapped Students:", students);
  } catch (err) {
    console.error("Execution error:", err);
  }
}

testActionLogic();
