import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createClient } from '@/core/config/supabase/client'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  grade?: string
  group?: string
  avatarUrl?: string
}

interface UserSessionState {
  user: SessionUser | null
  isLoading: boolean
  isInitialized: boolean
  initSession: (forceRefresh?: boolean) => Promise<SessionUser | null>
  setUser: (user: SessionUser | null) => void
  clearSession: () => void
}

let activeFetchPromise: Promise<SessionUser | null> | null = null

export const useUserSessionStore = create<UserSessionState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isInitialized: false,

      setUser: (user) => set({ user, isInitialized: true }),

      clearSession: () => {
        set({ user: null, isInitialized: false, isLoading: false })
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('aulaensuny-session')
          localStorage.removeItem('aulaensuny-session')
        }
      },

      initSession: async (forceRefresh = false) => {
        const state = get()

        // Si ya hay una petición en curso, devolverla para no duplicar llamadas
        if (activeFetchPromise) {
          return activeFetchPromise
        }

        // Si no se fuerza refresco y ya está inicializado, verificar que el authUser real coincida
        if (state.user && state.isInitialized && !forceRefresh && typeof window !== 'undefined') {
          try {
            const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
            if (!isDemo) {
              const supabase = createClient()
              const { data: { user: authUser } } = await supabase.auth.getUser()
              if (authUser && authUser.id === state.user.id) {
                return state.user
              }
            } else {
              return state.user
            }
          } catch {
            return state.user
          }
        }

        const runFetch = async (): Promise<SessionUser | null> => {
          // 1. Modo Demo (sin Supabase real)
          const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                             process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')

          if (isDemoMode) {
            if (typeof document !== 'undefined') {
              const value = `; ${document.cookie}`
              const parts = value.split(`; aulaensuny-demo-session=`)
              if (parts.length === 2) {
                try {
                  const raw = parts.pop()?.split(';').shift()
                  if (raw) {
                    const session = JSON.parse(decodeURIComponent(raw))
                    const demoId = session.id || 'demo-user-id'
                    const demoUser: SessionUser = {
                      id: demoId,
                      name: `${session.first_name || 'Usuario'} ${session.last_name || 'Demo'}`.trim(),
                      email: session.email || '',
                      role: (session.role || 'student').toLowerCase(),
                      grade: session.grade_level || undefined,
                      group: session.group_name || undefined,
                      avatarUrl: undefined,
                    }
                    set({ user: demoUser, isInitialized: true, isLoading: false })
                    return demoUser
                  }
                } catch (e) {
                  console.error('Error parseando demo session en store:', e)
                }
              }
            }
            set({ isInitialized: true, isLoading: false })
            return null
          }

          // 2. Modo Producción con Supabase
          set({ isLoading: !state.user }) // Si ya había usuario cacheado, no mostrar spinner bloqueante
          try {
            const supabase = createClient()
            const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser()

            if (authErr || !authUser) {
              set({ user: null, isInitialized: true, isLoading: false })
              return null
            }

            // Consulta optimizada a perfiles
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, grade_level, group_name, avatar_url, role_id, roles(name)')
              .eq('id', authUser.id)
              .maybeSingle()

            let role = 'student'
            if (profile?.roles && typeof profile.roles === 'object' && 'name' in profile.roles) {
              role = (profile.roles.name as string).toLowerCase()
            } else if (profile?.role_id) {
              // Si no funcionó la relación (roles(name)), hacemos query manual por role_id
              const { data: roleData } = await supabase
                .from('roles')
                .select('name')
                .eq('id', profile.role_id)
                .single()
              
              if (roleData?.name) {
                role = roleData.name.toLowerCase()
              }
            } else if (authUser.user_metadata?.role_name) {
              role = (authUser.user_metadata.role_name as string).toLowerCase()
            }

            const fullName = profile
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
              : `${authUser.user_metadata?.first_name || 'Usuario'} ${authUser.user_metadata?.last_name || ''}`.trim()

            const sessionUser: SessionUser = {
              id: authUser.id,
              name: fullName || 'Usuario',
              email: authUser.email || '',
              role,
              grade: profile?.grade_level || authUser.user_metadata?.grade_level || undefined,
              group: profile?.group_name || authUser.user_metadata?.group_name || undefined,
              avatarUrl: profile?.avatar_url || authUser.user_metadata?.avatar_url || undefined,
            }

            set({ user: sessionUser, isInitialized: true, isLoading: false })
            return sessionUser
          } catch (error) {
            console.error('Error cargando sesión en useUserSessionStore:', error)
            set({ isInitialized: true, isLoading: false })
            return state.user
          }
        }

        activeFetchPromise = runFetch()
        try {
          return await activeFetchPromise
        } finally {
          activeFetchPromise = null
        }
      },
    }),
    {
      name: 'aulaensuny-user-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }), // Solo persistir el usuario para hidratación instantánea
    }
  )
)
