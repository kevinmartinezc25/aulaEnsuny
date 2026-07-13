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

// Since we might need bypass RLS or service role, let's see if we have SUPABASE_SERVICE_ROLE_KEY
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || anonKey;

const client = createClient(supabaseUrl, serviceRoleKey);

async function checkColumns() {
  console.log("Checking columns of 'resources' table...");
  const { data: resData, error: resError } = await client.from('resources').select('*').limit(1);
  if (resError) {
    console.error("Resources error:", resError);
  } else {
    console.log("Resources keys:", resData.length > 0 ? Object.keys(resData[0]) : "No rows found in resources, trying to fetch columns from information_schema...");
  }

  const { data: lesData, error: lesError } = await client.from('lessons').select('*').limit(1);
  if (lesError) {
    console.error("Lessons error:", lesError);
  } else {
    console.log("Lessons keys:", lesData.length > 0 ? Object.keys(lesData[0]) : "No rows found in lessons");
  }

  // Let's also check if we can query information_schema directly
  const { data: schemaData, error: schemaError } = await client.rpc('get_table_columns', { table_name: 'resources' }).select();
  if (schemaError) {
    // If RPC doesn't exist, query via postgres if possible, or just print what we got
    console.log("RPC get_table_columns error/not found");
  } else {
    console.log("Columns from RPC:", schemaData);
  }
}

checkColumns();
