/**
 * New flow: create/edit meeting draft tasks via NewTaskModal + meeting_dashboard APIs.
 */
import { shallowMount } from '@vue/test-utils'
import NewTaskModal from '@/components/NewTaskModal.vue'
import { flushPromises, ymdDaysFromNow } from '../helpers/meeting-test-utils'
import { PACK_HIGHLIGHT_MODE } from '@/utils/meetingPackHighlightFilter'

const EditorStub = {
  name: 'NewEnhancedNodeEditor',
  props: [
    'meetingEditorOverlay',
    'meetingPackHighlightMode',
    'initialNodes',
    'taskVersionId',
    'meetingDraftTaskId'
  ],
  template: '<div data-test="node-editor-stub" />'
}

jest.mock('@/utils/meetingDashboardUi', () => ({
  isMeetingDashboardUiEnabled: jest.fn(() => true)
}))

const sampleTreeNode = {
  id: 1001,
  content: '<p>Sample action content</p>',
  level: 1,
  list_style: 'decimal',
  node_type: 'point',
  position: 1,
  parent_id: null,
  review_date: null,
  completed: false
}

describe('NewTaskModal.vue (meeting_dashboard draft)', () => {
  let wrapper

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
      wrapper = null
    }
    jest.clearAllMocks()
  })

  it('edit: PUT meeting task includes updated sector, review_date, and tag_ids', async () => {
    const put = jest.fn(() =>
      Promise.resolve({ data: { success: true, data: {} } })
    )
    const get = jest.fn((url) => {
      if (url.includes('/meeting_dashboard/tasks/77/nodes')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ node: sampleTreeNode, children: [] }]
          }
        })
      }
      return Promise.resolve({ data: {} })
    })

    const task = {
      id: 77,
      meeting_dashboard_draft: true,
      sector_division: 'OldSector',
      description: 'Desc',
      responsibility: 'Resp',
      original_date: '2026-01-10T00:00:00.000Z',
      review_date: '2026-01-12T00:00:00.000Z',
      tags: [{ id: 1, name: 'Alpha' }]
    }

    wrapper = shallowMount(NewTaskModal, {
      propsData: { task, mode: 'edit' },
      stubs: { NewEnhancedNodeEditor: true, datepicker: true },
      mocks: {
        $http: { secured: { get, put, post: jest.fn() } },
        $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }
      }
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    wrapper.vm.formData.sector_division = 'NewSector'
    wrapper.vm.formData.review_date = new Date('2026-06-15')
    wrapper.vm.selectedTags = [
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' }
    ]
    wrapper.vm.flatActionNodes = [
      {
        id: 1001,
        content: '<p>Sample action content</p>',
        level: 1,
        list_style: 'decimal',
        node_type: 'point',
        position: 1
      }
    ]

    await wrapper.vm.saveTask()
    await flushPromises()

    expect(put).toHaveBeenCalledWith(
      '/meeting_dashboard/tasks/77',
      expect.objectContaining({
        task: expect.objectContaining({
          sector_division: 'NewSector',
          tag_ids: [1, 2]
        }),
        action_nodes: expect.any(Array)
      })
    )
    const body = put.mock.calls[0][1]
    expect(body.task.review_date).toBeTruthy()
  })

  it('add: POST /meeting_dashboard/tasks creates a new task with action nodes', async () => {
    const post = jest.fn(() =>
      Promise.resolve({ data: { success: true, data: { id: 999 } } })
    )

    wrapper = shallowMount(NewTaskModal, {
      propsData: { task: null, mode: 'add' },
      stubs: { NewEnhancedNodeEditor: true, datepicker: true },
      mocks: {
        $http: { secured: { get: jest.fn(), post, put: jest.fn() } },
        $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }
      }
    })

    await flushPromises()

    const rd = new Date(ymdDaysFromNow(20))
    const od = new Date(ymdDaysFromNow(18))
    wrapper.setData({
      formData: {
        sector_division: 'NewSector',
        description: 'Brand new task',
        responsibility: 'Team',
        original_date: od,
        review_date: rd,
        action_to_be_taken: ''
      },
      flatActionNodes: [
        {
          id: -1,
          content: '<p>First point</p>',
          level: 1,
          list_style: 'decimal',
          node_type: 'point',
          position: 1
        },
        {
          id: -2,
          content: '<p>Second point</p>',
          level: 1,
          list_style: 'decimal',
          node_type: 'point',
          position: 2
        }
      ]
    })

    await wrapper.vm.saveTask()
    await flushPromises()

    expect(post).toHaveBeenCalledWith(
      '/meeting_dashboard/tasks',
      expect.objectContaining({
        task: expect.objectContaining({
          sector_division: 'NewSector',
          description: 'Brand new task'
        }),
        action_nodes: expect.arrayContaining([
          expect.objectContaining({ content: expect.stringContaining('First point') }),
          expect.objectContaining({ content: expect.stringContaining('Second point') })
        ])
      })
    )
  })

  it('edit: fetches draft_editor_overlay and passes overlay + pack mode to NewEnhancedNodeEditor', async () => {
    const overlayNodes = {
      'node-stable-1': {
        assignment_users: [{ id: 1, name: 'A' }],
        comment_count: 0
      }
    }
    const get = jest.fn((url, config) => {
      if (url.includes('/meeting_dashboard/tasks/77/nodes')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ node: { ...sampleTreeNode, stable_node_id: 'node-stable-1' }, children: [] }]
          }
        })
      }
      if (url.includes('/meeting_dashboard/draft_editor_overlay')) {
        expect(config.params).toEqual({ new_dashboard_version_id: 42 })
        return Promise.resolve({ data: { nodes: overlayNodes } })
      }
      return Promise.resolve({ data: {} })
    })

    const task = {
      id: 77,
      meeting_dashboard_draft: true,
      sector_division: 'S',
      description: 'D',
      responsibility: 'R',
      original_date: '2026-01-10T00:00:00.000Z',
      review_date: '2026-01-12T00:00:00.000Z',
      tags: []
    }

    wrapper = shallowMount(NewTaskModal, {
      propsData: {
        task,
        mode: 'edit',
        meetingOverlayVersionId: 42,
        packHighlightMode: PACK_HIGHLIGHT_MODE.RED
      },
      stubs: { NewEnhancedNodeEditor: EditorStub, datepicker: true },
      mocks: {
        $http: { secured: { get, put: jest.fn(), post: jest.fn() } },
        $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }
      }
    })

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(get).toHaveBeenCalledWith(
      '/meeting_dashboard/draft_editor_overlay',
      expect.objectContaining({ params: { new_dashboard_version_id: 42 } })
    )
    expect(wrapper.vm.meetingEditorOverlay).toEqual(overlayNodes)

    const editor = wrapper.findComponent(EditorStub)
    expect(editor.exists()).toBe(true)
    expect(editor.props('meetingEditorOverlay')).toEqual(overlayNodes)
    expect(editor.props('meetingPackHighlightMode')).toBe(PACK_HIGHLIGHT_MODE.RED)
  })
})
