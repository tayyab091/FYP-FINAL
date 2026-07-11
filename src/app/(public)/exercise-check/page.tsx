import { ExerciseCheckGate } from '@/components/exercise/ExerciseCheckGate'
import { ExerciseCheckSteps } from '@/components/exercise/ExerciseCheckSteps'
import { PageHero, PageShell } from '@/components/layout/PageShell'

export default function ExerciseCheckPage() {
  return (
    <PageShell width="narrow">
      <PageHero
        eyebrow="Computer Vision Coaching"
        title="Perfect Your Form in Real Time"
        description="Allow camera access. Select an exercise. Get instant AI feedback on your form."
        tagline="REP BY REP · ANGLE BY ANGLE"
        className="text-center"
      />
      <ExerciseCheckGate />
      <ExerciseCheckSteps />
    </PageShell>
  )
}
