const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testModalidad() {
  const { data, error } = await supabase.from('student_enrollments').select('modalidad').limit(1);
  console.log('modalidad column in student_enrollments:', { error: error?.message, data });
}
testModalidad();
