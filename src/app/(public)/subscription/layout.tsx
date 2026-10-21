import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildPageMetadata, subscriptionServiceJsonLd } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  title: 'Membership Plans & Pricing',
  description:
    'Start free with Basic, upgrade to Pro for AI form checking and trainer chat, or go Elite for live sessions and unlimited coaching.',
  path: '/subscription',
  keywords: ['fitness subscription', 'gym membership', 'personal training plans', 'Pro Elite pricing'],
})

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={subscriptionServiceJsonLd()} />
      {children}
    </>
  )
}
