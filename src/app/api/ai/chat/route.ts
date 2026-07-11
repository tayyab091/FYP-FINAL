import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()

    const GEMINI_KEY = process.env.GEMINI_API_KEY

    if (!GEMINI_KEY || GEMINI_KEY === 'PASTE_GEMINI_KEY_HERE') {
      // Smart fallback responses when no API key
      const lower = message.toLowerCase()
      let reply = ''

      if (lower.includes('squat') || lower.includes('leg')) {
        reply = 'For squats: feet shoulder-width apart, toes slightly out. Push hips back and down until thighs are parallel to the floor. Drive through your heels to stand. Aim for 3 sets of 12-15 reps.'
      } else if (lower.includes('protein') || lower.includes('diet') || lower.includes('eat')) {
        reply = 'Aim for 1.6-2.2g of protein per kg of bodyweight daily. Great Pakistani sources: chicken, fish, eggs, daal, paneer, and Greek yogurt. Spread your intake across 4-5 meals for best muscle protein synthesis.'
      } else if (lower.includes('lose') || lower.includes('fat') || lower.includes('weight')) {
        reply = 'For fat loss: create a 300-500 calorie deficit, prioritize protein to preserve muscle, combine strength training with cardio, and aim for 0.5-1kg per week loss. Patience is key — crash diets don\'t work long term.'
      } else if (lower.includes('muscle') || lower.includes('bulk') || lower.includes('gain')) {
        reply = 'For muscle gain: eat in a slight calorie surplus (200-300 calories), get enough protein (2g per kg), focus on progressive overload in compound lifts (bench, squat, deadlift), and sleep 7-9 hours for recovery.'
      } else if (lower.includes('sleep') || lower.includes('recover')) {
        reply = 'Sleep is when your muscles actually grow. Aim for 7-9 hours per night. Tips: consistent sleep schedule, dark and cool room, no screens 1 hour before bed, avoid caffeine after 2pm.'
      } else if (lower.includes('push') || lower.includes('chest') || lower.includes('upper')) {
        reply = 'For upper body: focus on push movements (bench press, shoulder press, push-ups) and pull movements (rows, pull-ups). Train upper body 2-3x per week with 48 hours of rest between sessions.'
      } else if (lower.includes('cardio') || lower.includes('run') || lower.includes('stamina')) {
        reply = 'For cardiovascular fitness: start with 20-30 minutes of moderate cardio 3x per week. HIIT (high intensity intervals) burns more calories in less time. Mix steady-state and HIIT for best results.'
      } else if (lower.includes('warm') || lower.includes('stretch') || lower.includes('injury')) {
        reply = 'Always warm up for 5-10 minutes before lifting: light cardio, dynamic stretches, and practice sets. Cool down with static stretching after. Most gym injuries happen from skipping warm-up or lifting too heavy too soon.'
      } else {
        reply = 'Great question! Focus on these fundamentals: consistency over perfection, progressive overload in training, enough protein daily, quality sleep, and managing stress. What specific aspect of your fitness would you like to know more about?'
      }

      return NextResponse.json({ reply })
    }

    // Use Gemini API
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You are a professional fitness and nutrition coach for T.E.S.T. — a Pakistani fitness platform.
              Answer questions about: exercise form, workout plans, nutrition, weight loss, muscle gain, recovery, and healthy habits.
              Keep answers concise (3-5 sentences max), practical, and encouraging.
              When relevant, use Pakistani food examples (chicken biryani, daal, roti, paratha, nihari, haleem).
              Do NOT answer questions unrelated to fitness or nutrition.
              Do NOT provide medical diagnoses. Suggest consulting a doctor for medical concerns.`
            }]
          },
          contents: [
            ...history.slice(-6).map((m: any) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            })),
            { role: 'user', parts: [{ text: message }] }
          ],
          generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
        })
      }
    )

    const data = await res.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      || 'I could not generate a response. Please try again.'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json({ reply: 'AI service temporarily unavailable. Please try again.' })
  }
}
