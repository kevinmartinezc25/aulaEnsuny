import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: curriculum, error } = await supabase
    .from('sch_curriculum')
    .select('teacher_id, duration, subject_name, group_name');
    
  if (error) {
    console.error(error);
    return;
  }
  
  const teacherHours = new Map<string, number>();
  for (const row of curriculum) {
    if (row.teacher_id) {
      teacherHours.set(row.teacher_id, (teacherHours.get(row.teacher_id) || 0) + row.duration);
    }
  }
  
  const { data: teachers } = await supabase.from('sch_teachers').select('id, name');
  const teacherNames = new Map(teachers?.map(t => [t.id, t.name]));
  
  console.log("Teacher Workloads:");
  const sorted = Array.from(teacherHours.entries()).sort((a, b) => b[1] - a[1]);
  for (const [id, hours] of sorted) {
    console.log(`${teacherNames.get(id) || id}: ${hours} horas`);
  }
}

main();
