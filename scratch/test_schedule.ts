import { getStudentDashboardSchedule } from '@/modules/students/application/scheduleActions'
import { createAdminClient, createClient } from '@/core/config/supabase/server'

async function check() {
  const res = await getStudentDashboardSchedule()
  console.log(JSON.stringify(res, null, 2))
}
check()
