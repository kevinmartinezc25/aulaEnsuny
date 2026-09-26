import { redirect } from 'next/navigation'

export default function TeacherCoursesRedirectPage() {
  redirect('/teacher/dashboard?tab=virtual')
}
