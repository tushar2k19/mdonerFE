/**
 * Meeting-centric dashboard UI routing (nav + /new-* paths).
 *
 * Backend `FEATURE_MEETING_DASHBOARD` / `meeting_dashboard_enabled` remains
 * authoritative for `/meeting_dashboard/*` — this module only affects which
 * Vue routes and header links are used.
 */

const STORAGE_KEY = 'meeting_dashboard_ui'

export function getBuildDefaultMeetingUi () {
  return process.env.FEATURE_MEETING_DASHBOARD === 'true'
}

export function getStoredMeetingUiOverride () {
  if (typeof localStorage === 'undefined') return null
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'on') return true
  if (v === 'off') return false
  return null
}

export function setStoredMeetingUiOverride (enabled) {
  localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
}

export function clearStoredMeetingUiOverride () {
  localStorage.removeItem(STORAGE_KEY)
}

export function isMeetingDashboardUiEnabled () {
  const o = getStoredMeetingUiOverride()
  if (o !== null) return o
  return getBuildDefaultMeetingUi()
}

export function isWebpackDevelopment () {
  return process.env.NODE_ENV === 'development'
}
