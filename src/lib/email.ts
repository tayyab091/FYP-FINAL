import nodemailer from 'nodemailer'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export interface SendEmailResult {
  ok: true
  devLink?: string
}

function extractDevLink(html: string): string | undefined {
  const match = html.match(/href=["']([^"']+)["']/i)
  return match?.[1]
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (host && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM || user,
      to,
      subject,
      html,
    })

    return { ok: true }
  }

  const devLink = extractDevLink(html)
  console.log('[email:dev]', { to, subject, html, devLink })
  return { ok: true, devLink }
}

export function getAppUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '')
}
