import { useState, useEffect } from 'react'

export function useLog(runId: string, label: string | null, intervalMs = 3000) {
  const [log, setLog] = useState<string>('')

  useEffect(() => {
    if (!label) { setLog(''); return }

    let active = true
    async function fetchLog() {
      try {
        const res = await fetch(`/api/runs/${runId}/logs/${label}?tail=200`)
        if (!res.ok) return
        const text = await res.text()
        if (active) setLog(text)
      } catch { /* ignore */ }
    }
    fetchLog()
    const id = setInterval(fetchLog, intervalMs)
    return () => { active = false; clearInterval(id) }
  }, [runId, label, intervalMs])

  return log
}
