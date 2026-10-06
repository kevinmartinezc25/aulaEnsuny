require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seedSchGroupsAndAcademicGroups() {
  // 1. Get all academic levels
  const { data: levels } = await supabase.from('academic_levels').select('*');
  console.log('Total levels in DB:', levels?.length);

  // 2. Ensure academic_groups has at least group '1' and '2' for each level
  for (const lvl of levels || []) {
    const groupsToSeed = lvl.name.includes('Multigrado') ? ['1'] : ['1', '2'];
    for (const gName of groupsToSeed) {
      const { data: existing } = await supabase
        .from('academic_groups')
        .select('id')
        .eq('academic_level_id', lvl.id)
        .eq('name', gName)
        .maybeSingle();

      if (!existing) {
        await supabase.from('academic_groups').insert({
          academic_level_id: lvl.id,
          name: gName
        });
        console.log(`Created academic_group ${gName} for level ${lvl.name}`);
      }
    }
  }

  // 3. Ensure sch_groups has the primary and preschool groups
  const schGroupsToEnsure = [
    { name: 'Transición-1', level: 'Preescolar' },
    { name: 'Transición-2', level: 'Preescolar' },
    { name: 'Jardín-1', level: 'Preescolar' },
    { name: '1°-1', level: 'Primaria' },
    { name: '1°-2', level: 'Primaria' },
    { name: '2°-1', level: 'Primaria' },
    { name: '2°-2', level: 'Primaria' },
    { name: '3°-1', level: 'Primaria' },
    { name: '3°-2', level: 'Primaria' },
    { name: '4°-1', level: 'Primaria' },
    { name: '4°-2', level: 'Primaria' },
    { name: '5°-1', level: 'Primaria' },
    { name: '5°-2', level: 'Primaria' },
    { name: 'Aula Multigrado-1', level: 'Escuela Nueva / Multigrado' }
  ];

  for (const sg of schGroupsToEnsure) {
    const { data: existing } = await supabase
      .from('sch_groups')
      .select('id')
      .eq('name', sg.name)
      .maybeSingle();

    if (!existing) {
      await supabase.from('sch_groups').insert({
        name: sg.name,
        level: sg.level
      });
      console.log(`Created sch_group: ${sg.name}`);
    } else {
      console.log(`sch_group already exists: ${sg.name}`);
    }
  }
}
seedSchGroupsAndAcademicGroups();
