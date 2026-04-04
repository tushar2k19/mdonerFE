import {
  flattenHubRows,
  applyHubFilters,
  formatNodePathFromSegments,
  hubStatusKey,
  HUB_STATUS
} from '@/utils/reviewHubMatrix'

describe('reviewHubMatrix', () => {
  it('formatNodePathFromSegments builds hierarchical labels', () => {
    expect(
      formatNodePathFromSegments([
        { counter: '1', list_style: 'decimal' },
        { counter: 'a', list_style: 'lower-alpha' },
        { counter: 'ii', list_style: 'lower-roman' }
      ])
    ).toBe('1(a)(ii)')
  })

  it('hubStatusKey matches R/G/B product rules', () => {
    expect(hubStatusKey(true, true)).toBe(HUB_STATUS.ASSIGNED_COMMENTED)
    expect(hubStatusKey(false, true)).toBe(HUB_STATUS.UNASSIGNED_COMMENTED)
    expect(hubStatusKey(true, false)).toBe(HUB_STATUS.ASSIGNED_PENDING)
    expect(hubStatusKey(false, false)).toBe(null)
  })

  it('flattenHubRows only includes assigned or commented nodes', () => {
    const tasks = [
      {
        id: 10,
        sector_division: 'S1',
        description: 'D1',
        current_version: {
          action_nodes: [
            {
              stable_node_id: 'n1',
              display_counter: '1',
              children: [
                {
                  stable_node_id: 'n2',
                  display_counter: 'a',
                  children: []
                }
              ]
            }
          ]
        }
      }
    ]
    const overlay = {
      n1: {
        assignment_users: [{ id: 1, name: 'A' }],
        comment_count: 0
      },
      n2: {
        assignment_users: [],
        comment_count: 2
      }
    }
    const rows = flattenHubRows(tasks, overlay)
    expect(rows).toHaveLength(2)
    const r1 = rows.find((r) => r.stableNodeId === 'n1')
    const r2 = rows.find((r) => r.stableNodeId === 'n2')
    expect(r1.statusKey).toBe(HUB_STATUS.ASSIGNED_PENDING)
    expect(r2.statusKey).toBe(HUB_STATUS.UNASSIGNED_COMMENTED)
    expect(r2.nodeLabel).toBe('1(a)')
  })

  it('applyHubFilters ANDs toggles', () => {
    const rows = [
      {
        stableNodeId: 'a',
        assigned: true,
        commented: true,
        assigneeIds: [5]
      },
      {
        stableNodeId: 'b',
        assigned: true,
        commented: false,
        assigneeIds: [5]
      },
      {
        stableNodeId: 'c',
        assigned: false,
        commented: true,
        assigneeIds: []
      }
    ]
    expect(
      applyHubFilters(rows, {
        ownOnly: true,
        assignedOnly: false,
        commentedOnly: false,
        currentUserId: 5
      })
    ).toHaveLength(2)
    expect(
      applyHubFilters(rows, {
        ownOnly: false,
        assignedOnly: true,
        commentedOnly: true,
        currentUserId: null
      })
    ).toHaveLength(1)
    expect(
      applyHubFilters(rows, {
        ownOnly: false,
        assignedOnly: true,
        commentedOnly: true,
        currentUserId: null
      })[0].stableNodeId
    ).toBe('a')
  })
})
