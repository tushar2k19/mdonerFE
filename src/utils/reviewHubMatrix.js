/**
 * Build Review Hub matrix rows from published snapshot tasks + draft_editor_overlay.nodes.
 * Only nodes with at least one assignment OR at least one comment are included (product: R/G/B states).
 */

export const HUB_STATUS = {
  ASSIGNED_COMMENTED: 'assigned_commented',
  UNASSIGNED_COMMENTED: 'unassigned_commented',
  ASSIGNED_PENDING: 'assigned_pending'
}

export function hubStatusKey (assigned, commented) {
  if (assigned && commented) return HUB_STATUS.ASSIGNED_COMMENTED
  if (!assigned && commented) return HUB_STATUS.UNASSIGNED_COMMENTED
  if (assigned && !commented) return HUB_STATUS.ASSIGNED_PENDING
  return null
}

export function formatNodePathFromSegments (segments) {
  if (!segments || !segments.length) return '—'
  const first = String(segments[0].counter || '').trim()
  if (!first) return '—'
  let s = first
  for (let i = 1; i < segments.length; i++) {
    const c = String(segments[i].counter || '').trim()
    if (c) s += `(${c})`
  }
  return s || '—'
}

export function flattenHubRows (tasks, overlayNodesMap) {
  const map = overlayNodesMap && typeof overlayNodesMap === 'object' ? overlayNodesMap : {}
  const rows = []
  for (const task of tasks || []) {
    const roots = task.current_version && task.current_version.action_nodes
    if (!Array.isArray(roots)) continue
    const walk = (nodes, segments) => {
      for (const node of nodes) {
        const nextSeg = [...segments, { counter: node.display_counter, list_style: node.list_style }]
        const sid = node.stable_node_id
        const overlay = sid && map[sid] ? map[sid] : {}
        const assignmentUsers = overlay.assignment_users || []
        const assigned = assignmentUsers.length > 0
        const commentCount = Number(overlay.comment_count || 0)
        const commented = commentCount > 0
        const statusKey = hubStatusKey(assigned, commented)
        if (statusKey) {
          rows.push({
            stableNodeId: sid,
            taskId: task.id,
            sector: task.sector_division != null ? String(task.sector_division) : '',
            description: task.description != null ? String(task.description) : '',
            nodeLabel: formatNodePathFromSegments(nextSeg),
            assigneeNames: assignmentUsers.map(u => u.name || '').filter(Boolean).join(', '),
            assigneeIds: assignmentUsers.map(u => u.id).filter(id => id != null),
            commentCount,
            assigned,
            commented,
            statusKey,
            lastCommentAt: overlay.last_comment_at || null
          })
        }
        if (node.children && node.children.length) {
          walk(node.children, nextSeg)
        }
      }
    }
    walk(roots, [])
  }
  return rows
}

export function applyHubFilters (rows, { ownOnly, assignedOnly, commentedOnly, currentUserId }) {
  let out = rows.slice()
  if (ownOnly && currentUserId != null && currentUserId !== '') {
    const uid = String(currentUserId)
    out = out.filter(r =>
      r.assigneeIds.some(id => String(id) === uid)
    )
  }
  if (assignedOnly) {
    out = out.filter(r => r.assigned)
  }
  if (commentedOnly) {
    out = out.filter(r => r.commented)
  }
  return out
}

export function statusLabel (statusKey) {
  switch (statusKey) {
    case HUB_STATUS.ASSIGNED_COMMENTED:
      return 'Assigned & commented'
    case HUB_STATUS.UNASSIGNED_COMMENTED:
      return 'Commented (unassigned)'
    case HUB_STATUS.ASSIGNED_PENDING:
      return 'Assigned — comment pending'
    default:
      return '—'
  }
}
