require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCols() {
  const { data: dirData, error: dirErr } = await supabase.from('student_directory').select('*').limit(1);
  console.log('student_directory row:', dirData ? Object.keys(dirData[0] || {}) : dirErr?.message);

  const { data: profData, error: profErr } = await supabase.from('profiles').select('*').limit(1);
  console.log('profiles row:', profData ? Object.keys(profData[0] || {}) : profErr?.message);

  const { data: enrollData, error: enrollErr } = await supabase.from('student_enrollments').select('*').limit(1);
  console.log('student_enrollments row:', enrollData ? Object.keys(enrollData[0] || {}) : enrollErr?.message);
}
checkCols();
