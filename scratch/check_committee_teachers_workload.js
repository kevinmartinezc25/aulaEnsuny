const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTeachersWorkload() {
  const { data: curr } = await supabase
    .from('sch_curriculum')
    .select('hours_per_week, teacher_id, subject_id, group_id, group:sch_groups(name), subject:sch_subjects(name)')
    .in('subject_id', ['5772b40c-5143-47d1-99d1-09c845526636']);

  const teacherIds = Array.from(new Set(curr.map(c => c.teacher_id)));
  console.log('Committee Teachers count:', teacherIds.length);

  for (const tId of teacherIds) {
    const { data: allTeacherCurr } = await supabase
      .from('sch_curriculum')
      .select('hours_per_week, subject_id, group_id, group:sch_groups(name), subject:sch_subjects(name)')
      .eq('teacher_id', tId);

    const { data: prof } = await supabase.from('profiles').select('first_name, last_name').eq('id', tId).single();
    const name = prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : tId;

    let totalHrs = 0;
    let commHrs = 0;
    let regularHrs = 0;

    for (const c of allTeacherCurr || []) {
      totalHrs += c.hours_per_week;
      if (c.subject_id === '5772b40c-5143-47d1-99d1-09c845526636') {
        commHrs += c.hours_per_week;
      } else {
        regularHrs += c.hours_per_week;
      }
    }

    console.log(`Teacher: ${name} (${tId.substring(0,8)}) | Total: ${totalHrs}h (Regular: ${regularHrs}h, Comité: ${commHrs}h)`);
  }
}

checkTeachersWorkload();
