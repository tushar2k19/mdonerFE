/**
 * Shared helpers for meeting-dashboard (new flow) unit tests.
 */

export function ymdDaysFromNow (days) {
  const d = new Date()
  d.setDate(d.getDate() + Number(days))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isYmdOnOrAfterToday (ymd) {
  const [yy, mm, dd] = String(ymd).split('-').map(Number)
  const target = new Date(yy, mm - 1, dd)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return target.getTime() >= today.getTime()
}

export function setEditorUserCookie () {
  const payload = JSON.stringify({
    role: 'editor',
    id: 1,
    first_name: 'Ed',
    last_name: 'Itor'
  })
  document.cookie = `user_info=${encodeURIComponent(payload)}; path=/`
}

export function clearCookies () {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim()
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })
}

export function flushPromises () {
  return new Promise((resolve) => setImmediate(resolve))
}
