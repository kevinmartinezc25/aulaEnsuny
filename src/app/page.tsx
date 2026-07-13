import { redirect } from 'next/navigation'

export default function RootPage() {
  // Redireccionar al login. Si hay sesión activa, el middleware interceptará e irá al dashboard correspondiente.
  redirect('/login')
}
