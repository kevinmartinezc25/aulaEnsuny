const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

// Load env vars
const envFile = fs.readFileSync('.env.local', 'utf8')
const envs = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) envs[match[1]] = match[2].trim()
})

const supabase = createClient(envs['NEXT_PUBLIC_SUPABASE_URL'], envs['SUPABASE_SERVICE_ROLE_KEY'])

async function check() {
  const { data: imports } = await supabase.from('academic_imports').select('id, status')
  console.log('Imports:', imports)
}
check()
