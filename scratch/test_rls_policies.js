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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create anon client
const supabase = createClient(supabaseUrl, anonKey);

async function testRLS() {
  console.log("Signing in as student (Luisa Torres)...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'estudiante@ensuny.edu.co',
    password: 'Password123!'
  });

  if (authError) {
    console.error("Auth error:", authError.message);
    return;
  }

  console.log("Logged in as student:", authData.user.email);

  // 1. Check quizzes select
  console.log("\n1. Testing SELECT from quizzes...");
  const { data: quizzes, error: quizzesErr } = await supabase.from('quizzes').select('id, title').limit(3);
  console.log("Quizzes error:", quizzesErr ? quizzesErr.message : "None");
  console.log("Quizzes count:", quizzes ? quizzes.length : 0);

  // 2. Check quiz_questions select
  console.log("\n2. Testing SELECT from quiz_questions...");
  const { data: questions, error: questionsErr } = await supabase.from('quiz_questions').select('id, question_text').limit(3);
  console.log("Questions error:", questionsErr ? questionsErr.message : "None");
  console.log("Questions count:", questions ? questions.length : 0);

  // 3. Check quiz_options select
  console.log("\n3. Testing SELECT from quiz_options...");
  const { data: options, error: optionsErr } = await supabase.from('quiz_options').select('id, option_text').limit(3);
  console.log("Options error:", optionsErr ? optionsErr.message : "None");
  console.log("Options count:", options ? options.length : 0);

  // 4. Check quiz_attempts select
  console.log("\n4. Testing SELECT from quiz_attempts...");
  const { data: attempts, error: attemptsErr } = await supabase.from('quiz_attempts').select('id, score').limit(3);
  console.log("Attempts error:", attemptsErr ? attemptsErr.message : "None");
  console.log("Attempts count:", attempts ? attempts.length : 0);

  // 5. Check inserting quiz_attempt as student
  if (quizzes && quizzes.length > 0) {
    console.log("\n5. Testing INSERT into quiz_attempts as student...");
    const { data: insData, error: insErr } = await supabase.from('quiz_attempts').insert({
      student_id: authData.user.id,
      quiz_id: quizzes[0].id,
      score: 4.5,
      is_passed: true
    }).select();
    
    if (insErr) {
      console.log("INSERT attempt error:", insErr.message);
    } else {
      console.log("INSERT attempt success:", insData);
      
      // Clean up the test insertion
      console.log("Cleaning up test insertion...");
      const { error: delErr } = await supabase.from('quiz_attempts').delete().eq('id', insData[0].id);
      console.log("Clean up error:", delErr ? delErr.message : "None");
    }
  }

  // 6. Check that student cannot insert grades directly
  console.log("\n6. Testing INSERT into grades (should be BLOCKED by RLS)...");
  const { error: gradeErr } = await supabase.from('grades').insert({
    student_id: authData.user.id,
    course_id: '45c26bca-06e8-4d47-9dc3-3bb5da189c57', // Fisica
    category_id: '8a89b873-5671-41cc-a90e-a32d73f36756', // some category ID
    score: 5.0
  });
  console.log("Grades insert error (expected RLS violation or policy block):", gradeErr ? gradeErr.message : "None");
}

testRLS();
