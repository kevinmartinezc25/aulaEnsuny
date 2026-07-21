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
  const { data: users, error: fetchError } = await supabase.auth.admin.listUsers()
  if (fetchError) {
    console.error('Error fetching users:', fetchError)
    return
  }
  
  if (users.users.length < 2) {
    console.log('Not enough users to test.')
    return
  }

  const user1 = users.users[0]
  const user2 = users.users[1]
  
  console.log('User1:', user1.email)
  console.log('User2:', user2.email)

  console.log('Attempting to update User1 email to User2 email (which should fail)...')

  const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(user1.id, {
    email: user2.email,
    email_confirm: true
  })

  if (updateError) {
    console.error('Failed as expected. Error:', updateError)
  } else {
    console.log('Wait, it succeeded? This is bad. Reverting.')
    await supabase.auth.admin.updateUserById(user1.id, {
      email: user1.email,
      email_confirm: true
    })
  }
}

run().catch(console.error)
