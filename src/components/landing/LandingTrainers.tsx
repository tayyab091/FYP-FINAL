'use client'



import { useEffect, useRef, useState } from 'react'

import Link from 'next/link'
import { Avatar } from '@/components/shared/Avatar'
import { useHorizontalWheelScroll } from '@/hooks/useHorizontalWheelScroll'

import { motion, useInView, useReducedMotion } from 'framer-motion'

import { ArrowRight, Search, Star } from 'lucide-react'

import { Trainer } from '@/types'

import { Skeleton } from '@/components/ui/skeleton'

import { EmptyState } from '@/components/shared/EmptyState'

import { trainerPublicPath } from '@/lib/trainer-slug'

import { LandingSection } from './LandingSection'

import { LandingReveal } from './LandingReveal'

import { easeTransition } from '@/lib/motion'



function trainerSpecialties(specialty: Trainer['specialty'] | string | undefined): string[] {

  if (!specialty) return []

  if (Array.isArray(specialty)) return specialty.filter(Boolean)

  return String(specialty)

    .split(/[,;|/]+/)

    .map((s) => s.trim())

    .filter(Boolean)

}



export function LandingTrainers() {

  const [trainers, setTrainers] = useState<Trainer[]>([])

  const [loading, setLoading] = useState(true)

  const reduceMotion = useReducedMotion() ?? false

  const sectionRef = useRef<HTMLDivElement>(null)
  const scrollRef = useHorizontalWheelScroll<HTMLDivElement>()

  const shouldLoad = useInView(sectionRef, { once: true, margin: '240px 0px' })

  useEffect(() => {
    const el = scrollRef.current
    if (!el || trainers.length === 0) return
    // #region agent log
    fetch('http://127.0.0.1:7893/ingest/3b5841b0-46ed-4652-9b9f-279e38a5ba27',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1483ff'},body:JSON.stringify({sessionId:'1483ff',location:'LandingTrainers.tsx:mount',message:'trainer scroll metrics',data:{scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overflowX:getComputedStyle(el).overflowX,canScroll:el.scrollWidth>el.clientWidth},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  }, [trainers.length, scrollRef])



  useEffect(() => {

    if (!shouldLoad) return



    const controller = new AbortController()

    const timeout = setTimeout(() => controller.abort(), 8000)



    const startFetch = () => {

      fetch('/api/trainers?limit=8', { signal: controller.signal })

        .then((r) => r.json())

        .then((data) => {

          const list = Array.isArray(data) ? data : data?.trainers

          setTrainers(Array.isArray(list) ? list : [])

        })

        .catch(() => setTrainers([]))

        .finally(() => {

          clearTimeout(timeout)

          setLoading(false)

        })

    }



    let idleId: number

    if (typeof window.requestIdleCallback === 'function') {

      idleId = window.requestIdleCallback(startFetch, { timeout: 2000 })

    } else {

      idleId = globalThis.setTimeout(startFetch, 400) as unknown as number

    }



    return () => {

      clearTimeout(timeout)

      if (typeof window.cancelIdleCallback === 'function') {

        window.cancelIdleCallback(idleId)

      } else {

        globalThis.clearTimeout(idleId)

      }

      controller.abort()

    }

  }, [shouldLoad])



  return (

    <LandingSection alt id="trainers" ariaLabel="Featured trainers">

      <div ref={sectionRef} className="landing-trainers__header">

        <LandingReveal>

          <p className="eyebrow mb-3">Trainer marketplace</p>

          <h2 className="display-title text-3xl md:text-4xl lg:text-5xl">Featured coaches</h2>

          <p className="mt-3 max-w-lg text-muted-foreground">

            Verified professionals ready to guide your journey.

          </p>

        </LandingReveal>

        <LandingReveal delay={0.08}>

          <Link href="/coaching" className="landing-trainers__view-all group">

            View all trainers

            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />

          </Link>

        </LandingReveal>

      </div>



      {loading ? (

        <div className="landing-trainers__scroll">

          {[1, 2, 3, 4].map((i) => (

            <Skeleton key={i} className="landing-trainer-card landing-trainer-card--skeleton" />

          ))}

        </div>

      ) : trainers.length === 0 ? (

        <EmptyState

          icon={<Search className="size-7" />}

          tagline="Coaches loading"

          title="No featured trainers yet"

          description="Browse the marketplace to find verified coaches near you."

          action={

            <Link href="/coaching" className="btn-accent px-6 text-sm">

              Find trainers

            </Link>

          }

        />

      ) : (

        <div className="landing-trainers__scroll-wrap" ref={scrollRef}>

          <div className="landing-trainers__scroll">

            {trainers.map((trainer, i) => (

              <motion.div

                key={trainer._id}

                className="landing-trainers__item"

                initial={reduceMotion ? false : { opacity: 0, y: 20 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true, margin: '-20px' }}

                transition={{ ...easeTransition, delay: i * 0.06 }}

              >

                <Link href={trainerPublicPath(trainer)} className="landing-trainer-card group">

                  <div className="landing-trainer-card__avatar">
                    <Avatar name={trainer.name} avatarUrl={trainer.profileImage} size={64} />
                  </div>

                  <div className="landing-trainer-card__body">

                    <h3 className="landing-trainer-card__name">{trainer.name}</h3>

                    <p className="landing-trainer-card__meta">

                      {trainer.gymName || trainer.country}

                    </p>

                    <div className="landing-trainer-card__tags">

                      {trainerSpecialties(trainer.specialty).slice(0, 2).map((s) => (

                        <span key={s} className="landing-trainer-card__tag">

                          {s}

                        </span>

                      ))}

                    </div>

                    <div className="landing-trainer-card__rating">

                      <Star className="size-3.5 fill-primary text-primary" />

                      {trainer.rating?.toFixed(1) || '5.0'}

                    </div>

                  </div>

                </Link>

              </motion.div>

            ))}

          </div>

        </div>

      )}

    </LandingSection>

  )

}


