import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Acceso Estudiante | aulaEnsuny',
  description: 'Ingreso a la plataforma educativa aulaEnsuny',
}

export default function StudentRegistrationPage() {
  redirect('/login')
}
