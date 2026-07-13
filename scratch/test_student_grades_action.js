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

const adminClient = createClient(supabaseUrl, serviceKey);

async function test() {
  const studentId = '4ae04a8f-36df-4d91-b7fe-ff53abec2349'; // Luisa Torres
  const courseId = '45c26bca-06e8-4d47-9dc3-3bb5da189c57'; // Fisica
  
  console.log("Testing quiz_attempts query from getStudentCourseGrades...");
  
  const { data: quizAttempts, error } = await adminClient
    .from('quiz_attempts')
    .select(`
      id, score, max_score, completed_at,
      lessons!lesson_id(id, title)
    `)
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .eq('status', 'completed');
    
  console.log("Error:", error);
  console.log("Data:", quizAttempts);
}

test();
