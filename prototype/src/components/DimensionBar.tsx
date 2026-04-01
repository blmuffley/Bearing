import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { scoreColor } from '../theme'

interface DimensionBarProps {
  scores: Array<{ dimension: string; score: number; weight: number }>
}

export function DimensionBar({ scores }: DimensionBarProps) {
  const data = scores.map(s => ({
    name: s.dimension.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    score: s.score,
    weight: `${(s.weight * 100).toFixed(0)}%`,
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
        <YAxis type="category" dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} width={100} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={scoreColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
