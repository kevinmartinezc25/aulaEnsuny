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

async function updatePassword() {
  const email = 'estudiante@ensuny.edu.co';
  console.log(`Searching for user: ${email}...`);
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }
  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`User ${email} not found!`);
    return;
  }
  console.log(`Found user ID: ${user.id}. Updating password...`);
  const { data, error } = await adminClient.auth.admin.updateUserById(user.id, {
    password: 'Password123!'
  });
  if (error) {
    console.error("Error updating password:", error);
  } else {
    console.log("Successfully updated password to: Password123!");
  }
}

updatePassword();
