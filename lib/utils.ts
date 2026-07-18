import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function estimateDuration(text: string): { seconds: number; display: string } {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const seconds = Math.round((words / 130) * 60)
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return {
    seconds,
    display: min > 0 ? `${min}m${sec > 0 ? ` ${sec}s` : ''}` : `${sec}s`,
  }
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  ready: 'Prêt',
  published: 'Publié',
}

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  ready: 'bg-green-100 text-green-700',
  published: 'bg-purple-100 text-purple-700',
}
