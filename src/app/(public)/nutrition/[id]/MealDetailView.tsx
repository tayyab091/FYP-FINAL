import Link from 'next/link'
import fs from 'node:fs'
import path from 'node:path'
import { ArrowLeft, Globe, UtensilsCrossed, Play } from 'lucide-react'
import type { MealDetail } from '@/lib/meals'
import { CatalogImageFrame } from '@/components/shared/CatalogImageFrame'
import { MealDocumentTitle } from './MealDocumentTitle'

export function MealDetailView({ meal }: { meal: MealDetail }) {
  // #region agent log
  try {
    const payload = {
      sessionId: '1483ff',
      hypothesisId: 'H3',
      runId: 'post-fix',
      location: 'MealDetailView.tsx:render',
      message: 'server render meal detail',
      data: { mealId: meal.id, mealName: meal.name, category: meal.category },
      timestamp: Date.now(),
    }
    fs.appendFileSync(path.join(process.cwd(), 'debug-1483ff.log'), `${JSON.stringify(payload)}\n`)
    fetch('http://127.0.0.1:7893/ingest/3b5841b0-46ed-4652-9b9f-279e38a5ba27', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1483ff' },
      body: JSON.stringify(payload),
    }).catch(() => {})
  } catch {
    /* ignore */
  }
  // #endregion

  return (
    <>
      <MealDocumentTitle name={meal.name} category={meal.category} />
      <div className="min-h-screen px-4 pt-8 pb-24 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/nutrition" className="inline-flex items-center gap-1 hover:text-primary">
              <ArrowLeft className="size-4" /> All recipes
            </Link>
            <span className="mx-2 text-border">/</span>
            <span className="font-medium text-foreground">{meal.name}</span>
          </nav>

          <div className="elite-panel overflow-hidden rounded-2xl">
            <CatalogImageFrame
              src={meal.thumb}
              alt={`${meal.name} — ${meal.category} recipe photo`}
              variant="detail"
              fit="contain"
              priority
              fallback={
                <div className="flex h-full items-center justify-center text-primary/50">
                  <UtensilsCrossed className="size-12" />
                </div>
              }
              badge={
                <span className="absolute left-4 top-4 rounded-full border border-border bg-background/85 px-3 py-1 text-xs font-bold text-foreground backdrop-blur">
                  {meal.category}
                </span>
              }
            />

            <div className="space-y-6 p-6 sm:p-8">
              <div>
                <h1 className="display-title text-3xl text-foreground md:text-4xl">{meal.name}</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="size-4" /> {meal.area}
                </p>
              </div>

              {meal.youtube && (
                <a
                  href={meal.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
                >
                  <Play className="size-4" /> Watch video tutorial
                </a>
              )}

              <div>
                <h2 className="mb-3 font-bold text-foreground">Ingredients</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {meal.ingredients.map((ing) => (
                    <li
                      key={`${ing.name}-${ing.measure}`}
                      className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground"
                    >
                      <span className="text-foreground">{ing.name}</span>
                      {ing.measure ? <span className="text-muted-foreground"> — {ing.measure}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="mb-3 font-bold text-foreground">Instructions</h2>
                <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{meal.instructions}</p>
              </div>

              <Link href="/nutrition" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                ← Browse more recipes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
