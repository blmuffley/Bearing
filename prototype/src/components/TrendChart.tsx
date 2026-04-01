import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { colors } from '../theme'

interface TrendPoint {
  label: string
  score: number
}

interface TrendChartProps {
  data: TrendPoint[]
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="label" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        />
        <Line type="monotone" dataKey="score" stroke={colors.lime} strokeWidth={2} dot={{ fill: colors.lime, r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
