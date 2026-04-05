import { reviewerScopedHubClass } from '@/utils/meetingReviewerNodeHighlight'
import { MEETING_HUB_HIGHLIGHT } from '@/utils/meetingHubNodeHighlight'

describe('meetingReviewerNodeHighlight', () => {
  const sel = 42

  it('returns null when no reviewer selected', () => {
    expect(reviewerScopedHubClass({ assignment_users: [{ id: 42 }], comment_count: 0 }, '')).toBeNull()
  })

  it('red: assigned to reviewer, no comments', () => {
    const o = { assignment_users: [{ id: sel, name: 'A' }], comment_count: 0, comment_user_ids: [] }
    expect(reviewerScopedHubClass(o, sel)).toBe(MEETING_HUB_HIGHLIGHT.RED)
  })

  it('green: assigned to reviewer with comments', () => {
    const o = {
      assignment_users: [{ id: sel, name: 'A' }],
      comment_count: 2,
      comment_user_ids: [sel, 99]
    }
    expect(reviewerScopedHubClass(o, sel)).toBe(MEETING_HUB_HIGHLIGHT.GREEN)
  })

  it('blue: no pack assignees, reviewer commented', () => {
    const o = {
      assignment_users: [],
      comment_count: 1,
      comment_user_ids: [sel]
    }
    expect(reviewerScopedHubClass(o, sel)).toBe(MEETING_HUB_HIGHLIGHT.BLUE)
  })

  it('null: assigned to someone else only (reviewer commented but node is assigned)', () => {
    const o = {
      assignment_users: [{ id: 7, name: 'Other' }],
      comment_count: 1,
      comment_user_ids: [sel]
    }
    expect(reviewerScopedHubClass(o, sel)).toBeNull()
  })
})
