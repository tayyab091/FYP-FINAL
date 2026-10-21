'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function AvailabilityTab() {
  const [slots, setSlots] = useState(
    DAYS.map((_, i) => ({
      dayOfWeek: i,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: i >= 1 && i <= 5,
    })),
  )
  const [hydrating, setHydrating] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const profileRes = await fetch('/api/trainers/profile')
        if (!profileRes.ok) return
        const profile = await profileRes.json()
        const trainerId = profile._id
        if (!trainerId) return
        const res = await fetch(`/api/trainer/availability?trainerId=${encodeURIComponent(trainerId)}`)
        if (!res.ok) return
        const data = await res.json()
        if (data?.slots?.length) setSlots(data.slots)
      } catch {
        // keep defaults
      } finally {
        setHydrating(false)
      }
    })()
  }, [])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/trainer/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots, timezone: 'Asia/Karachi' }),
    })
    if (res.ok) toast.success('Availability saved!')
    else toast.error('Failed to save')
    setSaving(false)
  }

  return (
    <div className="space-y-4 max-w-xl" data-testid="availability-form">
      <div>
        <h2 className="text-xl font-black text-foreground">Set Your Availability</h2>
        <p className="text-muted-foreground text-sm mt-1">Clients will see these hours when booking sessions</p>
      </div>
      <div className={`tile space-y-3 ${hydrating ? 'opacity-70' : ''}`}>
        {slots.map((slot, i) => (
          <div
            key={slot.dayOfWeek}
            className="flex items-center gap-4 py-2 border-b border-border last:border-0 flex-wrap gap-y-2"
          >
            <div className="w-28 flex-shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSlots((s) =>
                    s.map((sl, idx) => (idx === i ? { ...sl, isAvailable: !sl.isAvailable } : sl)),
                  )
                }
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${slot.isAvailable ? 'bg-primary' : 'bg-white/10'}`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${slot.isAvailable ? 'right-0.5' : 'left-0.5'}`}
                />
              </button>
              <span className={`text-sm font-medium ${slot.isAvailable ? 'text-foreground' : 'text-muted-foreground'}`}>
                {DAYS[i]}
              </span>
            </div>
            {slot.isAvailable && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  data-testid="availability-time-input"
                  value={slot.startTime}
                  onChange={(e) =>
                    setSlots((s) => s.map((sl, idx) => (idx === i ? { ...sl, startTime: e.target.value } : sl)))
                  }
                  className="bg-card border border-border rounded-lg px-3 py-1.5 text-foreground text-sm outline-none focus:border-primary"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <input
                  type="time"
                  data-testid="availability-time-input"
                  value={slot.endTime}
                  onChange={(e) =>
                    setSlots((s) => s.map((sl, idx) => (idx === i ? { ...sl, endTime: e.target.value } : sl)))
                  }
                  className="bg-card border border-border rounded-lg px-3 py-1.5 text-foreground text-sm outline-none focus:border-primary"
                />
              </div>
            )}
            {!slot.isAvailable && <span className="text-xs text-muted-foreground italic">Not available</span>}
          </div>
        ))}
      </div>
      <button
        type="button"
        data-testid="availability-save"
        onClick={save}
        disabled={saving || hydrating}
        className="btn-accent w-full py-3 text-sm font-bold disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Availability'}
      </button>
    </div>
  )
}
