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
      return Promise.resolve({
        data: {
          new_dashboard_version_id: 42,
          nodes: opts.overlayNodes || {}
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
  const store = new Vuex.Store({
    state: { notifications: [] },
    mutations: {
      ADD_NOTIFICATION () {}
    }
  })
  return shallowMount(NewTaskReviewHub, {
    localVue,
    store,
    mocks: {
      $http: { secured: { get } },
      $route: {
        query: { dashboard_version_id: '42' }
      },
      $router: { back: jest.fn(), push: jest.fn() },
      $toast: { success: jest.fn(), error: jest.fn() }
    }
  })
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
    const w = mountHub({ tasks, overlayNodes })
    await flushPromises()
    expect(w.text()).toContain('Version #42')
    expect(w.text()).toContain('IFD')
    expect(w.text()).toContain('Reviewer Nine')
    expect(w.text()).toContain('Assigned & commented')
  })

  it('shows warning when dashboard_version_id missing', () => {
    const store = new Vuex.Store({})
    const w = shallowMount(NewTaskReviewHub, {
      localVue,
      store,
      mocks: {
        $http: { secured: { get: jest.fn() } },
        $route: { query: {} },
        $router: { back: jest.fn(), push: jest.fn() },
        $toast: {}
      }
    })
    expect(w.text()).toContain('Missing')
  })
})
