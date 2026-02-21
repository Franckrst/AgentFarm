import { useState, useEffect, useRef } from 'react'

interface HealthResponse {
  status: string
  timestamp: string
}

export function useHealth(intervalMs = 30000) {
  const [healthy, setHealthy] = useState<boolean | null>(null)
  const previousHealthy = useRef<boolean | null>(null)
  const failureCount = useRef(0)

  useEffect(() => {
    let active = true

    async function checkHealth() {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const res = await fetch('/health', { signal: controller.signal })
        clearTimeout(timeoutId)

        if (!res.ok) {
          if (active) {
            failureCount.current++
            setHealthy(false)
          }
          return
        }

        const json: HealthResponse = await res.json()
        const isHealthy = json.status === 'ok'

        if (active) {
          // Log recovery when transitioning from unhealthy to healthy
          if (isHealthy && previousHealthy.current === false) {
            console.log('[Health] Server connection recovered')
            failureCount.current = 0
          }

          previousHealthy.current = isHealthy
          setHealthy(isHealthy)
        }
      } catch {
        // Silently handle errors - no console.error to avoid noise during normal operation
        if (active) {
          failureCount.current++
          previousHealthy.current = false
          setHealthy(false)
        }
      }
    }

    // Perform initial health check on page load
    console.log('[Health] Initial health check started')
    checkHealth()

    const id = setInterval(checkHealth, intervalMs)
    return () => { active = false; clearInterval(id) }
  }, [intervalMs])

  return { healthy }
}
