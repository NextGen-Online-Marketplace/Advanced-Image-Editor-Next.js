import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Splits a comma-separated string and trims whitespace from each item
 * @param text - The comma-separated string to split
 * @returns Array of trimmed strings, filtered to remove empty values
 */
export function splitCommaSeparated(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return []
  }
  return text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}