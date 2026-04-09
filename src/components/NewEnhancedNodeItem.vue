<template>
  <div class="enhanced-node-item" :id="'action-node-' + node.id" :class="[
    { 'completed': node.completed },
    { 'has-reviewer': node.reviewer_id },
    diffHighlightClass,
    { 'suppress-node-highlights': suppressDiffHighlights },
    { 'permission-readonly': permissionMode && readonly },
    { 'permission-assigned': permissionMode && isNodeAssignedToCurrentReviewer() },
    { 'permission-unassigned': permissionMode && !isNodeAssignedToCurrentReviewer() },
    meetingHubRowClassObj
  ]">
    <!-- Node Content -->
    <div class="node-content" :style="{ paddingLeft: indentLevel + 'px' }" @contextmenu.prevent="handleNodeAreaContextMenu($event)">
      <!-- Counter/Marker -->
      <div class="node-marker">
        <span class="counter">{{ node.display_counter }}</span>
        <span class="counter-suffix" v-if="node.list_style !== 'bullet'">.</span>
      </div>

      <!-- Content Editor -->
      <div class="node-editor-container">
        <!-- Always-on rich text editor: no Save/Discard — blur + debounced input emit persist changes.
             Table nodes only: a tiny +Row/+Col strip while focused (structure ops; right-click menu also has these). -->
        <div class="rich-text-container">
          <div
            class="rich-text-editor always-on-editor"
            :class="{ 'always-on-editor--table-tools': isEditing && node.node_type === 'table' }"
          >
            <div
              v-if="isEditing && node.node_type === 'table'"
              class="node-table-tools"
            >
              <button @mousedown.prevent="insertTableRow" class="ntt-btn" type="button" title="Insert row">+ Row</button>
              <button @mousedown.prevent="insertTableColumn" class="ntt-btn" type="button" title="Insert column">+ Col</button>
            </div>

            <div
              ref="richEditor"
              :contenteditable="canEditThisNode() ? 'true' : 'false'"
              @focus="onEditorFocus"
              @blur="onEditorBlur($event)"
              @input="onContentChange"
              @paste="handlePaste"
              @keyup="onContentChange(); onTextSelection()"
              @keydown="handleEditorKeydown"
              @mouseup="onTextSelection"
              @contextmenu="handleTableContextMenu"
              class="rich-editor"
              :class="{ 'editor-active': isEditing, 'editor-readonly': !canEditThisNode() }"
              data-placeholder="Type here…"
            ></div>
          </div>
        </div>

        <!-- Floating text-selection toolbar (G): appears above any selected text for quick formatting.
             position absolute to .node-editor-container — same proven pattern as table/node context menus. -->
        <div
          v-show="selToolbarVisible && isEditing"
          ref="selToolbar"
          class="sel-toolbar"
          :style="{ top: selToolbarTop + 'px', left: selToolbarLeft + 'px' }"
          @mousedown.stop
        >
          <button @mousedown.prevent="execCommand('bold')" class="sel-tb-btn" title="Bold"><strong>B</strong></button>
          <button @mousedown.prevent="execCommand('italic')" class="sel-tb-btn" title="Italic"><em>I</em></button>
          <button @mousedown.prevent="execCommand('underline')" class="sel-tb-btn" title="Underline"><u>U</u></button>
          <span class="sel-tb-sep"></span>
          <select
            v-model="selToolbarFontPreset"
            class="sel-tb-size"
            title="Preset size"
            @mousedown="captureSelToolbarSelectionIfAny"
            @change="onSelToolbarFontPresetChange"
          >
            <option value="" disabled>Size</option>
            <option value="1">8pt</option>
            <option value="2">10pt</option>
            <option value="3">12pt</option>
            <option value="4">14pt</option>
            <option value="5">16pt</option>
          </select>
          <div class="sel-custom-pt">
            <input
              v-model.number="customFontPtInput"
              type="number"
              min="6"
              max="96"
              step="0.5"
              class="sel-pt-inp"
              title="Font size (pt) — applies automatically"
              @mousedown.stop
              @click.stop
              @input="scheduleSelToolbarCustomPtApply"
              @change="applyCustomFontPtFromInput"
              @blur="applyCustomFontPtFromInput"
            >
          </div>
          <label class="sel-tb-color" title="Text colour">
            <span class="sel-tb-color-swatch" :style="{ color: toolbarFgColor }">A</span>
            <input type="color" :value="toolbarFgColor" @input="applyToolbarFgColor($event.target.value)" class="sel-tb-color-input">
          </label>
        </div>

        <!-- Table context menu: sibling of rich-text-container so it is not clipped by .rich-text-editor overflow;
             position absolute to .node-editor-container so it stays aligned when the modal/list scrolls. -->
        <div
          v-if="showTableContextMenu"
          ref="tableContextMenu"
          class="table-context-menu"
          :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
          @click.stop
        >
          <!-- Text format row (at top so editors can format without leaving the menu) -->
          <div class="context-menu-group">
            <div class="context-menu-label">Text in cell:</div>
            <div class="cell-format-row">
              <button @mousedown.prevent="execCommand('bold')" class="cell-fmt-btn" title="Bold"><strong>B</strong></button>
              <button @mousedown.prevent="execCommand('italic')" class="cell-fmt-btn" title="Italic"><em>I</em></button>
              <button @mousedown.prevent="execCommand('underline')" class="cell-fmt-btn" title="Underline"><u>U</u></button>
              <select
                v-model="tableMenuFontPreset"
                class="cell-fmt-size"
                title="Preset size"
                @mousedown="captureSelToolbarSelectionIfAny"
                @change="onTableMenuFontPresetChange"
              >
                <option value="" disabled>Size</option>
                <option value="1">8pt</option>
                <option value="2">10pt</option>
                <option value="3">12pt</option>
                <option value="4">14pt</option>
              </select>
              <div class="cell-custom-pt">
                <input
                  v-model.number="customFontPtInput"
                  type="number"
                  min="6"
                  max="96"
                  step="0.5"
                  class="cell-pt-inp"
                  title="Font size (pt) — applies automatically"
                  @mousedown.stop
                  @click.stop
                  @input="scheduleSelToolbarCustomPtApply"
                  @change="applyCustomFontPtFromInput"
                  @blur="applyCustomFontPtFromInput"
                >
              </div>
              <label class="toolbar-color-wrap" title="Text Color">
                <span class="toolbar-color-icon" :style="{ color: toolbarFgColor }">A</span>
                <input type="color" :value="toolbarFgColor" @input="applyToolbarFgColor($event.target.value)" class="toolbar-color-input">
              </label>
            </div>
          </div>

          <div class="context-menu-divider"></div>

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
              @click="openReviewerModal()"
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

        <!-- Primary node context menu (right-click on node body) -->
        <div
          v-if="showNodeContextMenu"
          class="node-context-menu"
          :style="{ top: nodeContextMenuY + 'px', left: nodeContextMenuX + 'px' }"
          @click.stop
        >
          <button @click="addPointSameLevel(); hideNodeContextMenu()" class="context-menu-item">
            + Add Point (Same Level)
          </button>
          <button @click="addSubpoint(); hideNodeContextMenu()" class="context-menu-item">
            → Add Subpoint
          </button>
          <button v-if="node.level > 1" @click="addParentLevelPoint(); hideNodeContextMenu()" class="context-menu-item">
            ← Add Parent Point
          </button>
          <button @click="toggleCompletion(); hideNodeContextMenu()" class="context-menu-item" :class="{ 'completed-item': node.completed }">
            {{ node.completed ? '✓ Mark Incomplete' : '☐ Mark Complete' }}
          </button>
          <button @click="deleteNode(); hideNodeContextMenu()" class="context-menu-item delete-item">
            🗑 Delete
          </button>
          <div class="context-menu-divider"></div>
          <button class="context-menu-item more-options-btn" @click.stop="showNodeContextMenuMore = !showNodeContextMenuMore">
            More options <span class="more-arrow">▶</span>
          </button>
        </div>

        <!-- Secondary tier node context menu -->
        <div
          v-if="showNodeContextMenu && showNodeContextMenuMore"
          class="node-context-menu node-context-menu-more"
          :style="{ top: nodeContextMenuY + 'px', left: (nodeContextMenuX + 204) + 'px' }"
          @click.stop
        >
          <button @click="addTableAtLevel(); hideNodeContextMenu()" class="context-menu-item">
            📊 Add Table Here
          </button>
          <button @click="moveUp(); hideNodeContextMenu()" class="context-menu-item">
            ↑ Move Up
          </button>
          <button @click="moveDown(); hideNodeContextMenu()" class="context-menu-item">
            ↓ Move Down
          </button>
          <button @click="duplicateNode(); hideNodeContextMenu()" class="context-menu-item">
            📋 Duplicate
          </button>
          <button
            v-if="hasReviewerMeta && !hasValidReviewDate"
            @click="startDateEditFromMenu(); hideNodeContextMenu()"
            class="context-menu-item"
          >
            📅 Set review date
          </button>
          <button
            type="button"
            @click="openReviewerModal(); hideNodeContextMenu()"
            class="context-menu-item"
            :disabled="!isPersistedActionNode"
            :title="!isPersistedActionNode ? 'Save the task first so this row has a server id, then assign a reviewer.' : ''"
          >
            <span v-if="!node.reviewer_id">👤 Assign Reviewer</span>
            <span v-else>👤 Change Reviewer</span>
          </button>
          <div class="context-menu-divider"></div>
          <button
            type="button"
            class="context-menu-item action-item-show-delays"
            :class="{ 'action-item--has-delays': delaysHighlightMenuItem }"
            :disabled="!isPersistedActionNode || delaysMenuFetchLoading"
            @click="openDelaysModal(); hideNodeContextMenu()"
          >
            🕐 Show Delays
            <span v-if="delaysMenuFetchLoading" class="delays-inline-loading"> …</span>
          </button>
          <div class="context-menu-divider"></div>
          <!-- N: List-style picker -->
          <div class="context-menu-label" style="padding-top:0.3rem">List style:</div>
          <button @click="changeListStyle('decimal'); hideNodeContextMenu()" class="context-menu-item" :class="{ 'context-menu-item--active': node.list_style === 'decimal' }">
            <span class="cm-style-preview">1.</span> Numbered
          </button>
          <button @click="changeListStyle('lower-alpha'); hideNodeContextMenu()" class="context-menu-item" :class="{ 'context-menu-item--active': node.list_style === 'lower-alpha' }">
            <span class="cm-style-preview">a.</span> Alphabetic
          </button>
          <button @click="changeListStyle('lower-roman'); hideNodeContextMenu()" class="context-menu-item" :class="{ 'context-menu-item--active': node.list_style === 'lower-roman' }">
            <span class="cm-style-preview">i.</span> Roman
          </button>
          <button @click="changeListStyle('bullet'); hideNodeContextMenu()" class="context-menu-item" :class="{ 'context-menu-item--active': node.list_style === 'bullet' }">
            <span class="cm-style-preview">•</span> Bullet
          </button>
        </div>
      </div>

      <!-- Metadata: icon-first row — calendar + short date; reviewer control without label spam -->
      <div class="node-meta-section">
        <div class="meta-inline-row" v-if="showNodeDateField || showReviewDatePopover || hasReviewerMeta || canEditThisNode()">
          <!-- Review date: calendar opens full month picker; formatted text only when a valid date is saved -->
          <div
            v-if="showNodeDateField || showReviewDatePopover"
            ref="reviewDateAnchorWrap"
            class="meta-date-slot meta-date-slot--popover"
          >
            <button
              type="button"
              class="meta-icon-btn"
              :class="[metaCalendarBtnClass, { 'meta-icon-btn--picker-open': showReviewDatePopover }]"
              :title="hasValidReviewDate ? ('Review date: ' + formatDate(node.review_date)) : 'Review date'"
              aria-label="Review date"
              :aria-expanded="showReviewDatePopover ? 'true' : 'false'"
              @click.stop="toggleReviewDatePopover"
            >
              <svg class="meta-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <span
              v-if="hasValidReviewDate && !showReviewDatePopover"
              class="meta-date-text"
              :class="getReviewDateHighlightClassesIfSet(node.review_date)"
            >{{ formatDateShort(node.review_date) }}</span>
            <div
              v-show="showReviewDatePopover"
              class="meta-review-date-pop"
              :style="reviewPopoverPos"
              @click.stop
            >
              <v-date-picker
                mode="date"
                :value="reviewDatePickerCalendarValue"
                @dayclick="onReviewDatePickerDayPick"
                @daykeydown="onReviewDatePickerDayKeydown"
              />
            </div>
          </div>

          <!-- Reviewer: icon opens modal; optional compact name -->
          <div class="meta-reviewer-slot" v-if="hasReviewerMeta || canEditThisNode()">
            <button
              type="button"
              class="meta-icon-btn"
              :class="reviewerIconBtnClass"
              :title="reviewerIconTitle"
              :aria-label="reviewerIconTitle"
              :disabled="!isPersistedActionNode || !canEditThisNode()"
              @click.stop="openReviewerModal()"
            >
              <svg class="meta-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <span
              v-if="hasReviewerMeta && reviewerBadgeText"
              class="meta-reviewer-name"
              :title="reviewerBadgeText"
              @click.stop="canEditThisNode() && isPersistedActionNode && openReviewerModal()"
            >{{ reviewerBadgeText }}</span>
          </div>
        </div>

        <!-- Node Actions: right-click is primary; comment shortcut shown inline -->
        <div class="node-actions node-actions-row">
          <button
            v-if="enableCommentShortcut"
            type="button"
            class="action-btn node-comment-shortcut-btn"
            :title="'Comment on action item ' + (node.display_counter || node.id)"
            :aria-label="'Open comments for action item ' + (node.display_counter || node.id)"
            @click.stop="emitOpenCommentForNode"
          >
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
    </div>

    <!-- Hover quick-add: adds a same-level point below this node; keyboard/touch users use ⋮ menu -->
    <button
      v-if="!readonly && canEditThisNode()"
      class="quick-add-btn"
      type="button"
      title="Add item at same level (↵)"
      @click.stop="addPointSameLevel"
    >+</button>

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
import { legacyFontPresetKeyToPt } from '@/utils/execCommandFontSizePresets'
import VDatePicker from 'v-calendar/src/components/DatePicker.vue'
import 'v-calendar/src/styles/base.css'
import { ymdFromDate, parseYmdToLocalStart } from '@/utils/tentativeReviewDateFilter'

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
    NewEnhancedNodeItem: () => import('./NewEnhancedNodeItem.vue'),
    VDatePicker
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
      /** Full month calendar popover (replaces native type="date" two-step UX). */
      showReviewDatePopover: false,
      reviewPopoverPos: { top: '0px', left: '0px' },
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
      toolbarFgColor: '#000000',
      toolbarBgColor: '#ffffff',
      focusSnapshot: '', // innerHTML snapshot taken on focus; used by cancelEdit to revert
      ignoreNextBlur: false, // set true before context menu opens to skip the auto-blur save
      blurSaveTimer: null,
      selToolbarVisible: false,
      selToolbarTop: 0,
      selToolbarLeft: 0,
      /** Legacy execCommand fontSize values 1–7; we use 1–5 mapped to 8–16pt in the menu. */
      selToolbarFontPreset: '',
      selToolbarSavedRange: null,
      selToolbarDebounceTimer: null,
      customPtApplyTimer: null,
      /** Table context menu font preset (synced with customFontPtInput on change). */
      tableMenuFontPreset: '',
      customFontPtInput: 10,
      showNodeContextMenu: false,
      showNodeContextMenuMore: false,
      nodeContextMenuX: 0,
      nodeContextMenuY: 0,
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
    /** v-calendar bound value while the popover is open (local midnight). */
    reviewDatePickerCalendarValue () {
      const fromEdit = this.editDate ? this.toReviewDateKey(this.editDate) : null
      if (fromEdit) {
        const parsed = parseYmdToLocalStart(fromEdit)
        if (parsed) return parsed
      }
      if (this.hasValidReviewDate && this.node.review_date) {
        const k = this.toReviewDateKey(this.node.review_date)
        if (k) {
          const p = parseYmdToLocalStart(k)
          if (p) return p
        }
      }
      return new Date()
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
    },
    metaCalendarBtnClass () {
      if (!this.node.review_date) return {}
      const hi = getReviewDateHighlightClassesIfSet(this.node.review_date)
      return hi && hi.length ? { 'meta-icon-btn--date-attn': true } : {}
    },
    reviewerIconTitle () {
      if (!this.canEditThisNode()) {
        return this.reviewerBadgeText ? ('Reviewer: ' + this.reviewerBadgeText) : 'Reviewer'
      }
      if (!this.isPersistedActionNode) return 'Save the task first, then assign a reviewer'
      if (this.reviewerBadgeText) return 'Reviewer: ' + this.reviewerBadgeText + ' — click to change'
      return 'Assign reviewer'
    },
    reviewerIconBtnClass () {
      const c = {}
      if (!this.isPersistedActionNode || !this.canEditThisNode()) c['meta-icon-btn--disabled'] = true
      else if (this.hasReviewerMeta && !this.hasValidReviewDate) c['meta-icon-btn--alert'] = true
      else if (this.hasReviewerMeta) c['meta-icon-btn--ok'] = true
      return c
    }
  },

  watch: {
    // Watch for prop changes but only update DOM if user is not currently editing
    'node.content': {
      handler (newContent) {
        const ed = this.$refs.richEditor
        if (!ed) return
        // Parent sync must not replace the live DOM while the user is typing here:
        // that resets the caret to index 0 and inserts characters in reverse order.
        if (this._richEditorContainsActiveElement()) return
        if (!this.isEditing) {
          ed.innerHTML = newContent || ''
          this.editContent = newContent || ''
        }
      },
      immediate: false
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
    // Always-on: richEditor is always in the DOM; set initial content
    if (this.$refs.richEditor) {
      this.$refs.richEditor.innerHTML = this.node.content || ''
    }
    this.initializeTableResizing()
    document.addEventListener('selectionchange', this.onDocumentSelectionChangeForToolbar)
  },

  beforeDestroy () {
    document.removeEventListener('click', this.handleClickOutside)
    document.removeEventListener('selectionchange', this.onDocumentSelectionChangeForToolbar)
    this.closeReviewDatePopover()
    clearTimeout(this.updateTimer)
    clearTimeout(this.blurSaveTimer)
    clearTimeout(this.selToolbarDebounceTimer)
    clearTimeout(this.customPtApplyTimer)
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
      // Always-on: the richEditor is always in the DOM; just focus it.
      this.$nextTick(() => {
        if (this.$refs.richEditor) {
          this.$refs.richEditor.focus()
        }
      })
    },

    // ── Keyboard shortcuts (O) ───────────────────────────────────────────────
    // Guard: NEVER intercept Enter/Tab inside a table cell — let the browser handle
    // native cell navigation. Only fire when the cursor is in free text.
    handleEditorKeydown (event) {
      const inCell = event.target.closest('td, th')

      if (event.key === 'Escape') {
        event.preventDefault()
        this.cancelEdit()
        return
      }

      // Enter (no Shift, no Ctrl/Cmd) → add same-level point below OR continue list item.
      // When the cursor is inside a <li>, let the browser handle native list continuation
      // (non-empty → new <li>; empty <li> → exits list). Only intercept at the top-level
      // contenteditable where Enter should create a new sibling ActionNode.
      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !inCell) {
        const inListItem = this._cursorInListItem()
        if (inListItem) {
          // Browser will handle: new <li> on non-empty, exit list on empty.
          // For the empty-item case, schedule a save so the partially-built list
          // (now a paragraph after exit) is persisted to the node's content.
          if (!inListItem.textContent || !inListItem.textContent.trim()) {
            setTimeout(() => this.saveContent(), 0)
          }
          // Do NOT preventDefault — pass through to browser.
          return
        }
        event.preventDefault()
        this.saveContent()
        this.addPointSameLevel()
        return
      }

      // Tab → indent (add subpoint); Shift+Tab → dedent.
      // Inside a <li> we let the browser handle native list indentation instead
      // (Tab → nest list, Shift+Tab → lift list item).
      if (event.key === 'Tab' && !inCell) {
        if (this._cursorInListItem()) {
          // Pass through so the browser can indent/outdent the <li>.
          return
        }
        event.preventDefault()
        this.saveContent()
        if (event.shiftKey) {
          this.addParentLevelPoint()
        } else {
          this.addSubpoint()
        }
        return
      }

      // Alt+↑ / Alt+↓ → move node up / down
      if (event.altKey && event.key === 'ArrowUp') {
        event.preventDefault()
        this.moveUp()
        return
      }
      if (event.altKey && event.key === 'ArrowDown') {
        event.preventDefault()
        this.moveDown()
      }
    },

    /**
     * Returns the nearest <li> ancestor of the current caret position if it is
     * inside this node's contenteditable, otherwise null.
     * Used by handleEditorKeydown to decide whether Enter/Tab should be passed
     * through to the browser (list continuation) or intercepted (node actions).
     */
    _cursorInListItem () {
      const sel = window.getSelection()
      if (!sel || !sel.rangeCount) return null
      const editor = this.$refs.richEditor
      if (!editor) return null
      let node = sel.getRangeAt(0).startContainer
      while (node && node !== editor) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'LI') {
          return node
        }
        node = node.parentNode
      }
      return null
    },

    /** True if focus/selection is inside this node's contenteditable (including descendants). */
    _richEditorContainsActiveElement () {
      const ed = this.$refs.richEditor
      const ae = document.activeElement
      return !!(ed && ae && ed.contains(ae))
    },

    // ── Always-on focus / blur handlers ─────────────────────────────────────
    onEditorFocus () {
      if (!this.canEditThisNode()) return
      this.isEditing = true
      // Snapshot innerHTML at focus time so cancelEdit can fully revert
      this.focusSnapshot = this.$refs.richEditor ? this.$refs.richEditor.innerHTML : (this.node.content || '')
      this.editContent = this.focusSnapshot
    },

    onEditorBlur (event) {
      // ignoreNextBlur is set when opening context menus so blur does not flush mid-menu.
      if (this.ignoreNextBlur) {
        this.ignoreNextBlur = false
        return
      }
      // Focus may move to the floating selection toolbar, or to the meta row (review date /
      // reviewer / ⋮) which lives outside .node-editor-container but still inside .node-content.
      const related = event && event.relatedTarget
      const scope = this.$el && this.$el.querySelector('.node-content')
      if (scope && related && scope.contains(related)) return

      this.$nextTick(() => {
        window.requestAnimationFrame(() => {
          if (this.ignoreNextBlur) return
          const ae = document.activeElement
          const scope2 = this.$el && this.$el.querySelector('.node-content')
          if (scope2 && ae && scope2.contains(ae)) return

          this.isEditing = false
          this.selToolbarVisible = false
          this.selToolbarSavedRange = null
          clearTimeout(this.blurSaveTimer)
          this.blurSaveTimer = setTimeout(() => {
            this.saveContent()
          }, 200)
        })
      })
    },

    saveContent () {
      clearTimeout(this.blurSaveTimer)
      // Always read latest HTML from the DOM (blur / Enter can run before debounced onContentChange).
      if (this.$refs.richEditor) {
        this.editContent = this.$refs.richEditor.innerHTML
      }
      if (this.editContent.trim() !== this.originalContent) {
        const updateData = {
          content: this.editContent.trim(),
          node_type: this.node.node_type === 'table' ? 'table' : 'rich_text'
        }

        this.$emit('update-node', this.node.id, updateData)
      }
      // Only leave "editing" UX when focus is not still in this field — otherwise
      // isEditing=false lets the node.content watcher clobber innerHTML on the next
      // parent update and destroys caret position (reverse typing).
      if (!this._richEditorContainsActiveElement()) {
        this.isEditing = false
      }
    },

    // Escape-only: no visible Discard button (always-on model). Reverts this focus session.
    cancelEdit () {
      clearTimeout(this.blurSaveTimer)
      clearTimeout(this.updateTimer)
      if (this.$refs.richEditor) {
        this.$refs.richEditor.innerHTML = this.focusSnapshot
      }
      this.editContent = this.focusSnapshot
      this.isEditing = false
    },

    openReviewDatePopover () {
      if (!this.canEditThisNode()) return
      document.removeEventListener('click', this.onDocumentClickCloseReviewDatePopover, true)
      document.removeEventListener('keydown', this.onKeydownCloseReviewDatePopover)
      this.originalDate = this.node.review_date || ''
      const key = this.toReviewDateKey(this.originalDate)
      this.editDate = key || ''
      this.showReviewDatePopover = true
      this.$nextTick(() => {
        this.positionReviewDatePopover()
        document.addEventListener('click', this.onDocumentClickCloseReviewDatePopover, true)
        document.addEventListener('keydown', this.onKeydownCloseReviewDatePopover)
      })
    },

    toggleReviewDatePopover () {
      if (!this.canEditThisNode()) return
      if (this.showReviewDatePopover) {
        this.dismissReviewDatePopover()
      } else {
        this.openReviewDatePopover()
      }
    },

    /**
     * Place the calendar inside the task modal (if any) or editor/viewport.
     * `backdrop-filter` on `.enhanced-node-editor` makes `position:fixed` relative to that box,
     * so top/left must be insets relative to that CB — not raw viewport px (fixes half-screen modal).
     */
    positionReviewDatePopover () {
      const wrap = this.$refs.reviewDateAnchorWrap
      const btn = wrap && wrap.querySelector('.meta-icon-btn')
      if (!btn || !wrap) return

      const br = btn.getBoundingClientRect()
      const pad = 8
      const popW = 288
      const popH = 300

      const modalEl = wrap.closest('.modal-content')
      const editorEl = wrap.closest('.enhanced-node-editor')
      const boundsEl = modalEl || editorEl
      const b = boundsEl
        ? boundsEl.getBoundingClientRect()
        : {
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight
          }

      let topV = br.bottom + pad
      let leftV = br.left

      if (topV + popH > b.bottom - pad) {
        const above = br.top - popH - pad
        if (above >= b.top + pad) topV = above
        else topV = Math.max(b.top + pad, b.bottom - popH - pad)
      }

      if (leftV + popW > b.right - pad) {
        leftV = b.right - popW - pad
      }
      if (leftV < b.left + pad) {
        leftV = br.right - popW - pad
      }
      if (leftV < b.left + pad) {
        leftV = b.left + pad
      }

      const maxLeft = b.right - popW - pad
      const maxTop = b.bottom - popH - pad
      leftV = Math.min(Math.max(leftV, b.left + pad), Math.max(b.left + pad, maxLeft))
      topV = Math.min(Math.max(topV, b.top + pad), Math.max(b.top + pad, maxTop))

      const cbEl = editorEl
      if (!cbEl) {
        this.reviewPopoverPos = {
          top: Math.round(topV) + 'px',
          left: Math.round(leftV) + 'px'
        }
        return
      }

      const cb = cbEl.getBoundingClientRect()
      this.reviewPopoverPos = {
        top: Math.round(topV - cb.top) + 'px',
        left: Math.round(leftV - cb.left) + 'px'
      }
    },

    closeReviewDatePopover () {
      document.removeEventListener('click', this.onDocumentClickCloseReviewDatePopover, true)
      document.removeEventListener('keydown', this.onKeydownCloseReviewDatePopover)
      this.showReviewDatePopover = false
    },

    dismissReviewDatePopover () {
      this.editDate = this.originalDate
      this.closeReviewDatePopover()
    },

    onDocumentClickCloseReviewDatePopover (e) {
      const wrap = this.$refs.reviewDateAnchorWrap
      if (wrap && wrap.contains(e.target)) return
      this.dismissReviewDatePopover()
    },

    onKeydownCloseReviewDatePopover (e) {
      if (e.key === 'Escape' && this.showReviewDatePopover) {
        e.preventDefault()
        e.stopPropagation()
        this.dismissReviewDatePopover()
      }
    },

    /**
     * v-calendar DatePicker emits `input` from its created() hook when it normalizes the bound value,
     * which was closing the popover and saving a TZ-shifted day. Commit only on explicit day pick.
     */
    onReviewDatePickerDayKeydown (day) {
      const ev = day && day.event
      if (!ev || (ev.key !== 'Enter' && ev.key !== ' ')) return
      ev.preventDefault()
      this.commitReviewDateFromPickerDay(day)
    },
    onReviewDatePickerDayPick (day) {
      this.commitReviewDateFromPickerDay(day)
    },
    async commitReviewDateFromPickerDay (day) {
      const raw = day && day.date
      const d = raw instanceof Date ? raw : (raw != null ? new Date(raw) : null)
      if (!d || Number.isNaN(d.getTime())) return
      const ymd = ymdFromDate(d)
      if (!ymd) return
      this.editDate = ymd
      this.closeReviewDatePopover()
      await this.saveDate()
    },

    startDateEdit () {
      this.openReviewDatePopover()
    },

    startDateEditFromMenu () {
      this.showActionDropdown = false
      this.$nextTick(() => this.openReviewDatePopover())
    },

    toReviewDateKey (value) {
      if (value === null || value === undefined || value === '') return null
      if (typeof value === 'string') {
        const s = value.trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
      }
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return null
      return ymdFromDate(d)
    },

    isPostponingReviewDate (oldVal, newVal) {
      const next = this.toReviewDateKey(newVal)
      const prev = this.toReviewDateKey(oldVal)
      if (!next || !prev) return false
      return next > prev
    },

    async saveDate () {
      if (this.editDate === this.originalDate) {
        this.closeReviewDatePopover()
        return
      }
      if (!this.canEditThisNode()) {
        this.closeReviewDatePopover()
        return
      }

      // Meeting draft: meetingDraftTaskId + PUT /meeting_dashboard/tasks/:id/nodes/:id (no task_version).
      // Legacy: taskVersionId + /task_versions/... — align with isPersistedActionNode / nodeApiBase.
      if (!this.isPersistedActionNode) {
        this.$emit('update-node', this.node.id, { review_date: this.editDate })
        this.closeReviewDatePopover()
        return
      }

      if (this.isPostponingReviewDate(this.originalDate, this.editDate)) {
        this.pendingNewReviewDate = this.editDate
        this.extensionReason = ''
        this.extensionExplanation = ''
        this.showReviewDateExtensionModal = true
        this.closeReviewDatePopover()
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
        this.closeReviewDatePopover()
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
      this.dismissReviewDatePopover()
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
      // Close node context menus if click is outside this component
      if (!this.$el.contains(event.target)) {
        this.hideNodeContextMenu()
      }
    },

    /** Right-click on the node body area -- delegates to table context menu if inside a cell */
    handleNodeAreaContextMenu (event) {
      if (event.target.closest('td, th')) {
        // Let the table context menu take over
        this.handleTableContextMenu(event)
      } else {
        this.openNodeContextMenu(event)
      }
    },

    openNodeContextMenu (event) {
      if (!this.canEditThisNode()) return
      // Prevent the imminent blur (from focus leaving richEditor) from triggering auto-save
      this.ignoreNextBlur = true
      this.showTableContextMenu = false
      this.showNodeContextMenu = true
      this.showNodeContextMenuMore = false
      if (this.isPersistedActionNode) {
        this.fetchDelayEvents({ forModal: false })
      }
      const host = this.$el.querySelector('.node-editor-container')
      const hr = host ? host.getBoundingClientRect() : { left: 0, top: 0 }
      const { x, y } = this.clampTableMenuClientPoint(event.clientX, event.clientY, 204, 280)
      this.nodeContextMenuX = x - hr.left
      this.nodeContextMenuY = y - hr.top
      this.$nextTick(() => {
        document.addEventListener('click', this.hideNodeContextMenu, { once: true })
      })
    },

    openNodeContextMenuFromBtn (event) {
      if (!this.canEditThisNode()) return
      // Stop propagation so the same click doesn't bubble to the document-level
      // 'once' listener registered inside openNodeContextMenu, which would
      // immediately close the menu before the user sees it.
      event.stopPropagation()
      const btn = event.currentTarget
      const rect = btn.getBoundingClientRect()
      // Synthesise a fake event at the button's bottom-left corner
      this.openNodeContextMenu({
        clientX: rect.left,
        clientY: rect.bottom,
        target: btn,
        preventDefault: () => {},
      })
    },

    hideNodeContextMenu () {
      this.showNodeContextMenu = false
      this.showNodeContextMenuMore = false
    },

    // ── Floating text-selection toolbar (G) ─────────────────────────────────
    onDocumentSelectionChangeForToolbar () {
      if (!this.isEditing || !this.canEditThisNode()) return
      const sel = window.getSelection()
      const ed = this.$refs.richEditor
      if (!ed || !sel || !sel.anchorNode || !ed.contains(sel.anchorNode)) return
      clearTimeout(this.selToolbarDebounceTimer)
      this.selToolbarDebounceTimer = setTimeout(() => {
        this.onTextSelection()
      }, 50)
    },

    onTextSelection () {
      const sel = window.getSelection()
      const scope = this.$el && this.$el.querySelector('.node-editor-container')
      const ae = document.activeElement
      const focusInsideScope = scope && ae && scope.contains(ae)
      const focusOnToolbar = this.$refs.selToolbar && ae && this.$refs.selToolbar.contains(ae)

      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        // Keep the bar visible while the user uses the font dropdown / custom pt / colour (selection may collapse).
        if (this.selToolbarVisible && focusInsideScope && focusOnToolbar) {
          return
        }
        this.selToolbarVisible = false
        this.selToolbarSavedRange = null
        return
      }
      const editor = this.$refs.richEditor
      if (!editor || !editor.contains(sel.anchorNode)) {
        this.selToolbarVisible = false
        this.selToolbarSavedRange = null
        return
      }
      try {
        const range = sel.getRangeAt(0)
        const selRect = range.getBoundingClientRect()
        const host = this.$el.querySelector('.node-editor-container')
        if (!host || !selRect.width) {
          if (!(this.selToolbarVisible && focusOnToolbar)) {
            this.selToolbarVisible = false
            this.selToolbarSavedRange = null
          }
          return
        }
        const hostRect = host.getBoundingClientRect()
        const toolbarW = 280
        let left = selRect.left - hostRect.left + selRect.width / 2 - toolbarW / 2
        // Toolbar + chevron height + breathing room so the bar sits above the highlight, not on it
        let top = selRect.top - hostRect.top - 62
        left = Math.max(0, left)
        this.selToolbarTop = Math.max(0, top)
        this.selToolbarLeft = left
        this.selToolbarVisible = true
        this.selToolbarSavedRange = range.cloneRange()
      } catch (_) {
        if (!(this.selToolbarVisible && focusOnToolbar)) {
          this.selToolbarVisible = false
          this.selToolbarSavedRange = null
        }
      }
    },

    restoreSelToolbarSavedRange () {
      const ed = this.$refs.richEditor
      const r = this.selToolbarSavedRange
      if (!ed || !r) return false
      try {
        if (!ed.contains(r.commonAncestorContainer)) return false
        const s = window.getSelection()
        s.removeAllRanges()
        s.addRange(r)
        return true
      } catch (e) {
        return false
      }
    },

    captureSelToolbarSelectionIfAny () {
      const sel = window.getSelection()
      const ed = this.$refs.richEditor
      if (!sel || !sel.rangeCount || sel.isCollapsed || !ed || !ed.contains(sel.anchorNode)) return
      try {
        this.selToolbarSavedRange = sel.getRangeAt(0).cloneRange()
      } catch (_) {}
    },

    applyToolbarExec (command, value = null) {
      const ed = this.$refs.richEditor
      if (!ed) return
      ed.focus()
      this.restoreSelToolbarSavedRange()
      try {
        document.execCommand(command, false, value)
      } catch (e) { /* empty */ }
      this.onContentChange()
      this.$nextTick(() => {
        this.onTextSelection()
        this.captureSelToolbarSelectionIfAny()
      })
    },

    onSelToolbarFontPresetChange () {
      const v = this.selToolbarFontPreset
      if (v == null || v === '') return
      
      // Restore selection that was saved on mousedown
      this.restoreSelToolbarSavedRange()
      
      const pt = legacyFontPresetKeyToPt(v)
      if (pt != null) this.customFontPtInput = pt
      
      // Apply the font size
      this.applyToolbarExec('fontSize', String(v))
      
      // CRITICAL: Reset to empty so same value can be clicked again
      this.$nextTick(() => {
        this.selToolbarFontPreset = ''
      })
    },

    onTableMenuFontPresetChange () {
      const v = this.tableMenuFontPreset
      if (v == null || v === '') return
      
      // Restore selection that was saved on mousedown
      this.restoreSelToolbarSavedRange()
      
      const pt = legacyFontPresetKeyToPt(v)
      if (pt != null) this.customFontPtInput = pt
      
      // Apply the font size
      this.execCommand('fontSize', String(v))
      
      // CRITICAL: Reset to empty so same value can be clicked again
      this.$nextTick(() => {
        this.tableMenuFontPreset = ''
      })
    },

    scheduleSelToolbarCustomPtApply () {
      clearTimeout(this.customPtApplyTimer)
      this.customPtApplyTimer = setTimeout(() => {
        this.applyCustomFontPtFromInput()
      }, 280)
    },

    // N: change the list_style of this node (counter style: decimal, lower-alpha, etc.)
    changeListStyle (style) {
      this.$emit('update-node', this.node.id, { list_style: style })
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

    applyToolbarFgColor (color) {
      this.toolbarFgColor = color
      this.applyToolbarExec('foreColor', color)
    },

    applyToolbarBgColor (color) {
      this.toolbarBgColor = color
      this.execCommand('backColor', color)
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
        this.$nextTick(() => {
          this.normalizePastedFontSizes()
          this.onContentChange()
        })
        return
      }

      // For non-complex-table pastes, let browser handle normally, then normalise font sizes
      this.$nextTick(() => {
        this.normalizePastedFontSizes()
        this.onContentChange()
      })
    },

    // D2: Ensure nothing pasted in has a font size smaller than 10pt (≈13px).
    // Word and Google Docs often paste at 8–9pt which looks tiny in our editor.
    normalizePastedFontSizes () {
      const editor = this.$refs.richEditor
      if (!editor) return

      // <font size="1"> → size="2" (HTML legacy size attr: 1≈8pt, 2≈10pt)
      editor.querySelectorAll('font[size]').forEach(el => {
        const s = parseInt(el.getAttribute('size'), 10)
        if (!isNaN(s) && s < 2) el.setAttribute('size', '2')
      })

      // Inline style font-size below 10pt
      editor.querySelectorAll('[style*="font-size"]').forEach(el => {
        const raw = el.style.fontSize
        if (!raw) return
        const match = raw.match(/^([\d.]+)(px|pt|em|rem)$/)
        if (!match) return
        let px = parseFloat(match[1])
        const unit = match[2]
        if (unit === 'pt') px = px * 4 / 3
        else if (unit === 'em' || unit === 'rem') px = px * 16
        if (px < 13) el.style.fontSize = '13px' // 10pt ≈ 13.3px
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

    formatDateShort (date) {
      if (!date) return ''
      try {
        return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      } catch (e) {
        return this.formatDate(date) || ''
      }
    },

    applyCustomFontPtFromInput () {
      const ed = this.$refs.richEditor
      if (ed) ed.focus()
      this.restoreSelToolbarSavedRange()
      if (this.applyCustomFontPtToSelection(this.customFontPtInput)) {
        this.onContentChange()
        this.$nextTick(() => {
          this.onTextSelection()
          this.captureSelToolbarSelectionIfAny()
        })
      }
    },

    applyCustomFontPtToSelection (ptRaw) {
      let pt = parseFloat(ptRaw)
      if (!Number.isFinite(pt)) return false
      pt = Math.min(96, Math.max(6, pt))
      this.customFontPtInput = pt
      const sel = window.getSelection()
      if (!sel || !sel.rangeCount) return false
      const range = sel.getRangeAt(0)
      if (range.collapsed) return false
      const span = document.createElement('span')
      span.style.fontSize = pt + 'pt'
      try {
        range.surroundContents(span)
      } catch (e) {
        span.appendChild(range.extractContents())
        range.insertNode(span)
      }
      sel.removeAllRanges()
      const nr = document.createRange()
      nr.selectNodeContents(span)
      nr.collapse(false)
      sel.addRange(nr)
      return true
    },

    /**
     * Keep the table context menu on-screen (viewport), same idea as NewTentativeDashboard.clampContextMenuPosition.
     */
    clampTableMenuClientPoint (clientX, clientY, menuW, menuH) {
      const margin = 8
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = Math.max(1, menuW)
      const h = Math.max(1, menuH)
      const maxLeft = Math.max(margin, vw - w - margin)
      const maxTop = Math.max(margin, vh - h - margin)
      return {
        x: Math.min(Math.max(margin, clientX), maxLeft),
        y: Math.min(Math.max(margin, clientY), maxTop)
      }
    },

    /**
     * Position menu at the right-click point. Uses position:absolute inside .node-editor-container so:
     * - Ancestors with backdrop-filter/transform no longer break "fixed" like modal overlays.
     * - When the modal/list scrolls, the menu moves with this node row (same as content).
     */
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

      const host = this.$el && this.$el.querySelector && this.$el.querySelector('.node-editor-container')
      if (!host) {
        return
      }

      this.showTableContextMenu = true

      const hr = host.getBoundingClientRect()
      const estW = 228
      const estH = 380
      const est = this.clampTableMenuClientPoint(event.clientX, event.clientY, estW, estH)
      this.contextMenuX = est.x - hr.left
      this.contextMenuY = est.y - hr.top

      // Notify parent that context menu is open (for container height adjustment)
      this.$emit('context-menu-opened', true)

      this.$nextTick(() => {
        const contextMenuEl = this.$refs.tableContextMenu || this.$el.querySelector('.table-context-menu')
        if (contextMenuEl && host) {
          const menuRect = contextMenuEl.getBoundingClientRect()
          const hr2 = host.getBoundingClientRect()
          const { x: vx, y: vy } = this.clampTableMenuClientPoint(
            event.clientX,
            event.clientY,
            menuRect.width,
            menuRect.height
          )
          this.contextMenuX = vx - hr2.left
          this.contextMenuY = vy - hr2.top
        }
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
      // Always-on: richEditor is the single source of truth
      if (this.$refs.richEditor) {
        this.onContentChange()
      }
    },


    openReviewerModal () {
      this.hideTableContextMenu()
      this.hideNodeContextMenu()
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
        const d = response.data
        this.reviewers = Array.isArray(d) ? d : (d && d.reviewers) || []
      } catch (error) {
        this.reviewers = []
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
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap');

.enhanced-node-item {
  /* Seamless document row — no card styling by default */
  margin-bottom: 0;
  border-bottom: 1px solid #e2e8f0;
  transition: background 0.15s ease;
  overflow: visible;
  position: relative;
}

.enhanced-node-item.completed {
  background-color: rgba(16, 185, 129, 0.06);
  border-left: 3px solid #10b981;
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
  gap: 0.65rem;
  padding: 10px 14px;
  border: 1px solid transparent;
  border-radius: 0;
  transition: background 0.15s ease;
  min-height: 2.5rem;
  overflow: visible;
}

.node-marker {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  flex-shrink: 0;
  min-width: 36px;
  width: 36px;
  padding: 0.125rem 0.5rem 0 0;
  font-weight: 700;
  color: #94a3b8;
  font-size: 0.75rem;
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
  position: relative;
  overflow: visible;
  flex: 1;
  min-width: 0;
  /* Let flex-1 fill naturally; meta section shrink-wraps */
}

/* Rich Text Styles */
.rich-text-container {
  width: 100%;
}

/* .rich-text-display kept for any legacy references; always-on replaces it visually */
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

/* ── Phase 3A / Phase 8: Always-on editor styles ──────────────────────────── */
.always-on-editor {
  position: relative; /* anchor floating table chips */
  border: 1px solid transparent;
  border-radius: 4px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.always-on-editor .rich-editor {
  min-height: 2rem;
  padding: 0.4rem 0.6rem;
  line-height: 1.6;
  word-wrap: break-word;
  outline: none;
  cursor: text;
  font-size: 13px;
  color: #1e293b;
}
.always-on-editor .rich-editor.editor-active {
  background: #fff;
}
.always-on-editor .rich-editor.editor-readonly {
  cursor: default;
  color: #374151;
}
/* Hover hint */
.enhanced-node-item:hover .always-on-editor {
  border-color: #e2e8f0;
}
/* Gold focus ring */
.always-on-editor:focus-within {
  border-color: #c6a059;
  box-shadow: 0 0 0 2px rgba(198, 160, 89, 0.2);
  background: #fff;
}
/* Placeholder text when empty */
.always-on-editor .rich-editor:empty:before {
  content: attr(data-placeholder);
  color: #9ca3af;
  font-style: italic;
  pointer-events: none;
}

/* Table styles for display and always-on editor modes */
.rich-text-display /deep/ table,
.rich-text-display >>> table,
.rich-editor table {
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
.rich-text-display >>> table:not(.dashboard-import-table) td,
.rich-editor table:not(.dashboard-import-table) th,
.rich-editor table:not(.dashboard-import-table) td {
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

/* Table-only floating chips (no Save/Discard — always-on blur save) */
.node-table-tools {
  position: absolute;
  top: 6px;
  right: 8px;
  z-index: 3;
  display: flex;
  gap: 4px;
  pointer-events: auto;
}
.ntt-btn {
  height: 26px;
  padding: 0 10px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 600;
  color: #475569;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
.ntt-btn:hover {
  border-color: #004680;
  color: #004680;
  background: #fff;
}
.always-on-editor--table-tools .rich-editor {
  padding-top: 2.25rem; /* keep first line clear of floating +Row/+Col chips */
}

/* Native color picker buttons (replaces old <select> color dropdowns) */
.toolbar-color-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.toolbar-color-wrap:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.toolbar-color-icon {
  font-weight: 700;
  font-size: 14px;
  pointer-events: none;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.toolbar-bg-icon {
  text-decoration: none;
  padding: 1px 4px;
  border-radius: 2px;
  line-height: 1;
}

.toolbar-color-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
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
  gap: 0.35rem;
  min-width: 0;
  flex-shrink: 0;
  justify-content: flex-end;
}

/* Date Styles */
/* ── Metadata row: icon + compact text (no pill spam) ─────────────────── */
.meta-inline-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 0;
  flex: 0 1 auto;
  min-width: 0;
  justify-content: flex-end;
}
.meta-date-slot,
.meta-reviewer-slot {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
}
.meta-date-slot--popover {
  position: relative;
}
.meta-review-date-pop {
  /* Inset relative to .enhanced-node-editor (fixed CB when backdrop-filter is set) */
  position: fixed;
  z-index: 80;
  padding: 10px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(15, 23, 42, 0.06);
  max-height: min(340px, calc(100vh - 24px));
  overflow: auto;
}
.meta-icon-btn--picker-open {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #1d4ed8;
}
.meta-icon-svg {
  width: 15px;
  height: 15px;
  display: block;
}
.meta-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #475569;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.meta-icon-btn:hover:not(:disabled) {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
}
.meta-icon-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.meta-icon-btn--disabled {
  opacity: 0.45;
}
.meta-icon-btn--ok {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}
.meta-icon-btn--alert {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}
.meta-icon-btn--date-attn {
  border-color: #fde68a;
  background: #fffbeb;
}
.meta-date-text {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  background: #fef3c7;
  color: #92400e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 8rem;
  cursor: pointer;
  border: 1px solid #fde68a;
  transition: filter 0.15s;
}
.meta-date-text:hover {
  filter: brightness(0.95);
}
.meta-reviewer-name {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
  max-width: 7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: filter 0.15s;
}
.meta-reviewer-name:hover {
  filter: brightness(0.95);
}
.sel-custom-pt,
.cell-custom-pt {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
}
.sel-pt-inp {
  width: 3.25rem;
  padding: 2px 4px;
  font-size: 11px;
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 4px;
  background: rgba(15,23,42,0.6);
  color: #f1f5f9;
}
.cell-pt-inp {
  width: 3.25rem;
  padding: 2px 4px;
  font-size: 11px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
}
.meta-date-input {
  padding: 1px 6px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  font-size: 0.72rem;
  outline: none;
  background: #fff;
}
.meta-date-input:focus { border-color: #3b82f6; }
/* Keep legacy .node-date for any callers outside this file */
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

/* action-dropdown 3-dot button removed from template; hide defensively */
.action-dropdown {
  display: none !important;
}

.action-btn {
  padding: 4px 7px;
  border: 1px solid #e2e8f0;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #64748b;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  min-width: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
}

.action-btn:hover {
  background: #f8fafc;
  color: #1e293b;
  border-color: #cbd5e1;
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

/* Table Context Menu Styles — absolute to .node-editor-container */
.table-context-menu {
  position: absolute;
  background: rgba(15, 23, 42, 0.95);
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  box-shadow: 0 14px 28px rgba(2, 6, 23, 0.4);
  backdrop-filter: blur(10px);
  padding: 0.5rem;
  z-index: 10050;
  min-width: 200px;
  max-width: 220px;
  max-height: min(400px, calc(100vh - 24px));
  overflow-y: auto;
  border-left: 3px solid #06b6d4;
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
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #e2e8f0;
}

.context-menu-item:hover {
  background-color: rgba(148, 163, 184, 0.18);
  color: #ffffff;
}

.context-menu-divider {
  height: 1px;
  background-color: rgba(148, 163, 184, 0.3);
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

/* Phase 8/10: Document-row sizing + font */
.enhanced-node-item {
  font-size: 13px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Subtle hover tint — just enough to signal "interactive row" */
.enhanced-node-item:hover > .node-content {
  background: #f8fafc;
}

.node-content {
  gap: 1rem;
  padding: 14px 10px;
  border-bottom: 1px solid #f1f5f9;
  border-radius: 0;
}

.node-marker {
  font-size: 12px;
  min-width: 34px;
  padding: 0.125rem 0.45rem 0 0;
  color: #9ca3af;
  font-weight: 700;
}

.rich-text-display {
  padding: 6px 8px;
  min-height: 2rem;
  font-size: 13px;
}

.rich-editor {
  font-size: 13px;
}

.date-display, .date-input {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 999px;
}

.date-display {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  font-weight: 700;
}

.date-display:hover {
  background: #fde68a;
}

.action-btn {
  padding: 5px 7px;
  font-size: 12px;
}


/* Table Styles */
.resizable-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
}

.resizable-table th,
.resizable-table td {
  border: 1px solid #e5e7eb;
  padding: 10px 12px;
  min-width: 50px;
  min-height: 30px;
  text-align: left;
  vertical-align: top;
}

.resizable-table th {
  background-color: #f8fafc;
  color: #334155;
  font-weight: 700;
}

.resizable-table tr:nth-child(even) {
  background-color: #fafbfc;
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
  /* Above editor fullscreen (10200) and node context menus (~10050) */
  z-index: 10350;
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
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  margin-left: 8px;
  cursor: pointer;
  white-space: nowrap;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 700;
  border: 1px solid #dbeafe;
}
.reviewer-badge.no-date:not(.yellow-bg-bold) {
  color: #64748b;
  font-style: italic;
  background: #f1f5f9;
  border-color: #e2e8f0;
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

/* ── Phase 8/10: Node context menu — card style, green accent ──────────── */
.node-context-menu {
  position: absolute;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #2d6a4f;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  padding: 0.35rem 0;
  z-index: 10050;
  min-width: 200px;
}
.node-context-menu-more {
  border-left-color: #64748b;
}
.node-context-menu .context-menu-item {
  display: block;
  width: 100%;
  padding: 0.45rem 0.9rem;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.82rem;
  color: #1e293b;
  border-radius: 0;
  white-space: nowrap;
  transition: background 0.12s;
}
.node-context-menu .context-menu-item:hover {
  background: rgba(45, 106, 79, 0.06);
  color: #2d6a4f;
}
.node-context-menu .context-menu-item.delete-item { color: #dc2626; }
.node-context-menu .context-menu-item.delete-item:hover { background: #fef2f2; color: #dc2626; }
.node-context-menu .context-menu-item--active {
  font-weight: 600;
  color: #2d6a4f;
  background: #f0fdf4;
}
.cm-style-preview {
  display: inline-block;
  width: 18px;
  font-family: monospace;
  color: #64748b;
}
.node-context-menu .more-options-btn {
  color: #475569;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.more-arrow { font-size: 0.7rem; opacity: 0.7; }

/* ── Phase 8/10: Quick-add "+" button — green tint ─────────────────────── */
.quick-add-btn {
  display: none;
  position: absolute;
  bottom: -11px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  z-index: 5;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 0;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.enhanced-node-item:hover > .quick-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}
.quick-add-btn:hover {
  background: #f0fdf4;
  border-color: #2d6a4f;
  color: #2d6a4f;
}

/* ── Phase 2: Text format row inside table context menu ────────────────── */
.context-menu-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: #64748b;
  padding: 0 0.75rem 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.cell-format-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 0.5rem 0.4rem;
  flex-wrap: wrap;
}
.cell-fmt-btn {
  width: 26px;
  height: 26px;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.cell-fmt-btn:hover { background: #f1f5f9; }
.cell-fmt-size {
  font-size: 0.7rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 2px 2px;
  height: 26px;
}
.toolbar-color-icon {
  font-weight: 700;
  font-size: 13px;
  line-height: 1;
  pointer-events: none;
}

/* ── Phase 10: Floating text-selection toolbar — frosted glass ─────────── */
.sel-toolbar {
  position: absolute;
  z-index: 10100;
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(30, 41, 59, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 8px;
  padding: 4px 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.28);
  pointer-events: auto;
  white-space: nowrap;
}
/* Small arrow below the toolbar */
.sel-toolbar::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: rgba(30, 41, 59, 0.92);
  border-bottom: none;
}
.sel-tb-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: #f1f5f9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sel-tb-btn:hover { background: rgba(255,255,255,0.12); }
.sel-tb-sep {
  display: inline-block;
  width: 1px;
  height: 16px;
  background: rgba(255,255,255,0.2);
  margin: 0 3px;
}
.sel-tb-size {
  height: 24px;
  min-width: 4.5rem;
  font-size: 0.7rem;
  background: transparent;
  color: #f1f5f9;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  padding: 0 6px 0 4px;
  cursor: pointer;
}
.sel-tb-size option { color: #111; background: #fff; }
.sel-tb-color {
  position: relative;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
}
.sel-tb-color:hover { background: rgba(255,255,255,0.12); }
.sel-tb-color-swatch {
  font-weight: 700;
  font-size: 13px;
  pointer-events: none;
  z-index: 1;
}
.sel-tb-color-input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  top: 0; left: 0;
  cursor: pointer;
}
</style>
