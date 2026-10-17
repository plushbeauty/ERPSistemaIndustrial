import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Combina classes Tailwind sem deixar utilitários conflitantes ativos. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
