import { PieChart, Pie, Cell } from 'recharts'
import { scoreColor, gradeLabel } from '../theme'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

interface ScoreDonutProps {
  score: number
  size?: number
}

export function ScoreDonut({ score, size = 200 }: ScoreDonutProps) {
  const animatedScore = useAnimatedNumber(score, 800)
  const data = [
    { value: animatedScore },
    { value: 100 - animatedScore },
  ]
  const color = scoreColor(animatedScore)

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
          isAnimationActive={false}
        >
          <Cell fill={color} />
          <Cell fill="var(--color-bg-tertiary)" />
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading font-bold" style={{ fontSize: size * 0.2, color }}>
          {animatedScore}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          Grade: {gradeLabel(animatedScore)}
        </span>
      </div>
    </div>
  )
}
