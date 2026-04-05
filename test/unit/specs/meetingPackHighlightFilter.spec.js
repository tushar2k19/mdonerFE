import {
  PACK_HIGHLIGHT_MODE,
  extractStableNodeIdsFromActionHtml,
  overlayEntryHubClass,
  taskMatchesPackHighlightMode,
  packHighlightRestrictsTaskList,
  packHighlightShowsHubColors,
  shouldApplyMeetingHubTint
} from '@/utils/meetingPackHighlightFilter'
import { MEETING_HUB_HIGHLIGHT } from '@/utils/meetingHubNodeHighlight'

describe('meetingPackHighlightFilter', () => {
  const html = '<div class="action-node" data-stable-node-id="a1"></div><p data-stable-node-id="a2">'

  it('extractStableNodeIdsFromActionHtml finds all ids', () => {
    expect(extractStableNodeIdsFromActionHtml(html)).toEqual(['a1', 'a2'])
  })

  it('extractStableNodeIdsFromActionHtml empty input', () => {
    expect(extractStableNodeIdsFromActionHtml('')).toEqual([])
    expect(extractStableNodeIdsFromActionHtml(null)).toEqual([])
  })

  it('overlayEntryHubClass permutations', () => {
    expect(overlayEntryHubClass({ assignment_users: [1], comment_count: 0 })).toBe(MEETING_HUB_HIGHLIGHT.RED)
    expect(overlayEntryHubClass({ assignment_users: [1], comment_count: 2 })).toBe(MEETING_HUB_HIGHLIGHT.GREEN)
    expect(overlayEntryHubClass({ assignment_users: [], comment_count: 1 })).toBe(MEETING_HUB_HIGHLIGHT.BLUE)
    expect(overlayEntryHubClass({ assignment_users: [], comment_count: 0 })).toBe(null)
  })

  it('taskMatchesPackHighlightMode all and off always true', () => {
    const task = { action_to_be_taken: html }
    const overlay = { a1: { assignment_users: [1], comment_count: 0 } }
    expect(taskMatchesPackHighlightMode(task, overlay, PACK_HIGHLIGHT_MODE.ALL)).toBe(true)
    expect(taskMatchesPackHighlightMode(task, overlay, PACK_HIGHLIGHT_MODE.OFF)).toBe(true)
  })

  it('taskMatchesPackHighlightMode red', () => {
    const task = { action_to_be_taken: html }
    const overlay = {
      a1: { assignment_users: [1], comment_count: 0 },
      a2: { assignment_users: [1], comment_count: 3 }
    }
    expect(taskMatchesPackHighlightMode(task, overlay, PACK_HIGHLIGHT_MODE.RED)).toBe(true)
    const task2 = { action_to_be_taken: '<div data-stable-node-id="x"></div>' }
    const overlay2 = { x: { assignment_users: [1], comment_count: 1 } }
    expect(taskMatchesPackHighlightMode(task2, overlay2, PACK_HIGHLIGHT_MODE.RED)).toBe(false)
  })

  it('taskMatchesPackHighlightMode green and blue', () => {
    const t = { action_to_be_taken: '<div data-stable-node-id="n"></div>' }
    expect(taskMatchesPackHighlightMode(t, { n: { assignment_users: [1], comment_count: 1 } }, PACK_HIGHLIGHT_MODE.GREEN)).toBe(true)
    expect(taskMatchesPackHighlightMode(t, { n: { assignment_users: [], comment_count: 1 } }, PACK_HIGHLIGHT_MODE.BLUE)).toBe(true)
  })

  it('packHighlightRestrictsTaskList', () => {
    expect(packHighlightRestrictsTaskList(PACK_HIGHLIGHT_MODE.RED)).toBe(true)
    expect(packHighlightRestrictsTaskList(PACK_HIGHLIGHT_MODE.ALL)).toBe(false)
  })

  it('packHighlightShowsHubColors', () => {
    expect(packHighlightShowsHubColors(PACK_HIGHLIGHT_MODE.OFF)).toBe(false)
    expect(packHighlightShowsHubColors(PACK_HIGHLIGHT_MODE.ALL)).toBe(true)
  })

  it('shouldApplyMeetingHubTint matches dashboard/modal parity', () => {
    expect(shouldApplyMeetingHubTint(PACK_HIGHLIGHT_MODE.OFF, MEETING_HUB_HIGHLIGHT.RED)).toBe(false)
    expect(shouldApplyMeetingHubTint(PACK_HIGHLIGHT_MODE.ALL, null)).toBe(false)
    expect(shouldApplyMeetingHubTint(PACK_HIGHLIGHT_MODE.ALL, MEETING_HUB_HIGHLIGHT.RED)).toBe(true)
    expect(shouldApplyMeetingHubTint(PACK_HIGHLIGHT_MODE.ALL, MEETING_HUB_HIGHLIGHT.GREEN)).toBe(true)
    expect(shouldApplyMeetingHubTint(PACK_HIGHLIGHT_MODE.RED, MEETING_HUB_HIGHLIGHT.RED)).toBe(true)
    expect(shouldApplyMeetingHubTint(PACK_HIGHLIGHT_MODE.RED, MEETING_HUB_HIGHLIGHT.GREEN)).toBe(false)
    expect(shouldApplyMeetingHubTint(PACK_HIGHLIGHT_MODE.GREEN, MEETING_HUB_HIGHLIGHT.GREEN)).toBe(true)
    expect(shouldApplyMeetingHubTint(PACK_HIGHLIGHT_MODE.BLUE, MEETING_HUB_HIGHLIGHT.BLUE)).toBe(true)
  })
})
