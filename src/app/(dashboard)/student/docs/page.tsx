import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Documentos | aulaEnsuny',
  description: 'Accede a la documentación académica publicada por tu institución.',
}

export default function StudentDocsPage() {
  notFound()
}
