require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('sch_curriculum').select('teacher_id, hours_per_week, sch_groups(name)');
  console.log('Curriculum:', data, error);
}
check();
