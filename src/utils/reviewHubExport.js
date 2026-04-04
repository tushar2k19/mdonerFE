/**
 * Shared helpers for NewTaskReviewHub CSV/PDF exports (comment excerpts via meeting_dashboard API).
 */

export function stripHtml (html) {
  if (html == null) return ''
  const s = String(html)
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncateText (text, maxLen) {
  const t = text == null ? '' : String(text)
  if (t.length <= maxLen) return t
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`
}

/**
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} mapper
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency (items, limit, mapper) {
  const n = items.length
  if (n === 0) return []
  const results = new Array(n)
  let next = 0
  const cap = Math.max(1, Math.min(limit, n))

  async function worker () {
    while (true) {
      const i = next++
      if (i >= n) return
      results[i] = await mapper(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: cap }, () => worker()))
  return results
}

/**
 * Fetches first comment body per row (GET dashboard_node_comments) for rows with commentCount > 0.
 * @param {Object} http - axios-like { get(url, { params }) }
 * @param {string|number} versionId
 * @param {Array<{ stableNodeId: string, commentCount: number }>} rows
 * @param {{ concurrency?: number, excerptMaxLen?: number }} opts
 * @returns {Promise<string[]>} parallel array of excerpts (same order as rows)
 */
export async function fetchCommentExcerptsForRows (http, versionId, rows, opts = {}) {
  const concurrency = opts.concurrency != null ? opts.concurrency : 6
  const excerptMaxLen = opts.excerptMaxLen != null ? opts.excerptMaxLen : 240
  const vid = String(versionId)

  const excerpts = rows.map(() => '')
  const queue = []
  rows.forEach((r, i) => {
    if (r && Number(r.commentCount) > 0 && r.stableNodeId) {
      queue.push(i)
    }
  })

  async function fetchOne (rowIndex) {
    const row = rows[rowIndex]
    try {
      const res = await http.get('/meeting_dashboard/dashboard_node_comments', {
        params: {
          new_dashboard_version_id: vid,
          stable_node_id: row.stableNodeId
        }
      })
      const comments = (res.data && res.data.comments) || []
      if (!comments.length) {
        excerpts[rowIndex] = ''
        return
      }
      const body = stripHtml(comments[0].body || '')
      excerpts[rowIndex] = truncateText(body, excerptMaxLen)
    } catch (e) {
      excerpts[rowIndex] = ''
    }
  }

  const nWorkers = Math.max(1, Math.min(concurrency, queue.length))
  const workers = Array.from({ length: nWorkers }, async () => {
    while (queue.length) {
      const rowIndex = queue.shift()
      if (rowIndex === undefined) return
      await fetchOne(rowIndex)
    }
  })
  await Promise.all(workers)
  return excerpts
}

/**
 * @param {Array<Object>} filteredRows - hub matrix rows from reviewHubMatrix
 * @param {string[]} excerpts - same length as filteredRows
 * @param {(r: Object) => string} statusLabelFn
 */
export function buildExportRowViews (filteredRows, excerpts, statusLabelFn) {
  return filteredRows.map((r, i) => ({
    stableNodeId: r.stableNodeId,
    sector: r.sector,
    description: r.description,
    nodeLabel: r.nodeLabel,
    assigneeNames: r.assigneeNames,
    statusLabel: statusLabelFn(r.statusKey),
    statusKey: r.statusKey,
    commentCount: r.commentCount,
    commentExcerpt: excerpts[i] != null ? excerpts[i] : ''
  }))
}
