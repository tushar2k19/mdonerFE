/**
 * Final-dashboard only: when a reviewer is selected in the filter, hub tints are scoped to
 * that user with R/G/B semantics:
 * - Red: assigned to reviewer, no comments on the node
 * - Green: assigned to reviewer, node has comments
 * - Blue: no pack assignees, but this reviewer authored a comment on the node
 */

import { MEETING_HUB_HIGHLIGHT } from '@/utils/meetingHubNodeHighlight'

/**
 * @param {object|null|undefined} o overlay node entry
 * @param {string|number|null|undefined} reviewerUserId
 * @returns {string|null} meeting-hub-* class or null (no tint for this reviewer / not in focus)
 */
export function reviewerScopedHubClass (o, reviewerUserId) {
  if (o == null || reviewerUserId === '' || reviewerUserId == null) return null
  const want = Number(reviewerUserId)
  if (!Number.isFinite(want)) return null

  const users = Array.isArray(o.assignment_users) ? o.assignment_users : []
  const assignedToSel = users.some((u) => u && Number(u.id) === want)
  const noAssignees = users.length === 0
  const commentIds = Array.isArray(o.comment_user_ids)
    ? o.comment_user_ids.map((id) => Number(id))
    : []
  const commentedBySel = commentIds.includes(want)

  const inReviewerFocus = assignedToSel || (noAssignees && commentedBySel)
  if (!inReviewerFocus) return null

  const hasComments = (o.comment_count || 0) > 0
  if (assignedToSel && !hasComments) return MEETING_HUB_HIGHLIGHT.RED
  if (assignedToSel && hasComments) return MEETING_HUB_HIGHLIGHT.GREEN
  if (!assignedToSel && noAssignees && commentedBySel) return MEETING_HUB_HIGHLIGHT.BLUE
  return null
}
