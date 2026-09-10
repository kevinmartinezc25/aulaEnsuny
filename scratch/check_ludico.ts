import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function checkLudico() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: curr } = await supabase.from('sch_curriculum')
    .select('*, teacher:sch_teachers(name), subject:sch_subjects(name)')
    .in('teacher_id', ['6b6ef7e2-4113-41a4-a285-d6d1d2b8fe03', '41947f72-901d-4eb4-b632-6a56828551a3']);
  
  console.log('Curriculum for Ludico teachers:');
  curr?.forEach(c => {
    console.log(`Teacher: ${c.teacher?.name} | Subj: ${c.subject?.name} | Group: ${c.group_id} | Hrs: ${c.hours_per_week}`);
  });

  const { data: timeoff } = await supabase.from('sch_time_off')
    .select('*')
    .in('entity_id', ['6b6ef7e2-4113-41a4-a285-d6d1d2b8fe03', '41947f72-901d-4eb4-b632-6a56828551a3']);
  console.log('Time off for Ludico teachers:', timeoff);
}

checkLudico();
