import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import NewTaskReviewHub from '@/components/NewTaskReviewHub.vue'
import { flushPromises } from '../helpers/meeting-test-utils'

jest.mock('@/utils/reviewHubPdfExport', () => ({
  exportReviewHubPdf: jest.fn()
}))

const localVue = createLocalVue()
localVue.use(Vuex)

function mountHub (opts = {}) {
  if (opts.role || opts.userId != null) {
    const payload = {
      id: opts.userId != null ? opts.userId : 99,
      role: opts.role || 'editor'
    }
    document.cookie = `user_info=${encodeURIComponent(JSON.stringify(payload))}; path=/`
  } else {
    document.cookie = 'user_info=; Max-Age=0; path=/'
  }

  let overlayFetchRound = 0
  const get = jest.fn((url, config) => {
    if (url === '/meeting_dashboard/published') {
      expect(config.params.new_dashboard_version_id).toBe('42')
      return Promise.resolve({
        data: {
          tasks: opts.tasks || [],
          empty: !(opts.tasks && opts.tasks.length),
          meeting_dashboard_version_id: 42,
          published_at: '2026-03-01T12:00:00Z',
          meeting_date: '2026-03-10',
          schedule_meeting_date: '2026-03-10',
          target_meeting_date: '2026-03-10'
        }
      })
    }
    if (url === '/meeting_dashboard/draft_editor_overlay') {
      overlayFetchRound += 1
      const nodes =
        opts.overlayAfterResolve && overlayFetchRound > 1
          ? opts.overlayAfterResolve
          : opts.overlayNodes || {}
      return Promise.resolve({
        data: {
          new_dashboard_version_id: 42,
          nodes
        }
      })
    }
    if (url === '/meeting_dashboard/draft_settings') {
      return Promise.resolve({
        data: { target_meeting_date: '2026-03-20' }
      })
    }
    return Promise.reject(new Error(`unexpected GET ${url}`))
  })

  const patch = jest.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        stable_node_id: 'sn-x',
        resolved: true,
        resolved_at: '2026-04-05T12:00:00Z',
        resolved_by_id: 1
      }
    })
  )

  const toast = { success: jest.fn(), error: jest.fn() }

  const store = new Vuex.Store({
    state: { notifications: [] },
    mutations: {
      ADD_NOTIFICATION () {}
    }
  })
  const wrapper = shallowMount(NewTaskReviewHub, {
    localVue,
    store,
    mocks: {
      $http: { secured: { get, patch } },
      $route: {
        query: { dashboard_version_id: '42' }
      },
      $router: { back: jest.fn(), push: jest.fn() },
      $toast: toast
    }
  })
  return { wrapper, get, patch, toast }
}

describe('NewTaskReviewHub', () => {
  it('loads data and renders matrix rows', async () => {
    const tasks = [
      {
        id: 1,
        sector_division: 'IFD',
        description: 'Task one',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'sn-x',
              display_counter: '1',
              children: []
            }
          ]
        }
      }
    ]
    const overlayNodes = {
      'sn-x': {
        assignment_users: [{ id: 9, name: 'Reviewer Nine' }],
        comment_count: 1
      }
    }
    const { wrapper: w } = mountHub({ tasks, overlayNodes })
    await flushPromises()
    expect(w.text()).toContain('Version #42')
    expect(w.text()).toContain('IFD')
    expect(w.text()).toContain('Reviewer Nine')
    const legendDots = w.findAll('.nth-legend .nth-status-dot')
    expect(legendDots.length).toBe(3)
    const rowDot = w.find('.nth-row-green .nth-status-dot')
    expect(rowDot.exists()).toBe(true)
    expect(rowDot.attributes('aria-label')).toBe('Assigned & commented')
  })

  it('shows warning when dashboard_version_id missing', () => {
    const store = new Vuex.Store({})
    const w = shallowMount(NewTaskReviewHub, {
      localVue,
      store,
      mocks: {
        $http: { secured: { get: jest.fn(), patch: jest.fn() } },
        $route: { query: {} },
        $router: { back: jest.fn(), push: jest.fn() },
        $toast: {}
      }
    })
    expect(w.text()).toContain('Missing')
  })

  it('editor sees Mark resolved and PATCH refetches overlay', async () => {
    const tasks = [
      {
        id: 1,
        sector_division: 'IFD',
        description: 'Task one',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'sn-x',
              display_counter: '1',
              children: []
            }
          ]
        }
      }
    ]
    const overlayNodes = {
      'sn-x': {
        assignment_users: [{ id: 9, name: 'Reviewer Nine' }],
        comment_count: 1,
        is_resolved: false
      }
    }
    const overlayAfterResolve = {
      'sn-x': {
        assignment_users: [{ id: 9, name: 'Reviewer Nine' }],
        comment_count: 1,
        is_resolved: true,
        resolved_at: '2026-04-05T12:00:00Z',
        resolved_by: { id: 1, name: 'Editor One' }
      }
    }
    const { wrapper: w, patch, get, toast } = mountHub({
      tasks,
      overlayNodes,
      overlayAfterResolve,
      role: 'editor'
    })
    await flushPromises()

    const markBtn = w.find('.nth-resolve-tick:not(.nth-resolve-tick--resolved)')
    expect(markBtn.exists()).toBe(true)
    expect(markBtn.attributes('aria-label')).toBe('Mark node resolved')

    markBtn.trigger('click')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith(
      '/meeting_dashboard/dashboard_pack_nodes/42/resolve',
      { stable_node_id: 'sn-x', resolved: true }
    )

    const overlayGets = get.mock.calls.filter((c) => c[0] === '/meeting_dashboard/draft_editor_overlay')
    expect(overlayGets.length).toBeGreaterThanOrEqual(2)

    expect(toast.success).toHaveBeenCalledWith('Marked resolved.')

    const resolvedBtn = w.find('.nth-resolve-tick--resolved')
    expect(resolvedBtn.exists()).toBe(true)
    expect(resolvedBtn.attributes('aria-label')).toMatch(/Resolved/)
  })

  it('reviewer does not see Mark resolved; shows read-only Resolved when packed', async () => {
    const tasks = [
      {
        id: 1,
        sector_division: 'IFD',
        description: 'Task one',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'sn-x',
              display_counter: '1',
              children: []
            }
          ]
        }
      }
    ]
    const overlayNodes = {
      'sn-x': {
        assignment_users: [{ id: 9, name: 'Reviewer Nine' }],
        comment_count: 1,
        is_resolved: true,
        resolved_at: '2026-04-05T10:00:00Z',
        resolved_by: { id: 2, name: 'Editor Two' }
      }
    }
    const { wrapper: w } = mountHub({
      tasks,
      overlayNodes,
      role: 'reviewer'
    })
    await flushPromises()

    expect(w.find('.nth-resolve-tick').exists()).toBe(false)
    expect(w.find('.nth-resolve-tick--resolved').exists()).toBe(false)
    const ro = w.find('.nth-resolved-readonly')
    expect(ro.exists()).toBe(true)
    expect(ro.text()).toContain('Resolved')
  })

  it('reviewer with unresolved node sees no resolution control', async () => {
    const tasks = [
      {
        id: 1,
        sector_division: 'IFD',
        description: 'Task one',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'sn-x',
              display_counter: '1',
              children: []
            }
          ]
        }
      }
    ]
    const overlayNodes = {
      'sn-x': {
        assignment_users: [{ id: 9, name: 'Reviewer Nine' }],
        comment_count: 1,
        is_resolved: false
      }
    }
    const { wrapper: w } = mountHub({
      tasks,
      overlayNodes,
      role: 'reviewer'
    })
    await flushPromises()

    expect(w.find('.nth-resolve-tick').exists()).toBe(false)
    expect(w.find('.nth-resolved-readonly').exists()).toBe(false)
  })

  it('shows toast error on PATCH 403', async () => {
    const tasks = [
      {
        id: 1,
        sector_division: 'IFD',
        description: 'Task one',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'sn-x',
              display_counter: '1',
              children: []
            }
          ]
        }
      }
    ]
    const overlayNodes = {
      'sn-x': {
        assignment_users: [{ id: 9, name: 'Reviewer Nine' }],
        comment_count: 1,
        is_resolved: false
      }
    }
    const patch = jest.fn(() =>
      Promise.reject({
        response: { status: 403, data: { error: 'Forbidden' } }
      })
    )
    document.cookie = `user_info=${encodeURIComponent(
      JSON.stringify({ id: 99, role: 'editor' })
    )}; path=/`
    const store = new Vuex.Store({
      state: { notifications: [] },
      mutations: { ADD_NOTIFICATION () {} }
    })
    const toast = { success: jest.fn(), error: jest.fn() }
    const get = jest.fn((url, config) => {
      if (url === '/meeting_dashboard/published') {
        return Promise.resolve({
          data: {
            tasks,
            meeting_dashboard_version_id: 42,
            published_at: '2026-03-01T12:00:00Z',
            meeting_date: '2026-03-10',
            schedule_meeting_date: '2026-03-10',
            target_meeting_date: '2026-03-10'
          }
        })
      }
      if (url === '/meeting_dashboard/draft_editor_overlay') {
        return Promise.resolve({
          data: { new_dashboard_version_id: 42, nodes: overlayNodes }
        })
      }
      if (url === '/meeting_dashboard/draft_settings') {
        return Promise.resolve({ data: { target_meeting_date: '2026-03-20' } })
      }
      return Promise.reject(new Error(`unexpected GET ${url}`))
    })
    const w = shallowMount(NewTaskReviewHub, {
      localVue,
      store,
      mocks: {
        $http: { secured: { get, patch } },
        $route: { query: { dashboard_version_id: '42' } },
        $router: { back: jest.fn(), push: jest.fn() },
        $toast: toast
      }
    })
    await flushPromises()
    w.find('.nth-resolve-tick:not(.nth-resolve-tick--resolved)').trigger('click')
    await flushPromises()
    expect(toast.error).toHaveBeenCalledWith('Forbidden')
  })

  it('editor clicks Resolved PATCHes resolved:false and refetches overlay', async () => {
    const tasks = [
      {
        id: 1,
        sector_division: 'IFD',
        description: 'Task one',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'sn-x',
              display_counter: '1',
              children: []
            }
          ]
        }
      }
    ]
    const overlayNodes = {
      'sn-x': {
        assignment_users: [{ id: 9, name: 'Reviewer Nine' }],
        comment_count: 1,
        is_resolved: true,
        resolved_at: '2026-04-05T12:00:00Z',
        resolved_by: { id: 1, name: 'Editor One' }
      }
    }
    const overlayAfterUnresolve = {
      'sn-x': {
        assignment_users: [{ id: 9, name: 'Reviewer Nine' }],
        comment_count: 1,
        is_resolved: false
      }
    }
    const { wrapper: w, patch, get, toast } = mountHub({
      tasks,
      overlayNodes,
      overlayAfterResolve: overlayAfterUnresolve,
      role: 'editor'
    })
    await flushPromises()

    const doneBtn = w.find('.nth-resolve-tick--resolved')
    expect(doneBtn.exists()).toBe(true)
    expect(doneBtn.attributes('aria-label')).toMatch(/unresolved/)

    doneBtn.trigger('click')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith(
      '/meeting_dashboard/dashboard_pack_nodes/42/resolve',
      { stable_node_id: 'sn-x', resolved: false }
    )

    const overlayGets = get.mock.calls.filter((c) => c[0] === '/meeting_dashboard/draft_editor_overlay')
    expect(overlayGets.length).toBeGreaterThanOrEqual(2)

    expect(toast.success).toHaveBeenCalledWith('Marked unresolved.')

    expect(w.find('.nth-resolve-tick:not(.nth-resolve-tick--resolved)').exists()).toBe(true)
  })

  it('shows toast error on PATCH 422 with server message', async () => {
    const tasks = [
      {
        id: 1,
        sector_division: 'IFD',
        description: 'Task one',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'sn-x',
              display_counter: '1',
              children: []
            }
          ]
        }
      }
    ]
    const overlayNodes = {
      'sn-x': {
        assignment_users: [{ id: 9, name: 'Reviewer Nine' }],
        comment_count: 1,
        is_resolved: false
      }
    }
    const patch = jest.fn(() =>
      Promise.reject({
        response: {
          status: 422,
          data: { error: 'stable_node_id is required' }
        }
      })
    )
    document.cookie = `user_info=${encodeURIComponent(
      JSON.stringify({ id: 99, role: 'editor' })
    )}; path=/`
    const store = new Vuex.Store({
      state: { notifications: [] },
      mutations: { ADD_NOTIFICATION () {} }
    })
    const toast = { success: jest.fn(), error: jest.fn() }
    const get = jest.fn((url, config) => {
      if (url === '/meeting_dashboard/published') {
        return Promise.resolve({
          data: {
            tasks,
            meeting_dashboard_version_id: 42,
            published_at: '2026-03-01T12:00:00Z',
            meeting_date: '2026-03-10',
            schedule_meeting_date: '2026-03-10',
            target_meeting_date: '2026-03-10'
          }
        })
      }
      if (url === '/meeting_dashboard/draft_editor_overlay') {
        return Promise.resolve({
          data: { new_dashboard_version_id: 42, nodes: overlayNodes }
        })
      }
      if (url === '/meeting_dashboard/draft_settings') {
        return Promise.resolve({ data: { target_meeting_date: '2026-03-20' } })
      }
      return Promise.reject(new Error(`unexpected GET ${url}`))
    })
    const w = shallowMount(NewTaskReviewHub, {
      localVue,
      store,
      mocks: {
        $http: { secured: { get, patch } },
        $route: { query: { dashboard_version_id: '42' } },
        $router: { back: jest.fn(), push: jest.fn() },
        $toast: toast
      }
    })
    await flushPromises()
    w.find('.nth-resolve-tick:not(.nth-resolve-tick--resolved)').trigger('click')
    await flushPromises()
    expect(toast.error).toHaveBeenCalledWith('stable_node_id is required')
  })

  it('opens and closes filter panel via funnel trigger and Escape', async () => {
    const tasks = [
      {
        id: 1,
        sector_division: 'IFD',
        description: 'Task one',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'sn-x',
              display_counter: '1',
              children: []
            }
          ]
        }
      }
    ]
    const overlayNodes = {
      'sn-x': {
        assignment_users: [{ id: 9, name: 'Reviewer Nine' }],
        comment_count: 1
      }
    }
    const { wrapper: w } = mountHub({ tasks, overlayNodes })
    await flushPromises()

    expect(w.vm.filterPanelOpen).toBe(false)
    w.find('.nth-filter-trigger').trigger('click')
    await w.vm.$nextTick()
    expect(w.vm.filterPanelOpen).toBe(true)
    expect(w.find('.nth-filter-panel').exists()).toBe(true)

    const esc = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    document.dispatchEvent(esc)
    await w.vm.$nextTick()
    expect(w.vm.filterPanelOpen).toBe(false)
  })

  it('sector select reduces visible rows; Clear all resets', async () => {
    const tasks = [
      {
        id: 1,
        sector_division: 'IFD',
        description: 'A',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'sn-a',
              display_counter: '1',
              children: []
            }
          ]
        }
      },
      {
        id: 2,
        sector_division: 'MOF',
        description: 'B',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'sn-b',
              display_counter: '1',
              children: []
            }
          ]
        }
      }
    ]
    const overlayNodes = {
      'sn-a': {
        assignment_users: [{ id: 1, name: 'U1' }],
        comment_count: 1
      },
      'sn-b': {
        assignment_users: [{ id: 2, name: 'U2' }],
        comment_count: 1
      }
    }
    const { wrapper: w } = mountHub({ tasks, overlayNodes })
    await flushPromises()

    expect(w.vm.filteredRows).toHaveLength(2)

    w.find('.nth-filter-trigger').trigger('click')
    await w.vm.$nextTick()
    const sel = w.find('.nth-filter-select')
    sel.element.value = 'MOF'
    sel.trigger('change')
    await w.vm.$nextTick()

    expect(w.vm.filteredRows).toHaveLength(1)
    expect(w.vm.filteredRows[0].stableNodeId).toBe('sn-b')

    w.find('.nth-filter-panel-clear').trigger('click')
    await w.vm.$nextTick()
    expect(w.vm.filteredRows).toHaveLength(2)
    expect(w.vm.sectorFilter).toBe('ALL')
    expect(w.vm.filterPanelOpen).toBe(false)
  })

  it('combines My assignments with sector (intersection)', async () => {
    const tasks = [
      {
        id: 1,
        sector_division: 'IFD',
        description: 'A',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'sn-x',
              display_counter: '1',
              children: []
            }
          ]
        }
      },
      {
        id: 2,
        sector_division: 'MOF',
        description: 'B',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'sn-y',
              display_counter: '1',
              children: []
            }
          ]
        }
      }
    ]
    const overlayNodes = {
      'sn-x': {
        assignment_users: [{ id: 9, name: 'Me' }],
        comment_count: 1
      },
      'sn-y': {
        assignment_users: [{ id: 8, name: 'Other' }],
        comment_count: 1
      }
    }
    const { wrapper: w } = mountHub({
      tasks,
      overlayNodes,
      userId: 9,
      role: 'reviewer'
    })
    await flushPromises()

    w.find('.nth-filter-trigger').trigger('click')
    await w.vm.$nextTick()
    w.findAll('.nth-filter-panel .nth-filter-btn').at(0).trigger('click')
    await w.vm.$nextTick()
    expect(w.vm.filterOwn).toBe(true)
    expect(w.vm.filteredRows).toHaveLength(1)

    const sel = w.find('.nth-filter-select')
    sel.element.value = 'MOF'
    sel.trigger('change')
    await w.vm.$nextTick()
    expect(w.vm.filteredRows).toHaveLength(0)
  })
})
