import {
  buildActionNodeIdMap,
  formatActionNodePointerFromMap,
  nodeContentFingerprint,
  summarizeUnsavedNodeChanges
} from '@/utils/actionNodeChangeSummary'

describe('actionNodeChangeSummary', () => {
  it('formats compound pointer along parent_id chain', () => {
    const flat = [
      { id: 1, parent_id: null, display_counter: '3', level: 1, list_style: 'decimal' },
      { id: 2, parent_id: 1, display_counter: 'c', level: 2, list_style: 'lower-alpha' },
      { id: 3, parent_id: 2, display_counter: 'iii', level: 3, list_style: 'lower-roman' }
    ]
    const map = buildActionNodeIdMap(flat)
    expect(formatActionNodePointerFromMap(flat[2], map)).toBe('3(c)(iii)')
  })

  it('detects added temp ids, updated content, and deleted persisted nodes', () => {
    const baseline = {
      '10': JSON.stringify(nodeContentFingerprint({ id: 10, content: 'A', parent_id: null, level: 1, list_style: 'decimal', position: 1 })),
      '11': JSON.stringify(nodeContentFingerprint({ id: 11, content: 'B', parent_id: null, level: 1, list_style: 'decimal', position: 2 }))
    }
    const flat = [
      { id: 10, parent_id: null, display_counter: '1', content: 'A2', level: 1, list_style: 'decimal', position: 1 },
      { id: -1, parent_id: null, display_counter: '2', content: 'N', level: 1, list_style: 'decimal', position: 2, isTemp: true }
    ]
    const s = summarizeUnsavedNodeChanges(flat, baseline)
    expect(s.added).toEqual(['2'])
    expect(s.updated).toEqual(['1'])
    expect(s.deletedCount).toBe(1)
  })
})
