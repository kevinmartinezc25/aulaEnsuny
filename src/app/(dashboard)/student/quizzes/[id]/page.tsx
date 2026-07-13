import { Metadata } from 'next'
import { QuizTakingScreen } from '@/modules/quizzes/presentation/screens/QuizTakingScreen'

export const dynamic = 'force-dynamic'

interface QuizPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: QuizPageProps): Promise<Metadata> {
  const resolvedParams = await params
  const quizId = resolvedParams?.id
  const title = quizId ? `Evaluación: ${quizId.replace(/-/g, ' ')}` : 'Evaluación'

  return {
    title: `${title} | aulaEnsuny`,
    description: 'Responde las preguntas de la evaluación escolar de manera segura y monitorea tus calificaciones en tiempo real.',
  }
}

export default async function QuizPage({ params }: QuizPageProps) {
  const resolvedParams = await params
  return <QuizTakingScreen quizId={resolvedParams.id} />
}
