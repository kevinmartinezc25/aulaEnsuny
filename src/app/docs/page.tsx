import { DocCenterScreen } from '@/modules/docs/presentation/screens/DocCenterScreen'

export const metadata = {
  title: 'Documentación Institucional Pública | aulaEnsuny',
  description: 'Consulta los documentos académicos e institucionales públicos.',
}

export default function PublicDocsPage() {
  return (
    <div className="h-screen w-screen p-6 md:p-8 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <DocCenterScreen userRole="guest" />
    </div>
  )
}
