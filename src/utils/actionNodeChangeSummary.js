/**
 * Helpers for "unsaved action node" summaries in the task modal editor.
 * Compound pointers follow the same visual idea as nested list markers: 3(c)(iii).
 */

/** Fields that define whether a saved node row changed vs baseline (no DB write). */
export function nodeContentFingerprint (n) {
  if (!n) return {}
  return {
    content: (n.content || '').trim(),
    review_date: n.review_date != null && n.review_date !== '' ? String(n.review_date) : null,
    completed: !!n.completed,
    reviewer_id: n.reviewer_id != null && n.reviewer_id !== '' ? String(n.reviewer_id) : null,
    level: n.level != null ? Number(n.level) : 1,
    list_style: n.list_style || 'decimal',
    parent_id:
      n.parent_id != null && n.parent_id !== '' ? String(n.parent_id) : null,
    position: n.position != null ? Number(n.position) : 0,
    node_type: n.node_type || 'rich_text'
  }
}

/**
 * Build id → node map from a flat list (as from NewEnhancedNodeEditor.flattenNodes).
 */
export function buildActionNodeIdMap (flatNodes) {
  const m = new Map()
  ;(flatNodes || []).forEach((n) => {
    if (n == null || n.id == null) return
    m.set(String(n.id), n)
  })
  return m
}

/**
 * Compound pointer: root segment, then each deeper level in parentheses.
 * Uses parent_id chain and each node's display_counter (kept in sync by the editor).
 */
export function formatActionNodePointerFromMap (node, idToNode) {
  if (!node || !idToNode) return '?'
  const chain = []
  let cur = node
  const guard = new Set()
  while (cur && !guard.has(String(cur.id))) {
    guard.add(String(cur.id))
    chain.unshift(cur)
    const pid = cur.parent_id
    if (pid == null || pid === '') break
    const next = idToNode.get(String(pid))
    if (!next) break
    cur = next
  }
  if (!chain.length) return '?'
  const root = chain[0].display_counter != null ? String(chain[0].display_counter) : '?'
  if (chain.length === 1) return root
  let s = root
  for (let i = 1; i < chain.length; i++) {
    const seg = chain[i].display_counter != null ? String(chain[i].display_counter) : '?'
    s += '(' + seg + ')'
  }
  return s
}

const DEFAULT_MAX_POINTERS = 28

export function joinPointerList (pointers, max = DEFAULT_MAX_POINTERS) {
  const arr = (pointers || []).filter(Boolean)
  if (!arr.length) return ''
  if (arr.length <= max) return arr.join(', ')
  return arr.slice(0, max).join(', ') + ` … (+${arr.length - max} more)`
}

/**
 * @param {Array<Object>} flatNodes — preorder flatten of current tree
 * @param {Record<string, string>} baselineById — persisted id → JSON.stringify(fingerprint) at load
 * @returns {{ added: string[], updated: string[], deletedCount: number }}
 */
export function summarizeUnsavedNodeChanges (flatNodes, baselineById) {
  const base = baselineById && typeof baselineById === 'object' ? baselineById : {}
  const flat = flatNodes || []
  const idToNode = buildActionNodeIdMap(flat)

  const currentPersisted = new Set()
  flat.forEach((n) => {
    const idNum = Number(n.id)
    if (idNum > 0) currentPersisted.add(String(n.id))
  })

  let deletedCount = 0
  Object.keys(base).forEach((k) => {
    if (!currentPersisted.has(String(k))) deletedCount++
  })

  const added = []
  const updated = []

  for (const n of flat) {
    const idNum = Number(n.id)
    const ptr = formatActionNodePointerFromMap(n, idToNode)
    if (idNum < 0 || n.isTemp) {
      added.push(ptr)
      continue
    }
    if (idNum > 0) {
      const key = String(n.id)
      const snap = JSON.stringify(nodeContentFingerprint(n))
      const prev = base[key]
      if (prev != null && prev !== snap) {
        updated.push(ptr)
      }
    }
  }

  return { added, updated, deletedCount }
}
