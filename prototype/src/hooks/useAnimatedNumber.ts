import { useState, useEffect, useRef } from 'react'

/**
 * Smoothly animates a number from its previous value to the target.
 * Returns the current display value (integer).
 */
export function useAnimatedNumber(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target)
  const prevRef = useRef(target)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    const from = prevRef.current
    const to = target
    prevRef.current = target

    if (from === to) return

    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return display
}
