import {
  buildPackHighlightNavTargets,
  stripPackHighlightNavFocusClass
} from '@/utils/meetingPackHighlightNav'
import { PACK_HIGHLIGHT_MODE } from '@/utils/meetingPackHighlightFilter'

function fixtureTwoRows () {
  const root = document.createElement('div')
  root.innerHTML = `
    <div class="table-row" data-task-id="10">
      <div class="action-content-cell">
        <div class="action-node meeting-hub-red" data-stable-node-id="alpha">R</div>
      </div>
    </div>
    <div class="table-row" data-task-id="20">
      <div class="action-content-cell">
        <div class="action-node meeting-hub-green" data-stable-node-id="beta">G</div>
      </div>
    </div>
  `
  return root
}

describe('meetingPackHighlightNav', () => {
  it('buildPackHighlightNavTargets returns [] for OFF or missing root', () => {
    const root = fixtureTwoRows()
    expect(buildPackHighlightNavTargets(null, PACK_HIGHLIGHT_MODE.ALL)).toEqual([])
    expect(buildPackHighlightNavTargets(root, PACK_HIGHLIGHT_MODE.OFF)).toEqual([])
  })

  it('buildPackHighlightNavTargets (ALL) returns taskId and stableId in document order', () => {
    const root = fixtureTwoRows()
    expect(buildPackHighlightNavTargets(root, PACK_HIGHLIGHT_MODE.ALL)).toEqual([
      { taskId: '10', stableId: 'alpha' },
      { taskId: '20', stableId: 'beta' }
    ])
  })

  it('buildPackHighlightNavTargets filters to a single hub class for RED mode', () => {
    const root = fixtureTwoRows()
    expect(buildPackHighlightNavTargets(root, PACK_HIGHLIGHT_MODE.RED)).toEqual([
      { taskId: '10', stableId: 'alpha' }
    ])
  })

  it('buildPackHighlightNavTargets skips nodes without stable id or task row', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <div class="action-content-cell">
        <div class="action-node meeting-hub-red">x</div>
      </div>
      <div data-task-id="99">
        <div class="action-content-cell">
          <div class="action-node meeting-hub-blue" data-stable-node-id="z">z</div>
        </div>
      </div>
    `
    expect(buildPackHighlightNavTargets(root, PACK_HIGHLIGHT_MODE.ALL)).toEqual([
      { taskId: '99', stableId: 'z' }
    ])
  })

  it('stripPackHighlightNavFocusClass removes class from action nodes under root', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <div class="action-content-cell">
        <div class="action-node pack-highlight-nav-focus" data-stable-node-id="x">a</div>
      </div>
    `
    const node = root.querySelector('.action-node')
    expect(node.classList.contains('pack-highlight-nav-focus')).toBe(true)
    stripPackHighlightNavFocusClass(root)
    expect(node.classList.contains('pack-highlight-nav-focus')).toBe(false)
  })
})
