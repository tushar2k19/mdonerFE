/**
 * Filter panel: review date presets + tags (status removed); v-calendar stubbed.
 */
import { shallowMount } from '@vue/test-utils'
import NewTentativeDashboard from '@/components/NewTentativeDashboard.vue'
import {
  ymdDaysFromNow,
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

function buildHttpMock () {
  const get = jest.fn((url) => {
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
  return { get, post: jest.fn(() => Promise.resolve({ data: {} })), patch: jest.fn(), put: jest.fn(), delete: jest.fn() }
}

function localYmd (d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

describe('NewTentativeDashboard.vue (filter panel)', () => {
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

  it('displayTasks respects preset review date and tag filter', async () => {
    setEditorUserCookie()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = localYmd(today)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dTomorrow = localYmd(tomorrow)
    const tasks = [
      {
        id: 1,
        sector_division: 'A',
        description: 'One',
        responsibility: 'All',
        review_date: d,
        original_date: d,
        status: 'draft',
        meeting_dashboard_draft: true,
        action_to_be_taken: '<p>x</p>',
        current_version: { action_nodes: [] },
        tags: [{ id: 10, name: 'alpha' }]
      },
      {
        id: 2,
        sector_division: 'B',
        description: 'Two',
        responsibility: 'All',
        review_date: dTomorrow,
        original_date: dTomorrow,
        status: 'draft',
        meeting_dashboard_draft: true,
        action_to_be_taken: '<p>y</p>',
        current_version: { action_nodes: [] },
        tags: [{ id: 11, name: 'beta' }]
      }
    ]

    wrapper = shallowMount(NewTentativeDashboard, {
      stubs: {
        NewTaskModal: true,
        ReviewModal: true,
        CommentsModal: true,
        DashboardNodeCommentsModal: true,
        Datepicker: true,
        VDatePicker: true,
        RouterLink: true
      },
      mocks: {
        $http: { secured: buildHttpMock() },
        $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
        $route: { query: {} },
        $router: { push: jest.fn() }
      }
    })
    await flushPromises()
    await wrapper.vm.$nextTick()

    wrapper.setData({
      activeTasks: tasks,
      reviewDateMode: 'preset',
      reviewDatePresetKey: 'today',
      reviewDateFromYmd: d,
      reviewDateToYmd: d,
      selectedTagsFilter: [10]
    })
    await wrapper.vm.$nextTick()

    const shown = wrapper.vm.displayTasks
    expect(shown.length).toBe(1)
    expect(shown[0].id).toBe(1)
  })

  it('search + filter panel uses taskPassesFilterPanelWithSearch', async () => {
    setEditorUserCookie()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = localYmd(today)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dTomorrow = localYmd(tomorrow)
    const tasks = [
      {
        id: 1,
        sector_division: 'Sector',
        description: 'hello world',
        responsibility: 'All',
        review_date: d,
        original_date: d,
        status: 'draft',
        meeting_dashboard_draft: true,
        action_to_be_taken: '<p>hello</p>',
        current_version: { action_nodes: [] },
        tags: []
      }
    ]

    wrapper = shallowMount(NewTentativeDashboard, {
      stubs: {
        NewTaskModal: true,
        ReviewModal: true,
        CommentsModal: true,
        DashboardNodeCommentsModal: true,
        Datepicker: true,
        VDatePicker: true,
        RouterLink: true
      },
      mocks: {
        $http: { secured: buildHttpMock() },
        $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
        $route: { query: {} },
        $router: { push: jest.fn() }
      }
    })
    await flushPromises()
    await wrapper.vm.$nextTick()

    wrapper.setData({
      activeTasks: tasks,
      searchQuery: 'hello',
      filteredTasks: tasks,
      reviewDateMode: 'preset',
      reviewDatePresetKey: 'today',
      reviewDateFromYmd: d,
      reviewDateToYmd: d
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.displayTasks.length).toBe(1)

    wrapper.setData({
      reviewDatePresetKey: 'tomorrow',
      reviewDateFromYmd: dTomorrow,
      reviewDateToYmd: dTomorrow,
      calendarRangeValue: null
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.displayTasks.length).toBe(0)
  })

  it('pack highlight list filter keeps tasks with matching overlay hub', async () => {
    setEditorUserCookie()
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    const ymd = localYmd(d)
    const t1 = {
      id: 101,
      sector_division: 'S',
      description: 'A',
      responsibility: 'All',
      review_date: ymd,
      original_date: ymd,
      status: 'draft',
      meeting_dashboard_draft: true,
      action_to_be_taken: '<div class="action-node" data-stable-node-id="sn_red"></div>',
      current_version: { action_nodes: [] },
      tags: []
    }
    const t2 = {
      id: 102,
      sector_division: 'S',
      description: 'B',
      responsibility: 'All',
      review_date: ymd,
      original_date: ymd,
      status: 'draft',
      meeting_dashboard_draft: true,
      action_to_be_taken: '<div class="action-node" data-stable-node-id="sn_green"></div>',
      current_version: { action_nodes: [] },
      tags: []
    }
    const overlay = {
      sn_red: { assignment_users: [{ id: 1 }], comment_count: 0 },
      sn_green: { assignment_users: [{ id: 1 }], comment_count: 2 }
    }

    wrapper = shallowMount(NewTentativeDashboard, {
      stubs: {
        NewTaskModal: true,
        ReviewModal: true,
        CommentsModal: true,
        DashboardNodeCommentsModal: true,
        Datepicker: true,
        VDatePicker: true,
        RouterLink: true
      },
      mocks: {
        $http: { secured: buildHttpMock() },
        $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
        $route: { query: {} },
        $router: { push: jest.fn() }
      }
    })
    await flushPromises()
    await wrapper.vm.$nextTick()

    wrapper.setData({
      activeTasks: [t1, t2],
      editorOverlay: overlay,
      packHighlightMode: 'red',
      reviewDateMode: 'all',
      reviewDateFromYmd: '',
      reviewDateToYmd: ''
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.packHighlightListFilterActive).toBe(true)
    const rows = wrapper.vm.displayTasks
    expect(rows.length).toBe(1)
    expect(rows[0].id).toBe(101)

    wrapper.setData({ packHighlightMode: 'all' })
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.displayTasks.length).toBe(2)
  })

  it('displayTasks narrows by assigned reviewer when meeting UI is on', async () => {
    setEditorUserCookie()
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    const ymd = localYmd(d)
    const nodesA = [
      { stable_node_id: 'sn-a', display_counter: '1', children: [] }
    ]
    const nodesB = [
      { stable_node_id: 'sn-b', display_counter: '1', children: [] }
    ]
    const t1 = {
      id: 501,
      sector_division: 'S',
      description: 'One',
      responsibility: 'All',
      review_date: ymd,
      original_date: ymd,
      status: 'draft',
      meeting_dashboard_draft: true,
      action_to_be_taken: '<p>x</p>',
      current_version: { action_nodes: nodesA },
      tags: []
    }
    const t2 = {
      id: 502,
      sector_division: 'S',
      description: 'Two',
      responsibility: 'All',
      review_date: ymd,
      original_date: ymd,
      status: 'draft',
      meeting_dashboard_draft: true,
      action_to_be_taken: '<p>y</p>',
      current_version: { action_nodes: nodesB },
      tags: []
    }
    const overlay = {
      'sn-a': { assignment_users: [{ id: 9, name: 'Reviewer Nine' }], comment_count: 0 },
      'sn-b': { assignment_users: [{ id: 8, name: 'Other' }], comment_count: 0 }
    }

    wrapper = shallowMount(NewTentativeDashboard, {
      stubs: {
        NewTaskModal: true,
        ReviewModal: true,
        CommentsModal: true,
        DashboardNodeCommentsModal: true,
        Datepicker: true,
        VDatePicker: true,
        RouterLink: true
      },
      mocks: {
        $http: { secured: buildHttpMock() },
        $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
        $route: { query: {} },
        $router: { push: jest.fn() }
      }
    })
    await flushPromises()
    await wrapper.vm.$nextTick()

    wrapper.setData({
      activeTasks: [t1, t2],
      editorOverlay: overlay,
      latestPublishedVersionId: 40,
      reviewDateMode: 'all',
      selectedReviewerUserId: '9'
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.assignedNavNodes.length).toBe(1)
    expect(wrapper.vm.displayTasks.length).toBe(1)
    expect(wrapper.vm.displayTasks[0].id).toBe(501)
  })
})
