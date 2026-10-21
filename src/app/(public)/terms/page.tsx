import { LegalDocumentPage, legalPageMetadata } from '@/components/legal/LegalDocumentPage'
import { TERMS_SECTIONS } from '@/lib/legal-content'

export const metadata = legalPageMetadata(
  'Terms of Service',
  'Terms and conditions for using the T.E.S.T. fitness platform.',
  '/terms',
)

export default function TermsPage() {
  return (
    <LegalDocumentPage
      title="Terms of Service"
      intro="By using T.E.S.T., you agree to these Terms of Service."
      sections={TERMS_SECTIONS}
      path="/terms"
    />
  )
}
