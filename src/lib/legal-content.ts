export const LEGAL_LAST_UPDATED = 'August 6, 2026'

export const PRIVACY_SECTIONS = [
  {
    title: 'Information we collect',
    body: `Account details (name, email, country), fitness goals, workout and nutrition logs, messages with trainers, device push notification tokens, and photos you upload (profile, chat, form-check sessions processed on-device).`,
  },
  {
    title: 'How we use information',
    body: `To provide coaching, workouts, meal plans, community features, analytics, live sessions, and account security. We do not sell your personal data.`,
  },
  {
    title: 'Third-party services',
    body: `We use MongoDB (data storage), Cloudinary (image hosting), Stripe (payments), Pusher (realtime), Google OAuth (optional sign-in), and Jitsi (live video). Each provider processes data under their own policies.`,
  },
  {
    title: 'Data retention & deletion',
    body: `You may delete your account in Settings. Deletion removes your profile and associated data subject to legal retention requirements.`,
  },
  {
    title: 'Contact',
    body: `For privacy requests, contact your platform administrator or the support email listed in the app store listing.`,
  },
] as const

export const TERMS_SECTIONS = [
  {
    title: 'Eligibility',
    body: `You must be at least 16 years old and provide accurate registration information.`,
  },
  {
    title: 'Health disclaimer',
    body: `T.E.S.T. provides fitness and nutrition information for educational purposes only. Consult a physician before starting any exercise program. AI form checking and coaching features are not medical advice.`,
  },
  {
    title: 'Accounts & subscriptions',
    body: `You are responsible for safeguarding your credentials. Paid plans (Pro, Elite) renew according to the billing terms shown at purchase. Refunds follow applicable store policies.`,
  },
  {
    title: 'Acceptable use',
    body: `Do not harass other users, post illegal content, attempt to breach security, or misuse trainer or admin features.`,
  },
  {
    title: 'Intellectual property',
    body: `App content, branding, and exercise media remain the property of their respective owners. You retain rights to content you post in the community subject to a license to display it in the app.`,
  },
  {
    title: 'Termination',
    body: `We may suspend accounts that violate these terms. You may delete your account at any time in Settings.`,
  },
  {
    title: 'Changes',
    body: `We may update these terms; continued use after changes constitutes acceptance.`,
  },
] as const
