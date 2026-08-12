require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Test with Anon key (same as client-side createClient())
const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testAnonInsert() {
  console.log('Testing select sch_groups with anon client...');
  const { data: grp, error: grpErr } = await supabaseAnon
    .from('sch_groups')
    .select('id, name')
    .eq('name', 'DOCENTES_INSTITUCIONAL')
    .maybeSingle();

  console.log('Anon grp:', grp, 'Err:', grpErr);

  console.log('Testing select sch_subjects with anon client...');
  const { data: sub, error: subErr } = await supabaseAnon.from('sch_subjects').select('id').limit(1).single();
  console.log('Anon sub:', sub, 'Err:', subErr);

  console.log('Testing select profiles with anon client...');
  const { data: prof, error: profErr } = await supabaseAnon.from('profiles').select('id').limit(1).single();
  console.log('Anon prof:', prof, 'Err:', profErr);

  if (grp && sub && prof) {
    console.log('Testing insert sch_curriculum with anon client...');
    const { data: insData, error: insErr } = await supabaseAnon.from('sch_curriculum').insert([{
      group_id: grp.id,
      subject_id: sub.id,
      teacher_id: prof.id,
      hours_per_week: 2
    }]).select();

    console.log('Anon insert res:', insData);
    console.log('Anon insert err:', insErr);
  }
}

testAnonInsert().catch(console.error);
