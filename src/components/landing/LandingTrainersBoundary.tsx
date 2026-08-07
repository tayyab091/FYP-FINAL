'use client'

import { Component, type ReactNode } from 'react'
import Link from 'next/link'
import { LandingSection } from './LandingSection'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class LandingTrainersBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <LandingSection alt id="trainers" ariaLabel="Featured trainers">
          <p className="eyebrow mb-3">Trainer marketplace</p>
          <h2 className="display-title text-3xl md:text-4xl">Featured coaches</h2>
          <p className="mt-4 text-muted-foreground">
            Coaches are temporarily unavailable. Browse the marketplace directly.
          </p>
          <Link href="/coaching" className="btn-accent mt-6 inline-flex px-8">
            View all trainers
          </Link>
        </LandingSection>
      )
    }

    return this.props.children
  }
}
