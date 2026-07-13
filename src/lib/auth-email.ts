import { randomBytes } from 'crypto'
import { getAppUrl, sendEmail } from '@/lib/email'

export function createSecureToken() {
  return randomBytes(32).toString('hex')
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${getAppUrl()}/verify-email?token=${token}`
  return sendEmail({
    to: email,
    subject: 'Verify your T.E.S.T. email',
    html: `
      <p>Welcome to T.E.S.T.</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${getAppUrl()}/reset-password?token=${token}`
  return sendEmail({
    to: email,
    subject: 'Reset your T.E.S.T. password',
    html: `
      <p>You requested a password reset.</p>
      <p><a href="${link}">Reset password</a></p>
      <p>Or copy this link: ${link}</p>
      <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    `,
  })
}
