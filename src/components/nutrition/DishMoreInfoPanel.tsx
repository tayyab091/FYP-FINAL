'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Clock, Globe, Leaf, ListOrdered, ArrowRight, UtensilsCrossed } from 'lucide-react'
import { parseInstructionSteps } from '@/lib/parse-instruction-steps'
import { mealDetailPath } from '@/lib/meal-slug'

export interface DishMoreInfoData {
  id: string
  name: string
  category: string
  area: string
  thumb?: string
  ingredients: { name: string; measure: string }[]
  instructions?: string
}

interface DishMoreInfoPanelProps {
  dish: DishMoreInfoData
}

export function DishMoreInfoPanel({ dish }: DishMoreInfoPanelProps) {
  const ingredientCount = dish.ingredients.length
  const previewIngredients = dish.ingredients.slice(0, 6)
  const extraIngredients = ingredientCount - previewIngredients.length
  const steps = parseInstructionSteps(dish.instructions || '', 3)

  return (
    <div className="space-y-3">
      <div className="flex gap-2.5">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-muted/70">
          {dish.thumb ? (
            <Image
              src={dish.thumb}
              alt=""
              fill
              sizes="44px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-primary/50">
              <UtensilsCrossed className="size-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-foreground">{dish.name}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="workout-badge rounded-full border border-border bg-muted/60 px-1.5 py-px text-[9px] font-medium text-foreground">
              {dish.category}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/60 px-1.5 py-px text-[9px] text-muted-foreground">
              <Globe className="size-2.5" />
              {dish.area}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[9px]">
        <span className="inline-flex items-center gap-1 rounded-md border border-sky-600/20 bg-sky-500/10 px-1.5 py-0.5 text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
          <Leaf className="size-2.5" />
          {ingredientCount} ingredients
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-muted-foreground">
          <Clock className="size-2.5" />
          Prep time varies
        </span>
      </div>

      <div>
        <p className="workout-label mb-1.5 text-muted-foreground">Ingredients</p>
        <div className="grid grid-cols-2 gap-1">
          {previewIngredients.map((ing) => (
            <span
              key={ing.name}
              className="truncate rounded-md border border-border bg-muted/30 px-1.5 py-0.5 text-[9px] text-muted-foreground"
              title={`${ing.measure} ${ing.name}`.trim()}
            >
              <span className="font-medium text-foreground/80">{ing.measure}</span>{' '}
              <span>{ing.name}</span>
            </span>
          ))}
        </div>
        {extraIngredients > 0 && (
          <p className="mt-1 text-[9px] text-muted-foreground">+ {extraIngredients} more</p>
        )}
      </div>

      {steps.length > 0 && (
        <div>
          <p className="workout-label mb-1.5 flex items-center gap-1 text-muted-foreground">
            <ListOrdered className="size-2.5" />
            Steps
          </p>
          <ol className="space-y-1">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-1.5 text-[9px] leading-snug text-muted-foreground">
                <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[8px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="line-clamp-2">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <Link
        href={mealDetailPath(dish.name, dish.id)}
        className="group mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/20"
      >
        View full recipe
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
