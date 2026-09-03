import { z } from 'zod'

export const academicImpactItemSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1, 'La fecha es requerida'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  courseId: z.string().optional(),
  courseName: z.string().min(1, 'El curso o grupo es requerido'),
  gradeGroup: z.string().min(1, 'El grado/grupo es requerido'),
  subject: z.string().min(1, 'La asignatura es requerida'),
  hoursCount: z.coerce.number().min(1, 'Debe indicar al menos 1 hora'),
})

export const studentActivityPlanSchema = z.object({
  id: z.string().optional(),
  courseId: z.string().optional(),
  courseName: z.string().optional(),
  groupName: z.string().min(1, 'El grupo es requerido'),
  title: z.string().min(3, 'El título de la actividad debe tener al menos 3 caracteres'),
  instructions: z.string().min(5, 'Las instrucciones son requeridas'),
  resourceLinks: z.array(z.string()).optional(),
})

export const coverageAssignmentSchema = z.object({
  academicItemIndex: z.number(),
  groupName: z.string(),
  subject: z.string(),
  periodOrTime: z.string(),
  substituteTeacherId: z.string().optional(),
  substituteTeacherName: z.string().optional(),
  observations: z.string().optional(),
})

export const createPermissionRequestSchema = z.object({
  typeId: z.string().min(1, 'Debe seleccionar un tipo de permiso'),
  startDate: z.string().min(1, 'La fecha de inicio es requerida'),
  endDate: z.string().min(1, 'La fecha de finalización es requerida'),
  isFullDay: z.boolean().default(true),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().min(10, 'La descripción o motivo debe tener al menos 10 caracteres'),
  attachmentUrl: z.string().optional().nullable(),
  attachmentName: z.string().optional().nullable(),
  attachmentType: z.string().optional().nullable(),
  affectsAcademicDuty: z.boolean().default(false),
  academicImpact: z.array(academicImpactItemSchema).default([]),
  leavesStudentActivities: z.boolean().default(false),
  studentActivities: z.array(studentActivityPlanSchema).default([]),
  isDraft: z.boolean().optional().default(false),
}).refine(data => {
  if (!data.isFullDay) {
    return !!data.startTime && !!data.endTime
  }
  return true
}, {
  message: 'Debe especificar hora de inicio y finalización si la jornada es parcial',
  path: ['startTime'],
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate)
  }
  return true
}, {
  message: 'La fecha de inicio no puede ser posterior a la fecha de finalización',
  path: ['endDate'],
})

export type CreatePermissionRequestInput = z.infer<typeof createPermissionRequestSchema>

export const rectorDecisionSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(['approve', 'reject', 'return']),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
  correctionNotes: z.string().optional(),
}).refine(data => {
  if (data.decision === 'reject' && (!data.rejectionReason || data.rejectionReason.trim().length < 5)) {
    return false
  }
  return true
}, {
  message: 'El motivo del rechazo es obligatorio (mínimo 5 caracteres)',
  path: ['rejectionReason'],
}).refine(data => {
  if (data.decision === 'return' && (!data.correctionNotes || data.correctionNotes.trim().length < 5)) {
    return false
  }
  return true
}, {
  message: 'Las observaciones de corrección son obligatorias (mínimo 5 caracteres)',
  path: ['correctionNotes'],
})

export type RectorDecisionInput = z.infer<typeof rectorDecisionSchema>

export const coordinatorDecisionSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(['approve', 'reject']),
  coveragePlan: z.array(coverageAssignmentSchema).default([]),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
}).refine(data => {
  if (data.decision === 'reject' && (!data.rejectionReason || data.rejectionReason.trim().length < 5)) {
    return false
  }
  return true
}, {
  message: 'El motivo del rechazo es obligatorio (mínimo 5 caracteres)',
  path: ['rejectionReason'],
})

export type CoordinatorDecisionInput = z.infer<typeof coordinatorDecisionSchema>

export const permissionTypeConfigSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(2, 'El código es requerido'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  requiresAttachment: z.boolean().default(false),
  affectsClasses: z.boolean().default(true),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().default(0),
})

export type PermissionTypeConfigInput = z.infer<typeof permissionTypeConfigSchema>
