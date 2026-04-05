/**
 * Meeting-centric flow tests for NewTentativeDashboard.vue
 * (Submit uses future target date; reschedule moves pointer to new meeting date).
 */
import { shallowMount, mount } from '@vue/test-utils'
import NewTentativeDashboard from '@/components/NewTentativeDashboard.vue'
import {
  ymdDaysFromNow,
  isYmdOnOrAfterToday,
  setEditorUserCookie,
  clearCookies,
  flushPromises
} from '../helpers/meeting-test-utils'
import { isMeetingDashboardUiEnabled } from '@/utils/meetingDashboardUi'

jest.mock('@/utils/meetingDashboardUi', () => ({
  isMeetingDashboardUiEnabled: jest.fn(() => true),
  isWebpackDevelopment: jest.fn(() => false)
}))

jest.mock('@/utils/meetingDashboardPdfExport', () => ({
  exportMeetingDashboardPdf: jest.fn(() => Promise.resolve())
}))

function buildHttpMock (overrides = {}) {
  const get = jest.fn((url) => {
    // When tests supply a full `get` mock, use it for every URL (including draft).
    // Otherwise the hard-coded draft branch would ignore per-test `active` payloads.
    if (typeof overrides.get === 'function') {
      return overrides.get(url)
    }
    if (url === '/meeting_dashboard/draft') {
      return Promise.resolve({
        data: {
          active: [],
          completed: [],
          latest_published: { id: 40, target_meeting_date: ymdDaysFromNow(7) },
          draft_settings: { target_meeting_date: ymdDaysFromNow(7) }
        }
      })
    }
    if (url === '/meeting_dashboard/meeting_dates') {
      return Promise.resolve({ data: { meeting_dates: [] } })
    }
    if (url === '/meeting_dashboard/draft_editor_overlay') {
      return Promise.resolve({ data: { new_dashboard_version_id: 40, nodes: {} } })
    }
    return Promise.resolve({ data: {} })
  })
  const post = jest.fn(() => Promise.resolve({ data: { success: true } }))
  const patch = jest.fn(() => Promise.resolve({ data: {} }))
  const put = jest.fn(() => Promise.resolve({ data: {} }))
  const del = jest.fn(() => Promise.resolve({ data: {} }))
  return { get, post, patch, put, delete: del }
}

const commonStubs = {
  NewTaskModal: true,
  ReviewModal: true,
  CommentsModal: true,
  DashboardNodeCommentsModal: true,
  Datepicker: true,
  VDatePicker: true,
  RouterLink: true
}

function baseMeetingDraftTask (overrides = {}) {
  const d = new Date().toISOString()
  return {
    id: 1,
    sector_division: 'IFD',
    description: 'Task',
    responsibility: 'All',
    review_date: d,
    original_date: d,
    status: 'draft',
    meeting_dashboard_draft: true,
    action_to_be_taken: '<p>x</p>',
    current_version: { action_nodes: [] },
    tags: [],
    ...overrides
  }
}

describe('NewTentativeDashboard.vue (meeting flow)', () => {
  let wrapper

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
      wrapper = null
    }
    clearCookies()
    isMeetingDashboardUiEnabled.mockReturnValue(true)
    jest.clearAllMocks()
  })

  async function mountDashboard (http) {
    setEditorUserCookie()
    const w = shallowMount(NewTentativeDashboard, {
      stubs: commonStubs,
      mocks: {
        $http: { secured: http },
        $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
        $route: { query: {} },
        $router: { push: jest.fn() }
      }
    })
    await flushPromises()
    await w.vm.$nextTick()
    return w
  }

  it('Submit (publish) sends target_meeting_date that is on or after today', async () => {
    const future = ymdDaysFromNow(14)
    expect(isYmdOnOrAfterToday(future)).toBe(true)

    const http = buildHttpMock()
    wrapper = await mountDashboard(http)

    wrapper.setData({
      targetMeetingDate: future,
      persistedTargetMeetingDate: future,
      latestPublishedVersionId: 40
    })

    await wrapper.vm.publishMeetingDashboard()
    await flushPromises()

    expect(http.post).toHaveBeenCalledWith(
      '/meeting_dashboard/publish',
      expect.objectContaining({ target_meeting_date: future })
    )
    const arg = http.post.mock.calls.find((c) => c[0] === '/meeting_dashboard/publish')
    expect(isYmdOnOrAfterToday(arg[1].target_meeting_date)).toBe(true)
  })

  it('confirming postpone calls reschedule then persists new target meeting date', async () => {
    const fromD = ymdDaysFromNow(3)
    const toD = ymdDaysFromNow(10)
    const http = buildHttpMock()
    wrapper = await mountDashboard(http)

    http.post.mockImplementation((url) => {
      if (url === '/meeting_dashboard/reschedule') {
        return Promise.resolve({ data: { success: true } })
      }
      return Promise.resolve({ data: {} })
    })

    wrapper.setData({
      showPostponeModal: true,
      postponeFromDate: fromD,
      postponeToDate: toD,
      targetMeetingDate: toD,
      persistedTargetMeetingDate: fromD
    })

    await wrapper.vm.confirmPostponeMeeting()
    await flushPromises()

    expect(http.post).toHaveBeenCalledWith(
      '/meeting_dashboard/reschedule',
      expect.objectContaining({
        from_meeting_date: fromD,
        to_meeting_date: toD
      })
    )
    expect(http.patch).toHaveBeenCalledWith(
      '/meeting_dashboard/draft_settings',
      expect.objectContaining({ target_meeting_date: toD })
    )
  })

  it('opens edit task modal for an existing row (integration hook for modal tests)', async () => {
    const task = {
      id: 501,
      sector_division: 'IFD',
      description: 'Existing',
      responsibility: 'All',
      review_date: new Date().toISOString(),
      original_date: new Date().toISOString(),
      status: 'draft',
      meeting_dashboard_draft: true,
      action_to_be_taken: '<div class="action-node">x</div>',
      current_version: { action_nodes: [] },
      tags: []
    }
    const http = buildHttpMock({
      get: (url) => {
        if (url === '/meeting_dashboard/draft') {
          return Promise.resolve({
            data: {
              active: [task],
              completed: [],
              latest_published: { id: 1 },
              draft_settings: { target_meeting_date: ymdDaysFromNow(5) }
            }
          })
        }
        if (url === '/meeting_dashboard/meeting_dates') {
          return Promise.resolve({ data: { meeting_dates: [] } })
        }
        if (url === '/meeting_dashboard/draft_editor_overlay') {
          return Promise.resolve({ data: { nodes: {} } })
        }
        return Promise.resolve({ data: {} })
      }
    })
    wrapper = await mountDashboard(http)
    expect(wrapper.vm.activeTasks.length).toBe(1)

    wrapper.vm.editTask(wrapper.vm.activeTasks[0])
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.showTaskModal).toBe(true)
    expect(wrapper.vm.currentTask.id).toBe(501)
  })

  it('pack_node_stats: shows counts, tooltips, and Pending Action when work remains', async () => {
    const http = buildHttpMock({
      get: (url) => {
        if (url === '/meeting_dashboard/draft') {
          return Promise.resolve({
            data: {
              active: [
                baseMeetingDraftTask({
                  id: 601,
                  pack_node_stats: {
                    unresolved_count: 2,
                    resolved_count: 1,
                    assigned_without_comment_count: 1,
                    has_action_nodes: true
                  }
                })
              ],
              completed: [],
              latest_published: { id: 1 },
              draft_settings: { target_meeting_date: ymdDaysFromNow(5) }
            }
          })
        }
        if (url === '/meeting_dashboard/meeting_dates') {
          return Promise.resolve({ data: { meeting_dates: [] } })
        }
        if (url === '/meeting_dashboard/draft_editor_overlay') {
          return Promise.resolve({ data: { nodes: {} } })
        }
        return Promise.resolve({ data: {} })
      }
    })
    wrapper = await mountDashboard(http)
    const row = wrapper.find('.table-row[data-task-id="601"]')
    expect(row.exists()).toBe(true)
    const statusTd = row.find('.meeting-pack-status-td')
    expect(statusTd.exists()).toBe(true)
    expect(statusTd.classes()).not.toContain('meeting-pack-status-td--ready')
    expect(statusTd.classes()).toContain('meeting-pack-status-td--pending')
    const nums = statusTd.findAll('.meeting-pack-count-num')
    expect(nums.length).toBe(2)
    expect(nums.at(0).text()).toBe('2')
    expect(nums.at(1).text()).toBe('1')
    expect(statusTd.text()).toContain('Pending Action')
    expect(statusTd.find('.meeting-pack-count--unresolved').attributes('title')).toBe(
      'Unresolved nodes (review hub)'
    )
    expect(statusTd.find('.meeting-pack-count--resolved').attributes('title')).toBe('Resolved nodes')
  })

  it('pack_node_stats: fully clear row shows Ready to be published and green td class', async () => {
    const http = buildHttpMock({
      get: (url) => {
        if (url === '/meeting_dashboard/draft') {
          return Promise.resolve({
            data: {
              active: [
                baseMeetingDraftTask({
                  id: 602,
                  pack_node_stats: {
                    unresolved_count: 0,
                    resolved_count: 3,
                    assigned_without_comment_count: 0,
                    has_action_nodes: true
                  }
                })
              ],
              completed: [],
              latest_published: { id: 1 },
              draft_settings: { target_meeting_date: ymdDaysFromNow(5) }
            }
          })
        }
        if (url === '/meeting_dashboard/meeting_dates') {
          return Promise.resolve({ data: { meeting_dates: [] } })
        }
        if (url === '/meeting_dashboard/draft_editor_overlay') {
          return Promise.resolve({ data: { nodes: {} } })
        }
        return Promise.resolve({ data: {} })
      }
    })
    wrapper = await mountDashboard(http)
    const statusTd = wrapper.find('.table-row[data-task-id="602"] .meeting-pack-status-td')
    expect(statusTd.classes()).toContain('meeting-pack-status-td--ready')
    expect(statusTd.classes()).not.toContain('meeting-pack-status-td--pending')
    expect(statusTd.text()).toContain('Ready to be published')
    expect(statusTd.text()).not.toContain('Pending Action')
  })

  it('pack_node_stats: has_action_nodes false shows info icon and exact no-change tooltip', async () => {
    const http = buildHttpMock({
      get: (url) => {
        if (url === '/meeting_dashboard/draft') {
          return Promise.resolve({
            data: {
              active: [
                baseMeetingDraftTask({
                  id: 603,
                  pack_node_stats: {
                    unresolved_count: 0,
                    resolved_count: 0,
                    assigned_without_comment_count: 0,
                    has_action_nodes: false
                  }
                })
              ],
              completed: [],
              latest_published: { id: 1 },
              draft_settings: { target_meeting_date: ymdDaysFromNow(5) }
            }
          })
        }
        if (url === '/meeting_dashboard/meeting_dates') {
          return Promise.resolve({ data: { meeting_dates: [] } })
        }
        if (url === '/meeting_dashboard/draft_editor_overlay') {
          return Promise.resolve({ data: { nodes: {} } })
        }
        return Promise.resolve({ data: {} })
      }
    })
    wrapper = await mountDashboard(http)
    const statusTd = wrapper.find('.table-row[data-task-id="603"] .meeting-pack-status-td')
    expect(statusTd.classes()).not.toContain('meeting-pack-status-td--pending')
    expect(statusTd.find('.meeting-pack-info-icon').exists()).toBe(true)
    expect(statusTd.find('.meeting-pack-info-wrap').attributes('title')).toBe(
      'No change.\n\nReady to be published.'
    )
    expect(statusTd.text()).not.toContain('Pending Action')
    expect(statusTd.text()).not.toContain('Ready to be published')
  })

  it('missing pack_node_stats shows em dash in status cell', async () => {
    const http = buildHttpMock({
      get: (url) => {
        if (url === '/meeting_dashboard/draft') {
          return Promise.resolve({
            data: {
              active: [baseMeetingDraftTask({ id: 604 })],
              completed: [],
              latest_published: { id: 1 },
              draft_settings: { target_meeting_date: ymdDaysFromNow(5) }
            }
          })
        }
        if (url === '/meeting_dashboard/meeting_dates') {
          return Promise.resolve({ data: { meeting_dates: [] } })
        }
        if (url === '/meeting_dashboard/draft_editor_overlay') {
          return Promise.resolve({ data: { nodes: {} } })
        }
        return Promise.resolve({ data: {} })
      }
    })
    wrapper = await mountDashboard(http)
    const statusTd = wrapper.find('.table-row[data-task-id="604"] .meeting-pack-status-td')
    expect(statusTd.classes()).not.toContain('meeting-pack-status-td--pending')
    expect(statusTd.find('.meeting-pack-status-missing').text()).toBe('—')
  })

  it('context menu hides Send for Review and Reviews when meeting UI is enabled', async () => {
    const http = buildHttpMock()
    wrapper = await mountDashboard(http)
    const task = baseMeetingDraftTask({ id: 42 })
    await wrapper.setData({
      activeTasks: [task],
      activeMenuId: 42
    })
    await wrapper.vm.$nextTick()
    const menu = wrapper.find('.global-action-menu')
    expect(menu.classes()).toContain('show')
    const t = menu.text()
    expect(t).not.toMatch(/Send for Review/i)
    expect(t).not.toMatch(/Reviews/)
  })

  it('context menu shows Send for Review and Reviews in legacy flow when editor and draft', async () => {
    isMeetingDashboardUiEnabled.mockReturnValue(false)
    const d = new Date().toISOString()
    const http = buildHttpMock({
      get: (url) => {
        if (url === '/tasks') {
          return Promise.resolve({
            data: {
              active: [
                {
                  id: 800,
                  sector_division: 'X',
                  description: 'Legacy draft',
                  responsibility: 'R',
                  review_date: d,
                  original_date: d,
                  status: 'draft',
                  action_to_be_taken: '<p>a</p>',
                  tags: []
                }
              ],
              completed: []
            }
          })
        }
        return Promise.resolve({ data: {} })
      }
    })
    wrapper = await mountDashboard(http)
    await wrapper.setData({ activeMenuId: 800 })
    await wrapper.vm.$nextTick()
    const menu = wrapper.find('.global-action-menu')
    expect(menu.classes()).toContain('show')
    const t = menu.text()
    expect(t).toMatch(/Send for Review/)
    expect(t).toMatch(/Reviews/)
  })

  it('applyEditorOverlays adds pack resolution classes for stable nodes when highlights on', async () => {
    const nodeHtml =
      '<div class="action-node level-2" data-stable-node-id="st_overlay_1"><span class="node-marker">a.</span><span class="node-content">Node A</span></div>'
    const http = buildHttpMock({
      get: (url) => {
        if (url === '/meeting_dashboard/draft') {
          return Promise.resolve({
            data: {
              active: [
                baseMeetingDraftTask({
                  id: 901,
                  action_to_be_taken: nodeHtml
                })
              ],
              completed: [],
              latest_published: { id: 40, target_meeting_date: ymdDaysFromNow(7) },
              draft_settings: { target_meeting_date: ymdDaysFromNow(7) }
            }
          })
        }
        if (url === '/meeting_dashboard/meeting_dates') {
          return Promise.resolve({ data: { meeting_dates: [] } })
        }
        if (url === '/meeting_dashboard/draft_editor_overlay') {
          return Promise.resolve({
            data: {
              new_dashboard_version_id: 40,
              nodes: {
                st_overlay_1: {
                  assignment_users: [{ id: 1, name: 'Editor' }],
                  comment_count: 0,
                  is_resolved: false
                }
              }
            }
          })
        }
        return Promise.resolve({ data: {} })
      }
    })
    setEditorUserCookie()
    const el = document.createElement('div')
    document.body.appendChild(el)
    const w = mount(NewTentativeDashboard, {
      attachTo: el,
      stubs: commonStubs,
      mocks: {
        $http: { secured: http },
        $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
        $route: { query: {} },
        $router: { push: jest.fn() }
      }
    })
    await flushPromises()
    await w.vm.$nextTick()
    await w.vm.$nextTick()

    const pickNode = () => w.vm.$el.querySelector('.action-node[data-stable-node-id="st_overlay_1"]')

    let nodeEl = pickNode()
    expect(nodeEl).toBeTruthy()
    expect(nodeEl.classList.contains('meeting-overlay-node')).toBe(true)
    expect(nodeEl.classList.contains('meeting-hub-red')).toBe(true)
    expect(nodeEl.classList.contains('meeting-pack-resolved')).toBe(false)
    expect(nodeEl.querySelector('.meeting-pack-resolution-chip')).toBeFalsy()

    w.setData({
      editorOverlay: {
        st_overlay_1: {
          assignment_users: [{ id: 1, name: 'Editor' }],
          comment_count: 0,
          is_resolved: true
        }
      }
    })
    await flushPromises()
    await w.vm.$nextTick()
    w.vm.applyEditorOverlays()
    await w.vm.$nextTick()
    await w.vm.$nextTick()

    nodeEl = pickNode()
    expect(nodeEl).toBeTruthy()
    expect(nodeEl.classList.contains('meeting-pack-resolved')).toBe(true)
    expect(nodeEl.classList.contains('meeting-hub-red')).toBe(true)
    const marker = nodeEl.querySelector('.node-marker')
    const resolvedChip = nodeEl.querySelector('.meeting-pack-resolution-chip--resolved')
    expect(resolvedChip).toBeTruthy()
    expect(marker && marker.nextElementSibling === resolvedChip).toBe(true)

    w.setData({ packHighlightMode: 'off' })
    await w.vm.$nextTick()
    w.vm.applyEditorOverlays()
    await w.vm.$nextTick()
    await w.vm.$nextTick()
    nodeEl = pickNode()
    expect(nodeEl).toBeTruthy()
    expect(nodeEl.classList.contains('meeting-hub-red')).toBe(false)
    expect(nodeEl.classList.contains('meeting-pack-resolved')).toBe(false)
    expect(nodeEl.classList.contains('meeting-overlay-node')).toBe(true)
    expect(nodeEl.querySelector('.meeting-pack-resolution-chip--resolved')).toBeTruthy()

    w.destroy()
    el.remove()
  })

  it('pack highlight navigator FAB lists tinted nodes and next/prev moves focus', async () => {
    const nodeHtml = `
      <div class="action-node" data-stable-node-id="st_nav_a"><span class="node-marker">a.</span><span class="node-content">A</span></div>
      <div class="action-node" data-stable-node-id="st_nav_b"><span class="node-marker">b.</span><span class="node-content">B</span></div>
    `
    const http = buildHttpMock({
      get: (url) => {
        if (url === '/meeting_dashboard/draft') {
          return Promise.resolve({
            data: {
              active: [
                baseMeetingDraftTask({
                  id: 902,
                  action_to_be_taken: nodeHtml
                })
              ],
              completed: [],
              latest_published: { id: 40, target_meeting_date: ymdDaysFromNow(7) },
              draft_settings: { target_meeting_date: ymdDaysFromNow(7) }
            }
          })
        }
        if (url === '/meeting_dashboard/meeting_dates') {
          return Promise.resolve({ data: { meeting_dates: [] } })
        }
        if (url === '/meeting_dashboard/draft_editor_overlay') {
          return Promise.resolve({
            data: {
              new_dashboard_version_id: 40,
              nodes: {
                st_nav_a: {
                  assignment_users: [{ id: 1, name: 'Editor' }],
                  comment_count: 0,
                  is_resolved: false
                },
                st_nav_b: {
                  assignment_users: [{ id: 1, name: 'Editor' }],
                  comment_count: 1,
                  is_resolved: false
                }
              }
            }
          })
        }
        return Promise.resolve({ data: {} })
      }
    })
    setEditorUserCookie()
    const el = document.createElement('div')
    document.body.appendChild(el)

    const w = mount(NewTentativeDashboard, {
      attachTo: el,
      stubs: commonStubs,
      mocks: {
        $http: { secured: http },
        $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
        $route: { query: {} },
        $router: { push: jest.fn() }
      }
    })
    await flushPromises()
    await w.vm.$nextTick()
    await w.vm.$nextTick()

    w.vm.applyEditorOverlays()
    await w.vm.$nextTick()
    await w.vm.$nextTick()

    expect(w.vm.packHighlightNavTargets).toHaveLength(2)
    expect(w.vm.packHighlightNavFabVisible).toBe(true)
    expect(w.find('.pack-highlight-nav-fab').exists()).toBe(true)

    const nodeA = w.vm.$el.querySelector('.action-node[data-stable-node-id="st_nav_a"]')
    const nodeB = w.vm.$el.querySelector('.action-node[data-stable-node-id="st_nav_b"]')
    expect(nodeA.classList.contains('pack-highlight-nav-focus')).toBe(true)
    expect(nodeB.classList.contains('pack-highlight-nav-focus')).toBe(false)

    w.vm.packHighlightNavNext()
    await w.vm.$nextTick()
    expect(w.vm.packHighlightNavIndex).toBe(1)
    expect(nodeA.classList.contains('pack-highlight-nav-focus')).toBe(false)
    expect(nodeB.classList.contains('pack-highlight-nav-focus')).toBe(true)

    w.vm.packHighlightNavPrev()
    await w.vm.$nextTick()
    expect(w.vm.packHighlightNavIndex).toBe(0)
    expect(nodeA.classList.contains('pack-highlight-nav-focus')).toBe(true)

    w.destroy()
    el.remove()
  })

  it('prepareTentativePdfRowClone reduces main row to 7 cells (9-col legacy or 8-col current)', async () => {
    const http = buildHttpMock()
    wrapper = await mountDashboard(http)
    const makeClone = (n) => {
      const row = document.createElement('div')
      const table = document.createElement('table')
      const tr = document.createElement('tr')
      for (let i = 0; i < n; i++) {
        const td = document.createElement('td')
        td.textContent = String(i)
        tr.appendChild(td)
      }
      table.appendChild(tr)
      row.appendChild(table)
      return row
    }
    const nine = makeClone(9)
    wrapper.vm.prepareTentativePdfRowClone(nine)
    expect(nine.querySelectorAll('tr > td').length).toBe(7)
    const eight = makeClone(8)
    wrapper.vm.prepareTentativePdfRowClone(eight)
    expect(eight.querySelectorAll('tr > td').length).toBe(7)
  })

  it('legacy formatStatus when meeting UI is disabled (no pack column)', async () => {
    isMeetingDashboardUiEnabled.mockReturnValue(false)
    const d = new Date().toISOString()
    const http = buildHttpMock({
      get: (url) => {
        if (url === '/tasks') {
          return Promise.resolve({
            data: {
              active: [
                {
                  id: 701,
                  sector_division: 'X',
                  description: 'Legacy',
                  responsibility: 'R',
                  review_date: d,
                  original_date: d,
                  status: 'under_review',
                  action_to_be_taken: '<p>a</p>',
                  tags: []
                }
              ],
              completed: []
            }
          })
        }
        return Promise.resolve({ data: {} })
      }
    })
    wrapper = await mountDashboard(http)
    const row = wrapper.find('.table-row[data-task-id="701"]')
    expect(row.find('.meeting-pack-status-td').exists()).toBe(false)
    expect(row.text()).toContain('Reviewer')
  })
})
