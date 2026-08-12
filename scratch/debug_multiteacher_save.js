require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testConstraints() {
  console.log('Testing sch_constraints query...');
  const { data, error } = await supabase
    .from('sch_constraints')
    .select('*')
    .eq('rule_type', 'MULTI_TEACHER_WORKLOAD_CONFIG');

  console.log('Data:', data);
  console.log('Error:', error);
}

testConstraints().catch(console.error);
