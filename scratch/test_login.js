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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client = createClient(supabaseUrl, anonKey);

async function testFullLogin() {
  console.log("Signing in with email: docente@ensuny.edu.co...");
  const { data, error } = await client.auth.signInWithPassword({
    email: 'docente@ensuny.edu.co',
    password: 'Password123!'
  });

  if (error) {
    console.error("Auth Sign In Error:", error.message);
    return;
  }

  const user = data.user;
  console.log("Auth Successful. User ID:", user.id);

  // Set the session token in the client headers to mimic the cookies/session behavior
  client.auth.setSession(data.session);

  console.log("Fetching profile for user...");
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role_id')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Profile Fetch Error:", profileError.message);
    return;
  }

  console.log("Profile role_id:", profile.role_id);

  console.log("Fetching role name from roles table...");
  const { data: role, error: roleError } = await client
    .from('roles')
    .select('name')
    .eq('id', profile.role_id)
    .single();

  if (roleError) {
    console.error("Role Fetch Error:", roleError.message);
    return;
  }

  console.log("Role name found:", role.name);
  console.log("--- TEST SUCCESSFUL ---");
}

testFullLogin();
