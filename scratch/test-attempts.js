const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function test() {
  try {
    const { data: dbAttempts, error: attemptsError } = await adminClient
      .from('quiz_attempts')
      .select(`
        id,
        score,
        is_passed,
        completed_at,
        student_id,
        quiz_id,
        profiles (first_name, last_name, grade_level),
        quizzes (
          title,
          lessons (
            module_id,
            course_modules (
              course_id,
              courses (title, subject)
            )
          )
        )
      `)
      .order('completed_at', { ascending: false });

    if (attemptsError) {
      console.error('attemptsError:', attemptsError);
      return;
    }

    console.log('Attempts count:', dbAttempts.length);
    if (dbAttempts.length > 0) {
      console.log('Sample attempt:', JSON.stringify(dbAttempts[0], null, 2));
    }
  } catch (err) {
    console.error('Execution error:', err);
  }
}

test();
