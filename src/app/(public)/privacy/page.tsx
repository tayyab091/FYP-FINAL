import { LegalDocumentPage, legalPageMetadata } from '@/components/legal/LegalDocumentPage'
import { PRIVACY_SECTIONS } from '@/lib/legal-content'

export const metadata = legalPageMetadata(
  'Privacy Policy',
  'How T.E.S.T. collects, uses, and protects your personal information.',
  '/privacy',
)

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      intro={`T.E.S.T. ("Train, Eat, Strengthen, Transform") respects your privacy. This policy describes what information we collect, how we use it, and your choices.`}
      sections={PRIVACY_SECTIONS}
      path="/privacy"
    />
  )
}
