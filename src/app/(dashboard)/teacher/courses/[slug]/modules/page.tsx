import Link from 'next/link'
import { TeacherCourseModulesScreen } from '@/modules/courses/presentation/screens/TeacherCourseModulesScreen'

export default async function CourseModulesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { getCourseIdBySlug } = await import('@/modules/courses/application/teacherActions')
  const id = await getCourseIdBySlug(slug)
  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Curso no encontrado</h2>
        <p className="text-sm text-slate-500 mb-5">No se pudo encontrar el curso especificado ({slug}).</p>
        <Link 
          href="/teacher/dashboard" 
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Volver a mis cursos
        </Link>
      </div>
    )
  }
  return <TeacherCourseModulesScreen courseId={id} />
}
