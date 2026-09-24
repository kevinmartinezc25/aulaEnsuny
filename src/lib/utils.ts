import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convierte un nombre o texto a formato Capitalizado (primera letra de cada palabra en mayúscula y el resto en minúscula).
 * Ej: "JUAN CARLOS PÉREZ GÓMEZ" -> "Juan Carlos Pérez Gómez"
 */
export function formatCapitalizedWords(str?: string | null): string {
  if (!str) return ''
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

