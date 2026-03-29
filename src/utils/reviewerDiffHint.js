/**
 * Reviewer diff hint helpers (DiffView). Kept pure for clarity; keep in sync with
 * backend/test/models/reviewer_hint_suppress_test.rb for the suppress rule.
 */

/** Ignore missing, blank, or literal "undefined"/"null" strings (bad JSON / templates). */
export function sanitizeReviewerName (value) {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  if (!s) return ''
  const lower = s.toLowerCase()
  if (lower === 'undefined' || lower === 'null') return ''
  return s
}

export function reviewerIdKey (node) {
  if (!node) return null
  const raw = node.reviewer_id
  if (raw == null || raw === '') return null
  const str = String(raw).trim()
  if (!str) return null
  const lower = str.toLowerCase()
  if (lower === 'undefined' || lower === 'null') return null
  const n = Number(raw)
  return Number.isNaN(n) ? str : n
}

/** True when the node has an assignable reviewer (id or non-empty name) for diff gutter parity with current view. */
export function hasReviewerMetadata (node) {
  if (!node) return false
  if (reviewerIdKey(node) != null) return true
  return !!sanitizeReviewerName(node.reviewer_name)
}

export function formatReviewerForHint (node) {
  if (!node) return 'Unassigned'
  const name = sanitizeReviewerName(node.reviewer_name)
  if (name) return name
  const id = reviewerIdKey(node)
  if (id != null) return `Reviewer #${id}`
  return 'Unassigned'
}

function normalizeReviewerLabelForCompare (label) {
  return String(label || '').trim().toLowerCase()
}

export function reviewersSemanticallyEqual (oldNode, newNode) {
  if (!oldNode || !newNode) return true
  const ka = reviewerIdKey(oldNode)
  const kb = reviewerIdKey(newNode)
  if (ka != null && kb != null) return ka === kb
  if (ka == null && kb == null) {
    const na = normalizeReviewerLabelForCompare(sanitizeReviewerName(oldNode.reviewer_name))
    const nb = normalizeReviewerLabelForCompare(sanitizeReviewerName(newNode.reviewer_name))
    return na === nb
  }
  const la = formatReviewerForHint(oldNode)
  const lb = formatReviewerForHint(newNode)
  return normalizeReviewerLabelForCompare(la) === normalizeReviewerLabelForCompare(lb)
}

export function reviewerChangedMessage (oldNode, newNode) {
  const fromLabel = formatReviewerForHint(oldNode)
  const toLabel = formatReviewerForHint(newNode)
  return `Reviewer changed from ${fromLabel} to ${toLabel}`
}

/**
 * Baseline snapshot often omits node-level reviewer while current has one after assign → clear →
 * re-assign, with identical content and review dates. Suppress the noisy "Unassigned → X" hint.
 */
export function shouldSuppressNoisyReviewerHint (pair, { contentChanged, reviewDatesDiffer }) {
  if (!pair.oldNode || !pair.newNode) return false
  if (contentChanged(pair)) return false
  if (reviewDatesDiffer(pair)) return false
  const ka = reviewerIdKey(pair.oldNode)
  const kb = reviewerIdKey(pair.newNode)
  return ka == null && kb != null
}

/**
 * @param {(node: object) => boolean} showGutterMeta - true when the diff gutter should show baseline/current meta for
 *   that node (valid review date and/or reviewer). Must not require both; see DiffView `showGutterAnyMeta`.
 */
export function showReviewerChangedHint (pair, { showGutterMeta, contentChanged, reviewDatesDiffer }) {
  if (!pair.oldNode || !pair.newNode) return false
  if (reviewersSemanticallyEqual(pair.oldNode, pair.newNode)) return false
  if (shouldSuppressNoisyReviewerHint(pair, { contentChanged, reviewDatesDiffer })) return false
  return showGutterMeta(pair.oldNode) || showGutterMeta(pair.newNode)
}
