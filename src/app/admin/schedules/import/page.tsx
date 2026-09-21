import { Metadata } from 'next'
import { AscImportView } from './components/AscImportView'

export const metadata: Metadata = {
  title: 'Importar Horario | aulaEnsuny',
  description: 'Importar horario desde aSc TimeTables',
}

export default function ImportSchedulePage() {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Importar Horario
        </h1>
        <p className="text-slate-500 mt-1">
          Carga un archivo XML exportado desde aSc TimeTables para reemplazar el horario institucional.
        </p>
      </div>

      <AscImportView />
    </div>
  )
}
