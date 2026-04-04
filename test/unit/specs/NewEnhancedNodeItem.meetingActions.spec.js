/**
 * Node context menu actions (new flow) — emits match NewEnhancedNodeEditor handlers.
 * Covers items from the ⋮ menu: add/move/duplicate/delete/complete.
 */
import { shallowMount } from '@vue/test-utils'
import NewEnhancedNodeItem from '@/components/NewEnhancedNodeItem.vue'
import { flushPromises } from '../helpers/meeting-test-utils'

describe('NewEnhancedNodeItem.vue (action menu)', () => {
  const baseNode = {
    id: 42,
    content: '<p>Node body</p>',
    level: 1,
    list_style: 'decimal',
    node_type: 'point',
    position: 1,
    completed: false,
    review_date: null,
    reviewer_id: null
  }

  function mountItem (props = {}) {
    const { node: nodePatch, siblings, index, ...rest } = props
    const node = { ...baseNode, ...(nodePatch || {}) }
    return shallowMount(NewEnhancedNodeItem, {
      propsData: {
        ...rest,
        node,
        siblings: siblings || [node],
        index: index != null ? index : 0,
        readonly: false,
        meetingDraftTaskId: 99,
        taskVersionId: null
      },
      stubs: { NewEnhancedNodeItem: true },
      mocks: {
        $http: {
          secured: {
            get: jest.fn(() =>
              Promise.resolve({ data: { success: true, events: [] } })
            )
          }
        },
        $toast: { error: jest.fn(), success: jest.fn() }
      }
    })
  }

  let wrapper

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy()
      wrapper = null
    }
  })

  async function openMenu () {
    wrapper.find('.dropdown-toggle').trigger('click')
    await wrapper.vm.$nextTick()
    await flushPromises()
  }

  function clickActionContaining (substring) {
    const items = wrapper.findAll('.action-item')
    for (let i = 0; i < items.length; i++) {
      const w = items.at(i)
      if (w.text().indexOf(substring) !== -1) {
        w.trigger('click')
        return
      }
    }
    throw new Error(`No action item containing "${substring}"`)
  }

  it('emits add-point-same-level from + Add Point (Same Level)', async () => {
    wrapper = mountItem()
    await openMenu()
    clickActionContaining('Add Point (Same Level)')
    expect(wrapper.emitted('add-point-same-level')).toBeTruthy()
    expect(wrapper.emitted('add-point-same-level')[0][0].id).toBe(42)
  })

  it('emits add-subpoint from → Add Subpoint', async () => {
    wrapper = mountItem()
    await openMenu()
    clickActionContaining('Add Subpoint')
    expect(wrapper.emitted('add-subpoint')).toBeTruthy()
  })

  it('emits move-node up / down', async () => {
    const n1 = { ...baseNode, id: 1, position: 1 }
    const n2 = { ...baseNode, id: 2, position: 2 }
    wrapper = shallowMount(NewEnhancedNodeItem, {
      propsData: {
        node: n2,
        siblings: [n1, n2],
        index: 1,
        readonly: false,
        meetingDraftTaskId: 99
      },
      stubs: { NewEnhancedNodeItem: true },
      mocks: {
        $http: { secured: { get: jest.fn(() => Promise.resolve({ data: { success: true, events: [] } })) } },
        $toast: { error: jest.fn() }
      }
    })
    await openMenu()
    clickActionContaining('Move Up')
    expect(wrapper.emitted('move-node')).toBeTruthy()
    expect(wrapper.emitted('move-node')[0]).toEqual([2, 'up'])

    wrapper = shallowMount(NewEnhancedNodeItem, {
      propsData: {
        node: n1,
        siblings: [n1, n2],
        index: 0,
        readonly: false,
        meetingDraftTaskId: 99
      },
      stubs: { NewEnhancedNodeItem: true },
      mocks: {
        $http: { secured: { get: jest.fn(() => Promise.resolve({ data: { success: true, events: [] } })) } },
        $toast: { error: jest.fn() }
      }
    })
    await openMenu()
    clickActionContaining('Move Down')
    expect(wrapper.emitted('move-node')[0]).toEqual([1, 'down'])
  })

  it('emits duplicate-node and delete-node', async () => {
    wrapper = mountItem()
    await openMenu()
    clickActionContaining('Duplicate')
    expect(wrapper.emitted('duplicate-node')).toBeTruthy()

    wrapper = mountItem()
    await openMenu()
    clickActionContaining('Delete')
    expect(wrapper.emitted('delete-node')).toBeTruthy()
    expect(wrapper.emitted('delete-node')[0]).toEqual([42])
  })

  it('emits update-node with completed when toggling Mark Complete', async () => {
    wrapper = mountItem({ node: { completed: false } })
    await openMenu()
    clickActionContaining('Mark Complete')
    expect(wrapper.emitted('update-node')).toBeTruthy()
    expect(wrapper.emitted('update-node')[0]).toEqual([42, { completed: true }])
  })
})
