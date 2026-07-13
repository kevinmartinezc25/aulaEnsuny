'use server'

import { createClient, createAdminClient } from '@/core/config/supabase/server'

export interface CourseAnnouncement {
  id: string
  courseId: string
  authorId: string
  authorName: string
  authorRole: string
  title: string
  content: string
  type: 'announcement' | 'reminder' | 'new_material' | 'date_change' | 'congratulation' | 'urgent'
  isPinned: boolean
  publishAt: string
  attachments: { name: string; url: string; type: string }[]
  createdAt: string
  updatedAt: string
  isReadByMe?: boolean
}

// In-memory store for demo mode
let mockAnnouncements: CourseAnnouncement[] = [
  {
    id: 'ann-1',
    courseId: 'demo-physics',
    authorId: 'docente-id',
    authorName: 'Carlos Docente',
    authorRole: 'teacher',
    title: '📢 Quiz de Leyes de Newton',
    content: '<p>Recuerden estudiar los temas vistos en clase. El quiz se realizará el próximo martes.</p>',
    type: 'announcement',
    isPinned: true,
    publishAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    attachments: [
      { name: 'Guía_Leyes_Newton.pdf', url: '#', type: 'pdf' }
    ],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ann-2',
    courseId: 'demo-physics',
    authorId: 'docente-id',
    authorName: 'Carlos Docente',
    authorRole: 'teacher',
    title: '⏰ Recordatorio: Entrega de Taller 01',
    content: '<p>El plazo máximo para subir el Taller 01 es el viernes a medianoche. No se aceptarán entregas extemporáneas.</p>',
    type: 'reminder',
    isPinned: false,
    publishAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    attachments: [
      { name: 'Taller_01.pdf', url: '#', type: 'pdf' }
    ],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  }
]

let mockReads: { announcementId: string; studentId: string; readAt: string }[] = []

function checkDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')
}

// 1. Get announcements for a course
export async function getAnnouncementsByCourse(
  courseId: string,
  userId: string,
  userRole: string
): Promise<CourseAnnouncement[]> {
  const isDemo = checkDemoMode()

  if (isDemo) {
    // Return mock announcements for this course
    const list = mockAnnouncements.filter(a => a.courseId === courseId || courseId.includes('demo'))
    
    // If student, filter out scheduled but not yet published announcements
    const now = new Date().getTime()
    const filtered = userRole === 'student' 
      ? list.filter(a => new Date(a.publishAt).getTime() <= now)
      : list

    // Add isReadByMe status
    const result = filtered.map(a => ({
      ...a,
      isReadByMe: mockReads.some(r => r.announcementId === a.id && r.studentId === userId)
    }))

    // Sort: Pinned first, then newest first
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime()
    })
  }

  try {
    const supabase = createAdminClient()
    
    // Fetch all announcements for the course
    let query = supabase
      .from('course_announcements')
      .select('*, profiles(first_name, last_name, roles(name))')
      .eq('course_id', courseId)

    if (userRole === 'student') {
      query = query.lte('publish_at', new Date().toISOString())
    }

    const { data, error } = await query

    if (error || !data) return []

    // Fetch reads for this user if student
    let userReadIds = new Set<string>()
    if (userId) {
      const { data: readsData } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('student_id', userId)
      
      if (readsData) {
        readsData.forEach(r => userReadIds.add(r.announcement_id))
      }
    }

    const formatted: CourseAnnouncement[] = data.map(a => {
      const authorProfile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
      const roleName = authorProfile?.roles
        ? (Array.isArray(authorProfile.roles) ? authorProfile.roles[0]?.name : (authorProfile.roles as any).name)
        : 'teacher'

      return {
        id: a.id,
        courseId: a.course_id,
        authorId: a.author_id,
        authorName: authorProfile ? `${authorProfile.first_name} ${authorProfile.last_name}` : 'Docente',
        authorRole: roleName || 'teacher',
        title: a.title,
        content: a.content,
        type: a.type as any,
        isPinned: a.is_pinned,
        publishAt: a.publish_at,
        attachments: Array.isArray(a.attachments) ? a.attachments : [],
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        isReadByMe: userReadIds.has(a.id)
      }
    })

    // Sort: Pinned first, then newest first
    return formatted.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime()
    })
  } catch (err) {
    console.error('Error fetching announcements:', err)
    return []
  }
}

// 2. Save Announcement (Create or Update)
export async function saveAnnouncement(announcementData: {
  id?: string
  courseId: string
  authorId: string
  title: string
  content: string
  type: 'announcement' | 'reminder' | 'new_material' | 'date_change' | 'congratulation' | 'urgent'
  isPinned: boolean
  publishAt?: string
  attachments?: { name: string; url: string; type: string }[]
}): Promise<{ data?: CourseAnnouncement; error?: string }> {
  const isDemo = checkDemoMode()
  const publishTime = announcementData.publishAt || new Date().toISOString()
  const atts = announcementData.attachments || []

  if (isDemo) {
    if (announcementData.id) {
      const idx = mockAnnouncements.findIndex(a => a.id === announcementData.id)
      if (idx !== -1) {
        mockAnnouncements[idx] = {
          ...mockAnnouncements[idx],
          title: announcementData.title,
          content: announcementData.content,
          type: announcementData.type,
          isPinned: announcementData.isPinned,
          publishAt: publishTime,
          attachments: atts,
          updatedAt: new Date().toISOString()
        }
        return { data: mockAnnouncements[idx] }
      }
      return { error: 'Anuncio no encontrado' }
    } else {
      const newAnn: CourseAnnouncement = {
        id: `ann_${Date.now()}`,
        courseId: announcementData.courseId,
        authorId: announcementData.authorId,
        authorName: 'Carlos Docente',
        authorRole: 'teacher',
        title: announcementData.title,
        content: announcementData.content,
        type: announcementData.type,
        isPinned: announcementData.isPinned,
        publishAt: publishTime,
        attachments: atts,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      mockAnnouncements.push(newAnn)
      return { data: newAnn }
    }
  }

  try {
    const supabase = createAdminClient()
    
    // Get profiles info to build/refresh notification later
    const { data: authorProf } = await supabase
      .from('profiles')
      .select('first_name, last_name, roles(name)')
      .eq('id', announcementData.authorId)
      .single()

    const { data: courseData } = await supabase
      .from('courses')
      .select('title')
      .eq('id', announcementData.courseId)
      .single()

    const payload = {
      course_id: announcementData.courseId,
      author_id: announcementData.authorId,
      title: announcementData.title,
      content: announcementData.content,
      type: announcementData.type,
      is_pinned: announcementData.isPinned,
      publish_at: publishTime,
      attachments: atts,
      updated_at: new Date().toISOString()
    }

    let result
    if (announcementData.id) {
      result = await supabase
        .from('course_announcements')
        .update(payload)
        .eq('id', announcementData.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('course_announcements')
        .insert({
          ...payload,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
    }

    if (result.error) throw result.error

    const saved = result.data

    // Internal notification logic:
    // If it's a new announcement and it is published immediately, trigger internal notifications
    const isNew = !announcementData.id
    const isPublishedNow = new Date(publishTime).getTime() <= Date.now()
    
    if (isNew && isPublishedNow && courseData) {
      // Find all students in course.
      // Wait, is there an enrollments table or student_progress/profiles?
      // Typically, students are found in profiles. We can notify all users with student role in this sandbox,
      // or check profiles where role = 'student'. Let's select profiles where role_id points to student.
      const { data: studentRole } = await supabase.from('roles').select('id').eq('name', 'student').single()
      if (studentRole) {
        const { data: students } = await supabase
          .from('profiles')
          .select('id')
          .eq('role_id', studentRole.id)

        if (students && students.length > 0) {
          const notificationsToInsert = students.map(s => ({
            recipient_id: s.id,
            title: `Nueva novedad en ${courseData.title}`,
            message: `El docente ha publicado: "${saved.title}"`,
            is_read: false,
            created_at: new Date().toISOString()
          }))
          
          await supabase.from('notifications').insert(notificationsToInsert)
        }
      }
    }

    const roleName = authorProf?.roles
      ? (Array.isArray(authorProf.roles) ? authorProf.roles[0]?.name : (authorProf.roles as any).name)
      : 'teacher'

    return {
      data: {
        id: saved.id,
        courseId: saved.course_id,
        authorId: saved.author_id,
        authorName: authorProf ? `${authorProf.first_name} ${authorProf.last_name}` : 'Docente',
        authorRole: roleName || 'teacher',
        title: saved.title,
        content: saved.content,
        type: saved.type as any,
        isPinned: saved.is_pinned,
        publishAt: saved.publish_at,
        attachments: saved.attachments || [],
        createdAt: saved.created_at,
        updatedAt: saved.updated_at
      }
    }
  } catch (err: any) {
    console.error('Error saving announcement:', err)
    return { error: err.message || 'Error al guardar el anuncio' }
  }
}

// 3. Delete Announcement
export async function deleteAnnouncement(id: string): Promise<boolean> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    const originalLen = mockAnnouncements.length
    mockAnnouncements = mockAnnouncements.filter(a => a.id !== id)
    mockReads = mockReads.filter(r => r.announcementId !== id)
    return mockAnnouncements.length < originalLen
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('course_announcements')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error deleting announcement:', err)
    return false
  }
}

// 4. Mark Announcement as Read
export async function markAnnouncementAsRead(
  announcementId: string,
  studentId: string
): Promise<boolean> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    const alreadyRead = mockReads.some(r => r.announcementId === announcementId && r.studentId === studentId)
    if (!alreadyRead) {
      mockReads.push({
        announcementId,
        studentId,
        readAt: new Date().toISOString()
      })
    }
    return true
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('announcement_reads')
      .upsert({
        announcement_id: announcementId,
        student_id: studentId,
        read_at: new Date().toISOString()
      }, { onConflict: 'announcement_id,student_id' })

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error marking announcement as read:', err)
    return false
  }
}

// 5. Get Announcement Read Stats
export async function getAnnouncementReadStats(
  announcementId: string,
  courseId: string
): Promise<{ readCount: number; totalStudents: number }> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    const readCount = mockReads.filter(r => r.announcementId === announcementId).length
    // In demo mode, assume 5 total students
    return { readCount, totalStudents: 5 }
  }

  try {
    const supabase = createAdminClient()
    
    // Count reads
    const { count: readCount, error: readErr } = await supabase
      .from('announcement_reads')
      .select('*', { count: 'exact', head: true })
      .eq('announcement_id', announcementId)

    // Count total students (using student role)
    const { data: studentRole } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'student')
      .single()

    let totalStudents = 0
    if (studentRole) {
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', studentRole.id)
      
      totalStudents = studentCount || 0
    }

    return {
      readCount: readCount || 0,
      totalStudents: totalStudents || 1
    }
  } catch (err) {
    console.error('Error fetching read stats:', err)
    return { readCount: 0, totalStudents: 1 }
  }
}

// 6. Get student latest announcements (for main dashboard)
export async function getStudentLatestAnnouncements(
  studentId: string
): Promise<(CourseAnnouncement & { courseTitle: string })[]> {
  const isDemo = checkDemoMode()
  if (isDemo) {
    const now = new Date().getTime()
    return mockAnnouncements
      .filter(a => new Date(a.publishAt).getTime() <= now)
      .slice(0, 3)
      .map(a => ({
        ...a,
        courseTitle: 'Física General',
        isReadByMe: mockReads.some(r => r.announcementId === a.id && r.studentId === studentId)
      }))
  }

  try {
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('course_announcements')
      .select('*, courses(title), profiles(first_name, last_name, roles(name))')
      .lte('publish_at', new Date().toISOString())
      .order('publish_at', { ascending: false })
      .limit(3)

    if (error || !data) return []

    // Fetch reads
    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('student_id', studentId)

    const readIds = new Set(reads?.map(r => r.announcement_id) || [])

    return data.map(a => {
      const authorProfile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
      const courseObj = Array.isArray(a.courses) ? a.courses[0] : a.courses
      const roleName = authorProfile?.roles
        ? (Array.isArray(authorProfile.roles) ? authorProfile.roles[0]?.name : (authorProfile.roles as any).name)
        : 'teacher'

      return {
        id: a.id,
        courseId: a.course_id,
        authorId: a.author_id,
        authorName: authorProfile ? `${authorProfile.first_name} ${authorProfile.last_name}` : 'Docente',
        authorRole: roleName || 'teacher',
        title: a.title,
        content: a.content,
        type: a.type as any,
        isPinned: a.is_pinned,
        publishAt: a.publish_at,
        attachments: Array.isArray(a.attachments) ? a.attachments : [],
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        courseTitle: courseObj?.title || 'Curso',
        isReadByMe: readIds.has(a.id)
      }
    })
  } catch (err) {
    console.error('Error fetching student dashboard announcements:', err)
    return []
  }
}
