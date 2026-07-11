export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {}

  return Object.fromEntries(
    cookieHeader.split(';').map((part) => {
      const [key, ...valueParts] = part.trim().split('=')
      return [key, decodeURIComponent(valueParts.join('='))]
    }),
  )
}
