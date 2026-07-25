const JITSI_BASE_URL = 'https://meet.jit.si'

export interface JitsiRoom {
  name: string
  url: string
  embedUrl: string
}

function sanitizeRoomName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export function getJitsiBaseUrl(): string {
  return JITSI_BASE_URL
}

export function isJitsiConfigured(): boolean {
  return true
}

export function createJitsiRoom(options: { name: string }): JitsiRoom {
  const roomName = sanitizeRoomName(options.name) || `live-${crypto.randomUUID()}`
  const url = `${JITSI_BASE_URL}/${encodeURIComponent(roomName)}`
  const embedUrl = `${url}#config.prejoinPageEnabled=false`

  return {
    name: roomName,
    url,
    embedUrl,
  }
}
