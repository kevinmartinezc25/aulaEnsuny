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
  const courseId = '45c26bca-06e8-4d47-9dc3-3bb5da189c57';
  console.log("Querying lessons with quizzes relation...");
  const { data: lessons, error } = await adminClient
    .from('lessons')
    .select('id, title, content_type, type, order_index, course_modules!inner(course_id), quizzes(id)')
    .eq('course_modules.course_id', courseId);
  
  console.log("Error:", error);
  console.log("Lessons count:", lessons ? lessons.length : 0);
  console.log("Lessons data:", JSON.stringify(lessons, null, 2));
}

inspect();
