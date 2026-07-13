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

async function inspect() {
  const { data, error } = await adminClient.rpc('get_tables'); // wait, if get_tables is not defined, we can try querying a system table
  if (error) {
    console.log("RPC get_tables error, trying direct query...");
    // Let's try querying postgrest schema or running a select on a system view.
    // In Supabase/Postgrest we can query the OpenAPI spec or postgrest schema.
    // An alternative is querying one of the tables we know to see what works, or calling a simple query.
    // Let's query student_courses
    const { data: sc, error: scErr } = await adminClient.from('student_courses').select('*').limit(1);
    console.log("student_courses exists? Error:", scErr, "Data:", sc);

    // Let's query enrollments
    const { data: en, error: enErr } = await adminClient.from('enrollments').select('*').limit(1);
    console.log("enrollments exists? Error:", enErr);

    // Let's query student_enrollments
    const { data: se, error: seErr } = await adminClient.from('student_enrollments').select('*').limit(1);
    console.log("student_enrollments exists? Error:", seErr);
  } else {
    console.log("Tables:", data);
  }
}

inspect();
