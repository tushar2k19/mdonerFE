import {
  ymdFromDate,
  parseYmdToLocalStart,
  taskReviewDayMs,
  getPresetBoundsMs,
  boundsFromCustomYmd,
  taskMatchesReviewDateFilter,
  isDateFilterActive,
  presetKeyToYmdRange,
  countTasksMatchingDateFilter
} from '@/utils/tentativeReviewDateFilter'

describe('tentativeReviewDateFilter', () => {
  const ref = new Date(2026, 3, 5) // Apr 5 2026 local

  it('ymdFromDate formats local calendar day', () => {
    expect(ymdFromDate(new Date(2026, 0, 7))).toBe('2026-01-07')
  })

  it('boundsFromCustomYmd returns null when neither bound', () => {
    expect(boundsFromCustomYmd('', '')).toBe(null)
  })

  it('boundsFromCustomYmd inclusive range and swaps reversed order', () => {
    const b = boundsFromCustomYmd('2026-04-10', '2026-04-01')
    expect(b.fromMs).toBe(parseYmdToLocalStart('2026-04-01').getTime())
    expect(b.toMs).toBe(parseYmdToLocalStart('2026-04-10').getTime())
  })

  it('boundsFromCustomYmd from-only and to-only', () => {
    const fromOnly = boundsFromCustomYmd('2026-04-01', '')
    expect(fromOnly.fromMs).toBe(parseYmdToLocalStart('2026-04-01').getTime())
    expect(fromOnly.toMs).toBe(null)
    const toOnly = boundsFromCustomYmd('', '2026-04-30')
    expect(toOnly.fromMs).toBe(null)
    expect(toOnly.toMs).toBe(parseYmdToLocalStart('2026-04-30').getTime())
  })

  it('taskMatchesReviewDateFilter preset last7', () => {
    const ctx = { mode: 'preset', presetKey: 'last7', fromYmd: '', toYmd: '' }
    const t0 = { review_date: '2026-03-29' } // before window starting Mar 30 when ref is Apr 5
    const t1 = { review_date: '2026-04-04' }
    expect(taskMatchesReviewDateFilter(t0, ctx, ref)).toBe(false)
    expect(taskMatchesReviewDateFilter(t1, ctx, ref)).toBe(true)
  })

  it('taskMatchesReviewDateFilter range mode both bounds', () => {
    const ctx = { mode: 'range', presetKey: '', fromYmd: '2026-04-01', toYmd: '2026-04-03' }
    const a = { review_date: '2026-03-31' }
    const b = { review_date: '2026-04-02' }
    const c = { review_date: '2026-04-04' }
    expect(taskMatchesReviewDateFilter(a, ctx, ref)).toBe(false)
    expect(taskMatchesReviewDateFilter(b, ctx, ref)).toBe(true)
    expect(taskMatchesReviewDateFilter(c, ctx, ref)).toBe(false)
  })

  it('taskMatchesReviewDateFilter range mode open-ended', () => {
    const fromCtx = { mode: 'range', presetKey: '', fromYmd: '2026-04-10', toYmd: '' }
    const toCtx = { mode: 'range', presetKey: '', fromYmd: '', toYmd: '2026-04-10' }
    expect(taskMatchesReviewDateFilter({ review_date: '2026-04-09' }, fromCtx, ref)).toBe(false)
    expect(taskMatchesReviewDateFilter({ review_date: '2026-04-10' }, fromCtx, ref)).toBe(true)
    expect(taskMatchesReviewDateFilter({ review_date: '2026-04-11' }, toCtx, ref)).toBe(false)
    expect(taskMatchesReviewDateFilter({ review_date: '2026-04-10' }, toCtx, ref)).toBe(true)
  })

  it('taskMatchesReviewDateFilter excludes missing review_date when filter active', () => {
    const ctx = { mode: 'preset', presetKey: 'today', fromYmd: '', toYmd: '' }
    expect(taskMatchesReviewDateFilter({ review_date: null }, ctx, ref)).toBe(false)
  })

  it('taskMatchesReviewDateFilter range with no bounds is unconstrained', () => {
    const ctx = { mode: 'range', presetKey: '', fromYmd: '', toYmd: '' }
    expect(taskMatchesReviewDateFilter({ review_date: null }, ctx, ref)).toBe(true)
  })

  it('isDateFilterActive is false for range with empty bounds', () => {
    expect(isDateFilterActive({ mode: 'range', presetKey: '', fromYmd: '', toYmd: '' })).toBe(false)
    expect(isDateFilterActive({ mode: 'range', presetKey: '', fromYmd: '2026-01-01', toYmd: '' })).toBe(true)
  })

  it('presetKeyToYmdRange matches getPresetBoundsMs', () => {
    const { fromYmd, toYmd } = presetKeyToYmdRange('tomorrow', ref)
    const b = getPresetBoundsMs('tomorrow', ref)
    expect(fromYmd).toBe(ymdFromDate(new Date(b.fromMs)))
    expect(toYmd).toBe(ymdFromDate(new Date(b.toMs)))
  })

  it('countTasksMatchingDateFilter', () => {
    const tasks = [
      { id: 1, review_date: '2026-04-05' },
      { id: 2, review_date: '2026-04-06' }
    ]
    const ctx = { mode: 'preset', presetKey: 'today', fromYmd: '', toYmd: '' }
    expect(countTasksMatchingDateFilter(tasks, ctx, ref)).toBe(1)
  })

  it('taskReviewDayMs normalizes to local midnight', () => {
    const ms = taskReviewDayMs({ review_date: '2026-06-15T18:00:00.000Z' })
    const d = new Date(ms)
    expect(d.getHours()).toBe(0)
  })
})
