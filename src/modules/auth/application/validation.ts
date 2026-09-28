import { z } from 'zod'

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(4, 'Ingresa tu correo institucional o número de documento.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
})

/** Determina si una cadena es un correo electrónico válido */
export function isEmailIdentifier(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

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
