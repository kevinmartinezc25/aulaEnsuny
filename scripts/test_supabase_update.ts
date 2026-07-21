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
  console.log('Fetching users...')
  const { data: users, error: fetchError } = await supabase.auth.admin.listUsers()
  if (fetchError) {
    console.error('Error fetching users:', fetchError)
    return
  }
  
  if (users.users.length === 0) {
    console.log('No users found.')
    return
  }

  // Find a teacher or just the first user
  let targetUser = users.users.find(u => u.user_metadata?.role_name === 'teacher') || users.users[0]
  console.log('Target User ID:', targetUser.id, 'Current Email:', targetUser.email)

  const newEmail = `test_update_${Date.now()}@example.com`
  console.log('Attempting to update email to:', newEmail)

  const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(targetUser.id, {
    email: newEmail,
    email_confirm: true
  })

  if (updateError) {
    console.error('Failed to update email. Error:', updateError)
  } else {
    console.log('Successfully updated email!', updateData.user.email)
    
    // Revert
    console.log('Reverting back to old email:', targetUser.email)
    await supabase.auth.admin.updateUserById(targetUser.id, {
      email: targetUser.email,
      email_confirm: true
    })
  }
}

run().catch(console.error)
