import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Junta classes do Tailwind; em conflito (ex.: px-2 e px-4) vale a última
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
