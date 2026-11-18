'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartTheme } from '@/lib/chart-theme'

export function WeightProgressChart({ data }: { data: Array<{ date: string; weight?: number }> }) {
  return <ResponsiveContainer width="100%" height={220}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
      <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={12} />
      <YAxis stroke={chartTheme.axis} fontSize={12} />
      <Tooltip contentStyle={{ background: chartTheme.tooltip.background, border: `1px solid ${chartTheme.tooltip.border}`, borderRadius: chartTheme.tooltip.borderRadius }} />
      <Line type="monotone" dataKey="weight" stroke={chartTheme.primary} strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
}
