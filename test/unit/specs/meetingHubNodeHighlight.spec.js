import {
  meetingHubHighlightClass,
  MEETING_HUB_HIGHLIGHT,
  MEETING_HUB_HIGHLIGHT_CLASSES
} from '@/utils/meetingHubNodeHighlight'

describe('meetingHubNodeHighlight', () => {
  it('maps assign/comment to R/G/B like Review hub', () => {
    expect(meetingHubHighlightClass(true, false)).toBe(MEETING_HUB_HIGHLIGHT.RED)
    expect(meetingHubHighlightClass(true, true)).toBe(MEETING_HUB_HIGHLIGHT.GREEN)
    expect(meetingHubHighlightClass(false, true)).toBe(MEETING_HUB_HIGHLIGHT.BLUE)
    expect(meetingHubHighlightClass(false, false)).toBe(null)
  })

  it('exports three distinct classes', () => {
    expect(MEETING_HUB_HIGHLIGHT_CLASSES).toHaveLength(3)
    expect(new Set(MEETING_HUB_HIGHLIGHT_CLASSES).size).toBe(3)
  })
})
