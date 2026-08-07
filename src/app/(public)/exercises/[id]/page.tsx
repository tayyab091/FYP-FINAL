import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'
import { fetchExerciseById } from '@/lib/exercises-api'
import { buildPageMetadata, exerciseJsonLd } from '@/lib/seo'
import ExerciseDetailClient from './ExerciseDetailClient'

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const exercise = await fetchExerciseById(id)

  if (!exercise) {
    return buildPageMetadata({
      title: 'Exercise Not Found',
      description: 'This exercise could not be found. Browse the full exercise library on T.E.S.T.',
      path: `/exercises/${id}`,
      noIndex: true,
    })
  }

  const description = `${exercise.name} — ${exercise.muscle} exercise using ${exercise.equipment}. ${exercise.instructions.slice(0, 120)}…`

  return buildPageMetadata({
    title: `${exercise.name} — ${exercise.muscle} Exercise`,
    description,
    path: `/exercises/${id}`,
    ogImage: exercise.gifUrl || undefined,
    keywords: [exercise.name, exercise.muscle, exercise.equipment, 'exercise demo'],
  })
}

export default async function ExerciseDetailPage({ params }: PageProps) {
  const { id } = await params
  const exercise = await fetchExerciseById(id)

  return (
    <>
      {exercise ? <JsonLd data={exerciseJsonLd(exercise)} /> : null}
      <ExerciseDetailClient />
    </>
  )
}
