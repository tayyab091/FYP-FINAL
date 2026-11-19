'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { chartTheme } from '@/lib/chart-theme'

export function WeightProgressChart({ data }: { data: Array<{ date: string; weight?: number; bodyFat?: number }> }) {
  const hasBodyFat = data.some(entry => typeof entry.bodyFat === 'number')
  return <ResponsiveContainer width="100%" height={240}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
      <XAxis dataKey="date" stroke={chartTheme.axis} fontSize={11} />
      <YAxis yAxisId="weight" stroke={chartTheme.axis} fontSize={12} unit=" kg" domain={['auto', 'auto']} />
      {hasBodyFat && <YAxis yAxisId="bodyFat" orientation="right" stroke={chartTheme.axis} fontSize={12} unit="%" domain={[0, 100]} />}
      <Tooltip contentStyle={{ background: chartTheme.tooltip.background, border: '1px solid ' + chartTheme.tooltip.border, borderRadius: chartTheme.tooltip.borderRadius }} />
      <Legend />
      <Line yAxisId="weight" type="linear" name="Weight (kg)" dataKey="weight" stroke={chartTheme.primary} strokeWidth={2} connectNulls={false} />
      {hasBodyFat && <Line yAxisId="bodyFat" type="linear" name="Body fat (%)" dataKey="bodyFat" stroke="#f59e0b" strokeWidth={2} connectNulls={false} />}
    </LineChart>
  </ResponsiveContainer>
}
