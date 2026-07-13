'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'

export interface ForumConfig {
  id: string
  lessonId: string
  title: string
  description?: string
  forumType: 'debate' | 'qa' | 'social'
  isGraded: boolean
  dueDate?: string
  createdAt: string
}

export interface ForumThread {
  id: string
  forumId: string
  authorId: string
  authorName: string
  authorAvatar?: string
  authorRole: string
  title: string
  content: string
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  updatedAt: string
  repliesCount: number
}

export interface ForumReply {
  id: string
  threadId: string
  parentId?: string
  authorId: string
  authorName: string
  authorAvatar?: string
  authorRole: string
  content: string
  isHelpful: boolean
  isTeacherVerified: boolean
  createdAt: string
  updatedAt: string
}

// In-Memory Mock Store for Demo Mode
let mockForums: ForumConfig[] = [
  {
    id: 'f1',
    lessonId: 'l-forum-1',
    title: 'Foro: Impacto de la Gravedad en el Espacio',
    description: 'En este foro debatiremos sobre cómo la relatividad de Einstein cambió nuestra comprensión de la gravedad y del espacio-tiempo. Participen con al menos 2 aportaciones bien fundamentadas.',
    forumType: 'debate',
    isGraded: true,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    id: 'f2',
    lessonId: 'l-forum-2',
    title: 'Dudas y Consultas: Módulo Cinemática',
    description: 'Espacio para publicar dudas referentes a las leyes del movimiento rectilíneo uniforme (MRU) y uniformemente acelerado (MRUA).',
    forumType: 'qa',
    isGraded: false,
    createdAt: new Date().toISOString()
  }
]

let mockThreads: ForumThread[] = [
  {
    id: 't1',
    forumId: 'f1',
    authorId: 'stu1',
    authorName: 'LUISA FERNANDA TORRES PEREZ',
    authorRole: 'student',
    title: '¿Es la gravedad una fuerza o una curvatura?',
    content: 'Hola a todos, estuve leyendo que Einstein demostró que la gravedad no es una fuerza de atracción misteriosa como pensaba Newton, sino más bien el resultado de la deformación que los cuerpos con masa producen en la geometría del espacio-tiempo. ¿Qué opinan?',
    isPinned: true,
    isLocked: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    repliesCount: 2
  },
  {
    id: 't2',
    forumId: 'f2',
    authorId: 'stu1',
    authorName: 'LUISA FERNANDA TORRES PEREZ',
    authorRole: 'student',
    title: 'Duda con el ejercicio 5 de la guía',
    content: 'Tengo problemas para despejar la velocidad final en el ejercicio que involucra un plano inclinado con rozamiento. ¿Alguien tiene alguna sugerencia de qué fórmula usar?',
    isPinned: false,
    isLocked: false,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    repliesCount: 1
  }
]

let mockReplies: ForumReply[] = [
  {
    id: 'rep1',
    threadId: 't1',
    authorId: 'docente-id',
    authorName: 'Carlos Docente',
    authorRole: 'teacher',
    content: 'Excelente observación, Luisa. Newton definió la gravedad matemáticamente como una fuerza instantánea a distancia, mientras que Einstein la interpretó como geometría. Ambas teorías son válidas en diferentes escalas de masa y velocidad, pero la relatividad general explica fenómenos que Newton no pudo.',
    isHelpful: true,
    isTeacherVerified: true,
    createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rep2',
    threadId: 't1',
    authorId: 'stu2',
    authorName: 'Juan Estudiante',
    authorRole: 'student',
    content: 'Increíble, entonces la Tierra se mueve alrededor del Sol no porque haya un lazo invisible que la jale, sino porque el Sol crea una especie de embudo en el espacio y la Tierra sigue la línea más recta posible dentro de esa curva.',
    isHelpful: false,
    isTeacherVerified: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rep3',
    threadId: 't2',
    authorId: 'docente-id',
    authorName: 'Carlos Docente',
    authorRole: 'teacher',
    content: 'Hola Luisa, primero debes plantear la segunda ley de Newton en el eje paralelo al plano inclinado: F = m*g*sen(theta) - Fr = m*a. Luego calculas la aceleración y usas vf^2 = vi^2 + 2*a*d.',
    isHelpful: true,
    isTeacherVerified: true,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  }
]

// Helper function to check if Supabase is in demo mode
function checkDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
}

// 1. Get forum config by lesson ID
export async function getForumByLessonId(lessonId: string): Promise<ForumConfig | null> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    const forum = mockForums.find(f => f.lessonId === lessonId)
    return forum || null
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('forums')
      .select('*, lessons(title, content)')
      .eq('lesson_id', lessonId)
      .maybeSingle()

    if (error || !data) return null

    return {
      id: data.id,
      lessonId: data.lesson_id,
      title: data.lessons?.title || data.title || 'Foro de Discusión',
      description: data.lessons?.content || data.description || '',
      forumType: data.forum_type as any,
      isGraded: data.is_graded,
      dueDate: data.due_date,
      createdAt: data.created_at
    }
  } catch (err) {
    console.error('Error fetching forum by lesson id:', err)
    return null
  }
}

// 2. Create or Update Forum configuration
export async function saveForumConfig(forumData: {
  id?: string
  lessonId: string
  title: string
  description?: string
  forumType: 'debate' | 'qa' | 'social'
  isGraded: boolean
  dueDate?: string
}): Promise<{ data?: ForumConfig; error?: string }> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    if (forumData.id) {
      mockForums = mockForums.map(f => f.id === forumData.id ? {
        ...f,
        title: forumData.title,
        description: forumData.description,
        forumType: forumData.forumType,
        isGraded: forumData.isGraded,
        dueDate: forumData.dueDate
      } : f)
      const updated = mockForums.find(f => f.id === forumData.id)
      return { data: updated }
    } else {
      const newForum: ForumConfig = {
        id: `f_${Date.now()}`,
        lessonId: forumData.lessonId,
        title: forumData.title,
        description: forumData.description,
        forumType: forumData.forumType,
        isGraded: forumData.isGraded,
        dueDate: forumData.dueDate,
        createdAt: new Date().toISOString()
      }
      mockForums.push(newForum)
      return { data: newForum }
    }
  }

  try {
    const supabase = createAdminClient()

    // Ensure corresponding lesson has correct details and type updated to 'forum'
    const { error: lessonError } = await supabase
      .from('lessons')
      .update({
        title: forumData.title,
        content: forumData.description || '',
        type: 'forum'
      })
      .eq('id', forumData.lessonId)

    if (lessonError) throw lessonError

    let query
    const forumPayload = {
      lesson_id: forumData.lessonId,
      forum_type: forumData.forumType,
      is_graded: forumData.isGraded,
      due_date: forumData.dueDate || null
    }

    if (forumData.id) {
      query = supabase
        .from('forums')
        .update(forumPayload)
        .eq('id', forumData.id)
        .select()
        .single()
    } else {
      query = supabase
        .from('forums')
        .insert(forumPayload)
        .select()
        .single()
    }

    const { data, error } = await query
    if (error) throw error

    return {
      data: {
        id: data.id,
        lessonId: data.lesson_id,
        title: forumData.title,
        description: forumData.description || '',
        forumType: data.forum_type as any,
        isGraded: data.is_graded,
        dueDate: data.due_date || undefined,
        createdAt: data.created_at
      }
    }
  } catch (err: any) {
    console.error('Error saving forum config:', err)
    return { error: err.message || 'Error al guardar configuración del foro' }
  }
}

// 3. Fetch threads for a forum
export async function getForumThreads(forumId: string): Promise<ForumThread[]> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    const threads = mockThreads
      .filter(t => t.forumId === forumId)
      .map(t => ({
        ...t,
        repliesCount: mockReplies.filter(r => r.threadId === t.id).length
      }))
    // Sort pinned threads first, then by date descending
    return threads.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  try {
    const supabase = createAdminClient()
    const { data: dbThreads, error } = await supabase
      .from('forum_threads')
      .select('*, profiles(first_name, last_name, avatar_url, roles(name))')
      .eq('forum_id', forumId)

    if (error || !dbThreads) return []

    // Fetch replies counts
    const threadsWithCounts = await Promise.all(dbThreads.map(async (t) => {
      const { count } = await supabase
        .from('forum_replies')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', t.id)

      return {
        id: t.id,
        forumId: t.forum_id,
        authorId: t.author_id,
        authorName: `${t.profiles?.first_name} ${t.profiles?.last_name}`,
        authorAvatar: t.profiles?.avatar_url || undefined,
        authorRole: t.profiles?.roles?.name || 'student',
        title: t.title,
        content: t.content,
        isPinned: t.is_pinned,
        isLocked: t.is_locked,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        repliesCount: count || 0
      }
    }))

    return threadsWithCounts.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  } catch (err) {
    console.error('Error loading threads:', err)
    return []
  }
}

// 4. Create thread
export async function createForumThread(threadData: {
  forumId: string
  authorId: string
  title: string
  content: string
}): Promise<{ data?: ForumThread; error?: string }> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    // Check user info
    let authorName = 'Luisa Estudiante'
    let authorRole = 'student'
    if (threadData.authorId === 'docente-id' || threadData.authorId === 'teacher-id') {
      authorName = 'Carlos Docente'
      authorRole = 'teacher'
    } else if (threadData.authorId === 'stu1') {
      authorName = 'LUISA FERNANDA TORRES PEREZ'
      authorRole = 'student'
    }

    const forum = mockForums.find(f => f.id === threadData.forumId)
    const isDebate = forum ? forum.forumType === 'debate' : true

    if (isDebate && authorRole !== 'teacher' && authorRole !== 'admin') {
      return { error: 'Solo los docentes y administradores pueden crear temas de discusión en foros evaluativos.' }
    }

    const newThread: ForumThread = {
      id: `t_${Date.now()}`,
      forumId: threadData.forumId,
      authorId: threadData.authorId,
      authorName,
      authorRole,
      title: threadData.title,
      content: threadData.content,
      isPinned: false,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      repliesCount: 0
    }
    mockThreads.push(newThread)
    return { data: newThread }
  }

  try {
    const supabase = createAdminClient()
    const { data: dbUser } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url, roles(name)')
      .eq('id', threadData.authorId)
      .single()

    const { data: dbForum } = await supabase
      .from('forums')
      .select('forum_type')
      .eq('id', threadData.forumId)
      .single()

    const userRole = (Array.isArray(dbUser?.roles) ? dbUser.roles[0]?.name : (dbUser?.roles as any)?.name) || 'student'
    const isDebate = dbForum ? dbForum.forum_type === 'debate' : true

    if (isDebate && userRole !== 'teacher' && userRole !== 'admin') {
      return { error: 'Solo los docentes y administradores pueden crear temas de discusión en foros evaluativos.' }
    }

    const { data, error } = await supabase
      .from('forum_threads')
      .insert({
        forum_id: threadData.forumId,
        author_id: threadData.authorId,
        title: threadData.title,
        content: threadData.content
      })
      .select()
      .single()

    if (error) throw error

    return {
      data: {
        id: data.id,
        forumId: data.forum_id,
        authorId: data.author_id,
        authorName: dbUser ? `${dbUser.first_name} ${dbUser.last_name}` : 'Usuario',
        authorAvatar: dbUser?.avatar_url || undefined,
        authorRole: (Array.isArray(dbUser?.roles) ? dbUser.roles[0]?.name : (dbUser?.roles as any)?.name) || 'student',
        title: data.title,
        content: data.content,
        isPinned: data.is_pinned,
        isLocked: data.is_locked,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        repliesCount: 0
      }
    }
  } catch (err: any) {
    console.error('Error creating thread:', err)
    return { error: err.message || 'Error al crear hilo de discusión' }
  }
}

// 5. Get thread replies
export async function getThreadReplies(threadId: string): Promise<ForumReply[]> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    return mockReplies
      .filter(r => r.threadId === threadId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('forum_replies')
      .select('*, profiles(first_name, last_name, avatar_url, roles(name))')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (error || !data) return []

    return data.map(r => ({
      id: r.id,
      threadId: r.thread_id,
      parentId: r.parent_id || undefined,
      authorId: r.author_id,
      authorName: `${r.profiles?.first_name} ${r.profiles?.last_name}`,
      authorAvatar: r.profiles?.avatar_url || undefined,
      authorRole: r.profiles?.roles?.name || 'student',
      content: r.content,
      isHelpful: r.is_helpful,
      isTeacherVerified: r.is_teacher_verified,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  } catch (err) {
    console.error('Error loading replies:', err)
    return []
  }
}

// 6. Create reply
export async function createForumReply(replyData: {
  threadId: string
  parentId?: string
  authorId: string
  content: string
}): Promise<{ data?: ForumReply; error?: string }> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    let authorName = 'Luisa Estudiante'
    let authorRole = 'student'
    if (replyData.authorId === 'docente-id') {
      authorName = 'Carlos Docente'
      authorRole = 'teacher'
    } else if (replyData.authorId === 'stu1') {
      authorName = 'LUISA FERNANDA TORRES PEREZ'
      authorRole = 'student'
    }

    const newReply: ForumReply = {
      id: `rep_${Date.now()}`,
      threadId: replyData.threadId,
      parentId: replyData.parentId,
      authorId: replyData.authorId,
      authorName,
      authorRole,
      content: replyData.content,
      isHelpful: false,
      isTeacherVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    mockReplies.push(newReply)
    return { data: newReply }
  }

  try {
    const supabase = createAdminClient()
    const { data: dbUser } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url, roles(name)')
      .eq('id', replyData.authorId)
      .single()

    const { data, error } = await supabase
      .from('forum_replies')
      .insert({
        thread_id: replyData.threadId,
        parent_id: replyData.parentId || null,
        author_id: replyData.authorId,
        content: replyData.content
      })
      .select()
      .single()

    if (error) throw error

    return {
      data: {
        id: data.id,
        threadId: data.thread_id,
        parentId: data.parent_id || undefined,
        authorId: data.author_id,
        authorName: dbUser ? `${dbUser.first_name} ${dbUser.last_name}` : 'Usuario',
        authorAvatar: dbUser?.avatar_url || undefined,
        authorRole: (Array.isArray(dbUser?.roles) ? dbUser.roles[0]?.name : (dbUser?.roles as any)?.name) || 'student',
        content: data.content,
        isHelpful: data.is_helpful,
        isTeacherVerified: data.is_teacher_verified,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    }
  } catch (err: any) {
    console.error('Error creating reply:', err)
    return { error: err.message || 'Error al agregar respuesta' }
  }
}

// 7. Pin Thread (Teacher/Admin only)
export async function togglePinThread(threadId: string, isPinned: boolean): Promise<boolean> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    mockThreads = mockThreads.map(t => t.id === threadId ? { ...t, isPinned } : t)
    return true
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('forum_threads')
      .update({ is_pinned: isPinned })
      .eq('id', threadId)
    if (error) throw error
    return true
  } catch (err) {
    console.error('Error pinning thread:', err)
    return false
  }
}

// 8. Lock Thread (Teacher/Admin only)
export async function toggleLockThread(threadId: string, isLocked: boolean): Promise<boolean> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    mockThreads = mockThreads.map(t => t.id === threadId ? { ...t, isLocked } : t)
    return true
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('forum_threads')
      .update({ is_locked: isLocked })
      .eq('id', threadId)
    if (error) throw error
    return true
  } catch (err) {
    console.error('Error locking thread:', err)
    return false
  }
}

// 9. Verify Reply or Mark helpful
export async function verifyForumReply(
  replyId: string,
  verified: boolean,
  helpful: boolean
): Promise<boolean> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    mockReplies = mockReplies.map(r => r.id === replyId ? {
      ...r,
      isTeacherVerified: verified,
      isHelpful: helpful
    } : r)
    return true
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('forum_replies')
      .update({
        is_teacher_verified: verified,
        is_helpful: helpful
      })
      .eq('id', replyId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error verifying reply:', err)
    return false
  }
}

// 10. Get all forums for a course
export async function getForumsByCourseId(courseId: string): Promise<any[]> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    return mockForums.map(f => {
      const threads = mockThreads.filter(t => t.forumId === f.id)
      const threadsCount = threads.length
      const repliesCount = threads.reduce((acc, t) => acc + t.repliesCount, 0)
      return {
        id: f.id,
        lessonId: f.lessonId,
        forumType: f.forumType,
        isGraded: f.isGraded,
        dueDate: f.dueDate,
        createdAt: f.createdAt,
        title: f.title || 'Foro de Discusión',
        description: f.description || '',
        threadsCount,
        repliesCount
      }
    })
  }

  try {
    const supabase = createAdminClient()
    
    // Get course modules
    const { data: modules } = await supabase
      .from('course_modules')
      .select('id')
      .eq('course_id', courseId)
      
    if (!modules || modules.length === 0) return []
    const moduleIds = modules.map(m => m.id)
    
    // Get lessons of type 'forum'
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, title, content')
      .in('module_id', moduleIds)
      .eq('type', 'forum')
      
    if (!lessons || lessons.length === 0) return []
    const lessonIds = lessons.map(l => l.id)
    
    // Get forums configs
    const { data: forums } = await supabase
      .from('forums')
      .select('*, lessons(title, content)')
      .in('lesson_id', lessonIds)
      
    if (!forums || forums.length === 0) return []
    
    // Get threads count
    const forumIds = forums.map(f => f.id)
    const { data: threads } = await supabase
      .from('forum_threads')
      .select('id, forum_id')
      .in('forum_id', forumIds)
      
    // Get replies count
    const threadIds = threads?.map(t => t.id) || []
    let replies: any[] = []
    if (threadIds.length > 0) {
      const { data: dbReplies } = await supabase
        .from('forum_replies')
        .select('id, thread_id')
        .in('thread_id', threadIds)
      replies = dbReplies || []
    }
    
    return forums.map(f => {
      const fThreads = threads?.filter(t => t.forum_id === f.id) || []
      const fThreadIds = fThreads.map(t => t.id)
      const fReplies = replies.filter(r => fThreadIds.includes(r.thread_id))
      
      const lessonObj = Array.isArray(f.lessons) ? f.lessons[0] : f.lessons
      return {
        id: f.id,
        lessonId: f.lesson_id,
        forumType: f.forum_type,
        isGraded: f.is_graded,
        dueDate: f.due_date,
        createdAt: f.created_at,
        title: lessonObj?.title || 'Foro de Discusión',
        description: lessonObj?.content || '',
        threadsCount: fThreads.length,
        repliesCount: fReplies.length
      }
    })
  } catch (err) {
    console.error('Error in getForumsByCourseId:', err)
    return []
  }
}

// 11. Get a single forum configuration by its id
export async function getForumById(forumId: string): Promise<ForumConfig | null> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    const forum = mockForums.find(f => f.id === forumId)
    return forum || null
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('forums')
      .select('*, lessons(title, content)')
      .eq('id', forumId)
      .single()

    if (error || !data) return null

    const lessonObj = Array.isArray(data.lessons) ? data.lessons[0] : data.lessons
    return {
      id: data.id,
      lessonId: data.lesson_id,
      title: lessonObj?.title || 'Foro de Discusión',
      description: lessonObj?.content || '',
      forumType: data.forum_type,
      isGraded: data.is_graded,
      dueDate: data.due_date,
      createdAt: data.created_at
    }
  } catch (err) {
    console.error('Error fetching forum by id:', err)
    return null
  }
}

// 12. Update thread
export async function updateForumThread(threadId: string, title: string, content: string): Promise<{ data?: ForumThread; error?: string }> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    const threadIndex = mockThreads.findIndex(t => t.id === threadId)
    if (threadIndex === -1) return { error: 'Tema no encontrado' }
    const thread = mockThreads[threadIndex]

    // Determine role of author
    const isStudent = thread.authorRole === 'student'
    if (isStudent) {
      const elapsed = Date.now() - new Date(thread.createdAt).getTime()
      if (elapsed > 10 * 60 * 1000) {
        return { error: 'El plazo de 10 minutos para editar este mensaje ha expirado.' }
      }
    }

    mockThreads[threadIndex] = {
      ...thread,
      title,
      content,
      updatedAt: new Date().toISOString()
    }
    return { data: mockThreads[threadIndex] }
  }

  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const supabase = createAdminClient()

    // Fetch existing thread
    const { data: thread, error: fetchErr } = await supabase
      .from('forum_threads')
      .select('author_id, created_at, forum_id, is_pinned, is_locked')
      .eq('id', threadId)
      .single()

    if (fetchErr || !thread) return { error: 'Tema no encontrado' }

    // Check if user is author
    if (thread.author_id !== user.id) {
      return { error: 'No tienes permisos para editar esta discusión' }
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, roles(name)')
      .eq('id', user.id)
      .maybeSingle()
    const role = (Array.isArray(profile?.roles) ? profile.roles[0]?.name : (profile?.roles as any)?.name) || 'student'

    if (role === 'student') {
      const elapsed = Date.now() - new Date(thread.created_at).getTime()
      if (elapsed > 10 * 60 * 1000) {
        return { error: 'El plazo de 10 minutos para editar este mensaje ha expirado.' }
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from('forum_threads')
      .update({
        title,
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', threadId)
      .select('*, profiles(first_name, last_name, avatar_url, roles(name))')
      .single()

    if (updateErr) throw updateErr

    return {
      data: {
        id: updated.id,
        forumId: updated.forum_id,
        authorId: updated.author_id,
        authorName: `${updated.profiles?.first_name} ${updated.profiles?.last_name}`,
        authorAvatar: updated.profiles?.avatar_url || undefined,
        authorRole: (Array.isArray(updated.profiles?.roles) ? updated.profiles.roles[0]?.name : (updated.profiles?.roles as any)?.name) || 'student',
        title: updated.title,
        content: updated.content,
        isPinned: updated.is_pinned,
        isLocked: updated.is_locked,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
        repliesCount: 0
      }
    }
  } catch (err: any) {
    console.error('Error updating thread:', err)
    return { error: err.message || 'Error al actualizar el tema' }
  }
}

// 13. Update reply
export async function updateForumReply(replyId: string, content: string): Promise<{ data?: ForumReply; error?: string }> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    const replyIndex = mockReplies.findIndex(r => r.id === replyId)
    if (replyIndex === -1) return { error: 'Respuesta no encontrada' }
    const reply = mockReplies[replyIndex]

    const isStudent = reply.authorRole === 'student'
    if (isStudent) {
      const elapsed = Date.now() - new Date(reply.createdAt).getTime()
      if (elapsed > 10 * 60 * 1000) {
        return { error: 'El plazo de 10 minutos para editar este mensaje ha expirado.' }
      }
    }

    mockReplies[replyIndex] = {
      ...reply,
      content,
      updatedAt: new Date().toISOString()
    }
    return { data: mockReplies[replyIndex] }
  }

  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const supabase = createAdminClient()

    // Fetch existing reply
    const { data: reply, error: fetchErr } = await supabase
      .from('forum_replies')
      .select('author_id, created_at, thread_id, parent_id, is_helpful, is_teacher_verified')
      .eq('id', replyId)
      .single()

    if (fetchErr || !reply) return { error: 'Respuesta no encontrada' }

    if (reply.author_id !== user.id) {
      return { error: 'No tienes permisos para editar esta respuesta' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, roles(name)')
      .eq('id', user.id)
      .maybeSingle()
    const role = (Array.isArray(profile?.roles) ? profile.roles[0]?.name : (profile?.roles as any)?.name) || 'student'

    if (role === 'student') {
      const elapsed = Date.now() - new Date(reply.created_at).getTime()
      if (elapsed > 10 * 60 * 1000) {
        return { error: 'El plazo de 10 minutos para editar este mensaje ha expirado.' }
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from('forum_replies')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', replyId)
      .select('*, profiles(first_name, last_name, avatar_url, roles(name))')
      .single()

    if (updateErr) throw updateErr

    return {
      data: {
        id: updated.id,
        threadId: updated.thread_id,
        parentId: updated.parent_id || undefined,
        authorId: updated.author_id,
        authorName: `${updated.profiles?.first_name} ${updated.profiles?.last_name}`,
        authorAvatar: updated.profiles?.avatar_url || undefined,
        authorRole: (Array.isArray(updated.profiles?.roles) ? updated.profiles.roles[0]?.name : (updated.profiles?.roles as any)?.name) || 'student',
        content: updated.content,
        isHelpful: updated.is_helpful,
        isTeacherVerified: updated.is_teacher_verified,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      }
    }
  } catch (err: any) {
    console.error('Error updating reply:', err)
    return { error: err.message || 'Error al actualizar la respuesta' }
  }
}

