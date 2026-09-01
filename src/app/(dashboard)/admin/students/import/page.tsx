import { Metadata } from 'next'
import { AdminStudentImportScreen } from '@/modules/admin/presentation/screens/AdminStudentImportScreen'

export const metadata: Metadata = {
  title: 'Importar Estudiantes | aulaEnsuny Admin',
  description: 'Importa el padrón estudiantil completo desde un archivo Excel o CSV para el módulo de Convivencia.',
}

export default function AdminStudentImportPage() {
  return <AdminStudentImportScreen />
}
