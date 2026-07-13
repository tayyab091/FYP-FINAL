const DAILY_API = 'https://api.daily.co/v1'

export function isDailyConfigured(): boolean {
  return Boolean(process.env.DAILY_API_KEY)
}

export interface DailyRoom {
  name: string
  url: string
}

/** Create a Daily.co room for a live training session. */
export async function createDailyRoom(options: {
  name: string
  expUnix?: number
}): Promise<DailyRoom> {
  const apiKey = process.env.DAILY_API_KEY
  if (!apiKey) {
    throw new Error('DAILY_API_KEY is not configured')
  }

  const res = await fetch(`${DAILY_API}/rooms`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: options.name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80),
      properties: {
        exp: options.expUnix,
        enable_chat: true,
        start_video_off: false,
        start_audio_off: false,
      },
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || data?.info || 'Failed to create Daily room')
  }

  return { name: data.name, url: data.url }
}

/** Soft-delete / expire a Daily room when a session ends (best-effort). */
export async function deleteDailyRoom(name: string): Promise<void> {
  const apiKey = process.env.DAILY_API_KEY
  if (!apiKey || !name) return
  await fetch(`${DAILY_API}/rooms/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  }).catch(() => {})
}
