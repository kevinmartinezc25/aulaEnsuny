import { DocCenterScreen } from '@/modules/docs/presentation/screens/DocCenterScreen'

export const metadata = {
  title: 'Portal de Conocimiento Escolar | aulaEnsuny',
  description: 'Consulta los planes de aula, mallas curriculares y acuerdos del Portal de Conocimiento Escolar.',
}

export default function PublicDocsPage() {
  return (
    <div className="min-h-screen w-full bg-[#faf8fe] dark:bg-[#12141a]">
      <DocCenterScreen userRole="guest" />
    </div>
  )
}
