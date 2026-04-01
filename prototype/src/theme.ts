/** Avennorth theme tokens for charts and components. */

export const colors = {
  obsidian: '#1C1917',
  lime: '#39FF14',
  limeMuted: 'rgba(57, 255, 20, 0.25)',
  bgPrimary: '#0A0A0A',
  bgSecondary: '#1C1917',
  bgTertiary: '#292524',
  textPrimary: '#FAFAF9',
  textSecondary: '#A8A29E',
  textTertiary: '#78716C',
  border: '#44403C',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
}

export const scoreColor = (score: number): string => {
  if (score >= 75) return colors.success
  if (score >= 40) return colors.warning
  return colors.danger
}

export const severityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return colors.danger
    case 'high': return colors.warning
    case 'medium': return '#EAB308'
    case 'low': return colors.info
    default: return colors.textTertiary
  }
}

export const gradeLabel = (score: number): string => {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}
