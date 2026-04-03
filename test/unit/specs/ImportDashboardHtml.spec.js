import { shallowMount } from '@vue/test-utils'
import ImportDashboardHtml from '@/components/ImportDashboardHtml.vue'

describe('ImportDashboardHtml.vue', () => {
  it('renders import title and stays available for future HTML import flow', () => {
    const wrapper = shallowMount(ImportDashboardHtml, {
      stubs: { EnhancedNodeEditor: true },
      mocks: {
        $http: {
          secured: {
            post: jest.fn(() => Promise.resolve({ data: {} }))
          }
        }
      }
    })
    expect(wrapper.find('h2').text()).toContain('Import Dashboard HTML')
    expect(wrapper.find('.import-root').exists()).toBe(true)
  })
})
