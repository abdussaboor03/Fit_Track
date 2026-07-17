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
import { BODY_PARTS, BODY_PART_LABELS, type BodyPart } from '@/lib/fitness/types'

export type MeasurementPoint = {
  date: string
  label: string
} & Partial<Record<BodyPart, number>>

// One trend line per body part that has at least two data points, reusing the
// same styling as the dashboard weight chart.
export function MeasurementCharts({ data }: { data: MeasurementPoint[] }) {
  const partsWithData = BODY_PARTS.filter(
    (part) => data.filter((d) => d[part] != null).length >= 2,
  )

  if (partsWithData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Log a measurement on two or more days to see its trend.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {partsWithData.map((part) => (
        <PartChart key={part} part={part} data={data} />
      ))}
    </div>
  )
}

function PartChart({ part, data }: { part: BodyPart; data: MeasurementPoint[] }) {
  const series = data.filter((d) => d[part] != null)
  const values = series.map((d) => d[part] as number)
  const min = Math.floor(Math.min(...values) - 2)
  const max = Math.ceil(Math.max(...values) + 2)
  const latest = values.at(-1)

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {BODY_PART_LABELS[part]}
        </p>
        {latest != null && (
          <p className="text-sm text-muted">
            Latest{' '}
            <span className="font-semibold text-foreground">{latest} cm</span>
          </p>
        )}
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
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
              formatter={(value: number | string) => [
                `${value} cm`,
                BODY_PART_LABELS[part],
              ]}
            />
            <Line
              type="monotone"
              dataKey={part}
              stroke="#3d7dff"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#3d7dff' }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
