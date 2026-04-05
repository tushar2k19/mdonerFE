/**
 * Pack highlight navigator: collect tinted .action-node targets in document order.
 * Must match applyEditorOverlays / applyMeetingPackDomAugmentation hub classes.
 */

import { PACK_HIGHLIGHT_MODE, packModeToHubClass } from '@/utils/meetingPackHighlightFilter'
import { MEETING_HUB_HIGHLIGHT } from '@/utils/meetingHubNodeHighlight'

const PREFIX = '.action-content-cell .action-node'

function selectorForPackHighlightMode (mode) {
  if (mode === PACK_HIGHLIGHT_MODE.ALL) {
    return [
      `${PREFIX}.${MEETING_HUB_HIGHLIGHT.RED}`,
      `${PREFIX}.${MEETING_HUB_HIGHLIGHT.GREEN}`,
      `${PREFIX}.${MEETING_HUB_HIGHLIGHT.BLUE}`
    ].join(', ')
  }
  const hub = packModeToHubClass(mode)
  if (!hub) return null
  return `${PREFIX}.${hub}`
}

/**
 * @param {HTMLElement|null|undefined} rootEl
 * @param {string} mode packHighlightMode value
 * @returns {{ taskId: string, stableId: string }[]}
 */
export function buildPackHighlightNavTargets (rootEl, mode) {
  if (!rootEl || !rootEl.querySelectorAll) return []
  if (mode === PACK_HIGHLIGHT_MODE.OFF) return []

  const sel = selectorForPackHighlightMode(mode)
  if (!sel) return []

  const out = []
  rootEl.querySelectorAll(sel).forEach((el) => {
    const sid = el.getAttribute('data-stable-node-id')
    if (!sid) return
    const row = el.closest('[data-task-id]')
    const tid = row && row.getAttribute('data-task-id')
    if (!tid) return
    out.push({ taskId: String(tid), stableId: String(sid) })
  })
  return out
}

/**
 * @param {HTMLElement|null|undefined} rootEl
 */
export function stripPackHighlightNavFocusClass (rootEl) {
  if (!rootEl || !rootEl.querySelectorAll) return
  rootEl.querySelectorAll('.action-node.pack-highlight-nav-focus').forEach((el) => {
    el.classList.remove('pack-highlight-nav-focus')
  })
}
