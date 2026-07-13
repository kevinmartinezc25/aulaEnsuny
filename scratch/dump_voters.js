const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data: voters, error } = await supabase
    .from('election_voters')
    .select('*, profiles:student_id(first_name, last_name, grade_level)');
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Total voters in DB:', voters.length);
  console.log('Sample voters:', voters.slice(0, 10).map(v => ({
    name: `${v.profiles?.first_name} ${v.profiles?.last_name}`,
    grade: v.profiles?.grade_level,
    has_voted: v.has_voted
  })));
}

run();
