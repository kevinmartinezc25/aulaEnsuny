const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function restoreAndFind() {
  const originalCourses = [
    { id: 'ce9b7a23-3bc5-40c8-a466-0782084e25b6', teacher_id: 'd3aa9e2f-bd89-4b90-b47a-f8d6273347e3' },
    { id: 'deb9a55d-8f90-4e06-b454-e7337c0527f2', teacher_id: 'd3aa9e2f-bd89-4b90-b47a-f8d6273347e3' },
    { id: '9464de6e-a14a-420d-8ec6-a773a09129e4', teacher_id: '1d233c8c-2b8f-4add-a12c-edd1e1bac01d' },
    { id: '6c4e3a3a-7d1c-41a3-b83e-8666b2dfce7f', teacher_id: 'ba1ed6cb-a462-447f-8994-6aa1940f1b8d' },
    { id: '377847eb-c645-4c09-94aa-7f52487a1a56', teacher_id: 'ba1ed6cb-a462-447f-8994-6aa1940f1b8d' },
    { id: '38286078-44f8-4c45-9c4a-1a08ae2c2e89', teacher_id: 'ba1ed6cb-a462-447f-8994-6aa1940f1b8d' },
    { id: 'c3258f99-5261-4133-8b75-85f2f6391709', teacher_id: 'ba1ed6cb-a462-447f-8994-6aa1940f1b8d' },
    { id: 'e8cbd197-7324-4b32-9a19-09bdb800f754', teacher_id: 'ba1ed6cb-a462-447f-8994-6aa1940f1b8d' },
    { id: '45c26bca-06e8-4d47-9dc3-3bb5da189c57', teacher_id: 'd3aa9e2f-bd89-4b90-b47a-f8d6273347e3' },
    { id: 'bffbc515-9907-4391-8e20-4c8aca978684', teacher_id: 'd3aa9e2f-bd89-4b90-b47a-f8d6273347e3' },
    { id: '40ccff5e-90a2-416f-8e12-911377282cbd', teacher_id: 'd3aa9e2f-bd89-4b90-b47a-f8d6273347e3' },
    { id: 'aaf47b16-f20e-4e43-8d01-7be961bed013', teacher_id: 'd3aa9e2f-bd89-4b90-b47a-f8d6273347e3' },
    { id: '17c8846d-f1aa-4024-9c37-55ba84e198b0', teacher_id: 'd3aa9e2f-bd89-4b90-b47a-f8d6273347e3' },
    { id: '91792cbd-8142-4039-8ef9-70d68b299e48', teacher_id: 'd3aa9e2f-bd89-4b90-b47a-f8d6273347e3' }
  ]

  console.log("Restoring courses to their original teacher IDs...")
  for (const c of originalCourses) {
    await supabase.from('courses').update({ teacher_id: c.teacher_id }).eq('id', c.id)
  }

  const teacherIds = [...new Set(originalCourses.map(c => c.teacher_id))]
  console.log("Fetching user details for original teacher IDs:", teacherIds)

  for (const id of teacherIds) {
    const { data: user, error } = await supabase.auth.admin.getUserById(id)
    if (error || !user.user) {
      console.log(`Teacher ID ${id} NOT found in auth.users! (Orphaned ID from old DB)`)
    } else {
      console.log(`Teacher ID ${id} belongs to: ${user.user.email} (Metadata Name: ${user.user.user_metadata?.first_name} ${user.user.user_metadata?.last_name})`)
    }
  }
}

restoreAndFind()
