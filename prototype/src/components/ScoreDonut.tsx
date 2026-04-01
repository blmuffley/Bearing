import { PieChart, Pie, Cell } from 'recharts'
import { scoreColor, gradeLabel } from '../theme'

interface ScoreDonutProps {
  score: number
  size?: number
}

export function ScoreDonut({ score, size = 200 }: ScoreDonutProps) {
  const data = [
    { value: score },
    { value: 100 - score },
  ]
  const color = scoreColor(score)

  return (
    <div className="relative inline-flex items-center justify-center">
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          innerRadius={size * 0.32}
          outerRadius={size * 0.44}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          stroke="none"
        >
          <Cell fill={color} />
          <Cell fill="var(--color-bg-tertiary)" />
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading font-bold" style={{ fontSize: size * 0.2, color }}>
          {score}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Grade: {gradeLabel(score)}
        </span>
      </div>
    </div>
  )
}
