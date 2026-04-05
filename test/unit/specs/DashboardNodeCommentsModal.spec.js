import { shallowMount } from '@vue/test-utils'
import DashboardNodeCommentsModal from '@/components/DashboardNodeCommentsModal.vue'
import { flushPromises, clearCookies } from '../helpers/meeting-test-utils'

function mountModal(opts = {}) {
  const get = jest.fn((url) => {
    if (url === '/meeting_dashboard/dashboard_node_comments') {
      return Promise.resolve({ data: { comments: opts.comments || [] } })
    }
    return Promise.reject(new Error(`unexpected GET ${url}`))
  })
  const patch = jest.fn(() =>
    Promise.resolve({
      data: {
        success: true,
        stable_node_id: opts.stableNodeId || 'sid-1',
        resolved: true,
        resolved_at: '2026-04-05T12:00:00Z',
        resolved_by_id: 1
      }
    })
  )
  const toast = { success: jest.fn(), error: jest.fn() }
  const w = shallowMount(DashboardNodeCommentsModal, {
    propsData: {
      visible: true,
      versionId: opts.versionId != null ? opts.versionId : 5,
      stableNodeId: opts.stableNodeId || 'sid-1',
      currentUserId: 1,
      userRole: opts.userRole != null ? opts.userRole : 'editor',
      nodeContext: opts.nodeContext || null,
      isNodeResolved: !!opts.isNodeResolved
    },
    mocks: {
      $http: { secured: { get, patch, post: jest.fn(), put: jest.fn(), delete: jest.fn() } },
      $toast: toast
    }
  })
  return { wrapper: w, get, patch, toast }
}

describe('DashboardNodeCommentsModal', () => {
  afterEach(() => {
    clearCookies()
  })

  it('editor sees Mark resolved and PATCH emits resolution-changed', async () => {
    const { wrapper: w, patch, toast } = mountModal({ isNodeResolved: false })
    await flushPromises()

    const btn = w.find('.dnc-resolve-btn-mark')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('Mark resolved')

    btn.trigger('click')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith(
      '/meeting_dashboard/dashboard_pack_nodes/5/resolve',
      { stable_node_id: 'sid-1', resolved: true }
    )
    expect(toast.success).toHaveBeenCalled()
    expect(w.emitted('resolution-changed')).toBeTruthy()
    expect(w.emitted('resolution-changed')[0][0]).toEqual({
      stableNodeId: 'sid-1',
      resolved: true
    })
  })

  it('editor when resolved shows Unresolve and PATCHes false', async () => {
    const { wrapper: w, patch } = mountModal({ isNodeResolved: true })
    await flushPromises()

    expect(w.find('.dnc-resolve-btn-mark').exists()).toBe(false)
    const un = w.find('.dnc-resolve-btn-unresolve')
    expect(un.exists()).toBe(true)
    un.trigger('click')
    await flushPromises()

    expect(patch).toHaveBeenCalledWith(
      '/meeting_dashboard/dashboard_pack_nodes/5/resolve',
      { stable_node_id: 'sid-1', resolved: false }
    )
  })

  it('reviewer does not see resolve controls', async () => {
    const { wrapper: w } = mountModal({ userRole: 'reviewer', isNodeResolved: false })
    await flushPromises()

    expect(w.find('.dnc-resolve-btn-mark').exists()).toBe(false)
    expect(w.find('.dnc-resolve-btn-unresolve').exists()).toBe(false)
  })

  it('renders title as "Comments" (not "Node discussion")', async () => {
    const { wrapper: w } = mountModal()
    await flushPromises()

    expect(w.find('.dnc-title').text()).toBe('Comments')
  })

  it('shows sector badge when nodeContext.taskSector is provided', async () => {
    const { wrapper: w } = mountModal({
      nodeContext: {
        taskDescription: 'Exhibition test',
        taskSector: 'Infrastructure',
        nodeLabel: '1.b',
        nodeHierarchyPath: '1(b)',
        nodeContentPreview: 'Some preview text',
        nodeContentFull: 'Some preview text that is the full content'
      }
    })
    await flushPromises()

    const badge = w.find('.dnc-sector-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Infrastructure')
  })

  it('shows hierarchical node path with parenthetical notation', async () => {
    const { wrapper: w } = mountModal({
      nodeContext: {
        taskDescription: 'Exhibition test',
        taskSector: 'Infra',
        nodeLabel: '1.b.iii',
        nodeHierarchyPath: '1(b)(iii)',
        nodeContentPreview: 'Short text',
        nodeContentFull: 'Short text'
      }
    })
    await flushPromises()

    const nodePath = w.find('.dnc-node-path')
    expect(nodePath.exists()).toBe(true)
    expect(nodePath.text()).toContain('1(b)(iii)')
  })

  it('renders chat-style bubbles with avatars', async () => {
    const { wrapper: w } = mountModal({
      comments: [
        { id: 1, user_id: 1, user_name: 'Jane Doe', body: 'My message', created_at: '2026-04-05T10:00:00Z' },
        { id: 2, user_id: 2, user_name: 'Bob Smith', body: 'Their message', created_at: '2026-04-05T10:01:00Z' }
      ]
    })
    await flushPromises()

    const bubbles = w.findAll('.dnc-bubble-wrap')
    expect(bubbles.length).toBe(2)

    // First bubble is mine
    expect(bubbles.at(0).classes()).toContain('mine')

    // Avatars rendered
    const avatars = w.findAll('.dnc-avatar')
    expect(avatars.length).toBe(2)
    expect(avatars.at(0).text()).toBe('JD') // Jane Doe initials
    expect(avatars.at(1).text()).toBe('BS') // Bob Smith initials
  })

  it('shows empty state when no comments', async () => {
    const { wrapper: w } = mountModal({ comments: [] })
    await flushPromises()

    const empty = w.find('.dnc-empty-state')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('No messages yet')
  })
})
