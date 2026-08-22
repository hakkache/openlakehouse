// Friendly cron builder/description helpers shared by the Pipeline Builder's
// schedule picker and the Jobs page's Scheduled Pipelines table.

export type ScheduleMode = 'off' | 'every15' | 'hourly' | 'daily' | 'weekly' | 'custom'

export const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const pad = (n: number) => n.toString().padStart(2, '0')

export function buildCron(mode: ScheduleMode, minute: number, time: string, day: number): string {
  const [hh, mm] = time.split(':').map((v) => parseInt(v, 10) || 0)
  switch (mode) {
    case 'every15':
      return '*/15 * * * *'
    case 'hourly':
      return `${minute} * * * *`
    case 'daily':
      return `${mm} ${hh} * * *`
    case 'weekly':
      return `${mm} ${hh} * * ${day}`
    default:
      return ''
  }
}

export interface DetectedSchedule {
  mode: ScheduleMode
  minute: number
  time: string
  day: number
}

/** Best-effort reverse mapping from a saved cron string back to the friendly picker's fields. */
export function detectSchedule(cron: string): DetectedSchedule {
  const fallback: DetectedSchedule = { mode: 'off', minute: 0, time: '03:00', day: 1 }
  if (!cron || !cron.trim()) return fallback
  if (cron === '*/15 * * * *') return { mode: 'every15', minute: 0, time: '03:00', day: 1 }

  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return { ...fallback, mode: 'custom' }
  const [min, hour, dom, month, dow] = parts

  if (hour === '*' && dom === '*' && month === '*' && dow === '*' && /^\d+$/.test(min)) {
    return { mode: 'hourly', minute: parseInt(min, 10), time: '03:00', day: 1 }
  }
  if (dom === '*' && month === '*' && dow === '*' && /^\d+$/.test(hour) && /^\d+$/.test(min)) {
    return { mode: 'daily', minute: 0, time: `${pad(parseInt(hour, 10))}:${pad(parseInt(min, 10))}`, day: 1 }
  }
  if (dom === '*' && month === '*' && /^[0-6]$/.test(dow) && /^\d+$/.test(hour) && /^\d+$/.test(min)) {
    return {
      mode: 'weekly',
      minute: 0,
      time: `${pad(parseInt(hour, 10))}:${pad(parseInt(min, 10))}`,
      day: parseInt(dow, 10),
    }
  }
  return { ...fallback, mode: 'custom' }
}

/** Human-readable one-liner describing what a cron string does, for display next to the picker. */
export function describeCron(cron: string): string {
  if (!cron || !cron.trim()) return 'No schedule — runs only when triggered manually.'
  if (cron === '*/15 * * * *') return 'Runs every 15 minutes.'

  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return `Custom schedule: ${cron}`
  const [min, hour, dom, month, dow] = parts

  if (hour === '*' && dom === '*' && month === '*' && dow === '*' && /^\d+$/.test(min)) {
    return `Runs every hour, at minute ${min}.`
  }
  if (dom === '*' && month === '*' && dow === '*' && /^\d+$/.test(hour) && /^\d+$/.test(min)) {
    return `Runs daily at ${pad(parseInt(hour, 10))}:${pad(parseInt(min, 10))} UTC.`
  }
  if (dom === '*' && month === '*' && /^[0-6]$/.test(dow) && /^\d+$/.test(hour) && /^\d+$/.test(min)) {
    return `Runs weekly on ${WEEKDAYS[parseInt(dow, 10)].label} at ${pad(parseInt(hour, 10))}:${pad(parseInt(min, 10))} UTC.`
  }
  return `Custom schedule: ${cron}`
}
