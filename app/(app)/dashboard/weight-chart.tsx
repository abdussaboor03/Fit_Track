'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type WeightPoint = { date: string; label: string; weight: number }

export function WeightChart({
  data,
  unit,
}: {
  data: WeightPoint[]
  unit: 'kg' | 'lb'
}) {
  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Log your weight for a couple of days to see your trend.
      </p>
    )
  }

  const weights = data.map((d) => d.weight)
  const min = Math.floor(Math.min(...weights) - 1)
  const max = Math.ceil(Math.max(...weights) + 1)

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#23262f" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#8a8f9c', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#23262f' }}
            minTickGap={24}
          />
          <YAxis
            domain={[min, max]}
            tick={{ fill: '#8a8f9c', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: '#101218',
              border: '1px solid #23262f',
              borderRadius: 12,
              color: '#f4f5f7',
              fontSize: 12,
            }}
            labelStyle={{ color: '#8a8f9c' }}
            formatter={(value: number | string) => [`${value} ${unit}`, 'Weight']}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#3d7dff"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#3d7dff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
