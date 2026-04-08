import { calendarYmdInTimeZone } from '@/utils/calendarYmd'

describe('calendarYmdInTimeZone', () => {
  it('uses IST calendar day (not UTC) for late UTC evening', () => {
    // 2026-04-06 18:30 UTC = 2026-04-07 00:00 IST
    const d = new Date('2026-04-06T18:30:00.000Z')
    expect(calendarYmdInTimeZone(d, 'Asia/Kolkata')).toBe('2026-04-07')
  })

  it('returns empty for invalid date', () => {
    expect(calendarYmdInTimeZone(new Date('x'), 'Asia/Kolkata')).toBe('')
  })
})
