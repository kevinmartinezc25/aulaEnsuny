const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function inspect() {
  console.log("=== ROLES ===");
  const { data: roles, error: rErr } = await adminClient.from('roles').select('*');
  console.log("Roles error:", rErr);
  console.log("Roles data:", roles);

  console.log("\n=== PROFILES WITH ROLES ===");
  const { data: profiles, error: pErr } = await adminClient
    .from('profiles')
    .select('id, first_name, last_name, role_id, roles(name)');
  console.log("Profiles error:", pErr);
  console.log("Profiles count:", profiles ? profiles.length : 0);
  console.log("Profiles data:", JSON.stringify(profiles, null, 2));
}

inspect();
