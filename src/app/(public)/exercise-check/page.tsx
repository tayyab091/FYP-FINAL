import { PoseDetector } from '@/components/exercise/PoseDetector'

export default function ExerciseCheckPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-[#00ff87] text-sm font-semibold uppercase tracking-widest">AI Form Checker</span>
          <h1 className="text-4xl font-black text-white mt-3 mb-4">AI Exercise Form Checker</h1>
          <p className="text-[#a0a0a0]">
            Allow camera access. Select an exercise. Get instant AI feedback on your form.
          </p>
        </div>
        <PoseDetector />
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '📷', title: 'Enable Camera', desc: 'Click Start Camera and allow access' },
            { icon: '🏋️', title: 'Select Exercise', desc: 'Choose squat, push-up, lunge, or plank' },
            { icon: '🤖', title: 'Get Feedback', desc: 'AI tracks your joints and counts reps in real time' },
          ].map(s => (
            <div key={s.title} className="glass rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">{s.icon}</div>
              <h3 className="font-bold text-white mb-2">{s.title}</h3>
              <p className="text-[#a0a0a0] text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
