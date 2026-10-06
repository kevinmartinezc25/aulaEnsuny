require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seedLevels() {
  const newLevels = [
    'Transición',
    '1°',
    '2°',
    '3°',
    '4°',
    '5°',
    'Jardín',
    'Aula Multigrado'
  ];

  for (const name of newLevels) {
    const { data, error } = await supabase.from('academic_levels').upsert({ name }, { onConflict: 'name' }).select();
    console.log(`Upserted level "${name}":`, data ? 'OK' : error?.message);
  }
}
seedLevels();
