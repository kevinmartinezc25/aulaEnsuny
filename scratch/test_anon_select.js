const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aibdfspoxzyokvpnicla.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmRmc3BveHp5b2t2cG5pY2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NzU5MjgsImV4cCI6MjA5NTU1MTkyOH0.0BNB8065JmXGghy8nFO3PdS7rMJq-PAGA6FI5-1m0UM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  // Try to sign in as the teacher
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'alejandro.docente@ensuny.edu.co', // We can guess or get from the profiles table. Wait, let's list profile emails or just select directly if it's public.
    password: 'Password123' // Let's see if we can read course_grade_categories anonymously first.
  });
  
  console.log('Sign in:', signInData, signInError);

  const { data: anonCats, error: anonErr } = await supabase.from('course_grade_categories').select('*');
  console.log('Anon Categories:', anonCats, anonErr);
}

check();
