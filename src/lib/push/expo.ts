/** Send push notifications via Expo Push API (mobile clients). */

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, string>
  sound?: 'default' | null
}

export async function sendExpoPush(messages: ExpoPushMessage[]) {
  if (!messages.length) return

  const chunks: ExpoPushMessage[][] = []
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100))
  }

  for (const chunk of chunks) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    }).catch(() => {})
  }
}

export async function sendExpoPushToUser(
  tokens: string[] | undefined,
  payload: { title: string; body: string; link?: string },
) {
  const valid = (tokens || []).filter((t) => t.startsWith('ExponentPushToken'))
  if (!valid.length) return

  await sendExpoPush(
    valid.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      data: payload.link ? { link: payload.link } : undefined,
    })),
  )
}
