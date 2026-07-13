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

const orphanedLessonId = 'a4439ab1-661f-4e65-a324-412e6980af4a';

async function fix() {
  console.log("Checking if lesson exists...");
  const { data: lesson, error: lErr } = await adminClient
    .from('lessons')
    .select('id, title, type')
    .eq('id', orphanedLessonId)
    .single();

  if (lErr || !lesson) {
    console.log("Lesson not found:", lErr ? lErr.message : "No data");
    return;
  }

  console.log("Found lesson:", lesson);

  console.log("Checking if forum config already exists...");
  const { data: forum } = await adminClient
    .from('forums')
    .select('id')
    .eq('lesson_id', orphanedLessonId)
    .maybeSingle();

  if (forum) {
    console.log("Forum config already exists with ID:", forum.id);
    return;
  }

  console.log("Inserting missing forum config...");
  const { data: newForum, error: fErr } = await adminClient
    .from('forums')
    .insert({
      lesson_id: orphanedLessonId,
      forum_type: 'social',
      is_graded: false
    })
    .select()
    .single();

  if (fErr) {
    console.error("❌ Error inserting forum config:", fErr.message);
  } else {
    console.log("✅ Successfully fixed orphaned forum! New config:", newForum);
  }
}

fix();
