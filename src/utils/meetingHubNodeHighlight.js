/**
 * Pack node row tint on New Tentative / New Final (parity with NewTaskReviewHub R/G/B).
 * Assigned + commented → green; assigned, no comments → red; unassigned + comments → blue.
 */

export const MEETING_HUB_HIGHLIGHT = {
  RED: 'meeting-hub-red',
  GREEN: 'meeting-hub-green',
  BLUE: 'meeting-hub-blue'
}

export const MEETING_HUB_HIGHLIGHT_CLASSES = [
  MEETING_HUB_HIGHLIGHT.RED,
  MEETING_HUB_HIGHLIGHT.GREEN,
  MEETING_HUB_HIGHLIGHT.BLUE
]

/**
 * @param {boolean} hasAssign
 * @param {boolean} hasComment
 * @returns {string|null} one of meeting-hub-* or null when neither assign nor comment
 */
export function meetingHubHighlightClass (hasAssign, hasComment) {
  if (hasAssign && hasComment) return MEETING_HUB_HIGHLIGHT.GREEN
  if (hasAssign && !hasComment) return MEETING_HUB_HIGHLIGHT.RED
  if (!hasAssign && hasComment) return MEETING_HUB_HIGHLIGHT.BLUE
  return null
}
