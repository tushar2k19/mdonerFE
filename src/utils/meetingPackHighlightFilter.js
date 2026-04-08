/**
 * Pack highlight filter: task list + per-node hub tint (Tentative/Final meeting dashboards).
 * Parity with meetingHubHighlightClass: red / green / blue.
 */

import {
  meetingHubHighlightClass,
  MEETING_HUB_HIGHLIGHT
} from '@/utils/meetingHubNodeHighlight'

export const PACK_HIGHLIGHT_MODE = {
  OFF: 'off',
  ALL: 'all',
  RED: 'red',
  GREEN: 'green',
  BLUE: 'blue'
}

export const PACK_HIGHLIGHT_OPTIONS = [
  { value: PACK_HIGHLIGHT_MODE.OFF, label: 'Off (no pack colors)' },
  { value: PACK_HIGHLIGHT_MODE.ALL, label: 'All (assigned / comments)' },
  { value: PACK_HIGHLIGHT_MODE.RED, label: 'Assigned, no comments (red)' },
  { value: PACK_HIGHLIGHT_MODE.GREEN, label: 'Assigned + commented (green)' },
  { value: PACK_HIGHLIGHT_MODE.BLUE, label: 'Not assigned, commented (blue)' }
]

/**
 * Consultant-facing labels for filter UI (same values as PACK_HIGHLIGHT_MODE).
 * `accent` is consumed by FilterPrettySelect for color cues (not sent to API).
 */
export const FOLLOW_UP_STATUS_FILTER_OPTIONS = [
  { value: PACK_HIGHLIGHT_MODE.OFF, label: 'OFF', accent: null },
  { value: PACK_HIGHLIGHT_MODE.ALL, label: 'ALL', accent: 'triple' },
  { value: PACK_HIGHLIGHT_MODE.RED, label: 'No reply yet', accent: 'red' },
  { value: PACK_HIGHLIGHT_MODE.GREEN, label: 'Replied (assigned)', accent: 'green' },
  { value: PACK_HIGHLIGHT_MODE.BLUE, label: 'Replied (not assigned)', accent: 'blue' }
]

export function packModeToHubClass (mode) {
  switch (mode) {
    case PACK_HIGHLIGHT_MODE.RED:
      return MEETING_HUB_HIGHLIGHT.RED
    case PACK_HIGHLIGHT_MODE.GREEN:
      return MEETING_HUB_HIGHLIGHT.GREEN
    case PACK_HIGHLIGHT_MODE.BLUE:
      return MEETING_HUB_HIGHLIGHT.BLUE
    default:
      return null
  }
}

export function overlayEntryHubClass (o) {
  if (!o) return null
  const hasA = o.assignment_users && o.assignment_users.length
  const hasC = (o.comment_count || 0) > 0
  return meetingHubHighlightClass(!!hasA, !!hasC)
}

/**
 * @param {string} [html]
 * @returns {string[]}
 */
export function extractStableNodeIdsFromActionHtml (html) {
  if (!html || typeof html !== 'string') return []
  const re = /data-stable-node-id="([^"]+)"/g
  const out = []
  let m
  while ((m = re.exec(html)) !== null) {
    if (m[1]) out.push(m[1])
  }
  return out
}

/**
 * @param {object} task
 * @param {Record<string, object>} editorOverlay
 * @param {string} mode one of PACK_HIGHLIGHT_MODE
 */
export function taskMatchesPackHighlightMode (task, editorOverlay, mode) {
  if (mode === PACK_HIGHLIGHT_MODE.OFF || mode === PACK_HIGHLIGHT_MODE.ALL) return true
  const target = packModeToHubClass(mode)
  if (!target) return true
  const map = editorOverlay || {}
  const ids = extractStableNodeIdsFromActionHtml(task && task.action_to_be_taken)
  for (let i = 0; i < ids.length; i++) {
    const hub = overlayEntryHubClass(map[ids[i]])
    if (hub === target) return true
  }
  return false
}

export function packHighlightRestrictsTaskList (mode) {
  return (
    mode === PACK_HIGHLIGHT_MODE.RED ||
    mode === PACK_HIGHLIGHT_MODE.GREEN ||
    mode === PACK_HIGHLIGHT_MODE.BLUE
  )
}

export function packHighlightShowsHubColors (mode) {
  return mode !== PACK_HIGHLIGHT_MODE.OFF
}

/**
 * Whether a node should receive meeting-hub-* row tint for the given pack mode.
 * Mirrors NewTentativeDashboard.applyEditorOverlays (dashboard + modal parity).
 *
 * @param {string} mode pack highlight mode (PACK_HIGHLIGHT_MODE.*)
 * @param {string|null} hubClass meeting-hub-red|green|blue or null
 * @returns {boolean}
 */
export function shouldApplyMeetingHubTint (mode, hubClass) {
  if (!hubClass) return false
  if (!packHighlightShowsHubColors(mode)) return false
  const restrict = packHighlightRestrictsTaskList(mode)
  const targetClass = packModeToHubClass(mode)
  if (!restrict) return true
  return hubClass === targetClass
}
