import { useCallback, useRef } from 'react'

// Lets only one run of a task happen at a time. A second call made while the first is still running
// is ignored. State-based "saving" flags cannot do this: two submits fired in the same instant both
// read the old value before React re-renders.
export function useSingleFlight() {
  const running = useRef(false)

  return useCallback(async (task) => {
    if (running.current) return undefined
    running.current = true
    try {
      return await task()
    } finally {
      running.current = false
    }
  }, [])
}
