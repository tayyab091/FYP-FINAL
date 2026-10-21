import Link from 'next/link'
import { LEGAL_LAST_UPDATED } from '@/lib/legal-content'
import { buildPageMetadata } from '@/lib/seo'

type Section = { title: string; body: string }

type LegalDocumentPageProps = {
  title: string
  intro: string
  sections: readonly Section[]
  path: '/privacy' | '/terms'
}

export function legalPageMetadata(title: string, description: string, path: '/privacy' | '/terms') {
  return buildPageMetadata({ title, description, path })
}

export function LegalDocumentPage({ title, intro, sections, path }: LegalDocumentPageProps) {
  const other = path === '/privacy'
    ? { href: '/terms' as const, label: 'Terms of Service' }
    : { href: '/privacy' as const, label: 'Privacy Policy' }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <p className="mb-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span>{title}</span>
      </p>
      <h1 className="font-heading text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {LEGAL_LAST_UPDATED}</p>
      <p className="mt-8 text-base leading-relaxed text-muted-foreground">{intro}</p>
      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
            <p className="mt-2 text-base leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-12 text-sm text-muted-foreground">
        See also{' '}
        <Link href={other.href} className="font-medium text-primary hover:underline">
          {other.label}
        </Link>
        .
      </p>
    </main>
  )
}
