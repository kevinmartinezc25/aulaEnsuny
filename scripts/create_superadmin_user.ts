import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function run() {
  console.log('--- Creando usuario alternativo SuperAdmin ---')

  // 1. Obtener el ID del rol superadmin
  const { data: roles, error: roleError } = await supabase
    .from('roles')
    .select('id, name')
  
  if (roleError) {
    console.error('Error al obtener roles:', roleError)
    return
  }

  console.log('Roles encontrados:', roles)
  let superadminRole = roles?.find(r => r.name === 'superadmin')
  
  if (!superadminRole) {
    console.log('Rol superadmin no encontrado, creándolo...')
    const { data: newRole, error: createRoleErr } = await supabase
      .from('roles')
      .insert({ name: 'superadmin' })
      .select()
      .single()

    if (createRoleErr) {
      console.error('Error al crear rol superadmin:', createRoleErr)
      return
    }
    superadminRole = newRole
  }

  if (!superadminRole) {
    console.error('No se pudo resolver el rol de superadmin.')
    return
  }

  console.log('ID del rol superadmin:', superadminRole.id)

  const altEmail = 'superadmin_alt@ensuny.edu.co'
  const altPassword = 'Admin123!'
  const firstName = 'SuperAdmin'
  const lastName = 'Alternativo'

  // 2. Verificar si ya existe en auth.users
  const { data: userList, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) {
    console.error('Error al listar usuarios:', listErr)
    return
  }

  const existingUser = userList.users.find(u => u.email?.toLowerCase() === altEmail.toLowerCase())
  let userId = existingUser?.id

  if (existingUser) {
    console.log(`El usuario ${altEmail} ya existe en Auth (ID: ${userId}). Actualizando contraseña y metadata...`)
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId!, {
      password: altPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role_name: 'superadmin'
      }
    })
    if (updateErr) {
      console.error('Error al actualizar usuario:', updateErr)
      return
    }
  } else {
    console.log(`Creando usuario ${altEmail} en Auth...`)
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: altEmail,
      password: altPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role_name: 'superadmin'
      }
    })

    if (createErr || !newUser.user) {
      console.error('Error al crear usuario en Auth:', createErr)
      return
    }
    userId = newUser.user.id
    console.log(`Usuario creado exitosamente con ID: ${userId}`)
  }

  // 3. Upsert en public.profiles
  console.log('Sincronizando perfil en public.profiles...')
  const { data: profileData, error: profileErr } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      role_id: superadminRole.id,
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .select()

  if (profileErr) {
    console.error('Error al guardar en public.profiles:', profileErr)
  } else {
    console.log('Perfil actualizado en public.profiles con éxito:', profileData)
  }

  console.log('\n=============================================')
  console.log(' USUARIO SUPERADMIN ALTERNATIVO CREADO/ACTIVO ')
  console.log(' Correo:     ', altEmail)
  console.log(' Contraseña: ', altPassword)
  console.log(' Rol:         superadmin')
  console.log(' ID:         ', userId)
  console.log('=============================================\n')
}

run().catch(console.error)
