/**
 * Meeting-centric flow tests for NewTentativeDashboard.vue
 * (Submit uses future target date; reschedule moves pointer to new meeting date).
 */
import { shallowMount } from '@vue/test-utils'
import NewTentativeDashboard from '@/components/NewTentativeDashboard.vue'
import {
  ymdDaysFromNow,
  isYmdOnOrAfterToday,
  setEditorUserCookie,
  clearCookies,
  flushPromises
} from '../helpers/meeting-test-utils'

jest.mock('@/utils/meetingDashboardUi', () => ({
  isMeetingDashboardUiEnabled: jest.fn(() => true)
}))

jest.mock('@/utils/meetingDashboardPdfExport', () => ({
  exportMeetingDashboardPdf: jest.fn(() => Promise.resolve()),
  stripTentativePdfExtraColumns: jest.fn()
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
  RouterLink: true
}

describe('NewTentativeDashboard.vue (meeting flow)', () => {
  let wrapper

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
      wrapper = null
    }
    clearCookies()
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
})
