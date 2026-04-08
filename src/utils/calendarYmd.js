/**
 * Calendar YYYY-MM-DD in a fixed IANA zone (product: IST for meeting dates).
 * Avoids Date#toISOString() which uses UTC and can shift the calendar day.
 */
export function calendarYmdInTimeZone (date, timeZone = 'Asia/Kolkata') {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
  } catch (e) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
}
