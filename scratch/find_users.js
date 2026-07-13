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

async function findUsers() {
  console.log("=== ROLES ===");
  const { data: roles } = await adminClient.from('roles').select('*');
  console.log(roles);

  console.log("=== PROFILES ===");
  const { data: profiles } = await adminClient.from('profiles').select('id, first_name, last_name, role_id');
  console.log(profiles);

  console.log("=== AUTH USERS (from auth.users via admin api) ===");
  const { data: { users }, error } = await adminClient.auth.admin.listUsers();
  if (error) {
    console.error("Error listing auth users:", error);
  } else {
    users.forEach(u => {
      console.log(`Email: ${u.email}, ID: ${u.id}, Role Metadata: ${u.user_metadata?.role_name || 'none'}`);
    });
  }
}

findUsers();
