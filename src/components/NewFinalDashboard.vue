<template>
  <div
    class="dashboard-container"
    :class="{ 'new-final-meeting-readonly': useMeetingPublishedSource, 'dashboard-pdf-capture': pdfMode }"
  >
    <div v-if="useMeetingPublishedSource" class="new-final-meeting-bar">
      <div class="new-final-meeting-bar-row new-final-meeting-bar-row-top">
        <label class="meeting-date-label">
          <span class="meeting-bar-label-text">Published meeting</span>
          <select
            v-model="selectedMeetingDate"
            class="meeting-date-select"
            @change="onMeetingDateChange"
          >
            <option
              v-for="opt in meetingDateOptions"
              :key="String(opt.meeting_date)"
              :value="meetingDateInputValue(opt.meeting_date)"
            >
              {{ formatMeetingDateLabel(opt.meeting_date) }}
            </option>
            <option
              v-if="meetingDateOptions.length === 0 && selectedMeetingDate"
              :value="selectedMeetingDate"
            >
              {{ formatMeetingDateLabel(selectedMeetingDate) }} (no schedule yet)
            </option>
          </select>
        </label>
        <span v-if="publishedMeta && publishedMeta.published_at" class="meeting-published-meta">
          Published {{ formatPublishedAt(publishedMeta.published_at) }}
        </span>
        <span v-else-if="publishedLoadEmpty" class="meeting-published-empty">No published snapshot for this date yet.</span>
      </div>
      <div class="new-final-meeting-bar-row new-final-live-status">
        <span class="live-status-label">Live review status</span>
        <span v-if="currentVersionId" class="live-status-counts">
          {{ overlayStats.assignedNodes }} assigned · {{ overlayStats.commentedNodes }} with comments
        </span>
        <span v-else class="live-status-counts muted">No pack loaded</span>
        <router-link
          v-if="currentVersionId"
          class="new-final-review-hub-link"
          :to="{ name: 'NewTaskReviewHub', query: { dashboard_version_id: String(currentVersionId) } }"
          title="Matrix of assignments vs comments; CSV and branded PDF export"
        >
          Open review hub
        </router-link>
      </div>
      <div
        v-if="meetingAgendaUiEnabled"
        class="new-final-meeting-bar-row new-final-agenda-row"
      >
        <span class="meeting-bar-label-text">Agenda highlight</span>
        <label class="new-final-agenda-field">
          <span class="meeting-bar-sublabel">From</span>
          <input v-model="agendaDateFrom" type="date" class="meeting-date-input" @change="onAgendaRangeChange">
        </label>
        <label class="new-final-agenda-field">
          <span class="meeting-bar-sublabel">To</span>
          <input v-model="agendaDateTo" type="date" class="meeting-date-input" @change="onAgendaRangeChange">
        </label>
        <button type="button" class="new-final-ghost-btn" @click="clearAgendaRange">Clear highlight</button>
      </div>
      <div class="new-final-meeting-bar-row new-final-comment-nav-row">
        <button
          type="button"
          class="new-final-ghost-btn"
          :class="{ active: showCommentsNavMode }"
          :disabled="!currentVersionId || commentNavNodes.length === 0"
          @click="toggleCommentsNavMode"
        >
          Show comments
        </button>
        <div v-if="showCommentsNavMode && commentNavNodes.length" class="comment-nav-arrows">
          <button type="button" class="new-final-ghost-btn" @click="commentNavPrev">↑ Prev</button>
          <span class="comment-nav-pos">{{ commentNavIndex + 1 }} / {{ commentNavNodes.length }}</span>
          <button type="button" class="new-final-ghost-btn" @click="commentNavNext">Next ↓</button>
        </div>
        <button
          type="button"
          class="new-final-ghost-btn"
          :disabled="!currentVersionId || commentNavNodes.length === 0"
          @click="openAllCommentsModal"
        >
          Browse commented nodes
        </button>
      </div>
    </div>
    <!-- Advanced Search Bar + Actions Row -->
    <div class="search-actions-row">
      <div class="search-wrapper">
        <div class="search-input-group">
          <div class="search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <input 
            v-model="searchQuery" 
            @input="handleSearchInput"
            @focus="showSearchSuggestions = true"
            @blur="handleSearchBlur"
            type="text" 
            placeholder="Search approved tasks by description, sector, or action items..."
            class="search-input"
            :class="{ 'has-results': filteredTasks.length > 0 && searchQuery.length > 0 }"
          />
          <button 
            v-if="searchQuery.length > 0" 
            @click="clearSearch" 
            class="clear-search-btn"
            title="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
      </button>
        </div>
        
        <!-- Search Results Counter -->
        <div v-if="searchQuery.length > 0" class="search-results-info">
          <span class="results-count">{{ filteredTasks.length }} of {{ approvedTasks.length }} tasks</span>
          <span v-if="searchStats" class="search-stats">
            • {{ searchStats.descriptionMatches }} in descriptions
            • {{ searchStats.sectorMatches }} in sectors
            • {{ searchStats.actionMatches }} in actions
          </span>
        </div>
      </div>
      <!-- Action Buttons -->
      <div class="dashboard-actions-inline">
        <!-- Enhanced Filter Button -->
        <div class="filter-container">
          <button 
            @click="toggleFilterDropdown" 
            class="filter-btn"
            :class="{ 'active': showFilterDropdown }"
          >
            <span class="filter-text">Filter</span>
            <img src="../assets/img/filter1.png" alt="Filter" style="height: 20px;width: 18px;" />
            <span v-if="activeFiltersCount > 0" class="filter-badge">{{ activeFiltersCount }}</span>
          </button>
          
          <!-- Filter Dropdown -->
          <div v-if="showFilterDropdown" class="filter-dropdown">
            <div v-if="useMeetingPublishedSource" class="filter-section">
              <h4 class="filter-section-title">Pack highlight</h4>
              <p class="new-final-filter-hint">Same as Tentative: off, all pack colors, or filter rows by node state.</p>
              <select
                v-model="packHighlightMode"
                class="meeting-date-select"
                style="width:100%;margin-bottom:4px;"
                @change="onPackHighlightModeChange"
              >
                <option
                  v-for="opt in packHighlightSelectOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div
              v-if="currentVersionId && assignmentReviewerOptions.length"
              class="filter-section"
            >
              <h4 class="filter-section-title">Assigned reviewer</h4>
              <p class="new-final-filter-hint">
                Highlights this user’s pack footprint only. Red = assigned to them, no comments; green = assigned + comments; blue = not pack-assigned, but they commented. Works together with Pack highlight (off / all / one color).
              </p>
              <select
                v-model="selectedReviewerUserId"
                class="meeting-date-select"
                style="width:100%;margin-bottom:8px;"
                @change="onReviewerFilterChange"
              >
                <option value="">All nodes (full dashboard)</option>
                <option
                  v-for="u in assignmentReviewerOptions"
                  :key="u.id"
                  :value="String(u.id)"
                >
                  {{ u.name }}
                </option>
              </select>
              <p
                v-if="selectedReviewerUserId && !assignedNavNodes.length"
                class="new-final-filter-hint"
                style="margin:0;"
              >
                No nodes for this reviewer (not assigned to them and no comments by them on unassigned nodes).
              </p>
            </div>
            <div class="filter-section">
              <h4 class="filter-section-title">Review Date</h4>
              <div class="filter-options">
                <label class="filter-option">
                  <input 
                    type="radio" 
                    v-model="filters.reviewDate" 
                    value="all"
                    @change="applyFilters"
                  />
                  <span class="filter-option-text">All dates</span>
                </label>
                <label class="filter-option">
                  <input 
                    type="radio" 
                    v-model="filters.reviewDate" 
                    value="today"
                    @change="applyFilters"
                  />
                  <span class="filter-option-text">Today</span>
                </label>
                <label class="filter-option">
                  <input 
                    type="radio" 
                    v-model="filters.reviewDate" 
                    value="yesterday"
                    @change="applyFilters"
                  />
                  <span class="filter-option-text">Yesterday</span>
                </label>
                <label class="filter-option">
                  <input 
                    type="radio" 
                    v-model="filters.reviewDate" 
                    value="tomorrow"
                    @change="applyFilters"
                  />
                  <span class="filter-option-text">Tomorrow</span>
                </label>
                <label class="filter-option">
                  <input 
                    type="radio" 
                    v-model="filters.reviewDate" 
                    value="custom"
                    @change="applyFilters"
                  />
                  <span class="filter-option-text">Custom date</span>
                </label>
              </div>
              
              <!-- Custom Date Picker -->
              <div v-if="filters.reviewDate === 'custom'" class="custom-date-picker">
                <input 
                  type="date" 
                  v-model="filters.customDate"
                  @change="applyFilters"
                  class="date-input"
                />
              </div>
            </div>

            <!-- Tags Filter (Searchable dropdown like Tentative) -->
            <div class="filter-section" ref="fdTagFilterField">
              <div class="filter-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 12l-8 8-8-8 8-8 8 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Tags</span>
              </div>
              <div v-if="isLoadingTags" style="color:#6b7280;font-size:0.9rem;">Loading tags...</div>
              <div v-else-if="!allTagsForFilter.length" style="color:#6b7280;font-size:0.9rem;">No tags yet</div>
              <div v-else>
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                  <input
                    v-model="filterTagQuery"
                    type="text"
                    class="form-control fd-tag-search-input"
                    placeholder="Search tags..."
                    style="max-width:320px;"
                    @focus="openFdFilterTagDropdown"
                    @click="openFdFilterTagDropdown"
                    @input="openFdFilterTagDropdown"
                    @blur="onFdFilterTagBlur"
                    @keydown.esc.prevent="closeFdFilterTagDropdown"
                  >
                </div>

                <!-- Suggestions dropdown (stacked) -->
                <div v-if="showFdFilterTagDropdown" class="fd-filter-tag-suggest-dropdown" :class="{ flip: fdFilterTagDropdownFlip }">
                  <div v-if="!fdFilteredFilterTagSuggestions.length" class="fd-filter-tag-suggest-empty">No matching tags</div>
                  <div v-else class="fd-filter-tag-suggest-list">
                    <button
                      v-for="t in fdFilteredFilterTagSuggestions"
                      :key="t.id"
                      class="fd-filter-tag-suggest-item"
                      :class="{ selected: selectedTagsFilter.includes(t.id) }"
                      :disabled="selectedTagsFilter.includes(t.id)"
                      @click.stop.prevent="selectFdFilterTag(t)"
                    >
                      {{ t.name }}
                    </button>
                  </div>
                </div>

                <!-- Selected tags summary chips -->
                <div v-if="selectedTagsFilter.length" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
                  <span
                    v-for="tid in selectedTagsFilter"
                    :key="tid"
                    class="tag-chip selected"
                  >
                    {{ (allTagsForFilter.find(t => t.id === tid) || {}).name || 'Tag' }}
                    <button @click.stop="toggleTagFilter(tid)" class="remove-filter-btn" style="margin-left:6px;background:transparent;border:none;color:#fff;cursor:pointer;">×</button>
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Meeting pack tools (mirror top bar; quick access from Filter menu) -->
            <div v-if="useMeetingPublishedSource && currentVersionId" class="filter-section">
              <h4 class="filter-section-title">Published pack</h4>
              <p class="new-final-filter-hint">Use the meeting bar for comment navigation and reviewer hops.</p>
              <button
                type="button"
                class="clear-filters-btn"
                style="width:100%;margin-bottom:8px;"
                :disabled="commentNavNodes.length === 0"
                @click="toggleCommentsNavFromFilter"
              >
                {{ showCommentsNavMode ? 'Exit show comments mode' : 'Show comments (navigate)' }}
              </button>
              <button
                type="button"
                class="close-filter-btn"
                style="width:100%;"
                :disabled="commentNavNodes.length === 0"
                @click="openAllCommentsModalFromFilter"
              >
                Browse all commented nodes
              </button>
            </div>

            <!-- Filter Actions -->
            <div class="filter-actions">
              <button @click="clearAllFilters" class="clear-filters-btn">
                Clear All
              </button>
              <button @click="closeFilterDropdown" class="close-filter-btn">
                Close
              </button>
            </div>
          </div>
        </div>
        <!-- Download PDF Button -->
        <button 
          @click="downloadPDF" 
          class="download-btn"
          :disabled="pdfVisible"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L12 8M12 8L15 11M12 8L9 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3 15V16C3 18.8284 3 20.2426 3.87868 21.1213C4.75736 22 6.17157 22 9 22H15C17.8284 22 19.2426 22 20.1213 21.1213C21 20.2426 21 18.8284 21 16V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ pdfVisible ? 'Generating PDF...' : 'Download PDF' }}
        </button>
      </div>
      <!-- Search Suggestions -->
      <div v-if="showSearchSuggestions && searchSuggestions.length > 0" class="search-suggestions">
        <div 
          v-for="suggestion in searchSuggestions" 
          :key="suggestion.id"
          @click="selectSuggestion(suggestion)"
          class="suggestion-item"
        >
          <div class="suggestion-content">
            <div class="suggestion-title">{{ suggestion.text }}</div>
            <div class="suggestion-meta">{{ suggestion.type }} • {{ suggestion.context }}</div>
          </div>
          <div class="suggestion-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Table Headers -->
    <div class="table-headers">
      <table>
        <tr>
          <th>S No.</th>
          <th>Sector/Division</th>
          <th>Description</th>
          <th>Action to be Taken</th>
          <th>Original Date</th>
          <th>Responsibility</th>
          <th>Review Date</th>
        </tr>
      </table>
    </div>

    <!-- Table Rows -->
    <div v-for="(task, index) in displayTasks"
         :key="task.id"
         :data-task-id="task.id"
         :data-review-date="task.review_date != null && task.review_date !== '' ? String(task.review_date) : ''"
         class="table-row"
         :class="{ 
           'search-highlight': searchQuery.length > 0 && isTaskInSearchResults(task.id),
           'agenda-range-row-highlight': useMeetingPublishedSource && meetingAgendaUiEnabled && taskInAgendaRange(task)
         }">
      <table>
        <tr>
          <td><strong>{{ getDisplayIndex(index) }}</strong></td>
          <td><strong>{{ task.sector_division }}</strong></td>
          <td>
            <strong>{{ task.description }}</strong>
          </td>
          <td v-html="processActionContent(task.action_to_be_taken)" class="action-content-cell"></td>
          <td class="original-date-cell tag-host" :style="pdfMode ? 'vertical-align: middle;' : ''">
            <span :class="getHighlightClass(task.review_date)">{{ formatDate(task.original_date) }}</span>
            <button v-if="task.tags && task.tags.length" type="button" class="tag-peek no-print" @mousedown.prevent.stop="openRowTagsPopover(task, $event)" @click.stop="openRowTagsPopover(task, $event)" title="View tags">
              🏷️
            </button>
          </td>
          <td class="responsibility-cell tag-host" :style="pdfMode ? 'vertical-align: middle;' : ''">
            <span :class="getHighlightClass(task.review_date)">{{ task.responsibility }}</span>
            <button v-if="task.tags && task.tags.length" type="button" class="tag-peek no-print" @mousedown.prevent.stop="openRowTagsPopover(task, $event)" @click.stop="openRowTagsPopover(task, $event)" title="View tags">
              🏷️
            </button>
          </td>
          <td class="review-date-cell tag-host" :style="pdfMode ? 'vertical-align: middle;' : ''">
            <span :class="getHighlightClass(task.review_date)">{{ formatDate(task.review_date) }}</span>
            <button v-if="task.tags && task.tags.length" type="button" class="tag-peek no-print" @mousedown.prevent.stop="openRowTagsPopover(task, $event)" @click.stop="openRowTagsPopover(task, $event)" title="View tags">
              🏷️
            </button>
          </td>
        </tr>
      </table>
    </div>

    <!-- Row Tags Popover (Vue-controlled) -->
    <div v-if="showRowTagsPopover" class="fd-tags-popover no-print" :style="rowTagsPopoverStyle" @click.stop>
      <div class="fd-tags-popover-header">Tags</div>
      <div v-if="rowTagsPopoverTask && rowTagsPopoverTask.tags && rowTagsPopoverTask.tags.length" class="fd-tags-popover-list">
        <button v-for="t in rowTagsPopoverTask.tags" :key="t.id" class="fd-tags-popover-item" disabled>{{ t.name }}</button>
      </div>
      <div v-else class="fd-tags-popover-empty">No tags</div>
    </div>

    <!-- Empty State -->
    <div v-if="displayTasks.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>{{ searchQuery.length > 0 ? 'No Search Results' : 'No Approved Tasks' }}</h3>
      <p>{{ searchQuery.length > 0 ? 'No approved tasks match your search criteria.' : 'No approved tasks found for the selected date.' }}</p>
    </div>

    <DashboardNodeCommentsModal
      :visible="commentsModalVisible"
      :version-id="currentVersionId"
      :stable-node-id="commentsModalStableId"
      :current-user-id="currentUserId"
      :user-role="userRole"
      :node-context="commentsModalNodeContext"
      :is-node-resolved="commentsModalNodeResolved"
      @close="closeDashboardCommentsModal"
      @submitted="onPackCommentSubmitted"
      @resolution-changed="onPackNodeResolutionChanged"
    />

    <!-- Pack assignments attach to published version V (currentVersionId), not Tentative draft. -->
    <div
      v-if="showAssignPackModal"
      class="meeting-reset-modal-overlay nfd-assign-pack-overlay no-print"
      @click.self="closeAssignPackModal"
    >
      <div class="meeting-reset-modal assign-pack-modal" role="dialog" aria-modal="true">
        <h3 class="meeting-reset-modal-title">Assign input reviewer</h3>
        <p v-if="assignPackModalContext" class="meeting-reset-modal-text">
          <strong>{{ assignPackModalContext.taskDescription }}</strong><br>
          Node {{ assignPackModalContext.nodeLabel }}
        </p>
        <div class="assign-pack-fields">
          <label class="assign-pack-label">Reviewer</label>
          <select v-model="assignPackSelectedUserId" class="assign-pack-select">
            <option value="">Select user…</option>
            <option v-for="u in assignPackReviewers" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>
        <div class="meeting-reset-modal-actions">
          <button type="button" class="meeting-reset-cancel" @click="closeAssignPackModal">Cancel</button>
          <button
            type="button"
            class="meeting-reset-confirm"
            :disabled="assignPackSaving"
            @click="submitAssignPack"
          >
            {{ assignPackSaving ? 'Saving…' : 'Assign' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="allCommentsModalVisible"
      class="nfd-all-comments-overlay no-print"
      @click.self="allCommentsModalVisible = false"
    >
      <div class="nfd-all-comments-dialog" role="dialog" aria-modal="true">
        <div class="nfd-all-comments-head">
          <h3>Nodes with comments (this pack)</h3>
          <button type="button" class="nfd-all-comments-close" aria-label="Close" @click="allCommentsModalVisible = false">×</button>
        </div>
        <div class="nfd-all-comments-body">
          <p v-if="!commentNavNodes.length" class="nfd-muted">No comments on this dashboard version.</p>
          <div v-else class="nfd-all-comments-cards">
            <div
              v-for="(item, idx) in commentNavNodes"
              :key="item.stable_node_id + '-' + idx"
              class="nfd-comment-card"
            >
              <div class="nfd-comment-card-header">
                <strong>{{ taskLabelForCommentNode(item) }}</strong>
                <span class="nfd-comment-node-label">Node {{ nodeLabelForCommentNode(item) }}</span>
              </div>
              <div class="nfd-comment-card-preview">
                {{ getNodeContentPreview(item.stable_node_id, 150) }}
              </div>
              <div class="nfd-comment-card-actions">
                <button type="button" class="nfd-linkish" @click="goToCommentNode(item)">↗ Go to node</button>
                <button type="button" class="nfd-linkish" @click="openThreadForNode(item.stable_node_id)">💬 Open thread</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="packHighlightNavFabVisible"
      class="pack-highlight-nav-fab no-print"
      role="navigation"
      aria-label="Pack highlight nodes"
    >
      <button
        type="button"
        class="pack-highlight-nav-fab-btn"
        aria-label="Previous highlighted pack node"
        @click="packHighlightNavPrev"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
      <span class="pack-highlight-nav-fab-counter" aria-live="polite">
        {{ packHighlightNavIndex + 1 }} / {{ packHighlightNavCount }}
      </span>
      <button
        type="button"
        class="pack-highlight-nav-fab-btn"
        aria-label="Next highlighted pack node"
        @click="packHighlightNavNext"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script>
/**
 * Meeting-centric Final is read-only: no TaskModal / node editor. Action HTML comes from
 * `/meeting_dashboard/published` (NewFlowNodeHtml `.action-node` trees). Parity with the editor
 * stack lives in NewTentativeDashboard + NewTaskModal + NewEnhancedNodeEditor/Item — those
 * shared components carry hierarchy/order fixes; do not reintroduce legacy editors here.
 */
import { exportMeetingDashboardPdf } from '@/utils/meetingDashboardPdfExport'
import { isMeetingDashboardUiEnabled } from '@/utils/meetingDashboardUi'
import {
  meetingHubHighlightClass,
  MEETING_HUB_HIGHLIGHT_CLASSES
} from '@/utils/meetingHubNodeHighlight'
import {
  PACK_HIGHLIGHT_OPTIONS,
  packModeToHubClass,
  packHighlightShowsHubColors,
  packHighlightRestrictsTaskList,
  taskMatchesPackHighlightMode
} from '@/utils/meetingPackHighlightFilter'
import {
  buildPackHighlightNavTargets,
  stripPackHighlightNavFocusClass
} from '@/utils/meetingPackHighlightNav'
import { reviewerScopedHubClass } from '@/utils/meetingReviewerNodeHighlight'
import DashboardNodeCommentsModal from '@/components/DashboardNodeCommentsModal.vue'

export default {
  name: 'NewFinalDashboard',

  components: {
    DashboardNodeCommentsModal
  },

  data () {
    return {
      selectedDate: new Date(),
      selectedMeetingDate: '',
      meetingDateOptions: [],
      publishedMeta: null,
      publishedLoadEmpty: false,
      currentVersionId: null,
      editorOverlay: {},
      /** From draft_editor_overlay: id + name for Pack assignees and comment authors (Final-only filter). */
      overlayUserDirectory: [],
      /** Product: agenda date-range highlight not required; keep false. Safe-delete dead code later (see New_Todo.md). */
      meetingAgendaUiEnabled: false,
      agendaDateFrom: '',
      agendaDateTo: '',
      commentNavNodes: [],
      commentNavIndex: 0,
      showCommentsNavMode: false,
      selectedReviewerUserId: '',
      assignedNavIndex: 0,
      commentsModalVisible: false,
      commentsModalStableId: '',
      commentsModalNodeContext: null,
      allCommentsModalVisible: false,
      approvedTasks: [],
      pdfVisible: false,
      resizeTimeout: null,
      pdfMode: false,
      searchQuery: '',
      showSearchSuggestions: false,
      searchSuggestions: [],
      searchStats: null,
      showFilterDropdown: false,
      filters: {
        reviewDate: 'all',
        customDate: ''
      },
      // Tags filter (NEW)
      selectedTagsFilter: [],
      allTagsForFilter: [],
      isLoadingTags: false,
      // FinalDashboard tag filter (searchable)
      filterTagQuery: '',
      showFdFilterTagDropdown: false,
      fdFilterTagDropdownFlip: false,
      packHighlightMode: 'all',
      packHighlightNavIndex: 0,
      packHighlightNavTargets: [],
      packHighlightNavInitialScrollDone: false,
      _packHighlightNavForceScroll: false,
      _scheduleMeetingPackDomPending: false,
      // Row tags popover
      showRowTagsPopover: false,
      rowTagsPopoverTask: null,
      rowTagsPopoverStyle: {},
      // Published-pack node assignment (editor only; same API as former Tentative flow)
      showAssignPackModal: false,
      assignPackStableId: '',
      assignPackSelectedUserId: '',
      assignPackReviewers: [],
      assignPackSaving: false
    }
  },

  watch: {
    approvedTasks: {
      handler() {
        this.$nextTick(() => {
          this.applyAutoScaling()
          if (this.useMeetingPublishedSource) {
            this.applyAgendaNodeHighlights()
            this.scheduleApplyMeetingPackDomAugmentation()
          }
        })
      },
      deep: true
    },
    editorOverlay: {
      deep: true,
      handler() {
        if (this.useMeetingPublishedSource) {
          this.scheduleApplyMeetingPackDomAugmentation()
        }
      }
    },
    packHighlightMode() {
      if (this.useMeetingPublishedSource) {
        this.scheduleApplyMeetingPackDomAugmentation()
      }
    },
    currentVersionId() {
      if (this.useMeetingPublishedSource) {
        this.scheduleApplyMeetingPackDomAugmentation()
      }
    },
    assignedNavNodes: {
      handler(list) {
        if (!list.length) this.assignedNavIndex = 0
        else if (this.assignedNavIndex >= list.length) this.assignedNavIndex = 0
      }
    },
    pdfMode (v) {
      if (v && this.$el) stripPackHighlightNavFocusClass(this.$el)
    }
  },

  computed: {
    statusClass() {
      return {
        draft: 'status-draft',
        under_review: 'status-review', 
        final_review: 'status-final-review',
        approved: 'status-approved',
        completed: 'status-completed'
      }
    },
    displayTasks() {
      let tasks = this.approvedTasks

      if (this.hasActiveFilters) {
        tasks = this.applyFiltersToTasks(tasks)
      }

      if (this.searchQuery.length > 0) {
        const allowed = new Set(tasks.map(x => x.id))
        tasks = this.filteredTasks.filter(x => allowed.has(x.id))
      }

      return tasks
    },
    filteredTasks() {
      return this.approvedTasks.filter(task => {
        const search = this.searchQuery.toLowerCase()
        return (
          task.description.toLowerCase().includes(search) ||
          task.sector_division.toLowerCase().includes(search) ||
          this.processActionContent(task.action_to_be_taken).toLowerCase().includes(search)
        )
      })
    },
    hasActiveFilters() {
      return this.filters.reviewDate !== 'all' ||
             (this.filters.reviewDate === 'custom' && this.filters.customDate) ||
             (this.selectedTagsFilter && this.selectedTagsFilter.length > 0) ||
             (this.useMeetingPublishedSource && packHighlightRestrictsTaskList(this.packHighlightMode))
    },
    activeFiltersCount() {
      let count = 0
      if (this.filters.reviewDate !== 'all') count++
      if (this.selectedTagsFilter && this.selectedTagsFilter.length > 0) count++
      if (this.useMeetingPublishedSource && packHighlightRestrictsTaskList(this.packHighlightMode)) count++
      if (this.useMeetingPublishedSource && this.showCommentsNavMode) count++
      if (this.useMeetingPublishedSource && this.selectedReviewerUserId) count++
      return count
    },
    packHighlightSelectOptions () {
      return PACK_HIGHLIGHT_OPTIONS
    },
    packHighlightListFilterActive () {
      return this.useMeetingPublishedSource && packHighlightRestrictsTaskList(this.packHighlightMode)
    },
    userRole () {
      try {
        const raw = this.getCookie('user_info')
        if (!raw) return ''
        return String(JSON.parse(raw).role || '').toLowerCase()
      } catch (e) {
        return ''
      }
    },
    currentUserId () {
      try {
        const raw = this.getCookie('user_info')
        if (!raw) return null
        const u = JSON.parse(raw)
        return u.id != null ? u.id : null
      } catch (e) {
        return null
      }
    },
    /** Pack-node editor resolution for open thread (from draft_editor_overlay). */
    commentsModalNodeResolved () {
      const sid = this.commentsModalStableId
      if (!sid) return false
      const o = (this.editorOverlay || {})[sid]
      return !!(o && o.is_resolved === true)
    },
    assignPackModalContext () {
      if (!this.assignPackStableId) return null
      return this.resolveCommentsModalNodeContext(this.assignPackStableId)
    },
    overlayStats () {
      const nodes = this.editorOverlay || {}
      let assignedNodes = 0
      let commentedNodes = 0
      Object.keys(nodes).forEach((sid) => {
        const o = nodes[sid]
        if (!o) return
        const hasA = o.assignment_users && o.assignment_users.length
        const hasC = (o.comment_count || 0) > 0
        if (hasA) assignedNodes++
        if (hasC) commentedNodes++
      })
      return { assignedNodes, commentedNodes }
    },
    assignmentReviewerOptions () {
      if (Array.isArray(this.overlayUserDirectory) && this.overlayUserDirectory.length) {
        return this.overlayUserDirectory.map((u) => ({
          id: u.id,
          name: u.name || `User ${u.id}`
        }))
      }
      const nodes = this.editorOverlay || {}
      const byId = new Map()
      Object.keys(nodes).forEach((sid) => {
        const row = nodes[sid]
        const users = (row && row.assignment_users) || []
        users.forEach((u) => {
          if (u && u.id != null && !byId.has(u.id)) {
            byId.set(u.id, { id: u.id, name: u.name || `User ${u.id}` })
          }
        })
        const cids = (row && row.comment_user_ids) || []
        cids.forEach((rawId) => {
          const id = Number(rawId)
          if (!Number.isFinite(id) || byId.has(id)) return
          byId.set(id, { id, name: `User ${id}` })
        })
      })
      return Array.from(byId.values()).sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      )
    },
    // Ordered { new_task_id, stable_node_id, pathLabel } for reviewer hops. When task-level
    // pagination ships, use this list as the source of truth and add a hook in scrollToStableNode
    // to switch pages when the target task row is not mounted.
    assignedNavNodes () {
      const uid = this.selectedReviewerUserId
      if (!uid) return []
      const want = Number(uid)
      const out = []
      const map = this.editorOverlay || {}
      const tasks = Array.isArray(this.approvedTasks) ? this.approvedTasks : []
      tasks.forEach((task) => {
        const roots = task && task.current_version && task.current_version.action_nodes
        if (!Array.isArray(roots)) return
        const walk = (nodes, prefix) => {
          if (!Array.isArray(nodes)) return
          nodes.forEach((n, i) => {
            const c = n.display_counter != null ? String(n.display_counter) : String(i + 1)
            const path = prefix ? `${prefix}.${c}` : c
            const sid = n.stable_node_id
            if (sid) {
              const o = map[sid]
              if (o) {
                const users = o.assignment_users || []
                const assignedToSel = users.some((u) => u && Number(u.id) === want)
                const noAssignees = users.length === 0
                const cids = Array.isArray(o.comment_user_ids)
                  ? o.comment_user_ids.map((x) => Number(x))
                  : []
                const commentedBySel = cids.includes(want)
                if (assignedToSel || (noAssignees && commentedBySel)) {
                  out.push({
                    new_task_id: task.id,
                    stable_node_id: sid,
                    pathLabel: path
                  })
                }
              }
            }
            if (n.children && n.children.length) walk(n.children, path)
          })
        }
        walk(roots, '')
      })
      return out
    },
    fdFilteredFilterTagSuggestions () {
      const q = (this.filterTagQuery || '').trim().toLowerCase()
      if (!q) return this.allTagsForFilter.slice(0, 20)
      const starts = this.allTagsForFilter.filter(t => t.name.toLowerCase().startsWith(q))
      const contains = this.allTagsForFilter.filter(t => !t.name.toLowerCase().startsWith(q) && t.name.toLowerCase().includes(q))
      return [...starts, ...contains].slice(0, 20)
    },
    useMeetingPublishedSource () {
      return isMeetingDashboardUiEnabled()
    },
    packHighlightNavFabVisible () {
      return (
        this.useMeetingPublishedSource &&
        packHighlightShowsHubColors(this.packHighlightMode) &&
        !this.pdfMode &&
        this.packHighlightNavTargets.length > 0
      )
    },
    packHighlightNavCount () {
      return this.packHighlightNavTargets.length
    }
  },

  async created () {
    if (isMeetingDashboardUiEnabled()) {
      await this.loadMeetingDates()
    }
    await this.fetchApprovedTasks()
  },

  mounted() {
    // Re-apply scaling on window resize
    window.addEventListener('resize', this.handleResize)
    
    // Add click outside handler for filter dropdown
    document.addEventListener('click', this.handleClickOutside)
    this._onPackHighlightNavKeydown = (e) => this.onPackHighlightNavDocumentKeydown(e)
    document.addEventListener('keydown', this._onPackHighlightNavKeydown)

    // Position reviewer badges after mount and initial render
    this.$nextTick(() => {
      // Wait for DOM to be fully updated
      setTimeout(() => {
        this.displayTasks.forEach(task => {
          this.positionReviewerBadges(task.id);
        });
      }, 100);
    });

    this.scheduleFocusNodeFromRoute()

    // Add scroll event listener with debounce
    this.handleScroll = this.debounce(() => {
      this.displayTasks.forEach(task => {
        this.positionReviewerBadges(task.id);
      });
    }, 100);
    
    window.addEventListener('scroll', this.handleScroll);
    
    // Add resize observer for dynamic content changes
    this.resizeObserver = new ResizeObserver(this.debounce(() => {
      this.displayTasks.forEach(task => {
        this.positionReviewerBadges(task.id);
      });
    }, 100));
    
    // Observe the action content cells
    document.querySelectorAll('.action-content-cell').forEach(cell => {
      this.resizeObserver.observe(cell);
    });
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
    document.removeEventListener('click', this.handleClickOutside)
    if (this._onPackHighlightNavKeydown) {
      document.removeEventListener('keydown', this._onPackHighlightNavKeydown)
      this._onPackHighlightNavKeydown = null
    }
    window.removeEventListener('scroll', this.handleScroll)
    
    // Cleanup resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Clear any pending timeouts
    if (this.menuHideTimeout) {
      clearTimeout(this.menuHideTimeout)
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout)
    }
  },

  updated() {
    // Reposition badges when the component updates
    this.$nextTick(() => {
      this.displayTasks.forEach(task => {
        this.positionReviewerBadges(task.id);
      });
      if (this.useMeetingPublishedSource) {
        this.applyAgendaNodeHighlights()
      }
    });
  },

  methods: {
    // Open read-only tags popover for a row (click-to-open, hover-stay)
    openRowTagsPopover(task, event) {
      if (!task || !Array.isArray(task.tags)) return
      const triggerRect = event.currentTarget.getBoundingClientRect()
      // Approximate popover size for positioning; will adjust after nextTick
      const estimatedWidth = 240
      const estimatedHeight = 160
      const spaceBelow = window.innerHeight - triggerRect.bottom
      const flip = spaceBelow < estimatedHeight + 12
      const top = flip ? (triggerRect.top - estimatedHeight - 8) : (triggerRect.bottom + 8)
      const left = Math.min(Math.max(triggerRect.left - 8, 8), window.innerWidth - estimatedWidth - 8)
      this.rowTagsPopoverTask = task
      this.rowTagsPopoverStyle = { top: Math.max(8, top) + 'px', left: left + 'px' }
      this.showRowTagsPopover = true
      // Outside click handler
      this.$nextTick(() => {
        // Close on outside click using capture phase to beat other handlers
        const onDoc = (e) => {
          const pop = document.querySelector('.fd-tags-popover')
          if (!pop) { document.removeEventListener('click', onDoc, true); return }
          if (!pop.contains(e.target)) {
            this.showRowTagsPopover = false
            document.removeEventListener('click', onDoc, true)
          }
        }
        setTimeout(() => document.addEventListener('click', onDoc, true), 0)
      })
    },
    // Add toRoman helper method
    toRoman(num) {
      const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
      return roman[num - 1] || num;
    },

    // Add parseActionNodes method
    parseActionNodes(task) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(task.action_to_be_taken, 'text/html');
      const actionNodes = doc.querySelectorAll('.action-node');
      
      return Array.from(actionNodes).map(node => {
        const contentElement = node.querySelector('.node-content');
        const content = contentElement && contentElement.textContent ? contentElement.textContent.trim() : '';
        const hasReviewer = node.classList.contains('has-reviewer');
        const reviewerName = hasReviewer ? node.getAttribute('data-reviewer-name') : null;
        const offsetTop = node.offsetTop;
        return { content, hasReviewer, reviewerName, offsetTop };
      });
    },

    /**
     * Re-position reviewer badges on a cloned row for PDF capture.
     * Uses the clone's layout so badge positions are correct when html2canvas runs.
     */
    positionReviewerBadgesForClone(rowClone) {
      const actionCell = rowClone.querySelector('.action-content-cell');
      const responsibilityCell = rowClone.querySelector('.responsibility-cell');
      if (!actionCell || !responsibilityCell) return;

      const existingBadges = responsibilityCell.querySelectorAll('.reviewer-badge-parallel');
      existingBadges.forEach(badge => badge.remove());

      responsibilityCell.style.position = 'relative';
      responsibilityCell.style.overflow = 'visible';

      const rdAttr = (rowClone.getAttribute('data-review-date') || '').trim();
      const highlightClasses = this.getHighlightClass(rdAttr || null);

      const actionNodes = actionCell.querySelectorAll('.action-node');
      actionNodes.forEach(node => {
        if (node.classList.contains('has-reviewer')) {
          const reviewerName = node.dataset.reviewerName;
          if (!reviewerName) return;

          const badge = document.createElement('div');
          badge.className = 'reviewer-badge-parallel ' + highlightClasses.join(' ');
          badge.textContent = reviewerName;
          Object.assign(badge.style, {
            display: 'inline-block',
            margin: '2px 0',
            opacity: '1',
            zIndex: '10',
            position: 'absolute',
            left: '6px',
            width: 'calc(100% - 12px)',
            textAlign: 'left',
            boxSizing: 'border-box'
          });

          const nodeRect = node.getBoundingClientRect();
          const cellRect = responsibilityCell.getBoundingClientRect();
          let topOffset = nodeRect.top - cellRect.top;
          const cellHeight = cellRect.height;
          if (topOffset < 0) topOffset = 0;
          if (topOffset > cellHeight - 16) topOffset = Math.max(0, cellHeight - 16);
          badge.style.top = `${topOffset}px`;
          responsibilityCell.appendChild(badge);
        }
      });
    },

    // Add positionReviewerBadges method
    positionReviewerBadges(taskId) {
      const taskRow = document.querySelector(`[data-task-id="${taskId}"]`);
      if (!taskRow) return;

      const actionCell = taskRow.querySelector('.action-content-cell');
      const responsibilityCell = taskRow.querySelector('.responsibility-cell');
      if (!actionCell || !responsibilityCell) return;

      // Clear existing reviewer badges
      const existingBadges = responsibilityCell.querySelectorAll('.reviewer-badge-parallel');
      existingBadges.forEach(badge => badge.remove());

      // Ensure responsibility cell has proper positioning
      if (window.getComputedStyle(responsibilityCell).position !== 'relative') {
        responsibilityCell.style.position = 'relative';
      }

      const rdAttr = (taskRow.getAttribute('data-review-date') || '').trim();
      const highlightClasses = this.getHighlightClass(rdAttr || null);

      // Get all action nodes in this task
      const actionNodes = actionCell.querySelectorAll('.action-node');
      actionNodes.forEach(node => {
        if (node.classList.contains('has-reviewer')) {
          const reviewerName = node.dataset.reviewerName;
          if (!reviewerName) return;

          // Create reviewer badge
          const badge = document.createElement('div');
          badge.className = 'reviewer-badge-parallel ' + highlightClasses.join(' ');
          badge.textContent = reviewerName;

          // Apply inline styles directly
          Object.assign(badge.style, {
            display: 'inline-block',
            margin: '2px 0',
            opacity: '1',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            zIndex: '10',
            position: 'absolute',
            left: '6px',
            width: 'calc(100% - 12px)',
            textAlign: 'left',
            boxSizing: 'border-box'
          });

          // Get positions relative to the cells
          const nodeRect = node.getBoundingClientRect();
          const responsibilityCellRect = responsibilityCell.getBoundingClientRect();

          // Calculate relative position
          const topOffset = nodeRect.top - responsibilityCellRect.top;
          badge.style.top = `${topOffset}px`;
          
          // Add hover effect to highlight connection
          const nodeId = Math.random().toString(36).substr(2, 9);
          node.dataset.nodeId = nodeId;
          badge.dataset.nodeId = nodeId;
          
          // Add hover effects
          badge.addEventListener('mouseenter', () => {
            node.classList.add('highlight-connection');
            badge.classList.add('highlight-connection');
            // Add hover styles inline
            badge.style.opacity = '0.9';
            badge.style.transform = 'translateY(-1px)';
            badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          });
          
          badge.addEventListener('mouseleave', () => {
            node.classList.remove('highlight-connection');
            badge.classList.remove('highlight-connection');
            // Reset hover styles
            badge.style.opacity = '1';
            badge.style.transform = '';
            badge.style.boxShadow = '';
          });
          
          node.addEventListener('mouseenter', () => {
            const relatedBadge = responsibilityCell.querySelector(`[data-node-id="${nodeId}"]`);
            if (relatedBadge) {
              node.classList.add('highlight-connection');
              relatedBadge.classList.add('highlight-connection');
            }
          });
          
          node.addEventListener('mouseleave', () => {
            const relatedBadge = responsibilityCell.querySelector(`[data-node-id="${nodeId}"]`);
            if (relatedBadge) {
              node.classList.remove('highlight-connection');
              relatedBadge.classList.remove('highlight-connection');
            }
          });
          
          responsibilityCell.appendChild(badge);
        }
      });
    },

    // Add debounce utility method
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    async loadMeetingDates () {
      try {
        const res = await this.$http.secured.get('/meeting_dashboard/meeting_dates')
        const rows = Array.isArray(res.data.meeting_dates) ? res.data.meeting_dates : []
        this.meetingDateOptions = rows
        if (!this.selectedMeetingDate) {
          if (rows.length) {
            this.selectedMeetingDate = this.meetingDateInputValue(rows[0].meeting_date)
          } else {
            this.selectedMeetingDate = this.selectedDate.toISOString().split('T')[0]
          }
        }
      } catch (e) {
        console.error('loadMeetingDates failed', e)
        this.meetingDateOptions = []
        if (!this.selectedMeetingDate) {
          this.selectedMeetingDate = this.selectedDate.toISOString().split('T')[0]
        }
      }
    },

    meetingDateInputValue (d) {
      if (d == null || d === '') return ''
      const s = String(d)
      return s.includes('T') ? s.split('T')[0] : s
    },

    formatMeetingDateLabel (d) {
      const v = this.meetingDateInputValue(d)
      if (!v) return '—'
      const parts = v.split('-')
      if (parts.length === 3) {
        const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        if (!isNaN(dt.getTime())) return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      }
      return v
    },

    formatPublishedAt (iso) {
      if (!iso) return ''
      try {
        return new Date(iso).toLocaleString()
      } catch (e) {
        return String(iso)
      }
    },

    onMeetingDateChange () {
      this.fetchApprovedTasks()
    },

    async fetchApprovedTasks() {
      try {
        const sortTasksByReviewDate = (tasks) => {
          return tasks.sort((a, b) => {
            const dateA = new Date(a.review_date)
            const dateB = new Date(b.review_date)
            return dateA - dateB
          })
        }

        if (isMeetingDashboardUiEnabled()) {
          const dateParam = this.selectedMeetingDate || this.selectedDate.toISOString().split('T')[0]
          const response = await this.$http.secured.get('/meeting_dashboard/published', {
            params: { meeting_date: dateParam }
          })
          const body = response.data || {}
          this.publishedLoadEmpty = body.empty === true
          this.publishedMeta = {
            published_at: body.published_at,
            meeting_date: body.meeting_date,
            target_meeting_date: body.target_meeting_date
          }
          const vid = body.meeting_dashboard_version_id
          this.currentVersionId = vid != null && vid !== '' ? Number(vid) : null
          this.selectedReviewerUserId = ''
          this.assignedNavIndex = 0
          const tasks = Array.isArray(body.tasks) ? body.tasks : []
          this.approvedTasks = sortTasksByReviewDate([...tasks])
          await this.fetchMeetingPackOverlay()
          await this.loadCommentNavNodes()
          if (this.showCommentsNavMode) {
            this.commentNavIndex = 0
            this.commentNavScrollToCurrent()
          }
        } else {
          const response = await this.$http.secured.get('/tasks/approved', {
            params: {
              date: this.selectedDate.toISOString().split('T')[0]
            }
          })
          this.publishedLoadEmpty = false
          this.publishedMeta = null
          this.currentVersionId = null
          this.editorOverlay = {}
          this.overlayUserDirectory = []
          this.commentNavNodes = []
          this.approvedTasks = sortTasksByReviewDate(response.data.tasks || [])
        }

        this.$nextTick(() => {
          this.applyAutoScaling()
          this.scheduleFocusNodeFromRoute()
        })
      } catch (error) {
        console.error('Error fetching approved tasks:', error)
        this.$toast.error('Failed to fetch approved tasks')
      }
    },

    applyAutoScaling() {
      // Wait for DOM to be fully rendered
      setTimeout(() => {
        const actionCells = document.querySelectorAll('.action-content-cell')
        
        actionCells.forEach(cell => {
          // Reset any previous scaling
          cell.style.fontSize = ''
          cell.style.lineHeight = ''
          cell.classList.remove('scaled', 'auto-scaled-small', 'auto-scaled-tiny')
          
          // Reset table scaling
          const tables = cell.querySelectorAll('table')
          tables.forEach(table => {
            table.style.fontSize = ''
            table.style.transform = 'none'
            table.classList.remove('scaled-table')
          })
          
          // Check if content overflows
          const isOverflowing = cell.scrollWidth > cell.clientWidth
          
          if (isOverflowing) {
            // Calculate overflow amount
            const overflowRatio = cell.scrollWidth / cell.clientWidth
            
            console.log(`Content overflow detected: ${overflowRatio.toFixed(2)}x`)
            
            // Apply tiered font-size reduction instead of transform scaling
            if (overflowRatio > 1.8) {
              // Severe overflow: smallest font size
              cell.classList.add('auto-scaled-tiny')
              console.log('Applied tiny scaling (severe overflow)')
            } else if (overflowRatio > 1.3) {
              // Moderate overflow: medium font size
              cell.classList.add('auto-scaled-small')
              console.log('Applied small scaling (moderate overflow)')
            } else {
              // Minor overflow: slight reduction
              cell.style.fontSize = '0.85em'
              cell.style.lineHeight = '1.3'
              console.log('Applied minor font reduction')
            }
            
            // Special handling for tables within action content
            tables.forEach(table => {
              // Check if table still overflows after cell font reduction
              setTimeout(() => {
                if (table.scrollWidth > cell.clientWidth * 0.95) {
                  const tableOverflow = table.scrollWidth / (cell.clientWidth * 0.95)
                  
                  if (tableOverflow > 1.5) {
                    table.style.fontSize = '0.65em'
                    table.classList.add('scaled-table')
                    console.log(`Applied table font reduction: 0.65em`)
                  } else if (tableOverflow > 1.2) {
                    table.style.fontSize = '0.75em'
                    table.classList.add('scaled-table')
                    console.log(`Applied table font reduction: 0.75em`)
                  }
                }
              }, 50)
            })
          }
        })
      }, 100)
    },

    handleResize() {
      // Debounce resize events
      clearTimeout(this.resizeTimeout)
      this.resizeTimeout = setTimeout(() => {
        this.applyAutoScaling()
      }, 250)
    },

    processActionContent(content) {
      if (!content) return ''

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = content

      // Published meeting tasks already ship final `.action-node` HTML from the server (same source
      // of truth as Tentative row HTML). Skip legacy ul/ol rewiring so order/structure matches
      // NewTentativeDashboard (v-html) and cannot drift from client-side list heuristics.
      if (isMeetingDashboardUiEnabled()) {
        tempDiv.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'))
        tempDiv.querySelectorAll('[draggable]').forEach(el => el.removeAttribute('draggable'))
        return tempDiv.innerHTML
      }

      // Legacy approved-task HTML: normalize list markers into .action-node rows (Final-only).
      const processLists = (element, depth = 0) => {
        const lists = element.querySelectorAll('ul, ol')
        lists.forEach(list => {
          const items = list.querySelectorAll(':scope > li')
          let counter = 1
          
          items.forEach(li => {
            // Remove existing markers
            li.innerHTML = li.innerHTML.replace(/^(\s*)(•|\d+\.?)\s+/, '')
            
            // Check for reviewer information before processing
            const hasReviewer = li.textContent.includes('Reviewer:')
            const reviewerMatch = hasReviewer ? li.textContent.match(/Reviewer:\s*([^,\n]+)/) : null
            const reviewerName = reviewerMatch ? reviewerMatch[1].trim() : null
            
            // Remove reviewer information from the content text
            let cleanContent = li.innerHTML
            if (hasReviewer && reviewerMatch) {
              // Remove the reviewer information from the content
              cleanContent = cleanContent.replace(/Reviewer:\s*[^,\n]+/g, '').trim()
            }
            
            const marker = document.createElement('span')
            marker.className = 'list-marker'
            marker.style.width = '20px'
            marker.style.display = 'inline-block'
            
            // Determine marker style based on depth
            let markerText = ''
            let markerStyle = ''
            switch (depth % 4) {
              case 0:
                markerText = counter + '.'
                markerStyle = 'decimal'
                break
              case 1:
                markerText = String.fromCharCode(96 + counter)
                markerStyle = 'lower-alpha'
                break
              case 2:
                markerText = this.toRoman(counter).toLowerCase()
                markerStyle = 'lower-roman'
                break
              case 3:
                markerText = '•'
                markerStyle = 'bullet'
                break
            }
            
            marker.textContent = markerText
            
            // Create action node wrapper
            const actionNode = document.createElement('div')
            actionNode.className = `action-node level-${depth + 1} style-${markerStyle}`
            
            // Add marker and content
            const nodeMarker = document.createElement('div')
            nodeMarker.className = 'node-marker'
            nodeMarker.appendChild(marker)
            
            const nodeContent = document.createElement('div')
            nodeContent.className = 'node-content'
            nodeContent.innerHTML = cleanContent
            
            actionNode.appendChild(nodeMarker)
            actionNode.appendChild(nodeContent)
            
            // Add reviewer information to action node if present (for badge positioning)
            if (hasReviewer && reviewerName) {
              actionNode.classList.add('has-reviewer')
              actionNode.dataset.reviewerName = reviewerName
            }
            
            li.innerHTML = ''
            li.appendChild(actionNode)
            
            counter++
            
            // Process nested lists
            const nestedLists = li.querySelectorAll(':scope > ul, :scope > ol')
            if (nestedLists.length > 0) {
              processLists(li, depth + 1)
            }
          })
        })
      }
      
      processLists(tempDiv)
      return tempDiv.innerHTML
    },

    async downloadPDF () {
      try {
        await exportMeetingDashboardPdf({
          fileName: 'final-dashboard.pdf',
          prepareRowClone: (rowClone) => {
            rowClone.querySelectorAll('.meeting-pack-resolution-chip').forEach((el) => el.remove())
            rowClone.querySelectorAll('.meeting-pack-marker-with-tick').forEach((slot) => {
              const parent = slot.parentNode
              if (!parent) return
              while (slot.firstChild) parent.insertBefore(slot.firstChild, slot)
              parent.removeChild(slot)
            })
            rowClone.querySelectorAll('.final-node-actions, .final-meeting-assign-strip, .meeting-comment-badge').forEach((el) => el.remove())
            rowClone.querySelectorAll('.action-node').forEach((el) => {
              el.classList.remove(
                'meeting-overlay-node',
                ...MEETING_HUB_HIGHLIGHT_CLASSES,
                'meeting-pack-resolved',
                'final-meeting-node-flex',
                'agenda-range-node-highlight',
                'comment-nav-flash',
                'pack-highlight-nav-focus'
              )
            })
          },
          positionReviewerBadgesForClone: (rowClone) => this.positionReviewerBadgesForClone(rowClone),
          onStart: async () => {
            this.pdfVisible = true
            this.pdfMode = true
            await this.$nextTick()
          },
          onEnd: () => {
            this.pdfVisible = false
            this.pdfMode = false
          }
        })
      } catch (error) {
        console.error('PDF generation failed:', error)
      }
    },

    formatDate(date) {
      if (!date) return '-'
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },

    formatStatus(status) {
      const statusMap = {
        draft: 'Draft',
        under_review: 'Under Review', 
        final_review: 'Final Review',
        approved: 'Approved',
        completed: 'Completed'
      }
      return statusMap[status] || status
    },

    getHighlightClass(reviewDate) {
      const today = new Date();
      const review = reviewDate ? new Date(reviewDate) : null;
      const isToday = review && review.getFullYear() === today.getFullYear() && review.getMonth() === today.getMonth() && review.getDate() === today.getDate();
      return ['yellow-bg-bold', isToday ? 'red-text' : 'black-text'];
    },

    handleSearchInput() {
      this.generateSearchSuggestions()
      this.calculateSearchStats()
    },

    handleSearchBlur() {
      // Delay hiding suggestions to allow for clicks
      setTimeout(() => {
        this.showSearchSuggestions = false
      }, 200)
    },

    clearSearch() {
      this.searchQuery = ''
      this.searchSuggestions = []
      this.searchStats = null
      this.showSearchSuggestions = false
    },

    selectSuggestion(suggestion) {
      this.searchQuery = suggestion.text
      this.showSearchSuggestions = false
      this.$nextTick(() => {
        // Find and highlight the task
        const taskElement = document.querySelector(`[data-task-id="${suggestion.taskId}"]`)
        if (taskElement) {
          taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          taskElement.classList.add('highlight-animation')
          setTimeout(() => {
            taskElement.classList.remove('highlight-animation')
          }, 2000)
        }
      })
    },

    generateSearchSuggestions() {
      if (this.searchQuery.length < 2) {
        this.searchSuggestions = []
        return
      }

      const suggestions = []
      const search = this.searchQuery.toLowerCase()

      this.approvedTasks.forEach(task => {
        // Description suggestions
        if (task.description.toLowerCase().includes(search)) {
          suggestions.push({
            id: `desc-${task.id}`,
            text: task.description,
            type: 'Description',
            context: task.sector_division,
            taskId: task.id
          })
        }

        // Sector suggestions
        if (task.sector_division.toLowerCase().includes(search)) {
          suggestions.push({
            id: `sector-${task.id}`,
            text: task.sector_division,
            type: 'Sector',
            context: task.description.substring(0, 50) + '...',
            taskId: task.id
          })
        }

        // Action content suggestions (first 100 chars)
        const actionContent = this.processActionContent(task.action_to_be_taken)
        if (actionContent.toLowerCase().includes(search)) {
          const matchIndex = actionContent.toLowerCase().indexOf(search)
          const start = Math.max(0, matchIndex - 20)
          const end = Math.min(actionContent.length, matchIndex + search.length + 20)
          const snippet = actionContent.substring(start, end)
          
          suggestions.push({
            id: `action-${task.id}`,
            text: snippet,
            type: 'Action',
            context: task.description,
            taskId: task.id
          })
        }
      })

      // Limit suggestions and remove duplicates
      this.searchSuggestions = suggestions
        .filter((suggestion, index, self) => 
          index === self.findIndex(s => s.id === suggestion.id)
        )
        .slice(0, 8)
    },

    calculateSearchStats() {
      if (this.searchQuery.length === 0) {
        this.searchStats = null
        return
      }

      const search = this.searchQuery.toLowerCase()
      let descriptionMatches = 0
      let sectorMatches = 0
      let actionMatches = 0

      this.approvedTasks.forEach(task => {
        if (task.description.toLowerCase().includes(search)) descriptionMatches++
        if (task.sector_division.toLowerCase().includes(search)) sectorMatches++
        if (this.processActionContent(task.action_to_be_taken).toLowerCase().includes(search)) actionMatches++
      })

      this.searchStats = {
        descriptionMatches,
        sectorMatches,
        actionMatches
      }
    },

    isTaskInSearchResults(taskId) {
      return this.filteredTasks.some(task => task.id === taskId)
    },

    getDisplayIndex(index) {
      return index + 1
    },

    toggleFilterDropdown() {
      this.showFilterDropdown = !this.showFilterDropdown
    if (this.showFilterDropdown) {
      // Recompute in-use tags from approvedTasks when opening
      this.loadTagsForFilter()
    }
    },

    applyFilters() {
      // This method is called when filter options change
      // The actual filtering is handled in computed properties
    },

    clearAllFilters() {
      this.filters.reviewDate = 'all'
      this.filters.customDate = ''
      this.selectedTagsFilter = []
      if (this.useMeetingPublishedSource) {
        this.clearAgendaRange()
        this.showCommentsNavMode = false
        this.selectedReviewerUserId = ''
        this.assignedNavIndex = 0
      }
    },

    onPackHighlightModeChange () {
      this.packHighlightNavIndex = 0
      this._packHighlightNavForceScroll = true
      this.applyFilters()
      if (this.useMeetingPublishedSource) {
        this.scheduleApplyMeetingPackDomAugmentation()
      }
    },

    getPackHighlightFilterLabel () {
      const row = PACK_HIGHLIGHT_OPTIONS.find(o => o.value === this.packHighlightMode)
      return (row && row.label) || this.packHighlightMode
    },

    clearPackHighlightListFilter () {
      this.packHighlightMode = 'all'
      this.onPackHighlightModeChange()
    },

    closeFilterDropdown() {
      this.showFilterDropdown = false
    },

    applyFiltersToTasks(tasks) {
      // First apply review date filter
      let filtered = tasks.filter(task => {
        if (this.filters.reviewDate !== 'all') {
          const taskReviewDate = task.review_date ? new Date(task.review_date) : null
          if (!taskReviewDate) return false

          // Use the same logic as TentativeDashboard - compare local dates
          const taskDate = new Date(task.review_date)
          taskDate.setHours(0, 0, 0, 0)
          
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          switch (this.filters.reviewDate) {
            case 'today':
              return taskDate.getTime() === today.getTime()
            case 'yesterday': {
              const yesterday = new Date(today)
              yesterday.setDate(today.getDate() - 1)
              return taskDate.getTime() === yesterday.getTime()
            }
            case 'tomorrow': {
              const tomorrow = new Date(today)
              tomorrow.setDate(today.getDate() + 1)
              return taskDate.getTime() === tomorrow.getTime()
            }
            case 'custom':
              if (!this.filters.customDate) return false
              const customDate = new Date(this.filters.customDate)
              customDate.setHours(0, 0, 0, 0)
              return taskDate.getTime() === customDate.getTime()
            default:
              return true
          }
        }
        return true
      })

      // Then apply tags filter (ANY)
      if (this.selectedTagsFilter && this.selectedTagsFilter.length > 0) {
        filtered = filtered.filter(task => {
          if (!task || !Array.isArray(task.tags) || task.tags.length === 0) return false
          const ids = task.tags.map(t => t.id)
          return ids.some(id => this.selectedTagsFilter.includes(id))
        })
      }

      if (this.useMeetingPublishedSource && packHighlightRestrictsTaskList(this.packHighlightMode)) {
        filtered = filtered.filter(task =>
          taskMatchesPackHighlightMode(task, this.editorOverlay, this.packHighlightMode)
        )
      }

      return filtered
    },

    // Build tags list from approvedTasks for filter chips
    loadTagsForFilter () {
      const idToName = new Map()
      const source = Array.isArray(this.approvedTasks) ? this.approvedTasks : []
      source.forEach(task => {
        if (task && Array.isArray(task.tags)) {
          task.tags.forEach(t => {
            if (t && typeof t.id === 'number' && t.name) {
              idToName.set(t.id, t.name)
            }
          })
        }
      })
      this.allTagsForFilter = Array.from(idToName, ([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },

    // Select from FD tag suggestions
    selectFdFilterTag (tag) {
      this.toggleTagFilter(tag.id)
      this.filterTagQuery = ''
      this.$nextTick(() => {
        const input = this.$el.querySelector('.fd-tag-search-input')
        if (input) input.focus()
      })
    },

    // Open/close searchable dropdown with flip logic
    openFdFilterTagDropdown () {
      this.showFdFilterTagDropdown = true
      this.$nextTick(() => {
        const inputEl = this.$el.querySelector('.fd-tag-search-input')
        if (inputEl) {
          const rect = inputEl.getBoundingClientRect()
          const viewportHeight = window.innerHeight
          const estimatedDropdownHeight = 200
          this.fdFilterTagDropdownFlip = (rect.bottom + estimatedDropdownHeight > viewportHeight - 10)
        }
      })
      if (!this._onFdFilterTagOutside) {
        this._onFdFilterTagOutside = (e) => {
          const root = this.$refs.fdTagFilterField
          if (root && !root.contains(e.target)) {
            this.closeFdFilterTagDropdown()
            document.removeEventListener('click', this._onFdFilterTagOutside)
            this._onFdFilterTagOutside = null
          }
        }
      }
      document.addEventListener('click', this._onFdFilterTagOutside)
    },
    onFdFilterTagBlur () {
      requestAnimationFrame(() => {
        const root = this.$refs.fdTagFilterField
        if (root && !root.contains(document.activeElement)) {
          this.closeFdFilterTagDropdown()
        }
      })
    },
    closeFdFilterTagDropdown () {
      this.showFdFilterTagDropdown = false
      if (this._onFdFilterTagOutside) {
        document.removeEventListener('click', this._onFdFilterTagOutside)
        this._onFdFilterTagOutside = null
      }
    },

    toggleTagFilter (tagId) {
      const id = Number(tagId)
      if (this.selectedTagsFilter.includes(id)) {
        this.selectedTagsFilter = this.selectedTagsFilter.filter(tid => tid !== id)
      } else {
        this.selectedTagsFilter = [...this.selectedTagsFilter, id]
      }
      this.applyFilters()
    },

    handleClickOutside(event) {
      const filterContainer = event.target.closest('.filter-container')
      if (!filterContainer && this.showFilterDropdown) {
        this.showFilterDropdown = false
      }
    },

    getCookie (name) {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) {
        let encodedValue = parts.pop().split(';').shift()
        return decodeURIComponent(encodedValue)
      }
    },

    async fetchMeetingPackOverlay () {
      if (!isMeetingDashboardUiEnabled() || !this.currentVersionId) {
        this.editorOverlay = {}
        this.overlayUserDirectory = []
        this.scheduleApplyMeetingPackDomAugmentation()
        return
      }
      try {
        const { data } = await this.$http.secured.get('/meeting_dashboard/draft_editor_overlay', {
          params: { new_dashboard_version_id: this.currentVersionId }
        })
        this.editorOverlay = data.nodes || {}
        this.overlayUserDirectory = Array.isArray(data.overlay_user_directory)
          ? data.overlay_user_directory
          : []
      } catch (e) {
        this.editorOverlay = {}
        this.overlayUserDirectory = []
      }
      this.scheduleApplyMeetingPackDomAugmentation()
    },

    clearAgendaRange () {
      this.agendaDateFrom = ''
      this.agendaDateTo = ''
      this.applyAgendaNodeHighlights()
    },

    onAgendaRangeChange () {
      this.applyAgendaNodeHighlights()
    },

    parseYmdToLocalDate (ymd) {
      if (!ymd) return null
      const parts = String(ymd).split('-').map(Number)
      if (parts.length < 3 || parts.some(n => !Number.isFinite(n))) return null
      const [y, m, d] = parts
      return new Date(y, m - 1, d)
    },

    taskInAgendaRange (task) {
      if (!this.meetingAgendaUiEnabled) return false
      if (!this.agendaDateFrom || !this.agendaDateTo) return false
      if (task == null || task.review_date == null || task.review_date === '') return false
      const rd = new Date(task.review_date)
      if (isNaN(rd.getTime())) return false
      const d = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate())
      const from = this.parseYmdToLocalDate(this.agendaDateFrom)
      const to = this.parseYmdToLocalDate(this.agendaDateTo)
      if (!from || !to || from > to) return false
      return d >= from && d <= to
    },

    parseNodeReviewDateText (text) {
      const t = (text || '').trim()
      if (!t || t === '-') return null
      const parsed = Date.parse(t)
      if (!isNaN(parsed)) {
        const d = new Date(parsed)
        return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      }
      const m = t.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
      if (m) {
        let y = parseInt(m[3], 10)
        if (y < 100) y += 2000
        return new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10))
      }
      const shortM = t.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/)
      if (shortM) {
        const d = new Date(`${shortM[2]} ${shortM[1]}, ${shortM[3]}`)
        if (!isNaN(d.getTime())) {
          return new Date(d.getFullYear(), d.getMonth(), d.getDate())
        }
      }
      return null
    },

    applyAgendaNodeHighlights () {
      this.$nextTick(() => {
        const root = this.$el
        if (!root || !root.querySelectorAll) return
        root.querySelectorAll('.action-node.agenda-range-node-highlight').forEach((el) => {
          el.classList.remove('agenda-range-node-highlight')
        })
        if (!this.meetingAgendaUiEnabled) return
        if (!this.agendaDateFrom || !this.agendaDateTo) return
        const from = this.parseYmdToLocalDate(this.agendaDateFrom)
        const to = this.parseYmdToLocalDate(this.agendaDateTo)
        if (!from || !to || from > to) return
        root.querySelectorAll('.table-row .action-content-cell .action-node .review-date').forEach((span) => {
          const node = span.closest('.action-node')
          if (!node) return
          const d = this.parseNodeReviewDateText(span.textContent)
          if (!d || d < from || d > to) return
          node.classList.add('agenda-range-node-highlight')
        })
      })
    },

    /**
     * Coalesce DOM augmentation to one pass per tick.
     * Avoid running full overlay augmentation from `updated()` on every reactive change.
     */
    scheduleApplyMeetingPackDomAugmentation () {
      if (!isMeetingDashboardUiEnabled()) return
      if (this._scheduleMeetingPackDomPending) return
      this._scheduleMeetingPackDomPending = true
      this.$nextTick(() => {
        this._scheduleMeetingPackDomPending = false
        this.applyMeetingPackDomAugmentation()
      })
    },

    applyMeetingPackDomAugmentation () {
      if (!isMeetingDashboardUiEnabled() || !this.$el || !this.$el.querySelectorAll) return
      const root = this.$el
      root.querySelectorAll('.action-content-cell .action-node').forEach((el) => {
        el.classList.remove(
          'meeting-overlay-node',
          ...MEETING_HUB_HIGHLIGHT_CLASSES,
          'meeting-pack-resolved',
          'final-meeting-node-flex'
        )
        el.querySelectorAll('.final-node-actions, .final-meeting-assign-strip, .meeting-pack-resolution-chip').forEach((x) => x.remove())
        el.querySelectorAll('.meeting-pack-marker-with-tick').forEach((slot) => {
          const parent = slot.parentNode
          if (!parent) return
          while (slot.firstChild) parent.insertBefore(slot.firstChild, slot)
          parent.removeChild(slot)
        })
        el.removeAttribute('data-final-action-count')
      })
      const map = this.editorOverlay || {}
      this.$nextTick(() => {
        root.querySelectorAll('.action-content-cell .action-node[data-stable-node-id]').forEach((el) => {
          const sid = el.getAttribute('data-stable-node-id')
          if (!sid) return
          const o = map[sid]
          if (!o) return
          const hasA = o.assignment_users && o.assignment_users.length
          const hasC = (o.comment_count || 0) > 0
          /* Flex row for node body + icon strip whenever we inject actions (editor always has assign). */
          el.classList.add('final-meeting-node-flex')
          if (hasA || hasC) el.classList.add('meeting-overlay-node')
          const globalHub = meetingHubHighlightClass(!!hasA, !!hasC)
          const reviewerSel = this.selectedReviewerUserId
          const hub = reviewerSel ? reviewerScopedHubClass(o, reviewerSel) : globalHub
          const mode = this.packHighlightMode
          const showColors = packHighlightShowsHubColors(mode)
          const restrict = packHighlightRestrictsTaskList(mode)
          const targetClass = packModeToHubClass(mode)
          const applyTint = showColors && hub && (!restrict || hub === targetClass)
          if (applyTint) {
            el.classList.add(hub)
            if (o.is_resolved === true) el.classList.add('meeting-pack-resolved')
          }
          /* Resolved only: tick beside .node-marker (parity with NewTentativeDashboard); no "!?". */
          if ((hasA || hasC) && o.is_resolved === true) {
            const chip = document.createElement('span')
            chip.className = 'meeting-pack-resolution-chip meeting-pack-resolution-chip--resolved no-print'
            chip.setAttribute('role', 'img')
            chip.setAttribute('aria-label', 'Pack node resolved')
            chip.innerHTML =
              '<svg class="meeting-pack-resolution-tick" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>'
            const marker = el.querySelector('.node-marker')
            if (marker && marker.parentNode === el) {
              const slot = document.createElement('span')
              slot.className = 'meeting-pack-marker-with-tick no-print'
              el.insertBefore(slot, marker)
              slot.appendChild(marker)
              slot.appendChild(chip)
            } else {
              el.insertBefore(chip, el.firstChild)
            }
          }
          el.setAttribute(
            'data-final-action-count',
            this.userRole === 'editor' ? '3' : '2'
          )
          const actions = document.createElement('div')
          actions.className = 'final-node-actions no-print'
          if (this.userRole === 'editor') {
            const assignBtn = document.createElement('button')
            assignBtn.type = 'button'
            assignBtn.className = 'final-node-icon-btn final-node-assign-btn'
            assignBtn.setAttribute('aria-label', 'Assign input reviewer to this node')
            assignBtn.title = 'Assign reviewer (published pack)'
            assignBtn.textContent = '👤'
            assignBtn.addEventListener('click', (ev) => {
              ev.stopPropagation()
              ev.preventDefault()
              this.openAssignPackModal(sid)
            })
            actions.appendChild(assignBtn)
          }
          const addBtn = document.createElement('button')
          addBtn.type = 'button'
          addBtn.className = 'final-node-icon-btn'
          addBtn.setAttribute('aria-label', 'Add comment on this node')
          addBtn.title = 'Add comment'
          addBtn.innerHTML = '+'
          addBtn.addEventListener('click', (ev) => {
            ev.stopPropagation()
            ev.preventDefault()
            this.openDashboardCommentsModal(sid)
          })
          const viewWrap = document.createElement('span')
          viewWrap.className = 'final-node-view-wrap'
          const viewBtn = document.createElement('button')
          viewBtn.type = 'button'
          viewBtn.className = 'final-node-icon-btn final-node-eye' + (hasC ? ' has-comments' : '')
          viewBtn.setAttribute('aria-label', 'View comments on this node')
          viewBtn.title = 'View comments'
          viewBtn.innerHTML = '&#128065;'
          viewBtn.addEventListener('click', (ev) => {
            ev.stopPropagation()
            ev.preventDefault()
            this.openDashboardCommentsModal(sid)
          })
          viewWrap.appendChild(viewBtn)
          if (hasC) {
            const badge = document.createElement('span')
            badge.className = 'final-node-comment-count-badge'
            badge.textContent = String(o.comment_count)
            viewWrap.appendChild(badge)
          }
          actions.appendChild(addBtn)
          actions.appendChild(viewWrap)
          el.appendChild(actions)
        })
        this.$nextTick(() => {
          this.refreshPackHighlightNavTargets()
        })
      })
    },

    escapeSelectorValue (sid) {
      return typeof CSS !== 'undefined' && CSS.escape
        ? CSS.escape(String(sid))
        : String(sid).replace(/\\/g, '\\\\')
    },

    packHighlightNavTargetsEqual (a, b) {
      if (!a || !b || a.length !== b.length) return false
      return a.every((t, i) => b[i] && t.taskId === b[i].taskId && t.stableId === b[i].stableId)
    },

    refreshPackHighlightNavTargets () {
      const root = this.$el
      if (!root || !this.useMeetingPublishedSource) {
        if (this.packHighlightNavTargets.length) this.packHighlightNavTargets = []
        stripPackHighlightNavFocusClass(root)
        return
      }
      if (!packHighlightShowsHubColors(this.packHighlightMode)) {
        if (this.packHighlightNavTargets.length) this.packHighlightNavTargets = []
        this.packHighlightNavIndex = 0
        stripPackHighlightNavFocusClass(root)
        return
      }
      const list = buildPackHighlightNavTargets(root, this.packHighlightMode)
      const n = list.length
      if (n === 0) {
        if (this.packHighlightNavTargets.length) this.packHighlightNavTargets = []
        this.packHighlightNavIndex = 0
        stripPackHighlightNavFocusClass(root)
        return
      }
      const targetsUnchanged = this.packHighlightNavTargetsEqual(this.packHighlightNavTargets, list)
      if (!targetsUnchanged) {
        this.packHighlightNavTargets = list
      }
      if (this.packHighlightNavIndex >= n) this.packHighlightNavIndex = n - 1
      if (this.packHighlightNavIndex < 0) this.packHighlightNavIndex = 0
      const forceScroll = this._packHighlightNavForceScroll
      this._packHighlightNavForceScroll = false
      const firstEver = !this.packHighlightNavInitialScrollDone
      if (firstEver) this.packHighlightNavInitialScrollDone = true
      const scroll = forceScroll || firstEver
      this.applyPackHighlightNavFocus({ scroll })
    },

    applyPackHighlightNavFocus ({ scroll }) {
      const root = this.$el
      if (!root) return
      stripPackHighlightNavFocusClass(root)
      const targets = this.packHighlightNavTargets
      const n = targets.length
      if (!n) return
      let idx = this.packHighlightNavIndex
      if (idx < 0 || idx >= n) idx = 0
      const { taskId, stableId } = targets[idx]
      const esc = this.escapeSelectorValue(stableId)
      const el = root.querySelector(
        `[data-task-id="${taskId}"] .action-node[data-stable-node-id="${esc}"]`
      )
      if (!el) return
      el.classList.add('pack-highlight-nav-focus')
      if (scroll) {
        const row = el.closest('[data-task-id]')
        const si = (node) =>
          node &&
          typeof node.scrollIntoView === 'function' &&
          node.scrollIntoView({ behavior: 'smooth', block: 'center' })
        si(row)
        si(el)
      }
    },

    packHighlightNavPrev () {
      const n = this.packHighlightNavTargets.length
      if (!n) return
      this.packHighlightNavIndex = (this.packHighlightNavIndex - 1 + n) % n
      this.applyPackHighlightNavFocus({ scroll: true })
    },

    packHighlightNavNext () {
      const n = this.packHighlightNavTargets.length
      if (!n) return
      this.packHighlightNavIndex = (this.packHighlightNavIndex + 1) % n
      this.applyPackHighlightNavFocus({ scroll: true })
    },

    onPackHighlightNavDocumentKeydown (e) {
      if (!this.packHighlightNavFabVisible || this.packHighlightNavTargets.length === 0) return
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      const t = e.target
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          (t.isContentEditable && t.isContentEditable !== 'false'))
      ) {
        return
      }
      e.preventDefault()
      if (e.key === 'ArrowUp') this.packHighlightNavPrev()
      else this.packHighlightNavNext()
    },

    async toggleCommentsNavMode () {
      this.showCommentsNavMode = !this.showCommentsNavMode
      if (this.showCommentsNavMode) {
        await this.loadCommentNavNodes()
        this.commentNavIndex = 0
        this.commentNavScrollToCurrent()
      }
    },

    toggleCommentsNavFromFilter () {
      this.toggleCommentsNavMode()
      if (!this.showCommentsNavMode) return
      this.closeFilterDropdown()
    },

    async loadCommentNavNodes () {
      if (!this.currentVersionId) {
        this.commentNavNodes = []
        return
      }
      try {
        const { data } = await this.$http.secured.get('/meeting_dashboard/comment_nodes', {
          params: { new_dashboard_version_id: this.currentVersionId }
        })
        this.commentNavNodes = data.nodes || []
      } catch (e) {
        this.commentNavNodes = []
      }
    },

    commentNavPrev () {
      if (!this.commentNavNodes.length) return
      this.commentNavIndex = (this.commentNavIndex - 1 + this.commentNavNodes.length) % this.commentNavNodes.length
      this.commentNavScrollToCurrent()
    },

    commentNavNext () {
      if (!this.commentNavNodes.length) return
      this.commentNavIndex = (this.commentNavIndex + 1) % this.commentNavNodes.length
      this.commentNavScrollToCurrent()
    },

    commentNavScrollToCurrent () {
      const item = this.commentNavNodes[this.commentNavIndex]
      if (!item) return
      this.scrollToStableNode(item.new_task_id, item.stable_node_id)
    },

    scheduleFocusNodeFromRoute () {
      const focusNode = this.$route && this.$route.query && this.$route.query.focus_node
      if (!focusNode) return
      this.$nextTick(() => {
        setTimeout(() => {
          this.scrollToStableNode(null, focusNode)
        }, 500)
      })
    },

    scrollToStableNode (taskId, stableNodeId) {
      if (!stableNodeId || !this.$el) return
      const sid = stableNodeId
      const esc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(sid) : String(sid).replace(/\\/g, '\\\\')
      const scrollFlash = (el) => {
        if (!el) return
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('comment-nav-flash')
        setTimeout(() => el.classList.remove('comment-nav-flash'), 1500)
      }
      const noTask = taskId == null || taskId === ''
      if (noTask) {
        this.$nextTick(() => {
          const el = this.$el.querySelector(`.action-node[data-stable-node-id="${esc}"]`)
          if (el) {
            const row = el.closest('[data-task-id]')
            if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' })
            scrollFlash(el)
          }
        })
        return
      }
      const row = this.$el.querySelector(`[data-task-id="${taskId}"]`)
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      this.$nextTick(() => {
        const el = this.$el.querySelector(
          `[data-task-id="${taskId}"] .action-node[data-stable-node-id="${esc}"]`
        )
        scrollFlash(el)
      })
    },

    onReviewerFilterChange () {
      this.assignedNavIndex = 0
      if (this.useMeetingPublishedSource) {
        this.scheduleApplyMeetingPackDomAugmentation()
      }
      if (this.selectedReviewerUserId && this.assignedNavNodes.length) {
        this.$nextTick(() => this.assignedNavScrollToCurrent())
      }
    },

    assignedNavPrev () {
      if (!this.assignedNavNodes.length) return
      this.assignedNavIndex = (this.assignedNavIndex - 1 + this.assignedNavNodes.length) % this.assignedNavNodes.length
      this.assignedNavScrollToCurrent()
    },

    assignedNavNext () {
      if (!this.assignedNavNodes.length) return
      this.assignedNavIndex = (this.assignedNavIndex + 1) % this.assignedNavNodes.length
      this.assignedNavScrollToCurrent()
    },

    assignedNavScrollToCurrent () {
      const item = this.assignedNavNodes[this.assignedNavIndex]
      if (!item) return
      this.scrollToStableNode(item.new_task_id, item.stable_node_id)
    },

    async openAllCommentsModal () {
      await this.loadCommentNavNodes()
      this.allCommentsModalVisible = true
    },

    async openAllCommentsModalFromFilter () {
      await this.openAllCommentsModal()
      this.closeFilterDropdown()
    },

    taskLabelForCommentNode (item) {
      const t = (this.approvedTasks || []).find((x) => x.id === item.new_task_id)
      return t ? (t.description || `Task ${item.new_task_id}`).slice(0, 120) : `Task ${item.new_task_id}`
    },

    nodeLabelForCommentNode (item) {
      const t = (this.approvedTasks || []).find((x) => x.id === item.new_task_id)
      if (!t || !t.current_version || !t.current_version.action_nodes) return item.stable_node_id || 'Node'
      let found = ''
      const walk = (nodes, prefix) => {
        if (!Array.isArray(nodes) || found) return
        nodes.forEach((n, i) => {
          if (found) return
          const c = n.display_counter != null ? String(n.display_counter) : String(i + 1)
          const path = prefix ? `${prefix}.${c}` : c
          if (n.stable_node_id === item.stable_node_id) {
            found = path
            return
          }
          if (n.children && n.children.length) walk(n.children, path)
        })
      }
      walk(t.current_version.action_nodes, '')
      return found || item.stable_node_id || 'Node'
    },

    goToCommentNode (item) {
      this.allCommentsModalVisible = false
      this.$nextTick(() => this.scrollToStableNode(item.new_task_id, item.stable_node_id))
    },

    openThreadForNode (stableId) {
      this.allCommentsModalVisible = false
      this.openDashboardCommentsModal(stableId)
    },

    truncatePlainText (str, maxChars) {
      const s = String(str || '').trim()
      if (!s) return ''
      if (s.length <= maxChars) return s
      return s.slice(0, maxChars) + '…'
    },

    getNodeContentPreview (stableNodeId, maxChars) {
      if (!stableNodeId) return '(node content unavailable)'
      const list = this.approvedTasks || []
      for (const task of list) {
        const node = this.findNodeInTaskTreeByStableId(task, stableNodeId)
        if (node) {
          const plain = this.stripHtmlForCommentPreview(node.content)
          return this.truncatePlainText(plain, maxChars)
        }
      }
      return '(node content unavailable)'
    },

    stripHtmlForCommentPreview (html) {
      if (html == null) return ''
      return String(html)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    },

    findNodeInTaskTreeByStableId (task, stableId) {
      const roots = task && task.current_version && task.current_version.action_nodes
      if (!Array.isArray(roots) || !stableId) return null
      let found = null
      const walk = (nodes) => {
        if (!Array.isArray(nodes) || found) return
        nodes.forEach((n) => {
          if (found) return
          if (n.stable_node_id === stableId) {
            found = n
            return
          }
          if (n.children && n.children.length) walk(n.children)
        })
      }
      walk(roots)
      return found
    },

    nodeLabelForStableInTask (task, stableId) {
      const roots = task && task.current_version && task.current_version.action_nodes
      if (!Array.isArray(roots)) return stableId || 'Node'
      let label = ''
      const walk = (nodes, prefix) => {
        if (!Array.isArray(nodes) || label) return
        nodes.forEach((n) => {
          if (label) return
          const c = n.display_counter != null ? String(n.display_counter) : ''
          const path = prefix ? `${prefix}.${c}` : c
          if (n.stable_node_id === stableId) {
            label = path || stableId
            return
          }
          if (n.children && n.children.length) walk(n.children, path)
        })
      }
      walk(roots, '')
      return label || stableId || 'Node'
    },

    /**
     * Build parenthetical hierarchy label: e.g. "1(b)(iii)" instead of "1.b.iii".
     * Each depth after the first wraps its counter in parentheses.
     */
    nodeHierarchyLabel (task, stableId) {
      const roots = task && task.current_version && task.current_version.action_nodes
      if (!Array.isArray(roots) || !stableId) return ''
      let result = ''
      const walk = (nodes, pathParts, depth) => {
        if (!Array.isArray(nodes) || result) return
        nodes.forEach((n) => {
          if (result) return
          const c = n.display_counter != null ? String(n.display_counter) : ''
          const nextParts = pathParts.concat(c)
          if (n.stable_node_id === stableId) {
            // First part bare, rest wrapped in parens
            result = nextParts.map((p, i) => (i === 0 ? p : `(${p})`)).join('')
            return
          }
          if (n.children && n.children.length) walk(n.children, nextParts, depth + 1)
        })
      }
      walk(roots, [], 0)
      return result
    },

    buildCommentsModalNodeContext (task, stableId) {
      if (!task || !stableId) return null
      const node = this.findNodeInTaskTreeByStableId(task, stableId)
      if (!node) return null
      const plain = this.stripHtmlForCommentPreview(node.content)
      return {
        taskDescription: task.description || `Task ${task.id}`,
        taskSector: task.sector_division || '',
        nodeLabel: this.nodeLabelForStableInTask(task, stableId),
        nodeHierarchyPath: this.nodeHierarchyLabel(task, stableId),
        nodeContentPreview: this.truncatePlainText(plain, 150),
        nodeContentFull: plain
      }
    },

    resolveCommentsModalNodeContext (stableId) {
      if (!stableId) return null
      const list = this.approvedTasks || []
      for (const task of list) {
        const node = this.findNodeInTaskTreeByStableId(task, stableId)
        if (node) return this.buildCommentsModalNodeContext(task, stableId)
      }
      return null
    },

    openDashboardCommentsModal (stableId) {
      this.commentsModalStableId = stableId
      const ctx = this.resolveCommentsModalNodeContext(stableId)
      // Enrich context with assigned reviewer names from editorOverlay
      if (ctx && stableId && this.editorOverlay) {
        const o = this.editorOverlay[stableId]
        if (o && Array.isArray(o.assignment_users) && o.assignment_users.length) {
          ctx.assignedReviewerNames = o.assignment_users
            .map(u => u.name || `User ${u.id}`)
            .join(', ')
        }
      }
      this.commentsModalNodeContext = ctx
      this.commentsModalVisible = true
    },

    async openAssignPackModal (stableNodeId) {
      if (this.userRole !== 'editor' || !stableNodeId || !this.currentVersionId) {
        this.$toast && this.$toast.info('Select a published pack and open this screen as an editor to assign.')
        return
      }
      this.assignPackStableId = stableNodeId
      this.assignPackSelectedUserId = ''
      this.showAssignPackModal = true
      if (!this.assignPackReviewers.length) {
        try {
          const { data } = await this.$http.secured.get('/users/reviewers')
          const list = Array.isArray(data) ? data : (data.reviewers || [])
          this.assignPackReviewers = list.map((r) => ({
            id: r.id,
            name: r.name || [r.first_name, r.last_name].filter(Boolean).join(' ')
          }))
        } catch (e) {
          this.assignPackReviewers = []
        }
      }
    },

    closeAssignPackModal () {
      this.showAssignPackModal = false
      this.assignPackStableId = ''
      this.assignPackSelectedUserId = ''
    },

    async submitAssignPack () {
      if (!this.currentVersionId || !this.assignPackStableId || !this.assignPackSelectedUserId) {
        this.$toast && this.$toast.error('Choose a reviewer.')
        return
      }
      this.assignPackSaving = true
      try {
        await this.$http.secured.post('/meeting_dashboard/assignments', {
          new_dashboard_version_id: this.currentVersionId,
          stable_node_id: this.assignPackStableId,
          user_id: Number(this.assignPackSelectedUserId)
        })
        this.$toast && this.$toast.success('Assignment saved.')
        this.closeAssignPackModal()
        await this.fetchMeetingPackOverlay()
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || 'Assignment failed'
        this.$toast && this.$toast.error(msg)
      } finally {
        this.assignPackSaving = false
      }
    },

    closeDashboardCommentsModal () {
      this.commentsModalVisible = false
      this.commentsModalNodeContext = null
    },

    async onPackCommentSubmitted () {
      await this.fetchMeetingPackOverlay()
      if (this.showCommentsNavMode) {
        await this.loadCommentNavNodes()
      }
    },

    async onPackNodeResolutionChanged () {
      await this.fetchMeetingPackOverlay()
      if (this.showCommentsNavMode) {
        await this.loadCommentNavNodes()
      }
    }
  }
}
</script>

<style scoped>
/* Government Website Inspired Styling - Full Width like TentativeDashboard */
.dashboard-container {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: #f8f9fa;
  min-height: 100vh;
  color: #212529;
  padding: 1.5rem;
  min-height: calc(100vh - 4rem);
}

/* Search Actions Row Layout */
.search-actions-row {
  display: flex;
  align-items: stretch;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
  width: 100%;
  position: relative;
}

.search-wrapper {
  flex: 1 1 0%;
  min-width: 0;
  margin-bottom: 0;
}

.dashboard-actions-inline {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: 1.25rem;
}

@media (max-width: 900px) {
  .search-actions-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  .dashboard-actions-inline {
    margin-left: 0;
    justify-content: flex-end;
  }
}

/* Search System Styles */
.search-wrapper {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.3s ease;
}

.search-wrapper:focus-within {
  box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.1), 0 4px 6px -2px rgba(59, 130, 246, 0.05);
  border-color: #3b82f6;
  transform: translateY(-1px);
}

.search-input-group {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #6b7280;
  margin-right: 0.75rem;
  transition: color 0.2s ease;
}

.search-wrapper:focus-within .search-icon {
  color: #3b82f6;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 1rem;
  color: #1f2937;
  padding: 0.5rem 0;
  font-weight: 500;
}

.search-input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.search-input.has-results {
  color: #059669;
  font-weight: 600;
}

.clear-search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f3f4f6;
  border: none;
  border-radius: 50%;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 0.5rem;
}

.clear-search-btn:hover {
  background: #e5e7eb;
  color: #374151;
  transform: scale(1.1);
}

.search-results-info {
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-top: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
}

.results-count {
  font-weight: 600;
  color: #1e40af;
  background: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-stats {
  color: #4b5563;
  font-size: 0.8125rem;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-top: none;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  max-height: 400px;
  overflow-y: auto;
  z-index: 20;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: #f8fafc;
  transform: translateX(4px);
}

.suggestion-content {
  flex: 1;
  min-width: 0;
}

.suggestion-title {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-meta {
  font-size: 0.75rem;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-icon {
  color: #9ca3af;
  margin-left: 0.75rem;
  transition: color 0.2s ease;
}

.suggestion-item:hover .suggestion-icon {
  color: #3b82f6;
}

/* Search Highlight Animation */
.search-highlight {
  animation: searchHighlight 0.5s ease-in-out;
}

@keyframes searchHighlight {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(59, 130, 246, 0.1); }
}

.highlight-animation {
  animation: taskHighlight 2s ease-in-out;
}

@keyframes taskHighlight {
  0%, 100% { background-color: transparent; }
  25%, 75% { background-color: rgba(59, 130, 246, 0.15); }
}

/* Legacy Actions (for backward compatibility) */
.dashboard-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

/* Enhanced Filter Button Styles */
.filter-container {
  position: relative;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(30, 58, 138, 0.2);
  position: relative;
}

.filter-btn:hover {
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);
}

.filter-btn.active {
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
  box-shadow: 0 4px 8px rgba(30, 58, 138, 0.4);
}

.filter-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  animation: badgePulse 0.3s ease-in-out;
}

@keyframes badgePulse {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.filter-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 280px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 50;
  margin-top: 8px;
  animation: dropdownSlide 0.2s ease-out;
  overflow: visible; /* allow tag suggestion list to extend beyond card if needed */
}

@keyframes dropdownSlide {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filter-section {
  padding: 1.25rem;
  border-bottom: 1px solid #f3f4f6;
}

.filter-section:last-child {
  border-bottom: none;
}

.filter-section-title {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Match TentativeDashboard filter section header (icon + text) */
.filter-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 10px;
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.filter-option:hover {
  background-color: #f9fafb;
}

.filter-option input[type="radio"] {
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
  cursor: pointer;
}

.filter-option-text {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

/* NEW: tag chips */
.tag-chip {
  border: 1px solid #c7d2fe;
  background: #eef2ff;
  color: #1e40af;
  border-radius: 16px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.tag-chip:hover { filter: brightness(0.97); }
.tag-chip.selected {
  background: #1e3a8a;
  color: #fff;
  border-color: #1e3a8a;
}

/* FD: Tag suggestions dropdown like Tentative */
.fd-filter-tag-suggest-dropdown { position: relative; margin-bottom: 8px; }
.fd-filter-tag-suggest-dropdown.flip .fd-filter-tag-suggest-list { position: absolute; bottom: calc(100% + 6px); left: 0; right: 0; }
.fd-filter-tag-suggest-dropdown:not(.flip) .fd-filter-tag-suggest-list { position: absolute; top: calc(100% + 6px); left: 0; right: 0; }
.fd-filter-tag-suggest-list { max-height: 220px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 10px; background: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.12); padding: 4px 0; overflow-x: hidden; }
.fd-filter-tag-suggest-item { display: block; width: 100%; text-align: left; background: transparent; border: none; padding: 10px 14px; margin: 0; font-size: 13px; color: #1f2937; cursor: pointer; }
.fd-filter-tag-suggest-item:hover { background: #f9fafb; }
.fd-filter-tag-suggest-empty { padding: 8px; color: #6b7280; font-size: 12px; }
.fd-tag-search-input { 
  display: block; 
  width: 100%; 
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 10px 36px 10px 40px; /* left room for icon */
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  background: #fff url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>') no-repeat 12px center;
}
.fd-tag-search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}
.fd-filter-tag-suggest-list::-webkit-scrollbar { width: 8px; }
.fd-filter-tag-suggest-list::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 10px; }
.fd-filter-tag-suggest-list::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }

.custom-date-picker {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.date-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #374151;
  background: white;
  transition: border-color 0.2s ease;
}

.date-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background: #f9fafb;
  border-top: 1px solid #f3f4f6;
}

.clear-filters-btn {
  flex: 1;
  padding: 0.75rem;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-filters-btn:hover {
  background: #e5e7eb;
  color: #374151;
}

.close-filter-btn {
  flex: 1;
  padding: 0.75rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-filter-btn:hover {
  background: #2563eb;
}

.download-btn {
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
}

.download-btn:hover {
  background: linear-gradient(135deg, #047857 0%, #059669 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
}

/* Compact Government Style Table Headers */
.table-headers {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  margin-bottom: 0.5rem;
  border-radius: 8px 8px 0 0;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  overflow: hidden; /* Prevent any overflow */
}

.table-headers table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
  margin: 0; /* Remove any margin */
}

.table-headers th {
  color: white;
  font-size: 0.65rem; /* Reduced from 0.875rem */
  font-weight: 600;
  text-align: left;
  padding: 0.75rem; /* Reduced from 1rem */
  white-space: normal;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  line-height: 1.3; /* Compact line height */
}

.table-headers th:last-child {
  border-right: none;
}

.table-row {
  background: white;
  border-radius: 0;
  margin: 0.5rem 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  text-align: center;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e9ecef;
  overflow: hidden; /* Prevent overflow */
}

.table-row:last-child {
  border-radius: 0 0 8px 8px;
}

.table-row table {
  width: 100%;
  margin: 0; /* Remove margin that was causing overflow */
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
}

.table-row td {
  vertical-align: top !important;
  padding: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: #1a202c;
  background: #fff;
}

.table-row td:last-child {
  border-right: none;
}

/* Adjusted Column widths to total exactly 100% */
.table-headers th:nth-child(1),
.table-row td:nth-child(1) { 
  width: 5%; 
  min-width: 50px; /* Reduced min-width */
}

.table-headers th:nth-child(2),
.table-row td:nth-child(2) { 
  width: 10%; 
  min-width: 100px; /* Reduced min-width */
}

.table-headers th:nth-child(3),
.table-row td:nth-child(3) { 
  width: 12%; 
  min-width: 120px; /* Reduced min-width */
}

.table-headers th:nth-child(4),
.table-row td:nth-child(4) { 
  width: 55%; 
  min-width: 400px; /* Reduced min-width */
  overflow: hidden !important; /* Changed from visible to hidden */
  word-wrap: break-word;
  white-space: normal;
  text-align: left !important;
}

.table-headers th:nth-child(5),
.table-row td:nth-child(5) { 
  width: 6%; 
  min-width: 70px; /* Reduced min-width */
}

.table-headers th:nth-child(6),
.table-row td:nth-child(6) { 
  width: 8%; 
  min-width: 90px; /* Reduced min-width */
}

.table-headers th:nth-child(7),
.table-row td:nth-child(7) { 
  width: 4%; 
  min-width: 50px; /* Reduced min-width */
}

/* Action Content Styling - More Compact with Auto-scaling */
.action-content-cell {
  vertical-align: top !important;
  padding: 0.75rem !important;
  line-height: 1.5 !important;
  font-size: 0.875rem !important;
  color: #1a202c !important;
  overflow: hidden !important; /* Prevent horizontal overflow */
  word-wrap: break-word;
  max-width: 100% !important; /* Ensure it doesn't exceed container */
  position: relative;
  box-sizing: border-box;
  /* Smooth transition for scaling */
  transition: transform 0.3s ease;
}

/* Specific vertical alignment for highlight columns */
.original-date-cell,
.responsibility-cell,
.review-date-cell {
  vertical-align: middle !important;
}

.action-content-cell ul, .action-content-cell ol {
  margin: 6px 0; /* Reduced margin */
  padding-left: 0;
  list-style: none;
}

.action-content-cell li {
  margin: 3px 0; /* Reduced margin */
  list-style: none;
  display: flex;
  align-items: flex-start;
  line-height: 1.3; /* More compact line height */
}

.action-content-cell .list-marker {
  font-weight: 600;
  margin-right: 6px; /* Reduced margin */
  min-width: 18px; /* Reduced width */
  color: #1e40af;
  flex-shrink: 0;
}

/* More compact table styling within action content */
.action-content-cell table {
  width: 100% !important;
  max-width: 100% !important;
  border-collapse: collapse !important;
  margin: 0.4rem 0 !important; /* Reduced margin */
  font-size: 0.75rem !important; /* Reduced font size */
  table-layout: auto !important;
  overflow-wrap: break-word !important;
  /* Smooth transition for table scaling */
  transition: transform 0.3s ease;
  transform-origin: top left;
}

.action-content-cell table th,
.action-content-cell table td {
  border: 1px solid #d1d5db !important;
  padding: 4px 6px !important; /* Reduced padding */
  text-align: left !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
  font-size: 0.7rem !important; /* Reduced font size */
}

.action-content-cell table th {
  background-color: #f3f4f6 !important;
  font-weight: 600 !important;
  font-size: 0.7rem !important; /* Reduced font size */
}

.action-content-cell table td {
  font-size: 0.7rem !important; /* Reduced font size */
}

/* 🎯 UNIFIED: Clean Action Node Hierarchical Styling with DEEP SELECTORS */
.action-content-cell /deep/ .action-node {
  display: flex !important;
  align-items: flex-start !important;
  margin: 3px 0 !important; /* Reduced margin */
  padding: 2px 0 !important; /* Reduced padding */
  line-height: 1.4 !important;
  font-size: inherit !important;
}

.action-content-cell /deep/ .action-node .node-marker {
  flex-shrink: 0 !important;
  margin-right: 8px !important;
  font-weight: bold !important;
  min-width: 24px !important;
  text-align: left !important;
}

.action-content-cell /deep/ .action-node .node-content {
  flex: 1 !important;
  word-break: break-word !important;
  color: #000 !important;
}

/* 📐 ENHANCED: Hierarchical indentation with deep selectors - REDUCED SPACING! */
.action-content-cell /deep/ .action-node.level-1 { 
  margin-left: 0 !important; 
  background-color: rgba(59, 130, 246, 0.02) !important;
}
.action-content-cell /deep/ .action-node.level-2 { 
  margin-left: 20px !important; 
  /* background-color: rgba(16, 185, 129, 0.02) !important; */
  padding-left: 4px !important;
}
.action-content-cell /deep/ .action-node.level-3 { 
  margin-left: 40px !important; 
  /* background-color: rgba(139, 92, 246, 0.02) !important; */
  padding-left: 6px !important;
}
.action-content-cell /deep/ .action-node.level-4 { 
  margin-left: 60px !important; 
  /* background-color: rgba(245, 158, 11, 0.02) !important; */
  padding-left: 6px !important;
}
.action-content-cell /deep/ .action-node.level-5 { 
  margin-left: 80px !important; 
  /* background-color: rgba(239, 68, 68, 0.02) !important; */
  padding-left: 6px !important;
}

/* 🎨 UNIFIED: List style colors with deep selectors */
.action-content-cell /deep/ .action-node.style-decimal .node-marker { 
  /* color: #1e40af !important; */
  font-weight: bold !important; 
}
.action-content-cell /deep/ .action-node.style-lower-alpha .node-marker { 
  /* color: #059669 !important; */
  font-weight: bold !important; 
}
.action-content-cell /deep/ .action-node.style-lower-roman .node-marker { 
  /* color: #7C3AED !important; */
  font-weight: bold !important; 
}
.action-content-cell /deep/ .action-node.style-bullet .node-marker { 
  /* color: #DC2626 !important; */
  font-weight: bold !important; 
}

/* 📅 Review date styling - yellow highlight with deep selectors */
.action-content-cell /deep/ .action-node .node-content .review-date {
  font-size: 0.85em !important;
  color: #333 !important;
  font-weight: 500 !important;
  margin-left: 8px !important;
  background-color: #ffeb3b !important; /* Yellow highlight background */
  padding: 2px 6px !important;
  border-radius: 4px !important;
  border: none !important;
  display: inline-block !important;
}

/* Today's date styling - red text on yellow background */
.action-content-cell /deep/ .action-node .node-content .review-date.today {
  color: #d32f2f !important; /* Red text for today's date */
  font-weight: 600 !important;
}

/* ✅ Completed nodes styling with DEEP SELECTORS - GREEN COLOR */
.action-content-cell /deep/ .action-node.completed { 
  /* background-color: rgba(16, 185, 129, 0.1) !important; */
  /* border-left: 3px solid #10b981 !important; Green left border */
  border-radius: 4px !important;
  padding: 4px 8px !important;
}
.action-content-cell /deep/ .action-node.completed .node-content { 
  color: #059669 !important; /* Green text color */
  font-weight: 500 !important; /* Slightly bold */
}
.action-content-cell /deep/ .action-node.completed .node-marker { 
  color: #10b981 !important; /* Green marker color */
  font-weight: 600 !important;
}

/* 🔧 FALLBACK: Alternative deep selector syntaxes for maximum compatibility - REDUCED SPACING! */
.action-content-cell >>> .action-node.level-2 { 
  margin-left: 20px !important; 
  /* background-color: rgba(16, 185, 129, 0.02) !important; */
  /* border-left: 2px solid rgba(16, 185, 129, 0.3) !important; */
  padding-left: 4px !important;
}
.action-content-cell >>> .action-node.level-3 { 
  margin-left: 40px !important; 
  /* background-color: rgba(245, 158, 11, 0.02) !important; */
  /* border-left: 2px solid rgba(245, 158, 11, 0.3) !important; */
  padding-left: 6px !important;
}
.action-content-cell >>> .action-node.level-4 { 
  margin-left: 60px !important; 
  /* background-color: rgba(139, 92, 246, 0.02) !important; */
  /* border-left: 2px solid rgba(245, 158, 11, 0.3) !important; */
  padding-left: 6px !important;
}
.action-content-cell >>> .action-node.level-5 { 
  margin-left: 80px !important; 
  /* background-color: rgba(239, 68, 68, 0.02) !important; */
  /* border-left: 2px solid rgba(239, 68, 68, 0.3) !important; */
  padding-left: 6px !important;
}

/* Scaled content adjustments */
.action-content-cell.scaled {
  overflow: visible !important;
}

.action-content-cell.scaled table {
  margin-bottom: 0.2rem !important;
}

/* Ensure scaled tables don't interfere with layout */
.action-content-cell table.scaled-table {
  display: block;
  width: fit-content !important;
  max-width: none !important;
}

/* Government Style Status Badges */
.status-draft {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-review {
  background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-final-review {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-approved {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.status-completed {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

/* Government Style Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 0 0 8px 8px;
  color: #6c757d;
  border: 1px solid #e9ecef;
  border-top: none;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #495057;
  font-size: 1.25rem;
  font-weight: 600;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
  color: #6c757d;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 1rem; /* Adjusted for mobile */
  }
  
  .dashboard-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    /* No padding since we removed the card styling */
  }
  
  .filter-btn,
  .download-btn {
    justify-content: center;
    padding: 0.6rem 1rem; /* Slightly larger on mobile for touch */
    font-size: 0.85rem;
  }
  
  .table-headers th,
  .table-row td {
    padding: 0.5rem;
    font-size: 0.75rem;
  }
  
  .action-content-cell {
    padding: 0.5rem !important;
    font-size: 0.75rem !important;
  }
  
  .action-content-cell table th,
  .action-content-cell table td {
    padding: 3px 4px !important;
    font-size: 0.65rem !important;
  }
}

/* PDF-specific styles */
@media print {
  .dashboard-actions {
    display: none !important;
  }
  
  .table-headers,
  .table-row {
    box-shadow: none;
    border: 1px solid #ddd;
  }
}

/* ✅ NEW: Font-size based auto-scaling classes - NO MORE TRANSFORM SCALING */
/* Small font reduction for moderate overflow */
.action-content-cell.auto-scaled-small {
  font-size: 0.8em !important;
  line-height: 1.25 !important;
}

/* Tiny font reduction for severe overflow */
.action-content-cell.auto-scaled-tiny {
  font-size: 0.7em !important;
  line-height: 1.2 !important;
}

/* Ensure auto-scaled content maintains proper spacing */
.action-content-cell.auto-scaled-small /deep/ .action-node,
.action-content-cell.auto-scaled-tiny /deep/ .action-node {
  margin: 2px 0 !important;
  padding: 1px 0 !important;
}

/* Auto-scaled table improvements */
.action-content-cell.auto-scaled-small /deep/ table,
.action-content-cell.auto-scaled-tiny /deep/ table {
  margin: 0.2rem 0 !important;
}

.action-content-cell.auto-scaled-small /deep/ table th,
.action-content-cell.auto-scaled-small /deep/ table td,
.action-content-cell.auto-scaled-tiny /deep/ table th,
.action-content-cell.auto-scaled-tiny /deep/ table td {
  padding: 3px 4px !important;
}

/* Table-specific font scaling with deep selectors */
.action-content-cell /deep/ table.scaled-table {
  transform: none !important; /* Remove any transform scaling */
}

/* Ensure minimum cell width is always maintained */
.table-row td:nth-child(4) {
  min-width: 400px !important; /* Force minimum width for action column */
  width: 55% !important;
  max-width: none !important;
}

.yellow-bg-bold {
  background: #ffeb3b !important;
  font-weight: bold !important;
  border-radius: 4px;
  padding: 2px 6px;
  display: inline-block;
  vertical-align: middle;
}
.red-text {
  color: #d32f2f !important;
}
.black-text {
  color: #222 !important;
}
.review-date-cell, .responsibility-cell {
  text-align: center !important;
}

.responsibility-cell {
  position: relative;
  padding: 0.75rem !important;
  min-height: 50px;
  overflow: visible !important; /* Ensure badges are visible */
}

/* Hide reviewer badges in action content for FinalDashboard */
.action-content-cell /deep/ .reviewer-badge-parallel {
  display: none !important;
}

/* But keep the reviewer badges in the responsibility cell visible */
.responsibility-cell .reviewer-badge-parallel {
  display: inline-block !important;
}

/* Ensure action nodes with reviewers are properly marked */
.action-content-cell /deep/ .action-node.has-reviewer {
  position: relative !important;
  z-index: 1 !important;
}

/* Hover-revealed tag icon inside cells */
.tag-host { position: relative; }
.tag-peek {
  display: none;
  position: absolute;
  right: 6px;
  bottom: 6px;
  background: #eef2ff;
  color: #1e40af;
  border: 1px solid #c7d2fe;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  cursor: pointer;
}
.tag-host:hover .tag-peek { display: inline-block; }
.tag-peek:focus { display: inline-block; outline: none; box-shadow: 0 0 0 2px rgba(59,130,246,0.35); }

/* Tags popover (read-only) */
.fd-tags-popover {
  position: fixed;
  width: 240px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(0,0,0,0.18);
  padding: 0;
  overflow: hidden;
  z-index: 1000;
}
.fd-tags-popover-header {
  padding: 10px 12px;
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  color: #fff;
  font-weight: 600;
  font-size: 13px;
}
.fd-tags-popover-list {
  max-height: 180px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: #c7d2fe #f1f5f9;
}
.fd-tags-popover-list::-webkit-scrollbar { width: 8px; }
.fd-tags-popover-list::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
.fd-tags-popover-list::-webkit-scrollbar-thumb { background-color: #c7d2fe; border-radius: 4px; border: 2px solid #f1f5f9; }
.fd-tags-popover-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  font-size: 13px;
  color: #111827;
  background: #ffffff;
  border: none;
  white-space: normal;
  word-break: break-word;
}
.fd-tags-popover-item + .fd-tags-popover-item { border-top: 1px solid #f3f4f6; }
.fd-tags-popover-empty { color:#6b7280; font-size:12px; padding:8px 12px; }

/* Hide icons and popover in print/PDF/Word exports */
@media print {
  .no-print { display: none !important; }
}

/* Highlight connection class for hover effects */
.highlight-connection {
  background-color: #ffeb3b !important;
  color: #000000 !important;
  box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.5) !important;
}

/* Ensure action nodes with reviewers are properly marked */
.action-content-cell /deep/ .action-node.has-reviewer {
  position: relative !important;
  z-index: 1 !important;
}

/* Meeting pack overlay (parity with NewTentativeDashboard) */
.table-row.agenda-range-row-highlight {
  outline: 2px solid #fbbf24;
  outline-offset: 1px;
  border-radius: 4px;
}
.action-content-cell /deep/ .action-node.agenda-range-node-highlight {
  box-shadow: 0 0 0 2px #fbbf24;
  border-radius: 6px;
}
.action-content-cell /deep/ .action-node.meeting-overlay-node {
  position: relative;
  border-radius: 6px;
  padding: 2px 4px;
}
/*
 * Hub tints must use !important: base hierarchy rules set e.g.
 * `.action-node.level-1 { background-color: … !important; }` which otherwise
 * wins over non-important hub backgrounds — level-1 nodes then look untinted
 * (blue especially easy to miss). Parity with NewTentativeDashboard hub CSS.
 */
.new-final-meeting-readonly .action-content-cell /deep/ .action-node.meeting-hub-red {
  background: rgba(254, 202, 202, 0.88) !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}
.new-final-meeting-readonly .action-content-cell /deep/ .action-node.meeting-hub-green {
  background: rgba(187, 247, 208, 0.88) !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}
.new-final-meeting-readonly .action-content-cell /deep/ .action-node.meeting-hub-blue {
  background: rgba(191, 219, 254, 0.88) !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}
/* Black boundary for editors; !important keeps it visible over hub tint resets. */
.new-final-meeting-readonly .action-content-cell /deep/ .action-node.pack-highlight-nav-focus {
  outline: 3px solid #000000 !important;
  outline-offset: -3px !important;
  position: relative;
  z-index: 1;
}
.new-final-meeting-readonly .pack-highlight-nav-fab {
  position: fixed;
  right: 20px;
  bottom: 24px;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
  pointer-events: auto;
}
.new-final-meeting-readonly .pack-highlight-nav-fab-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid #64748b;
  background: #ffffff;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.new-final-meeting-readonly .pack-highlight-nav-fab-btn:hover {
  background: #f8fafc;
  border-color: #475569;
  color: #0f172a;
}
.new-final-meeting-readonly .pack-highlight-nav-fab-btn svg {
  width: 22px;
  height: 22px;
}
.new-final-meeting-readonly .pack-highlight-nav-fab-counter {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  line-height: 1.2;
  user-select: none;
}
.dashboard-container.dashboard-pdf-capture.new-final-meeting-readonly .pack-highlight-nav-fab,
.pdf-capture-mode .new-final-meeting-readonly .pack-highlight-nav-fab {
  display: none !important;
}
.dashboard-container.dashboard-pdf-capture.new-final-meeting-readonly .action-content-cell /deep/ .action-node.pack-highlight-nav-focus,
.pdf-capture-mode .new-final-meeting-readonly .action-content-cell /deep/ .action-node.pack-highlight-nav-focus {
  outline: none !important;
  z-index: auto;
}
.action-content-cell /deep/ .action-node.final-meeting-node-flex {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: flex-start !important;
}
.action-content-cell /deep/ .action-node .meeting-pack-marker-with-tick {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  gap: 2px;
  margin-right: 8px;
  line-height: 1;
}
.action-content-cell /deep/ .action-node .meeting-pack-marker-with-tick .node-marker {
  margin-right: 0 !important;
}
/* Pack resolution: tick grouped with marker (matches NewTentativeDashboard). */
.action-content-cell /deep/ .action-node .meeting-pack-resolution-chip {
  position: static;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  min-width: 11px;
  height: auto;
  pointer-events: none;
  line-height: 1;
  vertical-align: middle;
}
.action-content-cell /deep/ .action-node .meeting-pack-resolution-chip--resolved {
  color: #15803d;
}
.action-content-cell /deep/ .action-node .meeting-pack-resolution-tick {
  width: 12px;
  height: 12px;
  display: block;
}
.action-content-cell /deep/ .final-node-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}
.action-content-cell /deep/ .final-node-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #fff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
  color: #334155;
}
.action-content-cell /deep/ .final-node-icon-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}
.action-content-cell /deep/ .final-node-eye.has-comments {
  border-color: #2563eb;
  background: #eff6ff;
}
.action-content-cell /deep/ .final-node-view-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.action-content-cell /deep/ .final-node-comment-count-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 9999px;
  background: #2563eb;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.action-content-cell /deep/ .action-node.comment-nav-flash {
  animation: nfdCommentFlash 1.5s ease-out;
}
@keyframes nfdCommentFlash {
  0% { box-shadow: 0 0 0 4px #3b82f6; }
  100% { box-shadow: 0 0 0 0 transparent; }
}

.nfd-assign-pack-overlay {
  z-index: 100050;
}
.meeting-reset-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.meeting-reset-modal {
  background: #fff;
  border-radius: 12px;
  max-width: 420px;
  width: 100%;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
}
.assign-pack-modal {
  max-width: 480px;
}
.meeting-reset-modal-title {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: #0f172a;
}
.meeting-reset-modal-text {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.45;
}
.meeting-reset-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.meeting-reset-cancel {
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  cursor: pointer;
}
.meeting-reset-confirm {
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  border: none;
  background: #1d4ed8;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.assign-pack-fields {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.assign-pack-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
}
.assign-pack-select {
  width: 100%;
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  font-size: 0.85rem;
}

.nfd-all-comments-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 100040;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.nfd-all-comments-dialog {
  background: #fff;
  border-radius: 12px;
  max-width: 520px;
  width: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
}
.nfd-all-comments-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
}
.nfd-all-comments-head h3 {
  margin: 0;
  font-size: 1rem;
  color: #0f172a;
}
.nfd-all-comments-close {
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
}
.nfd-all-comments-body {
  padding: 12px 14px 16px;
  overflow-y: auto;
}
.nfd-muted {
  color: #64748b;
  font-size: 0.9rem;
}
.nfd-all-comments-cards {
  display: flex;
  flex-direction: column;
}
.nfd-comment-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
  border-left: 3px solid #3b82f6;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.nfd-comment-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.nfd-comment-card-header strong {
  color: #0f172a;
  font-size: 0.9rem;
}
.nfd-comment-node-label {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 600;
}
.nfd-comment-card-preview {
  color: #64748b;
  font-size: 13px;
  font-style: italic;
  line-height: 1.4;
  margin-bottom: 10px;
  word-break: break-word;
}
.nfd-comment-card-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
}
.nfd-linkish {
  border: none;
  background: none;
  color: #1d4ed8;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.nfd-linkish:hover {
  text-decoration: underline;
}
</style>

<style>
.pdf-capture-mode {
  font-family: Arial !important;
  overflow: visible !important;
}

.pdf-capture-mode tr > td:not(table table td):nth-child(1),  /* S No. */
.pdf-capture-mode tr > td:not(table table td):nth-child(2),  /* Sector/Division */
.pdf-capture-mode tr > td:not(table table td):nth-child(3),  /* Description */
.pdf-capture-mode tr > td:not(table table td):nth-child(5),  /* Original Date */
.pdf-capture-mode tr > td:not(table table td):nth-child(6),  /* Responsibility */
.pdf-capture-mode tr > td:not(table table td):nth-child(7) { /* Review Date */
  font-size: 12px !important;
  line-height: 1.2 !important;
}

/* the following code makes the content uniform (12px) for 4th col. remove them to preserve the styling of "action to be taken" */

.pdf-capture-mode td {
  font-size: 12pt !important;
  padding: 2px 5px !important;
}

.pdf-capture-mode td:nth-child(4) {
  overflow: visible !important;
  padding: 5px !important;
}

/* Preserve block layout for generic wrappers; never force .action-node to block — it must stay flex
   or marker+content collapse to a narrow column and text only uses part of the cell width in PDF. */
.pdf-capture-mode td:nth-child(4) table,
.pdf-capture-mode td:nth-child(4) p,
.pdf-capture-mode td:nth-child(4) div:not(.action-node) {
  display: block !important;
}
.pdf-capture-mode td:nth-child(4) *:not(table):not(p):not(div) {
  /* Removed display: inline-block !important; as it breaks inline span wrapping with background colors */
}

/* PDF: fixed layout only on the outer dashboard row table (matches jsPDF column widths).
   Do not apply fixed to v-html tables inside Action — fixed + no col widths → equal columns (~50/50). */
.pdf-capture-mode > table {
  table-layout: fixed !important;
  width: 100% !important;
  border-collapse: collapse !important;
  border: 1px solid #ddd !important;
}
/* Rich HTML / Word paste: let columns size from content so text uses full cell width */
.pdf-capture-mode .action-content-cell table,
.pdf-capture-mode .action-content-cell table table {
  table-layout: auto !important;
  width: 100% !important;
  border-collapse: collapse !important;
}
.pdf-capture-mode th, .pdf-capture-mode td {
  border: 1px solid #ddd !important;
  padding: 2px 4px !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  white-space: pre-line !important;
  font-size: 10px !important;
  line-height: 1.3 !important;
  box-sizing: border-box !important;
  max-width: none !important;
}
.pdf-capture-mode td {
  max-width: none !important;
}
.pdf-capture-mode td:nth-child(4) {
  /* Action to be Taken column: use JS-applied width (scaledColumnWidths[3]); strict wrapping */
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  white-space: pre-line !important;
  font-size: 10px !important;
  line-height: 1.3 !important;
  vertical-align: top !important;
  overflow: visible !important;
}
.pdf-capture-mode .action-content-cell .action-node .node-content {
  min-width: 0 !important;
  flex: 1 1 0% !important;
}
.pdf-capture-mode td * {
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}

.pdf-capture-mode td div,
.pdf-capture-mode td p,
.pdf-capture-mode td table {
  white-space: pre-line !important;
  max-width: 100% !important;
}

.pdf-capture-mode td span,
.pdf-capture-mode td b,
.pdf-capture-mode td strong,
.pdf-capture-mode td i,
.pdf-capture-mode td em,
.pdf-capture-mode td u,
.pdf-capture-mode td font,
.pdf-capture-mode td a {
  white-space: normal !important;
  max-width: none !important;
  -webkit-box-decoration-break: clone !important;
  box-decoration-break: clone !important;
}
.pdf-capture-mode ul, .pdf-capture-mode ol {
  padding-left: 18px !important;
  margin: 0.2em 0 !important;
}
.pdf-capture-mode li {
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  white-space: pre-line !important;
  max-width: 100% !important;
}
.pdf-capture-mode .action-content-cell table th,
.pdf-capture-mode .action-content-cell table td {
  font-size: 9px !important;
  padding: 2px 3px !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  white-space: pre-line !important;
  max-width: 100% !important;
}

/* Table styling for tables inside 'Action to be Taken' (dashboard and PDF) */
.action-content-cell table,
.action-content-cell th,
.action-content-cell td,
.pdf-capture-mode .action-content-cell table,
.pdf-capture-mode .action-content-cell th,
.pdf-capture-mode .action-content-cell td,
.action-content-cell table table,
.action-content-cell table th,
.action-content-cell table td {
  border: 1px solid #222 !important;
  border-collapse: collapse !important;
  padding: 3px !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  text-align: center !important;
  vertical-align: top !important;
}

.action-content-cell table {
  width: 100% !important;
  table-layout: fixed !important;
  margin: 0 !important;
}

.action-content-cell th {
  background: #f2f2f2 !important;
  font-weight: 600 !important;
  color: #222 !important;
}

/* Ensure nested tables also get the same styling */
.action-content-cell table table,
.action-content-cell table th,
.action-content-cell table td {
  border: 1px solid #222 !important;
  padding: 1px !important;
  background: #fff !important;
  font-size: 11px !important;
}

.yellow-bg-bold {
  background: #ffeb3b !important;
  font-weight: bold !important;
  border-radius: 4px;
  padding: 2px 6px;
  display: inline-block;
  vertical-align: top;
}

/* PDF-specific vertical alignment for highlight columns */
.pdf-capture-mode .original-date-cell,
.pdf-capture-mode .responsibility-cell,
.pdf-capture-mode .review-date-cell {
  vertical-align: top !important;
}

.pdf-capture-mode .yellow-bg-bold {
  display: inline-block !important;
  vertical-align: top !important;
}

.pdf-capture-mode .action-content-cell .meeting-pack-resolution-chip {
  display: none !important;
}

/* Ensure bold styling for S.No, Sector/Division, and Description columns in PDF */
.pdf-capture-mode td:nth-child(1) strong,
.pdf-capture-mode td:nth-child(2) strong,
.pdf-capture-mode td:nth-child(3) strong {
  font-weight: bold !important;
}
.red-text {
  color: #d32f2f !important;
}
.black-text {
  color: #222 !important;
}
.review-date-cell, .responsibility-cell {
  text-align: center !important;
}

/* PDF-specific: Tight vertical spacing but allow gap around tables so text above/below stays clear */
.pdf-capture-mode .action-content-cell *,
.pdf-capture-mode .action-node,
.pdf-capture-mode .action-node * {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  line-height: 1.1 !important;
}

/* Keep small gap above/below tables so "Expenditure status..." and "Aug-25 targets..." stay separated */
.pdf-capture-mode .action-content-cell table {
  margin-top: 6px !important;
  margin-bottom: 6px !important;
}

.pdf-capture-mode p,
.pdf-capture-mode li,
.pdf-capture-mode div {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  line-height: 1.1 !important;
}

.new-final-meeting-bar {
  margin: 0 1rem 0.75rem;
  padding: 0.65rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  font-size: 0.9rem;
  color: #0f172a;
}
.new-final-meeting-bar .meeting-date-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.new-final-meeting-bar .meeting-bar-label-text {
  font-weight: 600;
}
.new-final-meeting-bar .meeting-date-select {
  min-width: 11rem;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #94a3b8;
  background: #fff;
}
.new-final-meeting-bar .meeting-published-meta {
  color: #334155;
  font-size: 0.85rem;
}
.new-final-meeting-bar .meeting-published-empty {
  color: #b45309;
  font-size: 0.85rem;
}
.new-final-meeting-readonly .action-content-cell [contenteditable="true"],
.new-final-meeting-readonly .action-content-cell [draggable="true"] {
  pointer-events: none;
}

.new-final-meeting-bar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}
.new-final-live-status {
  padding-top: 0.35rem;
  border-top: 1px solid #bfdbfe;
}
.live-status-label {
  font-weight: 600;
  color: #0f172a;
}
.live-status-counts {
  font-size: 0.85rem;
  color: #334155;
}
.live-status-counts.muted {
  color: #94a3b8;
}
.new-final-review-hub-link {
  margin-left: auto;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1d4ed8;
  text-decoration: none;
}
.new-final-review-hub-link:hover {
  text-decoration: underline;
}
.new-final-agenda-row .meeting-bar-sublabel {
  font-size: 0.75rem;
  color: #64748b;
  margin-right: 4px;
}
.new-final-agenda-field {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.meeting-date-input {
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #94a3b8;
  font-size: 0.85rem;
}
.new-final-ghost-btn {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #94a3b8;
  background: #fff;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  color: #334155;
}
.new-final-ghost-btn:hover:not(:disabled) {
  background: #f1f5f9;
}
.new-final-ghost-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.new-final-ghost-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1e40af;
}
.comment-nav-arrows {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.fd-reviewer-filter-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 4px;
}
.comment-nav-pos {
  font-size: 0.8rem;
  color: #64748b;
  min-width: 3.5rem;
  text-align: center;
}
.new-final-reviewer-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.new-final-filter-hint {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0 0 8px;
}
</style>
