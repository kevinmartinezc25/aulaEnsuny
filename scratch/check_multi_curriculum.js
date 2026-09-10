const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCurriculum() {
  const { data: curr, error } = await supabase
    .from('sch_curriculum')
    .select('id, group_id, subject_id, teacher_id, hours_per_week, subject:sch_subjects(name, is_academic_workload), group:sch_groups(name)');
  
  if (error) return console.error(error);

  const groupSubj = new Map();
  for (const c of curr) {
    const key = (c.group?.name || c.group_id) + ' | ' + (c.subject?.name || c.subject_id);
    if (!groupSubj.has(key)) groupSubj.set(key, []);
    groupSubj.get(key).push(c);
  }

  for (const [key, list] of groupSubj.entries()) {
    if (list.length > 1 || key.includes('DOCENTES') || key.includes('INSTITUCIONAL') || key.includes('Núcleo') || key.includes('Comité')) {
      console.log(`=== ${key} (Total rows: ${list.length}) ===`);
      list.forEach(item => {
        console.log(`  Teacher: ${item.teacher_id?.substring(0,8)} | Hrs: ${item.hours_per_week} | AcademicWorkload: ${item.subject?.is_academic_workload}`);
      });
    }
  }
}

checkCurriculum();
