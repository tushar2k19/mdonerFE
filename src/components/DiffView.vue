<template>
  <div class="diff-view-container">
    <div class="diff-header">
      <div class="diff-date-side diff-header-spacer" aria-hidden="true"></div>
      <div class="diff-col baseline-col">Original (Version {{ baseVersionNumber }})</div>
      <div class="diff-col current-col">Changes (Version {{ currentVersionNumber }})</div>
      <div class="diff-date-side diff-header-spacer" aria-hidden="true"></div>
    </div>
    <div class="diff-body">
      <div
        v-for="(pair, index) in diffPairs"
        :key="index"
        class="diff-row"
        :class="getRowClass(pair)"
        :id="'action-node-' + (pair.newNode ? pair.newNode.id : (pair.oldNode && pair.oldNode.id))"
      >
        <!-- Outward: baseline review date -->
        <div
          class="diff-date-side diff-date-baseline"
          :class="{ 'date-changed': pair.oldNode && pair.newNode && reviewDatesDiffer(pair) }"
        >
          <template v-if="pair.oldNode && showGutterAnyMeta(pair.oldNode)">
            <template v-if="hasValidReviewDate(pair.oldNode)">
              <span class="date-side-label">Review date</span>
              <span
                class="date-side-value"
                :class="getReviewDateHighlightClassesIfSet(pair.oldNode.review_date)"
              >{{ formatReviewDate(pair.oldNode.review_date) }}</span>
            </template>
            <div v-if="hasReviewerMetadata(pair.oldNode)" class="reviewer-side-block">
              <span class="date-side-label">Reviewer</span>
              <span
                class="reviewer-side-value"
                :class="gutterReviewerHighlightClasses(pair.oldNode)"
              >{{ formatReviewerDisplay(pair.oldNode) }}</span>
            </div>
          </template>
        </div>

        <div class="diff-col baseline-col">
          <div v-if="pair.oldNode" class="diff-node-content" :style="{ paddingLeft: getIndent(pair.oldNode) }">
            <span class="counter">{{ pair.oldNode.display_counter }}</span>
            <div class="rich-text" v-html="pair.oldNode.content"></div>
          </div>
          <div v-else class="empty-node">Node added</div>
        </div>

        <div class="diff-col current-col">
          <div v-if="pair.newNode" class="diff-node-content" :style="{ paddingLeft: getIndent(pair.newNode) }">
            <span class="counter">{{ pair.newNode.display_counter }}</span>
            <div class="rich-text diff-rich-text" v-html="getDiffContent(pair)"></div>
          </div>
          <div v-else class="empty-node">Node removed</div>
        </div>

        <!-- Outward: current review date + extension hint -->
        <div
          class="diff-date-side diff-date-current"
          :class="{ 'date-changed': pair.oldNode && pair.newNode && reviewDatesDiffer(pair) }"
        >
          <template v-if="pair.newNode && showGutterAnyMeta(pair.newNode)">
            <template v-if="hasValidReviewDate(pair.newNode)">
              <span class="date-side-label">Review date</span>
              <span
                class="date-side-value"
                :class="getReviewDateHighlightClassesIfSet(pair.newNode.review_date)"
              >{{ formatReviewDate(pair.newNode.review_date) }}</span>
            </template>
            <div v-if="hasReviewerMetadata(pair.newNode)" class="reviewer-side-block">
              <span class="date-side-label">Reviewer</span>
              <span
                class="reviewer-side-value"
                :class="gutterReviewerHighlightClasses(pair.newNode)"
              >{{ formatReviewerDisplay(pair.newNode) }}</span>
            </div>
            <div v-if="showReviewerChangedHint(pair)" class="reviewer-changed-hint" role="status">
              <i
                class="fas fa-info-circle"
                aria-hidden="true"
                :title="reviewerChangedMessage(pair)"
              ></i>
              <span>{{ reviewerChangedMessage(pair) }}</span>
            </div>
            <div v-if="dateShiftInfo(pair)" class="date-extension-hint" :class="'hint-' + dateShiftInfo(pair).type">
              <i :class="dateShiftInfo(pair).iconClass" aria-hidden="true"></i>
              <span>{{ dateShiftInfo(pair).message }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getHtmlDiff } from '../utils/htmlDiff'
import { getReviewDateHighlightClasses, getReviewDateHighlightClassesIfSet } from '../utils/reviewDateHighlight'
import * as reviewerHint from '../utils/reviewerDiffHint'

function parseReviewDateOnly (value) {
  if (value == null || value === '') return null
  const d = new Date(value)
  if (isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function calendarDaysBetween (oldVal, newVal) {
  const a = parseReviewDateOnly(oldVal)
  const b = parseReviewDateOnly(newVal)
  if (!a || !b) return null
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / 86400000)
}

function normalizeReviewDateKey (value) {
  const d = parseReviewDateOnly(value)
  if (!d) return value == null || value === '' ? '' : String(value).trim()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default {
  name: 'DiffView',
  props: {
    baselineNodes: { type: Array, required: true },
    currentNodes: { type: Array, required: true },
    showTextDiff: { type: Boolean, default: true },
    baseVersionNumber: { type: [Number, String], default: 'N/A' },
    currentVersionNumber: { type: [Number, String], default: 'N/A' },
    currentReviewerId: { type: [Number, String], default: null },
    reviewerType: { type: String, default: null },
    permissionMode: { type: Boolean, default: false },
    currentUserRole: { type: String, default: null },
    suppressDiffHighlights: { type: Boolean, default: false }
  },
  computed: {
    diffPairs () {
      const oldFlat = this.flattenNodes(this.baselineNodes)
      const newFlat = this.flattenNodes(this.currentNodes)

      const pairs = []
      const pairMap = new Map()
      const usedNewIds = new Set()

      // Function to get a node's reliable identifier
      const getNodeId = (node) => {
        if (!node) return null
        return node.stable_node_id || String(node.id)
      }

      oldFlat.forEach(oldNode => {
        const newNode = newFlat.find(n =>
          (n.stable_node_id && n.stable_node_id === oldNode.stable_node_id) ||
          (!n.stable_node_id && n.id === oldNode.id)
        )
        const pair = { oldNode, newNode, children: [] }
        pairs.push(pair)
        pairMap.set(getNodeId(oldNode), pair)
        if (newNode) {
          usedNewIds.add(newNode.id)
          pairMap.set(getNodeId(newNode), pair) // both IDs map to the same pair if different
        }
      })

      newFlat.forEach(newNode => {
        if (!usedNewIds.has(newNode.id)) {
          const pair = { oldNode: null, newNode, children: [] }
          pairs.push(pair)
          pairMap.set(getNodeId(newNode), pair)
        }
      })

      // Reconstruct tree relationships
      const rootPairs = []
      pairs.forEach(pair => {
        const node = pair.newNode || pair.oldNode
        if (!node) return

        if (node.parent_id) {
          // If we have a newNode, try to find parent using current version's hierarchy
          // If we only have oldNode (deleted), try to find parent using baseline version's hierarchy
          const parentNode = pair.newNode 
            ? newFlat.find(n => n.id === pair.newNode.parent_id) 
            : oldFlat.find(n => n.id === pair.oldNode.parent_id)

          const parentPair = parentNode ? pairMap.get(getNodeId(parentNode)) : null
          
          if (parentPair) {
            parentPair.children.push(pair)
          } else {
            rootPairs.push(pair) // Orphaned node, treat as root
          }
        } else {
          rootPairs.push(pair)
        }
      })

      // Sort children at each level
      const sortPairs = (pairsArray) => {
        pairsArray.sort((a, b) => {
          const aNode = a.newNode || a.oldNode
          const bNode = b.newNode || b.oldNode

          if (aNode.position !== bNode.position) {
            return (aNode.position || 0) - (bNode.position || 0)
          }
          // Tie-breaker: deletions before additions
          if (a.oldNode && !a.newNode && !b.oldNode && b.newNode) return -1
          if (!a.oldNode && a.newNode && b.oldNode && !b.newNode) return 1
          return 0
        })

        pairsArray.forEach(pair => {
          if (pair.children.length > 0) {
            sortPairs(pair.children)
          }
        })
      }

      sortPairs(rootPairs)

      // Flatten tree depth-first for rendering
      const flattenedPairs = []
      const flattenDFS = (pairsArray) => {
        pairsArray.forEach(pair => {
          flattenedPairs.push(pair)
          if (pair.children.length > 0) {
            flattenDFS(pair.children)
          }
        })
      }
      flattenDFS(rootPairs)

      return flattenedPairs
    }
  },
  methods: {
    getReviewDateHighlightClassesIfSet,
    flattenNodes (treeNodes) {
      if (!treeNodes) return []
      const result = []
      const flattenRecursive = (nodes) => {
        nodes.forEach(node => {
          const n = node.node || node
          result.push(n)
          if (node.children && node.children.length > 0) {
            flattenRecursive(node.children)
          } else if (n.children && n.children.length > 0) {
            flattenRecursive(n.children)
          }
        })
      }
      flattenRecursive(treeNodes)
      return result
    },
    hasValidReviewDate (node) {
      if (!node || node.review_date == null || node.review_date === '') return false
      const d = new Date(node.review_date)
      return !isNaN(d.getTime())
    },
    reviewerIdKey (node) {
      return reviewerHint.reviewerIdKey(node)
    },
    hasReviewerMetadata (node) {
      return reviewerHint.hasReviewerMetadata(node)
    },
    /** Gutter: show side rail when either a valid review date or a reviewer is present (matches current/old columns). */
    showGutterAnyMeta (node) {
      return this.hasValidReviewDate(node) || this.hasReviewerMetadata(node)
    },
    /** Yellow ribbon on reviewer; tie to date highlight when a date exists. */
    gutterReviewerHighlightClasses (node) {
      if (this.hasValidReviewDate(node)) {
        return getReviewDateHighlightClassesIfSet(node.review_date)
      }
      if (this.hasReviewerMetadata(node)) {
        return getReviewDateHighlightClasses(null)
      }
      return []
    },
    formatReviewDate (value) {
      const d = new Date(value)
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    },
    reviewDatesDiffer (pair) {
      if (!pair.oldNode || !pair.newNode) return false
      return normalizeReviewDateKey(pair.oldNode.review_date) !== normalizeReviewDateKey(pair.newNode.review_date)
    },
    formatReviewerDisplay (node) {
      const name = reviewerHint.sanitizeReviewerName(node && node.reviewer_name)
      if (name) return name
      const id = reviewerHint.reviewerIdKey(node)
      if (id != null) return `Reviewer #${id}`
      return 'Unassigned'
    },
    formatReviewerForHint (node) {
      return reviewerHint.formatReviewerForHint(node)
    },
    reviewersSemanticallyEqual (pair) {
      return reviewerHint.reviewersSemanticallyEqual(pair.oldNode, pair.newNode)
    },
    reviewerChangedMessage (pair) {
      return reviewerHint.reviewerChangedMessage(pair.oldNode, pair.newNode)
    },
    showReviewerChangedHint (pair) {
      return reviewerHint.showReviewerChangedHint(pair, {
        showGutterMeta: (n) => this.showGutterAnyMeta(n),
        contentChanged: (p) => this.contentChanged(p),
        reviewDatesDiffer: (p) => this.reviewDatesDiffer(p)
      })
    },
    dateShiftInfo (pair) {
      if (!pair.oldNode || !pair.newNode) return null
      if (!this.reviewDatesDiffer(pair)) return null
      const days = calendarDaysBetween(pair.oldNode.review_date, pair.newNode.review_date)
      if (days == null) return null
      if (days > 0) {
        return {
          type: 'extended',
          iconClass: 'fas fa-calendar-plus',
          message: `Task extended by ${days} day${days === 1 ? '' : 's'}`
        }
      }
      if (days < 0) {
        const abs = Math.abs(days)
        return {
          type: 'shortened',
          iconClass: 'fas fa-calendar-minus',
          message: `Review date moved earlier by ${abs} day${abs === 1 ? '' : 's'}`
        }
      }
      return null
    },
    contentChanged (pair) {
      if (!pair.oldNode || !pair.newNode) return true
      return pair.oldNode.content !== pair.newNode.content
    },
    canSeeDiffHighlights (node) {
      if (this.suppressDiffHighlights) return false
      if (!this.permissionMode) return true
      if (this.currentUserRole === 'editor') return true
      
      const currentId = this.currentReviewerId ? String(this.currentReviewerId) : null
      const nodeId = node && node.reviewer_id ? String(node.reviewer_id) : null
      
      if (this.reviewerType === 'task_level') {
        return !nodeId || nodeId === currentId
      }
      
      if (this.reviewerType === 'node_level') {
        return nodeId && nodeId === currentId
      }
      
      return false
    },
    getRowClass (pair) {
      const nodeForPerms = pair.newNode || pair.oldNode
      if (!this.canSeeDiffHighlights(nodeForPerms)) return 'row-unchanged'
      
      if (!pair.oldNode) return 'row-added'
      if (!pair.newNode) return 'row-removed'
      const content = this.contentChanged(pair)
      const dates = this.reviewDatesDiffer(pair)
      if (content && dates) return 'row-modified row-date-changed'
      if (content) return 'row-modified'
      if (dates) return 'row-date-only'
      return 'row-unchanged'
    },
    getIndent (node) {
      const level = node.level || 1
      return ((level - 1) * 32) + 'px'
    },
    getDiffContent (pair) {
      if (!this.showTextDiff) return pair.newNode.content
      if (!pair.oldNode) return pair.newNode.content
      if (pair.oldNode.content === pair.newNode.content) return pair.newNode.content

      return getHtmlDiff(pair.oldNode.content, pair.newNode.content)
    }
  }
}
</script>

<style scoped>
.diff-view-container {
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  margin-top: 1rem;
}
.diff-header {
  display: flex;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
  color: #334155;
  align-items: stretch;
}
.diff-header-spacer {
  flex: 0 0 128px;
  max-width: 128px;
  min-width: 96px;
  background: #f1f5f9;
  border-right: 1px solid #e2e8f0;
  box-sizing: border-box;
}
.diff-header .diff-header-spacer:last-child {
  border-right: none;
  border-left: 1px solid #e2e8f0;
}
.diff-col {
  flex: 1;
  padding: 16px;
  min-width: 0;
  overflow-x: auto;
}
.baseline-col {
  border-right: 1px solid #e2e8f0;
}
.diff-row {
  display: flex;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s;
  align-items: stretch;
}
.diff-row:last-child {
  border-bottom: none;
}
.diff-row:hover {
  background-color: #f8fafc;
}

/* Outward review date rails */
.diff-date-side {
  flex: 0 0 128px;
  max-width: 128px;
  min-width: 96px;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 4px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  font-size: 11px;
  color: #64748b;
  box-sizing: border-box;
}
.diff-date-current {
  border-right: none;
  border-left: 1px solid #e2e8f0;
  order: 4;
}
.diff-date-baseline {
  order: 0;
}
.diff-row .baseline-col {
  order: 1;
}
.diff-row .current-col {
  order: 2;
}

.date-side-label {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
  color: #94a3b8;
  font-size: 9px;
}
.date-side-value {
  font-weight: 600;
  color: #334155;
  line-height: 1.3;
  word-break: break-word;
}

/* Date changed between versions: accent toward the content columns; keeps dashboard yellow/red schema on values */
.diff-date-baseline.date-changed {
  background: #f8fafc;
  box-shadow: inset -3px 0 0 rgba(245, 158, 11, 0.85);
}
.diff-date-current.date-changed {
  background: #f8fafc;
  box-shadow: inset 3px 0 0 rgba(245, 158, 11, 0.85);
}

.date-extension-hint {
  margin-top: 6px;
  padding: 6px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.35;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.date-extension-hint i {
  margin-top: 1px;
  flex-shrink: 0;
}
.hint-extended {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
  border: 1px solid rgba(34, 197, 94, 0.25);
}
.hint-shortened {
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
  border: 1px solid rgba(59, 130, 246, 0.22);
}

.reviewer-side-block {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.reviewer-side-value {
  font-weight: 600;
  color: #475569;
  font-size: 10px;
  line-height: 1.35;
  word-break: break-word;
}

.reviewer-changed-hint {
  margin-top: 6px;
  padding: 6px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.35;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: rgba(245, 158, 11, 0.12);
  color: #9a3412;
  border: 1px solid rgba(245, 158, 11, 0.35);
}
.reviewer-changed-hint i {
  margin-top: 1px;
  flex-shrink: 0;
  color: #c2410c;
}

.diff-node-content {
  display: flex;
  gap: 12px;
}
.counter {
  font-weight: 600;
  color: #64748b;
  min-width: 24px;
}
.rich-text {
  flex: 1;
  font-size: 14px;
  color: #1e293b;
  line-height: 1.6;
}
.empty-node {
  color: #94a3b8;
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}
.row-added .current-col {
  background: rgba(34, 197, 94, 0.08);
}
.row-removed .baseline-col {
  background: rgba(239, 68, 68, 0.08);
}
.row-modified .current-col {
  background: rgba(245, 158, 11, 0.08);
}
.row-date-only .current-col {
  background: rgba(251, 191, 36, 0.06);
}
.row-date-only.row-modified .current-col {
  background: rgba(245, 158, 11, 0.1);
}

/* Diff styles for ins and del */
.diff-rich-text >>> ins {
  background-color: rgba(34, 197, 94, 0.15);
  text-decoration: none;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 1.4em;
  border: 1px solid rgba(34, 197, 94, 0.3);
  display: inline-block;
  color: #166534;
}

.diff-rich-text >>> del {
  background-color: rgba(239, 68, 68, 0.15);
  text-decoration: line-through;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 1.4em;
  border: 1px solid rgba(239, 68, 68, 0.3);
  display: inline-block;
  color: #991b1b;
  opacity: 0.8;
}

@media (max-width: 900px) {
  .diff-header {
    display: none;
  }
  .diff-row {
    flex-wrap: wrap;
  }
  .diff-date-side {
    flex: 1 1 100%;
    max-width: none;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    border-left: none;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
  .diff-date-baseline {
    order: 0;
  }
  .baseline-col {
    order: 1;
    flex: 1 1 100%;
    border-right: none;
    border-bottom: 1px solid #f1f5f9;
  }
  .diff-date-current {
    order: 2;
    border-left: none;
  }
  .current-col {
    order: 3;
    flex: 1 1 100%;
  }
}
</style>
