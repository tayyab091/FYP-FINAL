/**
 * Server-side text / URL hardening for user-generated content.
 * Prefer React text nodes for rendering; these helpers block stored XSS vectors.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/** Strip HTML tags and neutralize angle brackets / control chars. */
export function sanitizePlainText(input: string, maxLen = 2000): string {
  return input
    .replace(CONTROL_CHARS, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen)
}

/** Allow only http(s) URLs; reject javascript:, data:, etc. */
export function sanitizeHttpUrl(
  input: string,
  options: { requireHttps?: boolean; maxLen?: number } = {},
): string | null {
  const { requireHttps = false, maxLen = 2048 } = options
  const trimmed = input.trim().slice(0, maxLen)
  if (!trimmed) return null

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  const protocol = parsed.protocol.toLowerCase()
  if (protocol !== 'http:' && protocol !== 'https:') return null
  if (requireHttps && protocol !== 'https:') return null
  if (trimmed.toLowerCase().startsWith('javascript:')) return null

  return parsed.toString()
}

export function isSafeHttpUrl(input: string, requireHttps = false): boolean {
  return sanitizeHttpUrl(input, { requireHttps }) !== null
}
