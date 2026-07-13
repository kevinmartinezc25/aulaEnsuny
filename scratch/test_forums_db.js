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
  console.log("Checking forums tables...");

  const { data: forums, error: fError } = await adminClient.from('forums').select('id').limit(1);
  if (fError) {
    console.log("❌ forums table check failed:", fError.message);
  } else {
    console.log("✅ forums table exists!");
  }

  const { data: threads, error: tError } = await adminClient.from('forum_threads').select('id').limit(1);
  if (tError) {
    console.log("❌ forum_threads table check failed:", tError.message);
  } else {
    console.log("✅ forum_threads table exists!");
  }

  const { data: replies, error: rError } = await adminClient.from('forum_replies').select('id').limit(1);
  if (rError) {
    console.log("❌ forum_replies table check failed:", rError.message);
  } else {
    console.log("✅ forum_replies table exists!");
  }
}

inspect();
