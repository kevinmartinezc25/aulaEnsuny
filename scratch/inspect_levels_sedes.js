require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data: levels, error: lErr } = await supabase.from('academic_levels').select('*');
  console.log('academic_levels:', levels, lErr?.message);

  const { data: schGroups, error: gErr } = await supabase.from('sch_groups').select('id, name, level').order('name');
  console.log('sch_groups count:', schGroups?.length, 'names:', schGroups?.map(g => g.name));

  const { data: dirSample, error: dErr } = await supabase.from('student_directory').select('grade_level, group_name').limit(10);
  console.log('student_directory sample:', dirSample);

  // Check if institutional_sedes exists
  const { data: sedes, error: sErr } = await supabase.from('institutional_sedes').select('*');
  console.log('institutional_sedes:', sedes, sErr?.message);
}
inspect();
