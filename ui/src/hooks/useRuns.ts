import { useState, useEffect } from 'react'
import type { ApiResponse } from '../types'

export function useRuns(intervalMs = 5000) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function fetchRuns() {
      try {
        const res = await fetch('/api/runs')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (active) { setData(json); setError(null) }
      } catch (err: any) {
        if (active) setError(err.message)
      }
    }
    fetchRuns()
    const id = setInterval(fetchRuns, intervalMs)
    return () => { active = false; clearInterval(id) }
  }, [intervalMs])

  return { data, error }
}