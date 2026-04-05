/**
 * Client-side review_date filtering for New Tentative dashboard (local calendar days).
 * @param {Date} [referenceDate] — anchor for presets (defaults to now); inject in tests.
 */

const MS_DAY = 86400000

export function ymdFromDate (d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfLocalDay (d) {
  const x = new Date(d)
  if (Number.isNaN(x.getTime())) return null
  x.setHours(0, 0, 0, 0)
  return x
}

export function parseYmdToLocalStart (ymd) {
  if (!ymd || typeof ymd !== 'string') return null
  const parts = ymd.split('-').map(Number)
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return null
  const [y, m, d] = parts
  const dt = new Date(y, m - 1, d)
  dt.setHours(0, 0, 0, 0)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return dt
}

export function taskReviewDayMs (task) {
  if (!task || task.review_date == null || task.review_date === '') return null
  const t = new Date(task.review_date)
  if (Number.isNaN(t.getTime())) return null
  t.setHours(0, 0, 0, 0)
  return t.getTime()
}

/**
 * @returns {{ fromMs: number, toMs: number } | null}
 */
export function getPresetBoundsMs (presetKey, referenceDate = new Date()) {
  const today = startOfLocalDay(referenceDate)
  if (!today) return null
  const t0 = today.getTime()
  switch (presetKey) {
    case 'today':
      return { fromMs: t0, toMs: t0 }
    case 'yesterday':
      return { fromMs: t0 - MS_DAY, toMs: t0 - MS_DAY }
    case 'tomorrow':
      return { fromMs: t0 + MS_DAY, toMs: t0 + MS_DAY }
    case 'last7':
      return { fromMs: t0 - 6 * MS_DAY, toMs: t0 }
    case 'last30':
      return { fromMs: t0 - 29 * MS_DAY, toMs: t0 }
    default:
      return null
  }
}

export function presetKeyToYmdRange (presetKey, referenceDate = new Date()) {
  const b = getPresetBoundsMs(presetKey, referenceDate)
  if (!b) return { fromYmd: '', toYmd: '' }
  return {
    fromYmd: ymdFromDate(new Date(b.fromMs)),
    toYmd: ymdFromDate(new Date(b.toMs))
  }
}

/**
 * Open-ended allowed: from only, to only, both (inclusive); swap if to < from.
 * @returns {{ fromMs: number|null, toMs: number|null } | null} null = no bounds (no filter)
 */
export function boundsFromCustomYmd (fromYmd, toYmd) {
  const fromD = fromYmd ? parseYmdToLocalStart(fromYmd) : null
  const toD = toYmd ? parseYmdToLocalStart(toYmd) : null
  if (!fromD && !toD) return null
  let fromMs = fromD ? fromD.getTime() : null
  let toMs = toD ? toD.getTime() : null
  if (fromMs != null && toMs != null && toMs < fromMs) {
    const tmp = fromMs
    fromMs = toMs
    toMs = tmp
  }
  return { fromMs, toMs }
}

export function ymdPairToDateRange (fromYmd, toYmd) {
  const fromD = fromYmd ? parseYmdToLocalStart(fromYmd) : null
  const toD = toYmd ? parseYmdToLocalStart(toYmd) : null
  if (!fromD || !toD) return null
  return { start: fromD, end: toD }
}

/**
 * @typedef {{ mode: 'all'|'preset'|'range', presetKey: string, fromYmd: string, toYmd: string }} ReviewDateFilterContext
 */

export function isDateFilterActive (ctx) {
  if (!ctx || ctx.mode === 'all') return false
  if (ctx.mode === 'preset') return true
  if (ctx.mode === 'range') return !!(ctx.fromYmd || ctx.toYmd)
  return false
}

/**
 * @param {object} task
 * @param {ReviewDateFilterContext} ctx
 * @param {Date} [referenceDate]
 */
export function taskMatchesReviewDateFilter (task, ctx, referenceDate = new Date()) {
  if (!ctx || ctx.mode === 'all') return true

  let fromMs
  let toMs

  if (ctx.mode === 'preset') {
    const b = getPresetBoundsMs(ctx.presetKey, referenceDate)
    if (!b) return true
    fromMs = b.fromMs
    toMs = b.toMs
  } else {
    const b = boundsFromCustomYmd(ctx.fromYmd, ctx.toYmd)
    if (!b) return true
    fromMs = b.fromMs
    toMs = b.toMs
  }

  const taskMs = taskReviewDayMs(task)
  if (taskMs == null) return false
  if (fromMs != null && taskMs < fromMs) return false
  if (toMs != null && taskMs > toMs) return false
  return true
}

export function countTasksMatchingDateFilter (tasks, ctx, referenceDate = new Date()) {
  const list = Array.isArray(tasks) ? tasks : []
  if (!isDateFilterActive(ctx)) return list.length
  return list.filter(t => taskMatchesReviewDateFilter(t, ctx, referenceDate)).length
}
