/**
 * New meeting-centric Final dashboard — published pack, overlay, comments navigation, hub link.
 *
 * Dashboard node comments: GET/POST/PUT/DELETE on `/meeting_dashboard/dashboard_node_comments`.
 * Thread edit/delete is exercised via DashboardNodeCommentsModal integration-style tests below.
 */
import { shallowMount, mount } from '@vue/test-utils'
import NewFinalDashboard from '@/components/NewFinalDashboard.vue'
import DashboardNodeCommentsModal from '@/components/DashboardNodeCommentsModal.vue'
import {
  setEditorUserCookie,
  clearCookies,
  flushPromises
} from '../helpers/meeting-test-utils'

jest.mock('@/utils/meetingDashboardUi', () => ({
  isMeetingDashboardUiEnabled: jest.fn(() => true)
}))

jest.mock('@/utils/meetingDashboardPdfExport', () => ({
  exportMeetingDashboardPdf: jest.fn(() => Promise.resolve())
}))

const RouterLinkStub = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a class="router-link-stub"><slot /></slot></a>'
}

const DEFAULT_MEETING_DATE = '2026-04-10'
const DEFAULT_VERSION_ID = 77

function sampleTasks () {
  return [
    {
      id: 501,
      sector_division: 'S1',
      description: 'First task',
      original_date: '2026-04-01',
      review_date: '2026-04-05',
      responsibility: 'R1',
      action_to_be_taken:
        '<div class="action-node" data-stable-node-id="sn-a"><span class="node-marker">1.</span><span class="node-content">A</span></div>',
      current_version: {
        action_nodes: [
          { stable_node_id: 'sn-a', display_counter: '1', children: [] }
        ]
      },
      tags: []
    },
    {
      id: 502,
      sector_division: 'S2',
      description: 'Second task',
      original_date: '2026-04-02',
      review_date: '2026-04-06',
      responsibility: 'R2',
      action_to_be_taken:
        '<div class="action-node" data-stable-node-id="sn-b"><span class="node-marker">1.</span><span class="node-content">B</span></div>',
      current_version: {
        action_nodes: [
          { stable_node_id: 'sn-b', display_counter: '1', children: [] }
        ]
      },
      tags: []
    }
  ]
}

function createHttpMock (overrides = {}) {
  const tasks = overrides.tasks != null ? overrides.tasks : sampleTasks()
  const versionId = overrides.versionId != null ? overrides.versionId : DEFAULT_VERSION_ID
  const meetingDate = overrides.meetingDate != null ? overrides.meetingDate : DEFAULT_MEETING_DATE
  const commentNodes = overrides.commentNodes != null
    ? overrides.commentNodes
    : [
        { new_task_id: 501, stable_node_id: 'sn-a' },
        { new_task_id: 502, stable_node_id: 'sn-b' }
      ]

  const get = jest.fn((url, config) => {
    if (typeof overrides.get === 'function') {
      return overrides.get(url, config, { tasks, versionId, meetingDate, commentNodes })
    }
    if (url === '/meeting_dashboard/meeting_dates') {
      return Promise.resolve({
        data: {
          meeting_dates: [
            { meeting_date: meetingDate, new_dashboard_version_id: versionId, set_at: null }
          ]
        }
      })
    }
    if (url === '/meeting_dashboard/published') {
      const params = (config && config.params) || {}
      expect(params.meeting_date).toBe(meetingDate)
      return Promise.resolve({
        data: {
          tasks,
          empty: tasks.length === 0,
          meeting_date: meetingDate,
          meeting_dashboard_version_id: versionId,
          published_at: '2026-04-04T10:00:00Z'
        }
      })
    }
    if (url === '/meeting_dashboard/draft_editor_overlay') {
      const params = (config && config.params) || {}
      expect(params.new_dashboard_version_id).toBe(versionId)
      const nodes = {}
      tasks.forEach((t) => {
        const roots = t.current_version && t.current_version.action_nodes
        if (!Array.isArray(roots)) return
        const walk = (arr) => {
          arr.forEach((n) => {
            if (n.stable_node_id) {
              const cc = n.stable_node_id === 'sn-a' ? 1 : 0
              nodes[n.stable_node_id] = {
                assignment_users: [],
                comment_count: cc,
                comment_user_ids: cc > 0 ? [501] : []
              }
            }
            if (n.children && n.children.length) walk(n.children)
          })
        }
        walk(roots)
      })
      return Promise.resolve({
        data: {
          new_dashboard_version_id: versionId,
          nodes,
          overlay_user_directory: []
        }
      })
    }
    if (url === '/meeting_dashboard/comment_nodes') {
      const params = (config && config.params) || {}
      expect(params.new_dashboard_version_id).toBe(versionId)
      return Promise.resolve({
        data: { new_dashboard_version_id: versionId, nodes: commentNodes }
      })
    }
    if (url === '/meeting_dashboard/dashboard_node_comments') {
      return Promise.resolve({
        data: { comments: overrides.initialComments || [] }
      })
    }
    if (url === '/users/reviewers') {
      return Promise.resolve({
        data: [{ id: 9, name: 'Reviewer Nine' }]
      })
    }
    return Promise.resolve({ data: {} })
  })

  const post = jest.fn((url, body) => {
    if (typeof overrides.post === 'function') {
      return overrides.post(url, body)
    }
    return Promise.resolve({ data: { success: true } })
  })

  return { get, post }
}

function mountFinal (http, options = {}) {
  return shallowMount(NewFinalDashboard, {
    stubs: {
      RouterLink: RouterLinkStub,
      ...(options.stubs || {})
    },
    mocks: {
      $http: { secured: http },
      $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
      ...(options.mocks || {})
    }
  })
}

describe('NewFinalDashboard.vue (meeting published flow)', () => {
  let wrapper

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
      wrapper = null
    }
    clearCookies()
    jest.clearAllMocks()
  })

  it('loads published pack, stores version id, fetches overlay and comment_nodes', async () => {
    setEditorUserCookie()
    const http = createHttpMock()
    wrapper = mountFinal(http)
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.currentVersionId).toBe(DEFAULT_VERSION_ID)
    expect(wrapper.vm.selectedMeetingDate).toBe(DEFAULT_MEETING_DATE)
    expect(wrapper.vm.commentNavNodes.length).toBe(2)

    expect(http.get.mock.calls.filter((c) => c[0] === '/meeting_dashboard/draft_editor_overlay').length).toBeGreaterThanOrEqual(1)
    expect(http.get.mock.calls.filter((c) => c[0] === '/meeting_dashboard/comment_nodes').length).toBeGreaterThanOrEqual(1)
  })

  it('shows full dashboard: all published tasks in displayTasks with no reviewer filter', async () => {
    setEditorUserCookie()
    const http = createHttpMock()
    wrapper = mountFinal(http)
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.selectedReviewerUserId).toBe('')
    expect(wrapper.vm.approvedTasks.length).toBe(2)
    expect(wrapper.vm.displayTasks.length).toBe(2)
    expect(wrapper.vm.displayTasks.map((t) => t.id).sort()).toEqual([501, 502])
    expect(wrapper.vm.assignedNavNodes.length).toBe(0)
  })

  it('show comments mode toggles, loads nodes, and prev/next wraps index', async () => {
    setEditorUserCookie()
    const http = createHttpMock()
    wrapper = mountFinal(http)
    await flushPromises()
    await wrapper.vm.$nextTick()

    const scrollSpy = jest.spyOn(wrapper.vm, 'scrollToStableNode').mockImplementation(() => {})

    expect(wrapper.vm.showCommentsNavMode).toBe(false)
    await wrapper.vm.toggleCommentsNavMode()
    expect(wrapper.vm.showCommentsNavMode).toBe(true)
    expect(wrapper.vm.commentNavNodes.length).toBe(2)
    expect(wrapper.vm.commentNavIndex).toBe(0)
    expect(scrollSpy).toHaveBeenCalled()

    wrapper.vm.commentNavNext()
    expect(wrapper.vm.commentNavIndex).toBe(1)
    wrapper.vm.commentNavNext()
    expect(wrapper.vm.commentNavIndex).toBe(0)

    scrollSpy.mockRestore()
  })

  it('browse commented nodes opens aggregate modal and lists comment nodes', async () => {
    setEditorUserCookie()
    const http = createHttpMock()
    wrapper = mountFinal(http)
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.allCommentsModalVisible).toBe(false)
    await wrapper.vm.openAllCommentsModal()
    await flushPromises()
    expect(wrapper.vm.allCommentsModalVisible).toBe(true)
    expect(wrapper.vm.commentNavNodes.length).toBe(2)
    expect(wrapper.find('.nfd-all-comments-dialog').exists()).toBe(true)
  })

  it('submitAssignPack posts assignment for current published version and refreshes overlay', async () => {
    setEditorUserCookie()
    const http = createHttpMock()
    wrapper = mountFinal(http)
    await flushPromises()
    await wrapper.vm.$nextTick()

    const fetchOverlay = jest.spyOn(wrapper.vm, 'fetchMeetingPackOverlay').mockResolvedValue()

    wrapper.vm.assignPackStableId = 'sn-a'
    wrapper.vm.assignPackSelectedUserId = 9
    await wrapper.vm.submitAssignPack()
    await flushPromises()

    expect(http.post).toHaveBeenCalledWith(
      '/meeting_dashboard/assignments',
      expect.objectContaining({
        new_dashboard_version_id: DEFAULT_VERSION_ID,
        stable_node_id: 'sn-a',
        user_id: 9
      })
    )
    expect(fetchOverlay).toHaveBeenCalled()
    expect(wrapper.vm.showAssignPackModal).toBe(false)

    fetchOverlay.mockRestore()
  })

  it('Open review hub link targets NewTaskReviewHub with current dashboard_version_id', async () => {
    setEditorUserCookie()
    const http = createHttpMock()
    wrapper = mountFinal(http)
    await flushPromises()
    await wrapper.vm.$nextTick()

    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links.length).toBeGreaterThanOrEqual(1)
    const hub = links.wrappers.find(
      (w) => w.props().to && w.props().to.name === 'NewTaskReviewHub'
    )
    expect(hub).toBeTruthy()
    expect(String(hub.props().to.query.dashboard_version_id)).toBe(String(DEFAULT_VERSION_ID))
  })

  it('openThreadForNode opens DashboardNodeCommentsModal with version and stable id', async () => {
    setEditorUserCookie()
    const http = createHttpMock()
    wrapper = mount(NewFinalDashboard, {
      stubs: { RouterLink: RouterLinkStub },
      mocks: {
        $http: { secured: http },
        $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }
      }
    })
    await flushPromises()
    await wrapper.vm.$nextTick()

    wrapper.vm.openThreadForNode('sn-a')
    await wrapper.vm.$nextTick()

    const modal = wrapper.findComponent(DashboardNodeCommentsModal)
    expect(modal.exists()).toBe(true)
    expect(modal.props().visible).toBe(true)
    expect(modal.props().stableNodeId).toBe('sn-a')
    expect(modal.props().versionId).toBe(DEFAULT_VERSION_ID)
    expect(modal.props().nodeContext).toBeTruthy()
    expect(modal.props().nodeContext.taskDescription).toBe('First task')
    expect(modal.props().nodeContext.nodeLabel).toBeTruthy()
  })

  it('onPackCommentSubmitted refetches overlay and comment list when show-comments mode is on', async () => {
    setEditorUserCookie()
    const http = createHttpMock()
    wrapper = mountFinal(http)
    await flushPromises()
    await wrapper.vm.$nextTick()

    const fetchOverlay = jest.spyOn(wrapper.vm, 'fetchMeetingPackOverlay').mockResolvedValue()
    const loadNav = jest.spyOn(wrapper.vm, 'loadCommentNavNodes').mockResolvedValue()

    wrapper.setData({ showCommentsNavMode: true })
    await wrapper.vm.onPackCommentSubmitted()

    expect(fetchOverlay).toHaveBeenCalled()
    expect(loadNav).toHaveBeenCalled()

    fetchOverlay.mockRestore()
    loadNav.mockRestore()
  })

  it('builds ordered assignedNavNodes for selected reviewer', async () => {
    setEditorUserCookie()
    const tasks = sampleTasks()
    const fullGet = jest.fn((url, config) => {
      if (url === '/meeting_dashboard/meeting_dates') {
        return Promise.resolve({
          data: {
            meeting_dates: [
              { meeting_date: DEFAULT_MEETING_DATE, new_dashboard_version_id: DEFAULT_VERSION_ID, set_at: null }
            ]
          }
        })
      }
      if (url === '/meeting_dashboard/published') {
        return Promise.resolve({
          data: {
            tasks,
            empty: false,
            meeting_date: DEFAULT_MEETING_DATE,
            meeting_dashboard_version_id: DEFAULT_VERSION_ID,
            published_at: '2026-04-04T10:00:00Z'
          }
        })
      }
      if (url === '/meeting_dashboard/draft_editor_overlay') {
        return Promise.resolve({
          data: {
            new_dashboard_version_id: DEFAULT_VERSION_ID,
            nodes: {
              'sn-a': {
                assignment_users: [{ id: 9, name: 'Reviewer Nine' }],
                comment_count: 0
              },
              'sn-b': { assignment_users: [], comment_count: 0 }
            }
          }
        })
      }
      if (url === '/meeting_dashboard/comment_nodes') {
        return Promise.resolve({
          data: { new_dashboard_version_id: DEFAULT_VERSION_ID, nodes: [] }
        })
      }
      return Promise.resolve({ data: {} })
    })
    const http2 = { get: fullGet, post: jest.fn(() => Promise.resolve({ data: {} })) }

    wrapper = mountFinal(http2)
    await flushPromises()
    await wrapper.vm.$nextTick()

    wrapper.setData({ selectedReviewerUserId: '9' })
    await wrapper.vm.$nextTick()
    const nav = wrapper.vm.assignedNavNodes
    expect(nav.length).toBe(1)
    expect(nav[0].stable_node_id).toBe('sn-a')
    expect(nav[0].new_task_id).toBe(501)
  })
})

describe('DashboardNodeCommentsModal (meeting pack thread)', () => {
  afterEach(() => {
    clearCookies()
    jest.clearAllMocks()
  })

  it('GET loads thread; POST new comment then GET returns updated list', async () => {
    setEditorUserCookie()
    let loadCount = 0
    const http = {
      secured: {
        get: jest.fn(() => {
          loadCount++
          if (loadCount === 1) {
            return Promise.resolve({ data: { comments: [] } })
          }
          return Promise.resolve({
            data: {
              comments: [
                {
                  id: 100,
                  body: 'New note',
                  user_id: 1,
                  user_name: 'Ed Itor',
                  created_at: '2026-04-04T12:00:00Z'
                }
              ]
            }
          })
        }),
        post: jest.fn(() => Promise.resolve({ data: { success: true } }))
      }
    }

    const wrapper = mount(DashboardNodeCommentsModal, {
      propsData: {
        visible: false,
        versionId: DEFAULT_VERSION_ID,
        stableNodeId: 'sn-a',
        currentUserId: 1,
        userRole: 'editor'
      },
      mocks: { $http: http, $toast: { error: jest.fn() } }
    })

    wrapper.setProps({ visible: true })
    await flushPromises()
    expect(http.secured.get).toHaveBeenCalledWith(
      '/meeting_dashboard/dashboard_node_comments',
      expect.objectContaining({
        params: {
          new_dashboard_version_id: DEFAULT_VERSION_ID,
          stable_node_id: 'sn-a'
        }
      })
    )
    expect(wrapper.vm.comments.length).toBe(0)

    wrapper.setData({ body: 'New note' })
    await wrapper.vm.submit()
    await flushPromises()

    expect(http.secured.post).toHaveBeenCalledWith(
      '/meeting_dashboard/dashboard_node_comments',
      expect.objectContaining({
        new_dashboard_version_id: DEFAULT_VERSION_ID,
        stable_node_id: 'sn-a',
        body: 'New note'
      })
    )
    expect(wrapper.vm.comments.length).toBe(1)
    expect(wrapper.vm.comments[0].body).toBe('New note')
    expect(wrapper.emitted().submitted).toBeTruthy()
  })

  it('PUT updates own comment body', async () => {
    setEditorUserCookie()
    const http = {
      secured: {
        get: jest.fn(() =>
          Promise.resolve({
            data: {
              comments: [
                {
                  id: 55,
                  body: 'Old',
                  user_id: 1,
                  user_name: 'Ed Itor',
                  created_at: '2026-04-04T12:00:00Z'
                }
              ]
            }
          })
        ),
        put: jest.fn(() => Promise.resolve({ data: { success: true } }))
      }
    }
    const wrapper = mount(DashboardNodeCommentsModal, {
      propsData: {
        visible: false,
        versionId: DEFAULT_VERSION_ID,
        stableNodeId: 'sn-a',
        currentUserId: 1,
        userRole: 'editor'
      },
      mocks: { $http: http, $toast: { error: jest.fn(), success: jest.fn() } }
    })
    wrapper.setProps({ visible: true })
    await flushPromises()
    wrapper.vm.startEdit(wrapper.vm.comments[0])
    wrapper.setData({ editBody: 'Revised' })
    await wrapper.vm.saveEdit(55)
    await flushPromises()
    expect(http.secured.put).toHaveBeenCalledWith(
      '/meeting_dashboard/dashboard_node_comments/55',
      { body: 'Revised' }
    )
    expect(wrapper.vm.comments[0].body).toBe('Revised')
    expect(wrapper.vm.editingCommentId).toBe(null)
  })

  it('DELETE removes comment and emits submitted', async () => {
    setEditorUserCookie()
    const http = {
      secured: {
        get: jest.fn(() =>
          Promise.resolve({
            data: {
              comments: [
                {
                  id: 77,
                  body: 'X',
                  user_id: 1,
                  user_name: 'Ed Itor',
                  created_at: '2026-04-04T12:00:00Z'
                }
              ]
            }
          })
        ),
        delete: jest.fn(() => Promise.resolve({ data: { success: true } }))
      }
    }
    const wrapper = mount(DashboardNodeCommentsModal, {
      propsData: {
        visible: false,
        versionId: DEFAULT_VERSION_ID,
        stableNodeId: 'sn-a',
        currentUserId: 1,
        userRole: 'editor'
      },
      mocks: { $http: http, $toast: { error: jest.fn(), success: jest.fn() } }
    })
    wrapper.setProps({ visible: true })
    await flushPromises()
    await wrapper.vm.confirmDelete(77)
    await flushPromises()
    expect(http.secured.delete).toHaveBeenCalledWith('/meeting_dashboard/dashboard_node_comments/77')
    expect(wrapper.vm.comments.length).toBe(0)
    expect(wrapper.emitted().submitted).toBeTruthy()
  })
})
