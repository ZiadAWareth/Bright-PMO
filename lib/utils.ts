import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Up to two initials for an avatar fallback.
 *
 * Filters empty segments so a double space or a trailing space in a stored
 * name does not produce a blank initial.
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return parts
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/**
 * A stable colour for a name's initials avatar.
 *
 * Hashes the whole string rather than keying off the first character, so
 * "Ahmed Ali" and "Ahmed Hassan" do not collide — with a first-character key
 * every name sharing an initial gets the same colour, which is most of them.
 */
const AVATAR_COLORS = [
  "#3A6FD8",
  "#2E9E6B",
  "#E0911E",
  "#9B59B6",
  "#D24B43",
  "#16A89E",
  "#5B6CB8",
]

export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
