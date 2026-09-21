import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const tables = [
    'sch_schedules', 'sch_schedule_slots', 'sch_periods', 
    'sch_teachers', 'sch_subjects', 'sch_groups',
    'teachers', 'subjects', 'groups', 'courses', 'academic_load', 'convivencia',
    'sch_constraints', 'sch_rules', 'sch_generations', 'users'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        if (error.code === '42P01') {
           // Not found
        } else {
           console.log(`[ERROR ${table}]`, error);
        }
      } else {
        console.log(`[FOUND] ${table}`);
      }
    } catch(err) {
      console.log(`[CATCH ${table}]`, err);
    }
  }
}

main();
