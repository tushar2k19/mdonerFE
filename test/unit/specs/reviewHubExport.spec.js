import {
  stripHtml,
  truncateText,
  mapWithConcurrency,
  fetchCommentExcerptsForRows,
  buildExportRowViews
} from '@/utils/reviewHubExport'

describe('reviewHubExport', () => {
  it('stripHtml removes tags and collapses space', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world')
  })

  it('truncateText adds ellipsis', () => {
    expect(truncateText('abcdef', 4)).toBe('abc…')
  })

  it('mapWithConcurrency runs bounded parallelism', async () => {
    let peak = 0
    let running = 0
    const delays = [20, 10, 30, 5]
    const results = await mapWithConcurrency(delays, 2, async (ms) => {
      running++
      peak = Math.max(peak, running)
      await new Promise((r) => setTimeout(r, ms))
      running--
      return ms * 2
    })
    expect(results).toEqual([40, 20, 60, 10])
    expect(peak).toBeLessThanOrEqual(2)
  })

  it('fetchCommentExcerptsForRows fills excerpts by row index', async () => {
    const rows = [
      { stableNodeId: 'a', commentCount: 0 },
      { stableNodeId: 'b', commentCount: 1 },
      { stableNodeId: 'c', commentCount: 2 }
    ]
    const get = jest.fn((url, config) => {
      expect(url).toBe('/meeting_dashboard/dashboard_node_comments')
      const sid = config.params.stable_node_id
      if (sid === 'b') {
        return Promise.resolve({ data: { comments: [{ body: '<p>First</p>' }] } })
      }
      if (sid === 'c') {
        return Promise.resolve({ data: { comments: [{ body: 'Second note' }] } })
      }
      return Promise.reject(new Error('unexpected'))
    })
    const excerpts = await fetchCommentExcerptsForRows({ get }, 99, rows, {
      concurrency: 2,
      excerptMaxLen: 100
    })
    expect(excerpts[0]).toBe('')
    expect(excerpts[1]).toBe('First')
    expect(excerpts[2]).toBe('Second note')
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('buildExportRowViews merges excerpts and status labels', () => {
    const rows = [{ statusKey: 'assigned_commented', commentCount: 1 }]
    const excerpts = ['ex1']
    const views = buildExportRowViews(rows, excerpts, () => 'L')
    expect(views[0].statusLabel).toBe('L')
    expect(views[0].commentExcerpt).toBe('ex1')
  })
})
