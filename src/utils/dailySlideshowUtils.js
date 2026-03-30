/**
 * Helpers for Daily Review Slideshow: node trees from task payloads
 * (e.g. GET /tasks active list — same shape as TentativeDashboard),
 * calendar-day matching, ancestor chains, and expand-step modes.
 */

export function startOfLocalDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function nodeMatchesReviewDate(reviewDate, targetDay) {
  if (reviewDate == null || reviewDate === '') return false
  const a = startOfLocalDay(new Date(reviewDate))
  const b = startOfLocalDay(targetDay)
  return a.getTime() === b.getTime()
}

export function flattenNodes(tree, acc = []) {
  if (!Array.isArray(tree)) return acc
  for (const n of tree) {
    acc.push(n)
    if (n.children && n.children.length) flattenNodes(n.children, acc)
  }
  return acc
}

export function nodeMapById(flat) {
  const m = new Map()
  for (const n of flat) {
    if (n.id != null) {
      m.set(n.id, n)
      m.set(String(n.id), n)
      const numId = Number(n.id)
      if (!isNaN(numId)) m.set(numId, n)
    }
  }
  return m
}

export function childrenByParentId(flat) {
  const m = new Map()
  for (const n of flat) {
    const pid = n.parent_id
    const key = pid == null ? '__root__' : pid
    if (!m.has(key)) m.set(key, [])
    m.get(key).push(n)
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => (a.position || 0) - (b.position || 0))
  }
  return m
}

export function nodeIdEquals(a, b) {
  if (a == null || b == null) return false
  return String(a) === String(b)
}

export function pathFromRootToFocus(tree, focusId) {
  if (!Array.isArray(tree)) return null
  for (const node of tree) {
    if (nodeIdEquals(node.id, focusId)) return [node]
    if (node.children && node.children.length) {
      const sub = pathFromRootToFocus(node.children, focusId)
      if (sub) return [node, ...sub]
    }
  }
  return null
}

export function chainFromFocus(focusId, idMap) {
  const chain = []
  let cur = idMap.get(focusId) || idMap.get(String(focusId)) || idMap.get(Number(focusId))
  const seen = new Set()
  while (cur && !seen.has(String(cur.id))) {
    seen.add(String(cur.id))
    chain.unshift(cur)
    const pid = cur.parent_id
    cur = pid != null ? (idMap.get(pid) || idMap.get(String(pid)) || idMap.get(Number(pid))) : null
  }
  return chain
}

/**
 * One entry per (task, action node) where node.review_date matches targetDay.
 */
export function buildSlidesForTasks(tasks, targetDay) {
  const slides = []
  if (!Array.isArray(tasks)) return slides
  for (const task of tasks) {
    const tree =
      task.current_version && Array.isArray(task.current_version.action_nodes)
        ? task.current_version.action_nodes
        : null
    if (!tree || !tree.length) continue
    const flat = flattenNodes([...tree])
    const idMap = nodeMapById(flat)
    const childrenMap = childrenByParentId(flat)
    for (const node of flat) {
      if (!nodeMatchesReviewDate(node.review_date, targetDay)) continue
      const chain = pathFromRootToFocus(tree, node.id) || chainFromFocus(node.id, idMap)
      slides.push({
        task,
        focusNode: node,
        tree,
        flat,
        idMap,
        childrenMap,
        chain
      })
    }
  }
  return slides
}

/**
 * Expand steps: chain tails (1..L), then full task.
 */
export function buildViewModes({ chain, focusNode }) {
  const L = chain.length
  const modes = []
  for (let k = 1; k <= L; k++) {
    modes.push({
      type: 'chain',
      nodes: chain.slice(-k),
      key: `chain-${k}`
    })
  }
  modes.push({ type: 'full', key: 'full' })
  return modes
}

export function counterLabel(node) {
  if (node == null) return '•'
  const c = node.display_counter
  if (c != null && String(c).trim() !== '') return String(c)
  if (node.list_style === 'bullet') return '•'
  return `#${node.id}`
}
