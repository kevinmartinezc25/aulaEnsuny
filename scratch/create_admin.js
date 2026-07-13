const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

async function createAdmin() {
  const email = 'admin_pruebas@ensuny.edu.co';
  const password = 'Admin123!';

  console.log(`Intentando crear/actualizar usuario ${email}...`);

  // 1. Obtener ID del rol admin
  const { data: roles } = await adminClient.from('roles').select('id').eq('name', 'admin').single();
  if (!roles) {
    console.error("No se encontró el rol 'admin' en la tabla roles");
    return;
  }
  const adminRoleId = roles.id;

  // 2. Listar usuarios para ver si ya existe
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  const existingUser = users.find(u => u.email === email);

  let userId;
  if (existingUser) {
    console.log("El usuario ya existe en auth.users. Actualizando contraseña y metadata...");
    const { data: updated, error: updateError } = await adminClient.auth.admin.updateUserById(
      existingUser.id,
      {
        password: password,
        email_confirm: true,
        user_metadata: { role_name: 'admin', first_name: 'Admin', last_name: 'Pruebas' }
      }
    );
    if (updateError) {
      console.error("Error al actualizar usuario:", updateError);
      return;
    }
    userId = existingUser.id;
  } else {
    console.log("El usuario no existe. Creándolo...");
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { role_name: 'admin', first_name: 'Admin', last_name: 'Pruebas' }
    });
    if (createError) {
      console.error("Error al crear usuario:", createError);
      return;
    }
    userId = created.user.id;
  }

  // 3. Asegurar que el perfil público tenga el rol 'admin' correcto
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.log("Creando perfil público manualmente...");
    const { error: insertError } = await adminClient.from('profiles').insert({
      id: userId,
      first_name: 'Admin',
      last_name: 'Pruebas',
      role_id: adminRoleId
    });
    if (insertError) {
      console.error("Error al insertar perfil:", insertError);
    } else {
      console.log("Perfil público creado con éxito.");
    }
  } else {
    console.log("Actualizando perfil público existente...");
    const { error: updateProfileError } = await adminClient
      .from('profiles')
      .update({ role_id: adminRoleId })
      .eq('id', userId);
    if (updateProfileError) {
      console.error("Error al actualizar perfil:", updateProfileError);
    } else {
      console.log("Perfil público actualizado con éxito.");
    }
  }

  console.log("¡Todo listo!");
}

createAdmin();
