<template>
  <div class="enhanced-node-item" :id="'action-node-' + node.id" :class="[
    { 'completed': node.completed },
    { 'has-reviewer': node.reviewer_id },
    diffHighlightClass,
    { 'suppress-node-highlights': suppressDiffHighlights },
    { 'dragging': isDragging, 'drag-over': isDragOver },
    { 'permission-readonly': permissionMode && readonly },
    { 'permission-assigned': permissionMode && isNodeAssignedToCurrentReviewer() },
    { 'permission-unassigned': permissionMode && !isNodeAssignedToCurrentReviewer() },
    meetingHubRowClassObj
  ]" :draggable="canEditThisNode()" @dragstart="handleDragStart" @dragend="handleDragEnd" @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop">
    <!-- Node Content -->
    <div class="node-content" :style="{ paddingLeft: indentLevel + 'px' }">
      <!-- Counter/Marker -->
      <div class="node-marker">
        <span class="counter">{{ node.display_counter }}</span>
        <span class="counter-suffix" v-if="node.list_style !== 'bullet'">.</span>
      </div>

      <!-- Content Editor -->
      <div class="node-editor-container">
        <!-- Rich Text Editor for all nodes (now default) -->
        <div class="rich-text-container">
          <div v-if="!isEditing" @click="startEdit" @contextmenu="handleTableContextMenu" class="rich-text-display" v-html="node.content"></div>
          <div v-else class="rich-text-editor">
            <!-- Rich Text Toolbar -->
            <div class="rich-toolbar">
              <div class="toolbar-group">
                <button @click="execCommand('bold')" class="toolbar-btn" title="Bold">
                  <strong>B</strong>
                </button>
                <button @click="execCommand('italic')" class="toolbar-btn" title="Italic">
                  <em>I</em>
                </button>
                <button @click="execCommand('underline')" class="toolbar-btn" title="Underline">
                  <u>U</u>
                </button>
              </div>

              <div class="toolbar-group">
                <select @change="execCommand('fontSize', $event.target.value)" class="font-size-picker">
                  <option value="">Font Size</option>
                  <option value="1">8pt</option>
                  <option value="2">10pt</option>
                  <option value="3">12pt</option>
                  <option value="4">14pt</option>
                  <option value="5">16pt</option>
                  <option value="6">18pt</option>
                  <option value="7">24pt</option>
                </select>

                <select @change="execCommand('foreColor', $event.target.value)" class="color-picker">
                  <option value="">Text Color</option>
                  <option value="#000000">Black</option>
                  <option value="#ff0000">Red</option>
                  <option value="#00ff00">Green</option>
                  <option value="#0000ff">Blue</option>
                  <option value="#ffff00">Yellow</option>
                  <option value="#ff00ff">Magenta</option>
                  <option value="#00ffff">Cyan</option>
                </select>

                <select @change="execCommand('backColor', $event.target.value)" class="color-picker">
                  <option value="">Background</option>
                  <option value="#ffffff">White</option>
                  <option value="#ffff00">Yellow</option>
                  <option value="#00ff00">Green</option>
                  <option value="#ff0000">Red</option>
                  <option value="#0000ff">Blue</option>
                  <option value="#f0f0f0">Light Gray</option>
                </select>
              </div>

              <div class="toolbar-group" v-if="node.node_type === 'table'">
                <button @click="insertTableRow" class="toolbar-btn" title="Add Row">
                  + Row
                </button>
                <button @click="insertTableColumn" class="toolbar-btn" title="Add Column">
                  + Col
                </button>
              </div>

              <div class="toolbar-group">
                <button @click="saveContent" class="toolbar-btn save-btn" title="Save">
                  ✓
                </button>
                <button @click="cancelEdit" class="toolbar-btn cancel-btn" title="Cancel">
                  ✕
                </button>
              </div>
            </div>

            <!-- Editable Content -->
            <div
              ref="richEditor"
              contenteditable="true"
              @input="onContentChange"
              @paste="handlePaste"
              @keyup="onContentChange"
              @contextmenu="handleTableContextMenu"
              class="rich-editor"
              data-placeholder="Enter content..."
            ></div>

            <!-- Table Context Menu -->
            <div
              v-if="showTableContextMenu"
              class="table-context-menu"
              :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
              @click.stop
            >
              <!-- Color Picker Section -->
              <div class="context-menu-group">
                <div class="color-picker-section">
                  <div class="color-picker-label">Cell Background:</div>
                  <div class="color-picker-grid">
                    <button 
                      v-for="color in cellColors" 
                      :key="color.name"
                      @click="setCellBackgroundColor(color.value)"
                      class="color-picker-btn"
                      :style="{ backgroundColor: color.value }"
                      :title="color.name"
                    ></button>
                  </div>
                </div>
              </div>

              <div class="context-menu-divider"></div>

              <!-- Reviewer Assignment Section -->
              <div class="context-menu-group" v-if="canEditThisNode()">
                <button
                  type="button"
                  @click="openReviewerModal"
                  class="context-menu-item"
                  :disabled="!isPersistedActionNode"
                  :title="!isPersistedActionNode ? 'Save the task first so this row has a server id, then assign a reviewer.' : ''"
                >
                  👤 {{ node.reviewer_id ? 'Change Reviewer' : 'Assign Reviewer' }}
                </button>
                <div v-if="node.reviewer_id" class="current-reviewer">
                  Current: {{ getReviewerName(node.reviewer_id) }}
                </div>
              </div>

              <div class="context-menu-divider"></div>

              <div class="context-menu-group">
                <button @click="addRowAbove" class="context-menu-item">
                  ↑ Add Row Above
                </button>
                <button @click="addRowBelow" class="context-menu-item">
                  ↓ Add Row Below
                </button>
              </div>

              <div class="context-menu-group">
                <button @click="addColumnLeft" class="context-menu-item">
                  ← Add Column Left
                </button>
                <button @click="addColumnRight" class="context-menu-item">
                  → Add Column Right
                </button>
              </div>

              <div class="context-menu-divider"></div>

              <div class="context-menu-group">
                <button @click="deleteCurrentRow" class="context-menu-item delete-item">
                  🗑 Delete Row
                </button>
                <button @click="deleteCurrentColumn" class="context-menu-item delete-item">
                  🗑 Delete Column
                </button>
              </div>

              <div class="context-menu-divider"></div>

              <div class="context-menu-group">
                <button @click="clearCell" class="context-menu-item">
                  🧹 Clear Cell
                </button>
                <button @click="clearTable" class="context-menu-item delete-item">
                  🧹 Clear Table
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Combined Date & Actions Section -->
      <div class="node-meta-section">
        <!-- Review date: hidden when unset + reviewer assigned unless user opened the date editor (menu). -->
        <div v-if="showNodeDateField || isEditingDate" class="node-date">
          <input
            v-if="isEditingDate"
            v-model="editDate"
            @blur="saveDate"
            @keydown.enter="saveDate"
            @keydown.escape="cancelDateEdit"
            type="date"
            class="date-input"
            ref="dateInput"
          />
          <div
            v-else
            @click="startDateEdit"
            class="date-display"
            :class="[{ 'no-date': !node.review_date }, ...getReviewDateHighlightClassesIfSet(node.review_date)]"
          >
            {{ formatDate(node.review_date) || 'Set date' }}
          </div>
        </div>

        <!-- Node Actions -->
        <div class="node-actions node-actions-row">
          <div class="action-dropdown" ref="actionDropdown">
            <button @click="toggleActionDropdown" class="action-btn dropdown-toggle" type="button" aria-label="More actions">
              ⋮
            </button>

            <div v-if="showActionDropdown" class="action-menu">
              <button @click="addPointSameLevel" class="action-item">
                + Add Point (Same Level)
              </button>
              <button @click="addSubpoint" class="action-item">
                → Add Subpoint
              </button>
              <button v-if="node.level > 1" @click="addParentLevelPoint" class="action-item">
                ← Add Parent Point
              </button>
              <button @click="addTableAtLevel" class="action-item">
                📊 Add Table Here
              </button>
              <div class="action-divider"></div>
              <button @click="toggleCompletion" class="action-item" :class="{ 'completed-item': node.completed }">
                {{ node.completed ? '✓ Mark Incomplete' : '☐ Mark Complete' }}
              </button>
              <div class="action-divider"></div>
              <button @click="moveUp" class="action-item">
                ↑ Move Up
              </button>
              <button @click="moveDown" class="action-item">
                ↓ Move Down
              </button>
              <div class="action-divider"></div>
              <button @click="duplicateNode" class="action-item">
                📋 Duplicate
              </button>
              <button @click="deleteNode" class="action-item delete-item">
                🗑 Delete
              </button>
              <button
                v-if="hasReviewerMeta && !hasValidReviewDate"
                @click="startDateEditFromMenu"
                class="action-item"
              >
                📅 Set review date
              </button>
              <button
                type="button"
                @click="openReviewerModal"
                class="action-item"
                :disabled="!isPersistedActionNode"
                :title="!isPersistedActionNode ? 'Save the task first so this row has a server id, then assign a reviewer.' : ''"
              >
                <span v-if="!node.reviewer_id">👤 Assign Reviewer</span>
                <span v-else>👤 Change Reviewer</span>
              </button>
              <div class="action-divider"></div>
              <button
                type="button"
                class="action-item action-item-show-delays"
                :class="{ 'action-item--has-delays': delaysHighlightMenuItem }"
                :disabled="!isPersistedActionNode || delaysMenuFetchLoading"
                @click="openDelaysModal"
              >
                🕐 Show Delays
                <span v-if="delaysMenuFetchLoading" class="delays-inline-loading"> …</span>
              </button>
            </div>
          </div>
          <button
            v-if="enableCommentShortcut"
            type="button"
            class="action-btn node-comment-shortcut-btn"
            :title="'Comment on action item ' + (node.display_counter || node.id)"
            :aria-label="'Open comments for action item ' + (node.display_counter || node.id)"
            @click.stop="emitOpenCommentForNode"
          >
            <!-- Inline SVG (no FA subset dependency); Heroicons-style bubble, MIT -->
            <svg
              class="node-comment-shortcut-svg"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M8 10h8M8 14h5M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 3v-3H6a2 2 0 01-2-2V6z"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Reviewer: yellow ribbon when assigned; if no review date yet, still highlight as attention item. -->
      <div v-if="hasReviewerMeta" class="reviewer-hover-badge" @mouseenter="showReviewerHover = true" @mouseleave="showReviewerHover = false">
        <span
          class="reviewer-badge"
          :class="[{ 'no-date': !hasValidReviewDate }, ...reviewerRibbonClasses]"
        >👤 {{ reviewerBadgeText }}</span>
        <div v-if="showReviewerHover" class="reviewer-hover-popup">
          Reviewer: {{ reviewerBadgeText }}
        </div>
      </div>
    </div>

    <div class="node-children" v-if="node.children && node.children.length > 0">
      <NewEnhancedNodeItem
        v-for="(child, childIndex) in node.children"
        :key="child.id"
        :node="child"
        :siblings="node.children"
        :index="childIndex"
        :show-diff="showDiff"
        :view-mode="viewMode"
        :diff-data="diffData"
        :readonly="readonly"
        :task-version-id="taskVersionId"
        :meeting-draft-task-id="meetingDraftTaskId"
        :permission-mode="permissionMode"
        :current-reviewer-id="currentReviewerId"
        :reviewer-type="reviewerType"
        :assigned-node-ids="assignedNodeIds"
        :suppress-diff-highlights="suppressDiffHighlights"
        :enable-comment-shortcut="enableCommentShortcut"
        :meeting-editor-overlay="meetingEditorOverlay"
        :meeting-pack-highlight-mode="meetingPackHighlightMode"
        @update-node="$emit('update-node', $event, arguments[1])"
        @delete-node="$emit('delete-node', $event)"
        @add-subpoint="$emit('add-subpoint', $event)"
        @add-parent-level-point="$emit('add-parent-level-point', $event)"
        @add-point-same-level="$emit('add-point-same-level', $event, arguments[1], arguments[2])"
        @move-node="$emit('move-node', $event, arguments[1])"
        @duplicate-node="$emit('duplicate-node', $event, arguments[1], arguments[2])"
        @reorder-nodes="$emit('reorder-nodes', $event)"
        @open-comment-for-node="$emit('open-comment-for-node', $event)"
        @context-menu-opened="$emit('context-menu-opened', $event)"
      />
    </div>

    <div v-if="showTableModal" class="table-modal-overlay" @click="closeTableModal">
      <div class="table-modal" @click.stop>
        <h4>Add Table to Current Point</h4>
        <div class="table-form">
          <div class="form-group">
            <label>Rows:</label>
            <input v-model.number="tableRows" type="number" min="1" max="20" class="form-input">
          </div>
          <div class="form-group">
            <label>Columns:</label>
            <input v-model.number="tableCols" type="number" min="1" max="10" class="form-input">
          </div>
        </div>
        <div class="table-modal-actions">
          <button @click="closeTableModal" class="btn btn-secondary">Cancel</button>
          <button @click="createTableAtLevel" class="btn btn-primary">Create Table</button>
        </div>
      </div>
    </div>

    <!-- Reviewer Modal -->
    <div v-if="showReviewerModal" class="reviewer-modal-overlay" @click.self="closeReviewerModal">
      <div class="reviewer-modal" @click.stop>
        <h4>{{ node.reviewer_id ? 'Change Reviewer' : 'Assign Reviewer' }}</h4>
        <div v-if="loadingReviewers" class="reviewer-loading">Loading reviewers...</div>
        <div v-else>
          <select v-model="selectedReviewerId" class="reviewer-select">
            <option value="">-- Select Reviewer --</option>
            <option v-for="reviewer in reviewers" :key="reviewer.id" :value="reviewer.id">
              {{ reviewer.name }}
            </option>
          </select>
          <div class="reviewer-modal-actions">
            <button @click="closeReviewerModal" class="btn btn-secondary">Cancel</button>
            <button @click="assignReviewer" class="btn btn-primary" :disabled="!selectedReviewerId">Assign</button>
            <button v-if="node.reviewer_id" @click="removeReviewer" class="btn btn-danger">Remove Reviewer</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Review date extension (optional delay reason) — editors only when postponing -->
    <!-- Recorded review-date delays (saved reasons / explanations) -->
    <div
      v-if="showDelaysModal"
      class="reviewer-modal-overlay"
      @click.self="closeDelaysModal"
    >
      <div class="reviewer-modal delays-modal" @click.stop>
        <div class="delays-modal-header">
          <h4>Recorded delays — point {{ node.display_counter || node.id }}</h4>
          <button
            type="button"
            class="btn btn-secondary btn-sm delays-refresh-btn"
            :disabled="delaysModalFetchLoading"
            @click="refreshDelaysInModal"
          >
            Refresh
          </button>
        </div>
        <p class="extension-modal-hint delays-modal-sub">
          Rows below are saved only when an editor postponed the review date and chose a reason (or added remarks). Skipped popups do not appear here.
        </p>
        <div v-if="delaysModalFetchLoading" class="delays-modal-loading">Loading…</div>
        <div v-else-if="!delayEvents.length" class="delays-modal-empty">
          No delay records stored for this action point yet.
        </div>
        <div v-else class="delays-table-wrap">
          <table class="delays-table">
            <thead>
              <tr>
                <th>Previous date</th>
                <th>New date</th>
                <th>Reason</th>
                <th>Remarks</th>
                <th>Recorded</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ev in delayEvents" :key="ev.id">
                <td>{{ formatDelayDate(ev.previous_review_date) }}</td>
                <td>{{ formatDelayDate(ev.new_review_date) }}</td>
                <td>{{ formatDelayReason(ev.reason) }}</td>
                <td class="delays-remarks">{{ ev.explanation || '—' }}</td>
                <td>{{ formatDelayRecordedAt(ev.recorded_at) }}</td>
                <td>{{ (ev.recorded_by && ev.recorded_by.full_name) || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <p class="delays-count-footer">{{ delayEvents.length }} record(s)</p>
        </div>
        <div class="reviewer-modal-actions">
          <button type="button" class="btn btn-primary" @click="closeDelaysModal">Close</button>
        </div>
      </div>
    </div>

    <div
      v-if="showReviewDateExtensionModal"
      class="reviewer-modal-overlay"
      @click.self="cancelReviewDateExtensionModal"
    >
      <div class="reviewer-modal review-date-extension-modal" @click.stop>
        <h4>Review date extended</h4>
        <p class="extension-modal-hint">
          Optional: record why this review was postponed for analytics. You can skip if the change is not a delay.
        </p>
        <div class="extension-reason-tags">
          <button
            v-for="opt in reviewExtensionReasonOptions"
            :key="opt.value"
            type="button"
            class="extension-tag-btn"
            :class="{ active: extensionReason === opt.value }"
            @click="extensionReason = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <div class="form-group extension-remarks">
          <label for="extension-remarks">Add remarks (optional)</label>
          <input
            id="extension-remarks"
            v-model="extensionExplanation"
            type="text"
            class="form-input"
            maxlength="2000"
            placeholder="Short explanation for the delay…"
            autocomplete="off"
          >
        </div>
        <div class="reviewer-modal-actions extension-modal-actions">
          <button type="button" class="btn btn-secondary" :disabled="savingReviewDate" @click="cancelReviewDateExtensionModal">
            Cancel
          </button>
          <button type="button" class="btn btn-secondary" :disabled="savingReviewDate" @click="skipReviewDateExtensionReason">
            Skip
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="savingReviewDate || !extensionReason"
            @click="confirmReviewDateExtensionReason"
          >
            Save with reason
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getReviewDateHighlightClasses, getReviewDateHighlightClassesIfSet } from '../utils/reviewDateHighlight'
import { hasReviewerMetadata, reviewerIdKey, sanitizeReviewerName } from '../utils/reviewerDiffHint'
import { meetingHubHighlightClass } from '@/utils/meetingHubNodeHighlight'
import { shouldApplyMeetingHubTint, PACK_HIGHLIGHT_MODE } from '@/utils/meetingPackHighlightFilter'
import { hasComplexTable, normalizeComplexTableHtml, sanitizePastedHtml } from '@/utils/complexTableNormalizer'

const REVIEW_EXTENSION_REASON_OPTIONS = [
  { value: 'operational', label: 'Operational reasons' },
  { value: 'financial', label: 'Financial reasons' },
  { value: 'weather', label: 'Weather reasons' },
  { value: 'misc', label: 'Misc reasons' },
  { value: 'technical', label: 'Technical reasons' },
  { value: 'other', label: 'Other reasons' }
]

const REVIEW_EXTENSION_REASON_LABEL_MAP = REVIEW_EXTENSION_REASON_OPTIONS.reduce((acc, o) => {
  acc[o.value] = o.label
  return acc
}, {})

export default {
  name: 'NewEnhancedNodeItem',

  // Async self-import breaks the webpack circular dependency; sync `import from './self'`
  // can yield a partially-initialized export so props/computed never attach (runtime warnings).
  components: {
    NewEnhancedNodeItem: () => import('./NewEnhancedNodeItem.vue')
  },

  props: {
    node: {
      type: Object,
      required: true
    },
    siblings: {
      type: Array,
      required: true
    },
    index: {
      type: Number,
      required: true
    },
    showDiff: {
      type: Boolean,
      default: false
    },
    viewMode: {
      type: String,
      default: 'current'
    },
    diffData: {
      type: Object,
      default: () => ({})
    },
    readonly: {
      type: Boolean,
      default: false
    },
    permissionMode: {
      type: Boolean,
      default: false
    },
    currentReviewerId: {
      type: [Number, String],
      default: null
    },
    reviewerType: {
      type: String,
      default: 'task_level'
    },
    assignedNodeIds: {
      type: Array,
      default: () => []
    },
    taskVersionId: {
      type: [Number, String],
      default: null
    },
    /** Living meeting draft (`new_tasks`): incremental node updates use this id instead of task_versions. */
    meetingDraftTaskId: {
      type: [Number, String],
      default: null
    },
    suppressDiffHighlights: {
      type: Boolean,
      default: false
    },
    enableCommentShortcut: {
      type: Boolean,
      default: false
    },
    meetingEditorOverlay: {
      type: Object,
      default: () => ({})
    },
    meetingPackHighlightMode: {
      type: String,
      default: PACK_HIGHLIGHT_MODE.ALL
    }
  },

  data () {
    return {
      isEditing: false,
      isEditingDate: false,
      editContent: '',
      editDate: '',
      originalContent: '',
      originalDate: '',
      showActionDropdown: false,
      showTableModal: false,
      tableRows: 3,
      tableCols: 3,
      updateTimer: null,
      showTableContextMenu: false,
      contextMenuY: 0,
      contextMenuX: 0,
      currentCell: null,
      currentRow: null,
      currentColumn: null,
      isDragging: false,
      isDragOver: false,
      cellColors: [
        { name: 'No Color', value: 'transparent' },
        { name: 'Light Yellow', value: '#fff3cd' },
        { name: 'Light Blue', value: '#d1ecf1' },
        { name: 'Light Green', value: '#d4edda' },
        { name: 'Light Pink', value: '#f8d7da' },
        { name: 'Light Orange', value: '#ffeaa7' },
        { name: 'Light Purple', value: '#e2d9f3' },
        { name: 'Light Gray', value: '#f8f9fa' },
        { name: 'Light Cyan', value: '#d1f2eb' },
        { name: 'Light Salmon', value: '#ffcccb' }
      ],
      showReviewerModal: false,
      reviewers: [],
      selectedReviewerId: '',
      loadingReviewers: false,
      showReviewDateExtensionModal: false,
      pendingNewReviewDate: null,
      extensionReason: '',
      extensionExplanation: '',
      savingReviewDate: false,
      reviewExtensionReasonOptions: REVIEW_EXTENSION_REASON_OPTIONS,
      showReviewerHover: false,
      showDelaysModal: false,
      delaysMenuFetchLoading: false,
      delaysModalFetchLoading: false,
      delayEvents: []
    }
  },

  computed: {
    indentLevel () {
      return (this.node.level - 1) * 32 // 32px per level for better visibility
    },
    meetingHubEntry () {
      const sid = this.node && this.node.stable_node_id
      if (!sid || !this.meetingEditorOverlay || typeof this.meetingEditorOverlay !== 'object') return null
      return this.meetingEditorOverlay[sid] || null
    },
    meetingHubRowClassObj () {
      const o = this.meetingHubEntry
      if (!o) return {}
      const hasA = o.assignment_users && o.assignment_users.length
      const hasC = (o.comment_count || 0) > 0
      if (!hasA && !hasC) return {}
      const hub = meetingHubHighlightClass(!!hasA, !!hasC)
      const obj = { 'meeting-overlay-node': true }
      if (shouldApplyMeetingHubTint(this.meetingPackHighlightMode, hub)) {
        obj[hub] = true
      }
      return obj
    },
    computedDiffStatus() {
      if (this.viewMode === 'current' || this.viewMode === 'diff') {
        return this.node.diff_status || 'unchanged'
      } else if (this.viewMode === 'old' && this.diffData && this.diffData.removed_nodes) {
        // check if this node is in removed_nodes
        const isRemoved = this.diffData.removed_nodes.some(n => 
          (n.stable_node_id && n.stable_node_id === this.node.stable_node_id) ||
          (!n.stable_node_id && n.id === this.node.id)
        )
        return isRemoved ? 'removed' : 'unchanged'
      }
      return 'unchanged'
    },
    diffHighlightClass () {
      if (this.suppressDiffHighlights) return null
      if (!(this.viewMode !== 'current' || this.node.diff_status)) return null
      if (!this.canSeeDiffHighlights) return null
      return `diff-${this.computedDiffStatus}`
    },
    canSeeDiffHighlights () {
      if (!this.permissionMode) return true
      
      const currentUser = this.getCurrentUserInfo()
      const isEditor = currentUser && currentUser.role === 'editor'
      
      if (isEditor) return true
      
      // For reviewers, only show highlights for their assigned nodes
      return this.isNodeAssignedToCurrentReviewer()
    },
    hasValidReviewDate () {
      if (!this.node.review_date) return false
      const d = new Date(this.node.review_date)
      return !isNaN(d.getTime())
    },
    hasReviewerMeta () {
      return hasReviewerMetadata(this.node)
    },
    /** Show date control unless a reviewer is assigned and no date yet (avoid redundant "Set date"). */
    showNodeDateField () {
      return this.hasValidReviewDate || !this.hasReviewerMeta
    },
    reviewerRibbonClasses () {
      if (this.hasValidReviewDate) {
        return getReviewDateHighlightClassesIfSet(this.node.review_date)
      }
      if (this.hasReviewerMeta) {
        return getReviewDateHighlightClasses(null)
      }
      return []
    },
    reviewerBadgeText () {
      const name = sanitizeReviewerName(this.node.reviewer_name)
      if (name) return name
      const id = reviewerIdKey(this.node)
      if (id != null) return `Reviewer #${id}`
      return ''
    },
    isPersistedActionNode () {
      const id = Number(this.node.id)
      if (!(id > 0)) return false
      const hasVersion = this.taskVersionId != null && this.taskVersionId !== ''
      const hasMeetingDraft = this.meetingDraftTaskId != null && this.meetingDraftTaskId !== ''
      return hasVersion || hasMeetingDraft
    },
    /** Base path for PUT / GET delay events (no trailing slash). */
    nodeApiBase () {
      const id = this.node.id
      if (this.meetingDraftTaskId != null && this.meetingDraftTaskId !== '') {
        return `/meeting_dashboard/tasks/${this.meetingDraftTaskId}/nodes/${id}`
      }
      return `/task_versions/${this.taskVersionId}/nodes/${id}`
    },
    /** Highlight “Show Delays” after we know this node has saved extension events. */
    delaysHighlightMenuItem () {
      return this.delayEvents.length > 0
    }
  },

  watch: {
    // Watch for prop changes but only update if user is not currently editing
    'node.content': {
      handler (newContent, oldContent) {
        console.log('🔧 EnhancedNodeItem: node.content changed', { 
          nodeId: this.node.id,
          from: oldContent, 
          to: newContent,
          isEditing: this.isEditing 
        })
        
        if (!this.isEditing && this.$refs.richEditor) {
          this.$refs.richEditor.innerHTML = newContent || '<p>Enter content...</p>'
        }
        if (!this.isEditing) {
          this.editContent = newContent || ''
        }
        
        // Force a DOM update
        this.$nextTick(() => {
          const displayDiv = this.$el.querySelector('.rich-text-display')
          console.log('🔧 After nextTick - display div content:', 
            displayDiv ? displayDiv.innerHTML : 'no display div found')
        })
      },
      immediate: false
    },
    
    // Watch the entire node object for deep changes
    'node': {
      handler(newNode, oldNode) {
        console.log('🔧 EnhancedNodeItem: entire node changed', { 
          nodeId: this.node.id,
          newNode, 
          oldNode,
          contentChanged: (newNode && newNode.content) !== (oldNode && oldNode.content)
        })
      },
      deep: true
    },
    'node.id' () {
      this.delayEvents = []
      this.delaysMenuFetchLoading = false
      this.delaysModalFetchLoading = false
      this.showDelaysModal = false
    }
  },

  created () {
    // Initialize editContent
    this.editContent = this.node.content || ''

    // Auto-focus new empty nodes
    if (!this.node.content && this.node.isTemp) {
      this.$nextTick(() => {
        this.startEdit()
      })
    }

    document.addEventListener('click', this.handleClickOutside)
  },

  mounted () {
    // Set initial content in the DOM
    if (this.$refs.richEditor) {
      this.$refs.richEditor.innerHTML = this.node.content || '<p>Enter content...</p>'
    }
    
    // Initialize table resizing for existing tables
    this.initializeTableResizing()
  },

  beforeDestroy () {
    document.removeEventListener('click', this.handleClickOutside)
    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
    }
  },


  methods: {
    getReviewDateHighlightClassesIfSet,

    startEdit () {
      if (!this.canEditThisNode()) {
        if (this.permissionMode) {
          const u = this.getCurrentUserInfo()
          console.warn('[ReviewPerm] startEdit blocked', {
            nodeId: this.node.id,
            displayCounter: this.node.display_counter,
            globalReadonly: this.readonly,
            reviewerType: this.reviewerType,
            currentReviewerId: this.currentReviewerId,
            nodeReviewerId: this.node.reviewer_id,
            userRole: u && u.role,
            isAssignedToCurrentReviewer: this.isNodeAssignedToCurrentReviewer()
          })
        }
        return
      }

      this.isEditing = true
      this.editContent = this.node.content
      
      // Set up rich editor after DOM update
      this.$nextTick(() => {
        if (this.$refs.richEditor) {
          this.$refs.richEditor.innerHTML = this.node.content || ''
          this.$refs.richEditor.focus()
          
          // Set default font size to 10pt (size 2)
          document.execCommand('fontSize', false, '2')
        }
      })
    },

    saveContent () {
      if (this.editContent.trim() !== this.originalContent) {
        const updateData = {
          content: this.editContent.trim(),
          node_type: this.node.node_type === 'table' ? 'table' : 'rich_text'
        }

        this.$emit('update-node', this.node.id, updateData)
      }
      this.isEditing = false
    },

    cancelEdit () {
      this.editContent = this.originalContent
      this.isEditing = false
    },

    startDateEdit () {
      if (!this.canEditThisNode()) return
      this.isEditingDate = true
      this.editDate = this.node.review_date || ''
      this.originalDate = this.node.review_date || ''

      this.$nextTick(() => {
        if (this.$refs.dateInput) {
          this.$refs.dateInput.focus()
        }
      })
    },

    startDateEditFromMenu () {
      this.showActionDropdown = false
      this.startDateEdit()
    },

    toReviewDateKey (value) {
      if (value === null || value === undefined || value === '') return null
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return null
      return d.toISOString().slice(0, 10)
    },

    isPostponingReviewDate (oldVal, newVal) {
      const next = this.toReviewDateKey(newVal)
      const prev = this.toReviewDateKey(oldVal)
      if (!next || !prev) return false
      return next > prev
    },

    async saveDate () {
      if (this.editDate === this.originalDate) {
        this.isEditingDate = false
        return
      }
      if (!this.canEditThisNode()) {
        this.isEditingDate = false
        return
      }

      // Meeting draft: meetingDraftTaskId + PUT /meeting_dashboard/tasks/:id/nodes/:id (no task_version).
      // Legacy: taskVersionId + /task_versions/... — align with isPersistedActionNode / nodeApiBase.
      if (!this.isPersistedActionNode) {
        this.$emit('update-node', this.node.id, { review_date: this.editDate })
        this.isEditingDate = false
        return
      }

      if (this.isPostponingReviewDate(this.originalDate, this.editDate)) {
        this.pendingNewReviewDate = this.editDate
        this.extensionReason = ''
        this.extensionExplanation = ''
        this.showReviewDateExtensionModal = true
        this.isEditingDate = false
        return
      }

      await this.persistReviewDateToServer(null)
    },

    cancelReviewDateExtensionModal () {
      this.showReviewDateExtensionModal = false
      this.pendingNewReviewDate = null
      this.extensionReason = ''
      this.extensionExplanation = ''
      this.editDate = this.originalDate
    },

    async skipReviewDateExtensionReason () {
      await this.persistReviewDateToServer(null)
    },

    async confirmReviewDateExtensionReason () {
      if (!this.extensionReason) {
        this.$toast && this.$toast.info('Select a reason or use Skip')
        return
      }
      await this.persistReviewDateToServer({
        reason: this.extensionReason,
        explanation: (this.extensionExplanation || '').trim()
      })
    },

    async persistReviewDateToServer (reviewDateExtension) {
      const newDate = this.pendingNewReviewDate != null ? this.pendingNewReviewDate : this.editDate
      this.savingReviewDate = true
      try {
        const body = {
          action_node: { review_date: newDate }
        }
        if (reviewDateExtension && reviewDateExtension.reason) {
          body.review_date_extension = {
            reason: reviewDateExtension.reason,
            explanation: reviewDateExtension.explanation || ''
          }
        }
        const response = await this.$http.secured.put(this.nodeApiBase, body)
        const updated = response.data && response.data.data
        if (updated) {
          this.$emit('update-node', this.node.id, {
            review_date: updated.review_date
          })
        } else {
          this.$emit('update-node', this.node.id, { review_date: newDate })
        }
        this.showReviewDateExtensionModal = false
        this.pendingNewReviewDate = null
        this.extensionReason = ''
        this.extensionExplanation = ''
        this.originalDate = newDate
        this.editDate = newDate
        this.$toast && this.$toast.success('Review date saved')
        this.isEditingDate = false
        if (reviewDateExtension && reviewDateExtension.reason) {
          await this.fetchDelayEvents({ forModal: this.showDelaysModal })
        }
      } catch (error) {
        console.error('save review_date failed', error)
        let msg = (error.response && error.response.data && (error.response.data.errors || error.response.data.error)) || error.message
        if (Array.isArray(msg)) msg = msg.join(', ')
        this.$toast && this.$toast.error(typeof msg === 'string' ? msg : 'Failed to save review date')
      } finally {
        this.savingReviewDate = false
      }
    },

    cancelDateEdit () {
      this.editDate = this.originalDate
      this.isEditingDate = false
    },

    toggleCompletion () {
      if (!this.canEditThisNode()) return
      this.$emit('update-node', this.node.id, { completed: !this.node.completed })
    },

    toggleActionDropdown () {
      if (!this.canEditThisNode()) return
      const opening = !this.showActionDropdown
      this.showActionDropdown = opening
      if (opening && this.isPersistedActionNode) {
        this.fetchDelayEvents({ forModal: false })
      }
    },

    async fetchDelayEvents ({ forModal = false } = {}) {
      if (!this.isPersistedActionNode) return
      if (forModal) this.delaysModalFetchLoading = true
      else this.delaysMenuFetchLoading = true
      try {
        const url = `${this.nodeApiBase}/review_date_extension_events`
        const { data } = await this.$http.secured.get(url)
        if (data && data.success) {
          this.delayEvents = Array.isArray(data.events) ? data.events : []
        } else {
          this.delayEvents = []
        }
      } catch (e) {
        console.error('fetchDelayEvents failed', e)
        this.$toast && this.$toast.error('Could not load delay records')
        if (forModal) this.delayEvents = []
        /* Menu fetch failure: keep prior delayEvents so highlight stays stable. */
      } finally {
        this.delaysMenuFetchLoading = false
        this.delaysModalFetchLoading = false
      }
    },

    refreshDelaysInModal () {
      this.fetchDelayEvents({ forModal: true })
    },

    openDelaysModal () {
      if (!this.isPersistedActionNode) return
      this.showActionDropdown = false
      this.showDelaysModal = true
      this.fetchDelayEvents({ forModal: true })
    },

    closeDelaysModal () {
      this.showDelaysModal = false
    },

    formatDelayDate (iso) {
      if (!iso) return '—'
      const d = new Date(iso)
      return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString()
    },

    formatDelayRecordedAt (iso) {
      if (!iso) return '—'
      const d = new Date(iso)
      return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString()
    },

    formatDelayReason (code) {
      if (!code) return '—'
      return REVIEW_EXTENSION_REASON_LABEL_MAP[code] || code
    },

    emitOpenCommentForNode () {
      if (!this.enableCommentShortcut) return
      this.showActionDropdown = false
      this.$emit('open-comment-for-node', this.node.id)
    },

    handleClickOutside (event) {
      if (this.$refs.actionDropdown && !this.$refs.actionDropdown.contains(event.target)) {
        this.showActionDropdown = false
      }
    },

    addPointSameLevel () {
      this.$emit('add-point-same-level', this.node, this.siblings, this.index)
      this.showActionDropdown = false
    },

    addSubpoint () {
      this.$emit('add-subpoint', this.node)
      this.showActionDropdown = false
    },

    addParentLevelPoint () {
      this.$emit('add-parent-level-point', this.node)
      this.showActionDropdown = false
    },

    moveUp () {
      this.$emit('move-node', this.node.id, 'up')
      this.showActionDropdown = false
    },

    moveDown () {
      this.$emit('move-node', this.node.id, 'down')
      this.showActionDropdown = false
    },

    duplicateNode () {
      this.$emit('duplicate-node', this.node, this.siblings, this.index)
      this.showActionDropdown = false
    },

    deleteNode () {
      this.$emit('delete-node', this.node.id)
      this.showActionDropdown = false
    },

    addTableAtLevel () {
      this.showTableModal = true
      this.showActionDropdown = false
    },

    closeTableModal () {
      this.showTableModal = false
      // Reset to defaults when cancelled too
      this.tableRows = 3
      this.tableCols = 3
    },

    createTableAtLevel () {
      console.log('🔧 createTableAtLevel called', { rows: this.tableRows, cols: this.tableCols })
      
      const tableContent = this.generateTableHTML(this.tableRows, this.tableCols)
      console.log('🔧 Generated table HTML:', tableContent)
      
      const currentContent = this.node.content || ''
      console.log('🔧 Current node content:', currentContent)
      
      const newContent = currentContent + (currentContent ? '<br/><br/>' : '') + tableContent
      console.log('🔧 New combined content:', newContent)
      
      const updateData = {
        content: newContent,
        node_type: 'rich_text'
      }
      
      console.log('🔧 Emitting update-node with:', updateData)
      this.$emit('update-node', this.node.id, updateData)
      
      // Close the table creation modal and reset defaults
      this.showTableModal = false
      this.tableRows = 3
      this.tableCols = 3
      
      // Update the rich editor content immediately if we're in editing mode
      if (this.isEditing && this.$refs.richEditor) {
        console.log('🔧 Updating rich editor content with new table')
        this.$refs.richEditor.innerHTML = newContent
        
        // Initialize resizing for the new table
        this.$nextTick(() => {
          this.initializeTableResizing()
        })
      }
      
      // Exit editing mode after a short delay so user can see the result
      this.$nextTick(() => {
        setTimeout(() => {
          console.log('🔧 Exiting editing mode to show table result')
          this.isEditing = false
          this.editContent = newContent
        }, 500)
      })
    },

    generateTableHTML (rows, cols) {
      let html = '<table class="resizable-table" style="width: 100%; border-collapse: collapse;">\n'
      html += '  <thead>\n    <tr>\n'
      for (let c = 1; c <= cols; c++) {
        html += `      <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Header ${c}</th>\n`
      }
      html += '    </tr>\n  </thead>\n'
      html += '  <tbody>\n'
      for (let r = 1; r <= rows - 1; r++) {
        html += '    <tr>\n'
        for (let c = 1; c <= cols; c++) {
          html += `      <td style="border: 1px solid #ddd; padding: 8px;">Cell ${r}-${c}</td>\n`
        }
        html += '    </tr>\n'
      }
      html += '  </tbody>\n</table>'
      return html
    },

    // Rich text editor methods
    execCommand (command, value = null) {
      document.execCommand(command, false, value)
      this.$refs.richEditor.focus()
    },

    handlePaste (event) {
      const clipboardData = event.clipboardData || window.clipboardData
      if (!clipboardData) return

      const pastedHtml = clipboardData.getData('text/html')
      if (pastedHtml && hasComplexTable(pastedHtml)) {
        event.preventDefault()

        const sanitized = sanitizePastedHtml(pastedHtml)
        const normalized = normalizeComplexTableHtml(sanitized)

        document.execCommand('insertHTML', false, normalized)
        this.onContentChange()
        return
      }

      // For non-complex-table pastes, let browser handle normally then sync
      this.$nextTick(() => {
        this.onContentChange()
      })
    },

    onContentChange () {
      if (this.$refs.richEditor) {
        const newContent = this.$refs.richEditor.innerHTML

        // Only update and emit if content actually changed
        if (newContent !== this.editContent) {
          // Update the reactive data without triggering re-render
          this.editContent = newContent

          // Emit change for auto-save/change detection (debounced)
          this.emitContentUpdate()
        }
      }
    },

    emitContentUpdate () {
      // Debounce the update emission to avoid too many rapid updates
      clearTimeout(this.updateTimer)
      this.updateTimer = setTimeout(() => {
        if (this.editContent.trim() !== this.originalContent) {
          const updateData = {
            content: this.editContent.trim(),
            node_type: this.node.node_type === 'table' ? 'table' : 'rich_text'
          }

          this.$emit('update-node', this.node.id, updateData)
          this.originalContent = this.editContent.trim() // Update the reference point
        }
      }, 500) // 500ms debounce - longer to prevent interruption during typing
    },

    insertTableRow () {
      const table = this.$refs.richEditor.querySelector('table')
      if (table) {
        const newRow = table.insertRow()
        const cellCount = table.rows[0].cells.length

        for (let i = 0; i < cellCount; i++) {
          const cell = newRow.insertCell()
          cell.style.border = '1px solid #ddd'
          cell.style.padding = '8px'
          cell.textContent = `New Cell ${i + 1}`
        }

        // Ensure change detection is triggered
        this.onContentChange()
        console.log('🔄 Table row added - change detection triggered')
      }
    },

    insertTableColumn () {
      const table = this.$refs.richEditor.querySelector('table')
      if (table) {
        for (let i = 0; i < table.rows.length; i++) {
          const cell = table.rows[i].insertCell()
          cell.style.border = '1px solid #ddd'
          cell.style.padding = '8px'

          if (i === 0 && table.rows[i].cells[0].tagName === 'TH') {
            cell.outerHTML = '<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">New Header</th>'
          } else {
            cell.textContent = `New Cell`
          }
        }

        // Ensure change detection is triggered
        this.onContentChange()
        console.log('🔄 Table column added - change detection triggered')
      }
    },

    autoResize () {
      if (this.$refs.simpleEditor) {
        this.$refs.simpleEditor.style.height = 'auto'
        this.$refs.simpleEditor.style.height = this.$refs.simpleEditor.scrollHeight + 'px'
      }
    },

    formatDate (date) {
      if (!date) return null
      return new Date(date).toLocaleDateString()
    },

    handleTableContextMenu (event) {
      // Only show context menu if we're right-clicking on a table cell
      const target = event.target
      const cell = target.closest('td, th')
      const table = target.closest('table')

      if (!cell || !table) {
        return // Not in a table cell, let default context menu appear
      }

      event.preventDefault()
      event.stopPropagation()

      // Store reference to clicked cell and calculate its position
      this.currentCell = cell
      this.currentRow = cell.parentNode.rowIndex
      this.currentColumn = cell.cellIndex

      // Position context menu with proper container bounds checking
      this.showTableContextMenu = true
      
      // Get container bounds for proper positioning
      const container = this.$el.closest('.nodes-container') || this.$el.closest('.modal-body')
      const containerRect = container ? container.getBoundingClientRect() : { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
      
      // Calculate initial position
      let menuX = event.clientX
      let menuY = event.clientY
      
      // Estimate context menu dimensions (will be adjusted after DOM update)
      const menuWidth = 220
      const menuHeight = 400
      
      // Adjust X position to stay within container bounds
      if (menuX + menuWidth > containerRect.right) {
        menuX = containerRect.right - menuWidth - 10
      }
      if (menuX < containerRect.left) {
        menuX = containerRect.left + 10
      }
      
      // Adjust Y position to stay within container bounds
      if (menuY + menuHeight > containerRect.bottom) {
        menuY = containerRect.bottom - menuHeight - 10
      }
      if (menuY < containerRect.top) {
        menuY = containerRect.top + 10
      }
      
      this.contextMenuX = menuX
      this.contextMenuY = menuY

      // Notify parent that context menu is open (for container height adjustment)
      this.$emit('context-menu-opened', true)

      // Ensure the container can scroll to accommodate the menu
      this.$nextTick(() => {
        const contextMenuEl = this.$el.querySelector('.table-context-menu')
        if (contextMenuEl && container) {
          // Check if menu is fully visible in container
          const menuRect = contextMenuEl.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          
          // If menu extends beyond container bottom, scroll container
          if (menuRect.bottom > containerRect.bottom) {
            const scrollAmount = menuRect.bottom - containerRect.bottom + 20
            container.scrollBy({ top: scrollAmount, behavior: 'smooth' })
          }
          
          // If menu extends beyond container top, scroll up
          if (menuRect.top < containerRect.top) {
            const scrollAmount = containerRect.top - menuRect.top + 20
            container.scrollBy({ top: -scrollAmount, behavior: 'smooth' })
          }
        }
      })

      // Hide context menu when clicking elsewhere
      this.$nextTick(() => {
        document.addEventListener('click', this.hideTableContextMenu, { once: true })
      })
    },

    hideTableContextMenu () {
      this.showTableContextMenu = false
      this.currentCell = null
      this.currentRow = null
      this.currentColumn = null
      
      // Notify parent that context menu is closed
      this.$emit('context-menu-opened', false)
    },

    // Table resizing functionality (context menu based)
    initializeTableResizing () {
      // No initialization needed for context menu approach
      // Tables are resized via right-click context menu
    },

    addRowAbove () {
      // Find table either in editing mode (richEditor) or display mode (current cell's table)
      let table
      if (this.isEditing && this.$refs.richEditor) {
        table = this.$refs.richEditor.querySelector('table')
      } else if (this.currentCell) {
        table = this.currentCell.closest('table')
      }

      if (table && this.currentRow !== null) {
        const newRow = table.insertRow(this.currentRow)
        const cellCount = table.rows[0].cells.length

        for (let i = 0; i < cellCount; i++) {
          const cell = newRow.insertCell()
          cell.style.border = '1px solid #ddd'
          cell.style.padding = '8px'
          cell.textContent = `New Cell`
        }

        // Update content and trigger change detection
        this.updateNodeContentFromDOM()
        this.hideTableContextMenu()
        console.log('🔄 Table row added above - change detection triggered')
      }
    },

    addRowBelow () {
      // Find table either in editing mode (richEditor) or display mode (current cell's table)
      let table
      if (this.isEditing && this.$refs.richEditor) {
        table = this.$refs.richEditor.querySelector('table')
      } else if (this.currentCell) {
        table = this.currentCell.closest('table')
      }

      if (table && this.currentRow !== null) {
        const newRow = table.insertRow(this.currentRow + 1)
        const cellCount = table.rows[0].cells.length

        for (let i = 0; i < cellCount; i++) {
          const cell = newRow.insertCell()
          cell.style.border = '1px solid #ddd'
          cell.style.padding = '8px'
          cell.textContent = `New Cell`
        }

        // Update content and trigger change detection
        this.updateNodeContentFromDOM()
        this.hideTableContextMenu()
        console.log('🔄 Table row added below - change detection triggered')
      }
    },

    addColumnLeft () {
      // Find table either in editing mode (richEditor) or display mode (current cell's table)
      let table
      if (this.isEditing && this.$refs.richEditor) {
        table = this.$refs.richEditor.querySelector('table')
      } else if (this.currentCell) {
        table = this.currentCell.closest('table')
      }

      if (table && this.currentColumn !== null) {
        for (let i = 0; i < table.rows.length; i++) {
          const cell = table.rows[i].insertCell(this.currentColumn)
          cell.style.border = '1px solid #ddd'
          cell.style.padding = '8px'

          if (i === 0 && table.rows[i].cells[0].tagName === 'TH') {
            cell.outerHTML = '<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">New Header</th>'
          } else {
            cell.textContent = `New Cell`
          }
        }

        // Update content and trigger change detection
        this.updateNodeContentFromDOM()
        this.hideTableContextMenu()
        console.log('🔄 Table column added left - change detection triggered')
      }
    },

    addColumnRight () {
      // Find table either in editing mode (richEditor) or display mode (current cell's table)
      let table
      if (this.isEditing && this.$refs.richEditor) {
        table = this.$refs.richEditor.querySelector('table')
      } else if (this.currentCell) {
        table = this.currentCell.closest('table')
      }

      if (table && this.currentColumn !== null) {
        for (let i = 0; i < table.rows.length; i++) {
          const cell = table.rows[i].insertCell(this.currentColumn + 1)
          cell.style.border = '1px solid #ddd'
          cell.style.padding = '8px'

          if (i === 0 && table.rows[i].cells[0].tagName === 'TH') {
            cell.outerHTML = '<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">New Header</th>'
          } else {
            cell.textContent = `New Cell`
          }
        }

        // Update content and trigger change detection
        this.updateNodeContentFromDOM()
        this.hideTableContextMenu()
        console.log('🔄 Table column added right - change detection triggered')
      }
    },

    deleteCurrentRow () {
      // Find table either in editing mode (richEditor) or display mode (current cell's table)
      let table
      if (this.isEditing && this.$refs.richEditor) {
        table = this.$refs.richEditor.querySelector('table')
      } else if (this.currentCell) {
        table = this.currentCell.closest('table')
      }

      if (table && this.currentRow !== null) {
        // Don't delete if it's the only row
        if (table.rows.length <= 1) {
          alert('Cannot delete the last row')
          return
        }

        table.deleteRow(this.currentRow)
        this.updateNodeContentFromDOM()
        this.hideTableContextMenu()
        console.log('🗑 Table row deleted - change detection triggered')
      }
    },

    deleteCurrentColumn () {
      // Find table either in editing mode (richEditor) or display mode (current cell's table)
      let table
      if (this.isEditing && this.$refs.richEditor) {
        table = this.$refs.richEditor.querySelector('table')
      } else if (this.currentCell) {
        table = this.currentCell.closest('table')
      }

      if (table && this.currentColumn !== null) {
        // Don't delete if it's the only column
        if (table.rows[0].cells.length <= 1) {
          alert('Cannot delete the last column')
          return
        }

        // Delete the column from all rows
        for (let i = 0; i < table.rows.length; i++) {
          if (table.rows[i].cells[this.currentColumn]) {
            table.rows[i].deleteCell(this.currentColumn)
          }
        }

        this.updateNodeContentFromDOM()
        this.hideTableContextMenu()
        console.log('🗑 Table column deleted - change detection triggered')
      }
    },

    clearCell () {
      if (this.currentCell) {
        this.currentCell.textContent = ''
        this.updateNodeContentFromDOM()
        this.hideTableContextMenu()
        console.log('🧹 Current cell cleared - change detection triggered')
      }
    },

    clearTable () {
      // Find table either in editing mode (richEditor) or display mode (current cell's table)
      let table
      if (this.isEditing && this.$refs.richEditor) {
        table = this.$refs.richEditor.querySelector('table')
      } else if (this.currentCell) {
        table = this.currentCell.closest('table')
      }

      if (table) {
        // Clear all cell contents but keep table structure
        for (let i = 0; i < table.rows.length; i++) {
          for (let j = 0; j < table.rows[i].cells.length; j++) {
            table.rows[i].cells[j].textContent = ''
          }
        }
        this.updateNodeContentFromDOM()
        this.hideTableContextMenu()
        console.log('🧹 Table contents cleared - change detection triggered')
      }
    },

    setCellBackgroundColor (color) {
      if (this.currentCell) {
        // Set the background color of the clicked cell
        this.currentCell.style.backgroundColor = color
        
        // Update content and trigger change detection
        this.updateNodeContentFromDOM()
        this.hideTableContextMenu()
        console.log(`🎨 Cell background color set to: ${color}`)
      }
    },

    updateNodeContentFromDOM () {
      // This method updates the node content when we modify a table in display mode
      if (this.isEditing && this.$refs.richEditor) {
        // In editing mode, use the existing onContentChange method
        this.onContentChange()
      } else {
        // In display mode, extract the updated HTML and emit the change
        const displayDiv = this.$el.querySelector('.rich-text-display')
        if (displayDiv) {
          const updatedContent = displayDiv.innerHTML
          const updateData = {
            content: updatedContent,
            node_type: this.node.node_type === 'table' ? 'table' : 'rich_text'
          }

          this.$emit('update-node', this.node.id, updateData)
          console.log('🔄 Node content updated from DOM manipulation')
        }
      }
    },

    handleDragStart (event) {
      this.isDragging = true
      // Store the dragged node data
      event.dataTransfer.setData('text/plain', JSON.stringify({
        nodeId: this.node.id,
        level: this.node.level,
        parentId: this.node.parent_id,
        index: this.index
      }))
      event.dataTransfer.effectAllowed = 'move'
    },

    handleDragEnd (event) {
      this.isDragging = false
    },

    handleDragOver (event) {
      event.preventDefault()
      this.isDragOver = true
    },

    handleDragLeave (event) {
      this.isDragOver = false
    },

    handleDrop (event) {
      event.preventDefault()
      this.isDragOver = false
      
      try {
        const dragData = JSON.parse(event.dataTransfer.getData('text/plain'))
        const draggedNodeId = dragData.nodeId
        const targetNodeId = this.node.id
        
        console.log('🎯 Drop event details:', {
          draggedNodeId,
          targetNodeId,
          draggedLevel: dragData.level,
          targetLevel: this.node.level,
          draggedParentId: dragData.parentId,
          targetParentId: this.node.parent_id,
          draggedIndex: dragData.index,
          targetIndex: this.index
        })
        
        // Only allow same-level moves in Phase 1
        if (dragData.level === this.node.level && dragData.parentId === this.node.parent_id) {
          console.log('✅ Same-level drop validated, emitting reorder-nodes')
          this.$emit('reorder-nodes', {
            draggedNodeId,
            targetNodeId,
            draggedIndex: dragData.index,
            targetIndex: this.index
          })
        } else {
          console.log('❌ Cross-level drop rejected:', {
            sameLevel: dragData.level === this.node.level,
            sameParent: dragData.parentId === this.node.parent_id
          })
        }
      } catch (error) {
        console.error('Error processing drop:', error)
      }
    },

    openReviewerModal () {
      if (!this.isPersistedActionNode) {
        this.$toast && this.$toast.warning('Save the task first. New rows get a server id after save; then you can assign a reviewer.')
        this.showActionDropdown = false
        return
      }
      this.showReviewerModal = true
      this.selectedReviewerId = this.node.reviewer_id || ''
      this.fetchReviewers()
      this.showActionDropdown = false
    },
    closeReviewerModal () {
      this.showReviewerModal = false
      this.selectedReviewerId = ''
    },
    async fetchReviewers () {
      this.loadingReviewers = true
      try {
        const response = await this.$http.secured.get('/users/reviewers')
        this.reviewers = response.data
      } catch (error) {
        this.$toast && this.$toast.error('Failed to load reviewers')
      } finally {
        this.loadingReviewers = false
      }
    },
    async assignReviewer () {
      if (!this.selectedReviewerId) return
      if (!this.isPersistedActionNode) {
        this.$toast && this.$toast.warning('Save the task first, then assign a reviewer.')
        return
      }

      console.log('🔧 ASSIGNING REVIEWER:', {
        nodeId: this.node.id,
        taskVersionId: this.taskVersionId,
        meetingDraftTaskId: this.meetingDraftTaskId,
        selectedReviewerId: this.selectedReviewerId,
        url: this.nodeApiBase
      })
      
      try {
        const response = await this.$http.secured.put(this.nodeApiBase, {
          action_node: { reviewer_id: this.selectedReviewerId }
        })
        
        console.log('✅ REVIEWER ASSIGNMENT SUCCESS:', response.data)
        
        const updatedNodeData = response.data.data
        this.$emit('update-node', this.node.id, {
          reviewer_id: updatedNodeData.reviewer_id,
          reviewer_name: updatedNodeData.reviewer_name
        })
        this.closeReviewerModal()
        
        console.log('✅ NODE UPDATED WITH REVIEWER:', {
          nodeId: this.node.id,
          reviewerId: updatedNodeData.reviewer_id,
          reviewerName: updatedNodeData.reviewer_name
        })
        
      } catch (error) {
        console.error('❌ REVIEWER ASSIGNMENT FAILED:', error)
        this.$toast && this.$toast.error('Failed to assign reviewer')
      }
    },
    async removeReviewer () {
      if (!this.isPersistedActionNode) {
        this.$toast && this.$toast.warning('Save the task first, then change reviewers.')
        return
      }
      try {
        const response = await this.$http.secured.put(this.nodeApiBase, {
          action_node: { reviewer_id: null }
        })
        const updatedNodeData = response.data.data
        this.$emit('update-node', this.node.id, {
          reviewer_id: updatedNodeData.reviewer_id,
          reviewer_name: updatedNodeData.reviewer_name
        })
        this.closeReviewerModal()
      } catch (error) {
        this.$toast && this.$toast.error('Failed to remove reviewer')
      }
    },

    getReviewerName(reviewerId) {
      const reviewer = this.reviewers.find(r => r.id === reviewerId)
      return reviewer ? reviewer.full_name : 'Unknown'
    },

    // Permission checking methods
    isNodeAssignedToCurrentReviewer() {
      if (!this.permissionMode) return true
      
      const currentId = this.currentReviewerId ? String(this.currentReviewerId) : null
      const nodeId = this.node.reviewer_id ? String(this.node.reviewer_id) : null
      
      // Task-level handles unassigned nodes OR nodes explicitly assigned to them
      if (this.reviewerType === 'task_level') {
        return !nodeId || nodeId === currentId
      }
      
      // For node-level reviewers, check if this node is explicitly assigned to them
      if (this.reviewerType === 'node_level') {
        return nodeId && nodeId === currentId
      }
      
      return false
    },

    canEditThisNode() {
      if (!this.permissionMode) return !this.readonly
      if (this.readonly) return false
      
      // Get current user info to check if they're an editor
      const currentUser = this.getCurrentUserInfo()
      const isEditor = currentUser && currentUser.role === 'editor'
      
      // Editors can edit all nodes regardless of reviewer assignment
      if (isEditor) {
        return true
      }
      
      return this.isNodeAssignedToCurrentReviewer()
    },

    // Helper method to get current user info
    getCurrentUserInfo() {
      const userInfoCookie = this.getCookie('user_info')
      if (userInfoCookie) {
        try {
          const decodedCookie = decodeURIComponent(userInfoCookie)
          let parsed = JSON.parse(decodedCookie)
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed)
          }
          return parsed
        } catch (e) {
          console.error('Error parsing user info:', e)
          return null
        }
      }
      return null
    },

    // Helper method to get cookie value
    getCookie(name) {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
      return null
    }
  }
}
</script>

<style scoped>
.enhanced-node-item {
  margin-bottom: 0.75rem;
  transition: all 0.2s ease;
}

.enhanced-node-item.completed {
  background-color: rgba(16, 185, 129, 0.1);
  border-left: 3px solid #10b981;
  border-radius: 4px;
  padding: 4px 8px;
}

.enhanced-node-item.completed .node-content {
  color: #059669;
  font-weight: 500;
}

.enhanced-node-item.completed .node-marker {
  color: #10b981;
  font-weight: 600;
}

/* Distinct from diff-added (green): shows node-level reviewer assignment on THIS row only.
   Use direct child (>) so nested subpoints do not inherit yellow from a parent's has-reviewer. */
.enhanced-node-item.has-reviewer > .node-content {
  background-color: rgba(255, 237, 180, 0.45);
  border-color: rgba(217, 119, 6, 0.28);
}

.node-content {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  padding: 0.875rem 1rem;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.2s ease;
  min-height: 3rem; /* Ensure adequate height */
}

.node-marker {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  flex-shrink: 0;
  min-width: 3rem;
  padding: 0.125rem 0.75rem 0 0;
  font-weight: 600;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
  text-align: right;
}

.counter {
  font-family: monospace;
  text-align: right;
}

.counter-suffix {
  margin-left: 2px;
}

.node-editor-container {
  flex: 1;
  min-width: 0;
  max-width: calc(100% - 200px); /* Reserve space for date/actions but expand content */
}

/* Rich Text Styles */
.rich-text-container {
  width: 100%;
}

.rich-text-display {
  min-height: 2.5rem;
  padding: 0.75rem;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s ease;
  line-height: 1.6;
  word-wrap: break-word;
}

/* Table styles for display mode - using Vue 2 deep selectors for v-html content */
/* Try both /deep/ and >>> syntax for maximum compatibility */
.rich-text-display /deep/ table,
.rich-text-display >>> table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 0.5rem 0 !important;
  display: table !important;
  visibility: visible !important;
  /* Temporary debug styles to make tables super obvious */
  /* border: 3px solid red !important; */
  /* background-color: yellow !important; */
}

.rich-text-display /deep/ table:not(.dashboard-import-table) th,
.rich-text-display /deep/ table:not(.dashboard-import-table) td,
.rich-text-display >>> table:not(.dashboard-import-table) th,
.rich-text-display >>> table:not(.dashboard-import-table) td {
  border: 2px solid #000 !important;
  padding: 8px !important;
  text-align: left !important;
  display: table-cell !important;
  visibility: visible !important;
  background-color: white !important;
}

.rich-text-display /deep/ table.dashboard-import-table,
.rich-text-display >>> table.dashboard-import-table {
  width: auto !important;
  max-width: none !important;
  border-collapse: collapse !important;
  table-layout: auto !important;
}

.rich-text-display /deep/ table.dashboard-import-table th,
.rich-text-display /deep/ table.dashboard-import-table td,
.rich-text-display >>> table.dashboard-import-table th,
.rich-text-display >>> table.dashboard-import-table td {
  border: 1px solid #222 !important;
}

.rich-text-display /deep/ table th,
.rich-text-display >>> table th {
  /* background-color: #ff0000 !important; */
  font-weight: 600 !important;
  color: black !important;
}

.rich-text-display /deep/ table thead,
.rich-text-display >>> table thead {
  display: table-header-group !important;
}

.rich-text-display /deep/ table tbody,
.rich-text-display >>> table tbody {
  display: table-row-group !important;
}

.rich-text-display /deep/ table tr,
.rich-text-display >>> table tr {
  display: table-row !important;
}

.rich-text-editor {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}

.rich-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding-right: 0.5rem;
  border-right: 1px solid #e5e7eb;
}

.toolbar-group:last-child {
  border-right: none;
}

.toolbar-btn {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background: #f3f4f6;
}

.toolbar-btn.save-btn {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.toolbar-btn.cancel-btn {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.color-picker,
.font-size-picker {
  padding: 0.25rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
}

.font-size-picker {
  min-width: 80px;
}

.rich-editor {
  min-height: 100px;
  padding: 0.75rem;
  outline: none;
  line-height: 1.5;
}

.rich-editor /deep/ table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 0.5rem 0 !important;
  display: table !important;
  visibility: visible !important;
}

.rich-editor /deep/ table:not(.dashboard-import-table) th,
.rich-editor /deep/ table:not(.dashboard-import-table) td {
  border: 1px solid #ddd !important;
  padding: 8px !important;
  text-align: left !important;
  display: table-cell !important;
  visibility: visible !important;
}

.rich-editor /deep/ table:not(.dashboard-import-table) th {
  background-color: #f2f2f2 !important;
  font-weight: 600 !important;
}

.rich-editor /deep/ table.dashboard-import-table {
  width: auto !important;
  max-width: none !important;
  border-collapse: collapse !important;
  table-layout: auto !important;
}

.rich-editor /deep/ table.dashboard-import-table th,
.rich-editor /deep/ table.dashboard-import-table td {
  border: 1px solid #222 !important;
}

.rich-editor /deep/ table thead {
  display: table-header-group !important;
}

.rich-editor /deep/ table tbody {
  display: table-row-group !important;
}

.rich-editor /deep/ table tr {
  display: table-row !important;
}

/* Simple Text Styles */
.simple-text-container {
  width: 100%;
}

.simple-editor {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease;
}

.simple-editor:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.simple-display {
  min-height: 1.5rem;
  padding: 0.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s ease;
  word-wrap: break-word;
}

.simple-display:hover {
  border-color: #d1d5db;
}

.simple-display.empty-content {
  color: #9ca3af;
  font-style: italic;
}

/* Combined Date & Actions Section */
.node-meta-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 180px;
  justify-content: flex-end;
}

/* Date Styles */
.node-date {
  min-width: 110px;
}

.date-input {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  outline: none;
}

.date-input:focus {
  border-color: #3b82f6;
}

.date-display {
  padding: 0.375rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.date-display:hover {
  border-color: #d1d5db;
}

.date-display.no-date {
  color: #9ca3af;
  font-style: italic;
}

/* Completion Item Styles */
.action-item.completed-item {
  color: #10b981;
  font-weight: 500;
}

.action-item.completed-item:hover {
  background-color: #f0fdf4;
}

/* Actions Styles */
.node-actions {
  position: relative;
}

.node-actions-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.35rem;
}

/* Uses class action-btn; compact padding/font come from the second .action-btn block below */
.node-comment-shortcut-btn {
  flex-shrink: 0;
  line-height: 1;
}

.node-comment-shortcut-svg {
  width: 1em;
  height: 1em;
  display: block;
  flex-shrink: 0;
}

.action-dropdown {
  position: relative;
}

.action-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.action-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.action-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 10030;
  min-width: 200px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  margin-top: 0.25rem;
  padding: 0.5rem 0;
}

.action-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  gap: 0.5rem;
  transition: background-color 0.2s ease;
}

.action-item:hover {
  background-color: #f3f4f6;
}

.action-item.delete-item {
  color: #ef4444;
}

.action-item.delete-item:hover {
  background-color: #fef2f2;
}

.action-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 0.25rem 0;
}

.action-item-show-delays.action-item--has-delays {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.35), transparent);
  font-weight: 600;
  border-left: 3px solid #f59e0b;
  padding-left: calc(0.75rem - 3px);
}

.action-item-show-delays.action-item--has-delays:hover {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.5), #f3f4f6);
}

.delays-inline-loading {
  opacity: 0.7;
  font-size: 0.8rem;
}

.delays-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.delays-modal-header h4 {
  margin: 0;
  flex: 1;
}

.delays-modal-sub {
  margin-top: 0;
  margin-bottom: 0.75rem;
}

.delays-modal-loading,
.delays-modal-empty {
  padding: 1rem 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.delays-table-wrap {
  max-height: 50vh;
  overflow: auto;
  margin-bottom: 0.75rem;
}

.delays-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.delays-table th,
.delays-table td {
  border: 1px solid #e5e7eb;
  padding: 0.4rem 0.5rem;
  text-align: left;
  vertical-align: top;
}

.delays-table th {
  background: #f9fafb;
  font-weight: 600;
}

.delays-remarks {
  max-width: 14rem;
  word-break: break-word;
}

.delays-count-footer {
  margin: 0.5rem 0 0 0;
  font-size: 0.8rem;
  color: #6b7280;
}

.delays-refresh-btn {
  flex-shrink: 0;
}

/* Children Styles */
.node-children {
  margin-top: 0.5rem;
}

/* Table Modal Styles */
.table-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.table-modal {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  min-width: 300px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.table-modal h4 {
  margin: 0 0 1rem 0;
  color: #374151;
}

.table-form {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-input:focus {
  outline: none;
  /* border-color: #3b82f6; */
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.table-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* Table Context Menu Styles */
.table-context-menu {
  position: fixed;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  padding: 0.5rem;
  z-index: 10050;
  min-width: 200px;
  max-width: 220px;
  max-height: 400px;
  overflow-y: auto;
  backdrop-filter: blur(4px);
  border: 2px solid rgba(59, 130, 246, 0.1);
}

.context-menu-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.context-menu-group:last-child {
  margin-bottom: 0;
}

.context-menu-item {
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  text-align: left;
  width: 100%;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.context-menu-item:hover {
  background-color: #f3f4f6;
}

.context-menu-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 0.5rem 0;
}

.context-menu-item.delete-item {
  color: #ef4444;
}

.context-menu-item.delete-item:hover {
  background-color: #fef2f2;
}

/* Ensure context menu is properly scrollable */
.table-context-menu::-webkit-scrollbar {
  width: 6px;
}

.table-context-menu::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.table-context-menu::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.table-context-menu::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Color Picker Styles */
.color-picker-section {
  padding: 0.5rem 0;
}

/* Reviewer Assignment Styles */
.reviewer-assignment-section {
  padding: 0.5rem 0;
}

.reviewer-assignment-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.reviewer-select {
  width: 100%;
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background-color: white;
  color: #374151;
  margin-bottom: 0.5rem;
}

.reviewer-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.current-reviewer {
  font-size: 0.75rem;
  color: #059669;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  background-color: #ecfdf5;
  border-radius: 4px;
  border: 1px solid #d1fae5;
}

.color-picker-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 0.5rem;
  padding: 0 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.color-picker-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.25rem;
  padding: 0 1rem;
}

.color-picker-btn {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.color-picker-btn:hover {
  border-color: #3b82f6;
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-picker-btn[style*="transparent"] {
  background-image: linear-gradient(45deg, #e5e7eb 25%, transparent 25%), 
                    linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), 
                    linear-gradient(45deg, transparent 75%, #e5e7eb 75%), 
                    linear-gradient(-45deg, transparent 75%, #e5e7eb 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
}

/* Diff Status Styling */
.enhanced-node-item.diff-added {
  background: rgba(34, 197, 94, 0.08);
  border-left: 3px solid #22c55e;
}

.enhanced-node-item.diff-added .node-content {
  border-color: rgba(34, 197, 94, 0.2);
}

.enhanced-node-item.diff-modified {
  background: rgba(245, 158, 11, 0.08);
  border-left: 3px solid #f59e0b;
}

.enhanced-node-item.diff-modified .node-content {
  border-color: rgba(245, 158, 11, 0.2);
}

.enhanced-node-item.diff-removed {
  background: rgba(239, 68, 68, 0.08);
  border-left: 3px solid #ef4444;
  opacity: 0.7;
}

.enhanced-node-item.diff-removed .node-content {
  border-color: rgba(239, 68, 68, 0.2);
  text-decoration: line-through;
}

.enhanced-node-item.diff-removed .rich-text-display,
.enhanced-node-item.diff-removed .rich-editor {
  text-decoration: line-through;
}

.enhanced-node-item.diff-unchanged {
  /* Default styling for unchanged content */
}

/* Review page: flat view without diff / reviewer / completion tint */
.enhanced-node-item.suppress-node-highlights.has-reviewer > .node-content {
  background-color: transparent !important;
  border-color: transparent !important;
}

.enhanced-node-item.suppress-node-highlights.completed {
  background-color: transparent;
  border-left: none;
  padding-left: 8px;
  border-radius: 4px;
}

.enhanced-node-item.suppress-node-highlights.completed .node-content {
  color: inherit;
  font-weight: inherit;
}

.enhanced-node-item.suppress-node-highlights.completed .node-marker {
  color: #6b7280;
  font-weight: 600;
}

/* Reduced font sizes for better space utilization */
.enhanced-node-item {
  font-size: 13px; /* Reduced from default */
}

.node-content {
  gap: 1.25rem;
  padding: 12px 14px;
}

.node-marker {
  font-size: 12px;
  min-width: 3rem;
  padding: 0.125rem 0.75rem 0 0;
}

.rich-text-display {
  padding: 8px 10px; /* Reduced padding */
  min-height: 2rem; /* Reduced min-height */
  font-size: 13px; /* Consistent font size */
}

.rich-editor {
  font-size: 13px; /* Consistent font size */
}

.toolbar-btn {
  padding: 4px 6px; /* Reduced toolbar button padding */
  font-size: 11px; /* Smaller toolbar font */
}

.date-display, .date-input {
  font-size: 11px; /* Smaller date font */
  padding: 4px 6px; /* Reduced date padding */
}

.action-btn {
  padding: 6px 8px; /* Reduced action button padding */
  font-size: 12px; /* Smaller action button font */
}

/* Drag and Drop Styling */
.enhanced-node-item[draggable="true"] {
  cursor: move;
  position: relative;
}

.enhanced-node-item.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
  box-shadow: 0 8px 16px rgba(0,0,0,0.2);
  z-index: 1000;
}

.enhanced-node-item.drag-over {
  border: 2px solid #3b82f6;
  background-color: rgba(59, 130, 246, 0.1);
  transform: scale(1.02);
  transition: all 0.2s ease;
}

.enhanced-node-item.drag-over::before {
  content: '↓ Drop here to reorder';
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: #3b82f6;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 1001;
}

/* Table Styles */
.resizable-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
}

.resizable-table th,
.resizable-table td {
  border: 1px solid #ddd;
  padding: 8px;
  min-width: 50px;
  min-height: 30px;
  text-align: left;
  vertical-align: top;
}

.resizable-table th {
  background-color: #f2f2f2;
  font-weight: 600;
}

/* Table hover effects to show resize handles */
.resizable-table:hover .column-resize-handle {
  background: rgba(59, 130, 246, 0.3);
}

.resizable-table:hover .row-resize-handle {
  background: rgba(59, 130, 246, 0.3);
}

.reviewer-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.reviewer-modal {
  background: white;
  border-radius: 10px;
  padding: 2rem;
  min-width: 320px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
}
.reviewer-select {
  width: 100%;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  margin-bottom: 1rem;
}
.reviewer-modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
.review-date-extension-modal {
  max-width: 520px;
}
.extension-modal-hint {
  font-size: 0.875rem;
  color: #4b5563;
  margin: 0 0 1rem 0;
  line-height: 1.45;
}
.extension-reason-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.extension-tag-btn {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  color: #374151;
}
.extension-tag-btn:hover {
  border-color: #3b82f6;
  color: #1e40af;
}
.extension-tag-btn.active {
  background: #1e40af;
  color: #fff;
  border-color: #1e40af;
}
.extension-remarks {
  margin-bottom: 1rem;
}
.extension-remarks label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.35rem;
}
.extension-modal-actions {
  flex-wrap: wrap;
}
.btn-danger {
  background: #ef4444;
  color: white;
}
.btn-danger:hover {
  background: #dc2626;
}
.reviewer-hover-badge {
  position: relative;
  display: flex;
  align-items: center;
}
.reviewer-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  margin-left: 8px;
  cursor: pointer;
  white-space: nowrap;
}
.reviewer-badge.no-date:not(.yellow-bg-bold) {
  color: #9ca3af;
  font-style: italic;
  background: transparent;
}
.reviewer-hover-popup {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  background: #374151;
  color: #fff;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.9em;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  white-space: nowrap;
  z-index: 3000;
  pointer-events: none;
}

.reviewer-hover-popup::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #374151 transparent transparent transparent;
}

/* Add placeholder styles */
.rich-editor[contenteditable="true"]:empty:before {
  content: attr(data-placeholder);
  color: #9ca3af;
  font-style: italic;
}
</style>
