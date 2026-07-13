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

const courseId = 'cee266d1-1640-4afe-9f37-e322446086f9'; // Let's get any course first

async function debug() {
  // 1. Get courses
  const { data: courses } = await adminClient.from('courses').select('id, title');
  console.log("Courses:", courses);
  if (!courses || courses.length === 0) return;

  const targetCourseId = courses[0].id;
  console.log("\nUsing course:", courses[0].title, "(", targetCourseId, ")");

  // 2. Get course modules
  const { data: modules, error: mErr } = await adminClient
    .from('course_modules')
    .select('id, title')
    .eq('course_id', targetCourseId);
  console.log("Modules error:", mErr);
  console.log("Modules:", modules);
  if (!modules || modules.length === 0) return;

  const moduleIds = modules.map(m => m.id);

  // 3. Get lessons
  const { data: lessons, error: lErr } = await adminClient
    .from('lessons')
    .select('id, title, type, module_id')
    .in('module_id', moduleIds);
  console.log("\nLessons error:", lErr);
  console.log("All Lessons in modules:", lessons);

  const forumLessons = (lessons || []).filter(l => l.type === 'forum');
  console.log("Forum Lessons in modules:", forumLessons);

  if (lessons && lessons.length > 0) {
    const lessonIds = lessons.map(l => l.id);

    // Try joining lessons (plural)
    console.log("\nTrying query with lessons(title)...");
    const { data: dbForumsPlural, error: fErrPlural } = await adminClient
      .from('forums')
      .select('id, created_at, lesson_id, lessons(title)')
      .in('lesson_id', lessonIds);
    console.log("Plural query error:", fErrPlural);
    console.log("Plural query data:", dbForumsPlural);

    // Try joining lesson (singular)
    console.log("\nTrying query with lesson(title)...");
    const { data: dbForumsSingular, error: fErrSingular } = await adminClient
      .from('forums')
      .select('id, created_at, lesson_id, lesson(title)')
      .in('lesson_id', lessonIds);
    console.log("Singular query error:", fErrSingular);
    console.log("Singular query data:", dbForumsSingular);

    // Try reading raw forums table
    console.log("\nReading raw forums table...");
    const { data: rawForums, error: rawErr } = await adminClient
      .from('forums')
      .select('*');
    console.log("Raw forums error:", rawErr);
    console.log("Raw forums data:", rawForums);
  }
}

debug();
