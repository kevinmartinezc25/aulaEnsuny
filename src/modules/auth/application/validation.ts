import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Por favor ingresa un correo electrónico válido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const recoveryRequestSchema = z.object({
  email: z.string().email('Por favor ingresa un correo electrónico válido.'),
})

export type RecoveryRequestInput = z.infer<typeof recoveryRequestSchema>

export const recoveryResetSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
})

export type RecoveryResetInput = z.infer<typeof recoveryResetSchema>
