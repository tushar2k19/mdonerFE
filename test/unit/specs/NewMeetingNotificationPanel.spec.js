import { shallowMount, createLocalVue } from '@vue/test-utils'
import NewMeetingNotificationPanel from '@/components/NewMeetingNotificationPanel.vue'
import { flushPromises } from '../helpers/meeting-test-utils'

const mockFetchNotifications = jest.fn()
const mockSubscribeToStream = jest.fn()
const mockMarkRead = jest.fn()
const mockMarkAllRead = jest.fn()

jest.mock('@/services/MeetingNotificationService', () => {
  return jest.fn().mockImplementation(() => ({
    fetchNotifications: mockFetchNotifications,
    subscribeToStream: mockSubscribeToStream,
    markRead: mockMarkRead,
    markAllRead: mockMarkAllRead
  }))
})

const localVue = createLocalVue()

describe('NewMeetingNotificationPanel', () => {
  beforeEach(() => {
    mockFetchNotifications.mockReset()
    mockSubscribeToStream.mockReset()
    mockMarkRead.mockReset()
    mockMarkAllRead.mockReset()
    mockSubscribeToStream.mockReturnValue({ close: jest.fn() })
    mockFetchNotifications.mockResolvedValue([])
  })

  it('navigates to NewTaskReviewHub with focus query on row click', async () => {
    mockFetchNotifications.mockResolvedValue([
      {
        id: 22,
        kind: 'pack_assignment_created',
        body: 'Editor needs inputs from you on Node 1(a). Click to respond now.',
        read_at: null,
        created_at: '2026-04-07T10:00:00Z',
        payload: {
          new_dashboard_version_id: 42,
          stable_node_id: 'sn-22',
          node_label: '1(a)'
        }
      }
    ])
    mockMarkRead.mockResolvedValue(true)
    const push = jest.fn()

    const wrapper = shallowMount(NewMeetingNotificationPanel, {
      localVue,
      mocks: {
        $http: { secured: { defaults: { baseURL: '' } } },
        $router: { push }
      }
    })
    await flushPromises()

    await wrapper.vm.onRowClick(wrapper.vm.notifications[0])
    expect(mockMarkRead).toHaveBeenCalledWith(22)
    expect(push).toHaveBeenCalledWith({
      name: 'NewTaskReviewHub',
      query: {
        dashboard_version_id: '42',
        focus_stable_node_id: 'sn-22'
      }
    })
  })
})
