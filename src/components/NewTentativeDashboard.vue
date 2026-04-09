<template>
  <div
    class="dashboard-container new-tentative-dashboard"
    :class="{ 'dashboard-pdf-capture': pdfMode }"
  >
    <div
      v-if="showMeetingDashboardBar"
      class="meeting-dashboard-bar"
      role="region"
      aria-label="Meeting draft controls"
    >
      <div class="meeting-bar-row meeting-bar-row-main">
        <div class="meeting-bar-hint">
          <!-- Import button moved into Live review status actions -->
        </div>
      </div>
      <div
        v-if="latestPublishedVersionId"
        class="meeting-bar-row new-final-live-status"
        aria-label="Live review status"
      >
        <span class="live-status-label">Live review status</span>
        <div class="live-status-badges" aria-label="Pack node status counts">
          <span class="live-status-badge live-status-badge--green" title="Assigned and commented">
            <span class="live-status-badge-icon" aria-hidden="true"></span>
            <span class="live-status-badge-count">{{ packColorCounts.green }}</span>
          </span>
          <span class="live-status-badge live-status-badge--blue" title="Not assigned but has comments">
            <span class="live-status-badge-icon" aria-hidden="true"></span>
            <span class="live-status-badge-count">{{ packColorCounts.blue }}</span>
          </span>
          <span class="live-status-badge live-status-badge--red" title="Assigned, no comments yet">
            <span class="live-status-badge-icon" aria-hidden="true"></span>
            <span class="live-status-badge-count">{{ packColorCounts.red }}</span>
          </span>
        </div>
        <div class="live-status-actions">
          <router-link
            to="/import-dashboard-html"
            class="new-final-review-hub-link live-status-action-link live-status-action-link--import"
            title="Import dashboard HTML"
          >
            Import dashboard HTML
          </router-link>
          <router-link
            class="new-final-review-hub-link live-status-action-link"
            :to="{ name: 'NewTaskReviewHub', query: { dashboard_version_id: latestPublishedVersionId } }"
            title="Matrix of assignments vs comments; CSV and branded PDF export"
          >
            Open review hub
          </router-link>
        </div>
      </div>
      <div
        v-if="meetingAgendaUiEnabled"
        class="meeting-bar-row meeting-bar-row-agenda"
      >
        <span class="meeting-bar-label">Agenda highlight</span>
        <label class="meeting-bar-field">
          <span class="meeting-bar-sublabel">From</span>
          <input v-model="agendaDateFrom" type="date" class="meeting-date-input" @change="onAgendaRangeChange">
        </label>
        <label class="meeting-bar-field">
          <span class="meeting-bar-sublabel">To</span>
          <input v-model="agendaDateTo" type="date" class="meeting-date-input" @change="onAgendaRangeChange">
        </label>
        <button type="button" class="meeting-bar-clear-btn" @click="clearAgendaRange">Clear highlight</button>
      </div>

      <div v-if="userRole === 'editor'" class="meeting-bar-row meeting-bar-actions">
        <!-- moved to bottom footer to reduce accidental clicks while scanning -->
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
            placeholder="Search tasks by description, sector, or action items..."
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
          <span class="results-count">{{ filteredTasks.length }} of {{ activeTasks.length }} tasks</span>
          <span v-if="searchStats" class="search-stats">
            • {{ searchStats.descriptionMatches }} in descriptions
            • {{ searchStats.sectorMatches }} in sectors
            • {{ searchStats.actionMatches }} in actions
          </span>
        </div>
      </div>
      <div
        v-if="showMeetingDashboardBar"
        class="toolbar-date-slot"
        role="group"
        aria-label="Target meeting date"
      >
        <span class="toolbar-date-label">Target meeting date</span>
        <input
          v-model="targetMeetingDate"
          type="date"
          class="toolbar-date-input"
          @change="onTargetMeetingDateChange"
        >
      </div>
      <!-- Action Buttons -->
      <div class="dashboard-actions-inline">
        <div class="filter-container" ref="filterContainer">
<button 
            type="button"
            class="filter-btn"
            @click="toggleFilterDropdown"
            :class="{ 'active': showFilterDropdown }"
            :aria-expanded="showFilterDropdown ? 'true' : 'false'"
            aria-controls="task-filter-dropdown"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4V6.58579C21 6.851 20.8946 7.10536 20.7071 7.29289L14.2929 13.7071C14.1054 13.8946 14 14.149 14 14.4142V17L10 21V14.4142C10 14.149 9.89464 13.8946 9.70711 13.7071L3.29289 7.29289C3.10536 7.10536 3 6.851 3 6.58579V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Filter</span>
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              class="dropdown-arrow"
              :class="{ 'rotated': showFilterDropdown }"
            >
              <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div v-if="activeFiltersCount > 0" class="filter-badge">{{ activeFiltersCount }}</div>
          </button>
          
          <!-- Filter Dropdown -->
          <div v-if="showFilterDropdown" id="task-filter-dropdown" class="filter-dropdown" @click.stop>
            <div class="filter-header">
              <h4>Filter Tasks</h4>
              <button type="button" @click="clearAllFilters" class="clear-filters-btn">
                Clear All
              </button>
            </div>

            <!-- Follow-up status (meeting hub tint + row filter; values = pack highlight modes) -->
            <div v-if="showMeetingDashboardBar" class="filter-section filter-section--follow-up-status">
              <div class="filter-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Follow-up status</span>
              </div>
              <FilterPrettySelect
                :value="packHighlightMode"
                :options="followUpStatusSelectOptions"
                aria-label="Follow-up status"
                @input="onTentativePackHighlightSelect"
              />
            </div>

            <div
              v-if="showMeetingDashboardBar && latestPublishedVersionId && assignmentReviewerOptions.length"
              class="filter-section filter-section--assigned-reviewer"
            >
              <div class="filter-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Assigned reviewer</span>
              </div>
              <FilterPrettySelect
                :value="selectedReviewerUserId"
                :options="reviewerFilterOptions"
                aria-label="Assigned reviewer filter"
                @input="onTentativeReviewerSelect"
              />
              <p
                v-if="selectedReviewerUserId && !assignedNavNodes.length"
                class="filter-tags-state"
                style="margin: 8px 0 0;"
              >
                No nodes for this reviewer (not assigned to them and no comments by them on unassigned nodes).
              </p>
            </div>
            
            <!-- Review Date Filter -->
            <div class="filter-section filter-section--review-date">
              <div class="filter-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2V5M16 2V5M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Review Date</span>
              </div>
              <TentativeDateRangePicker
                :preset-key="reviewDateSelectValue"
                :from-ymd="reviewDateFromYmd"
                :to-ymd="reviewDateToYmd"
                :calendar-range="calendarRangeValue"
                :quick-select-options="reviewDateQuickSelectOptionsWithCounts"
                @preset-change="onReviewDatePresetChangeWrapper"
                @calendar-input="onReviewCalendarInput"
                @from-change="val => { reviewDateFromYmd = val; onReviewBoundChange() }"
                @to-change="val => { reviewDateToYmd = val; onReviewBoundChange() }"
              />
            </div>
            
            <!-- Tags Filter (Searchable dropdown, no creation) -->
            <div class="filter-section" ref="tagFilterField">
              <div class="filter-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 12l-8 8-8-8 8-8 8 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Tags</span>
              </div>

              <div v-if="isLoadingTags" class="filter-tags-state">Loading tags...</div>
              <div v-else-if="!allTagsForFilter.length" class="filter-tags-state">No tags yet</div>
              <div v-else>
                <div class="filter-tag-search-row">
                  <input
                    v-model="filterTagQuery"
                    type="text"
                    class="form-control tag-search-input"
                    placeholder="Search tags..."
                    @focus="openFilterTagDropdown"
                    @click="openFilterTagDropdown"
                    @input="openFilterTagDropdown"
                    @blur="onFilterTagBlur"
                    @keydown.esc.prevent="closeFilterTagDropdown"
                  >
                </div>

                <!-- Suggestions dropdown (stacked) -->
                <div v-if="showFilterTagDropdown" class="filter-tag-suggest-dropdown" :class="{ flip: filterTagDropdownFlip }">
                  <div v-if="!filteredFilterTagSuggestions.length" class="filter-tag-suggest-empty">No matching tags</div>
                  <div v-else class="filter-tag-suggest-list">
                    <button
                      v-for="t in filteredFilterTagSuggestions"
                      :key="t.id"
                      class="filter-tag-suggest-item"
                      :class="{ selected: selectedTagsFilter.includes(t.id) }"
                      :disabled="selectedTagsFilter.includes(t.id)"
                      @click.stop.prevent="selectFilterTag(t)"
                    >
                      {{ t.name }}
                    </button>
                  </div>
                </div>

                <!-- Selected tags summary chips -->
                <div v-if="selectedTagsFilter.length" class="filter-tag-chips-row">
                  <span
                    v-for="tid in selectedTagsFilter"
                    :key="tid"
                    class="active-filter-tag"
                  >
                    {{ (allTagsForFilter.find(t => t.id === tid) || {}).name || 'Tag' }}
                    <button type="button" @click.stop="clearOneTagFilter(tid)" class="remove-filter-btn" aria-label="Remove tag filter">×</button>
                  </span>
                </div>
              </div>
            </div>

            <!-- Active Filters Summary -->
            <div v-if="activeFiltersCount > 0" class="active-filters-summary">
              <div class="summary-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4V6.58579C21 6.851 20.8946 7.10536 20.7071 7.29289L14.2929 13.7071C14.1054 13.8946 14 14.149 14 14.4142V17L10 21V14.4142C10 14.149 9.89464 13.8946 9.70711 13.7071L3.29289 7.29289C3.10536 7.10536 3 6.851 3 6.58579V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Active Filters</span>
              </div>
              <div class="active-filters-list">
                <span v-if="reviewDateFilterActive" class="active-filter-tag">
                  {{ getReviewDateFilterLabel() }}
                  <button type="button" @click="clearDateFilter" class="remove-filter-btn">×</button>
                </span>
                <span v-if="packHighlightListFilterActive" class="active-filter-tag">
                  {{ getPackHighlightFilterLabel() }}
                  <button type="button" @click="clearPackHighlightListFilter" class="remove-filter-btn">×</button>
                </span>
                <span
                  v-if="showMeetingDashboardBar && selectedReviewerUserId"
                  class="active-filter-tag"
                >
                  {{ getReviewerFilterLabel() }}
                  <button type="button" @click="clearReviewerFilter" class="remove-filter-btn" aria-label="Clear reviewer filter">×</button>
                </span>
                <span
                  v-for="tid in selectedTagsFilter"
                  :key="tid"
                  class="active-filter-tag"
                >
                  {{ (allTagsForFilter.find(t => t.id === tid) || {}).name || 'Tag' }}
                  <button type="button" @click="clearOneTagFilter(tid)" class="remove-filter-btn" aria-label="Remove tag filter">×</button>
                </span>
              </div>
            </div>
            
            <!-- Results Summary -->
            <div class="filter-results-summary">
              <span class="results-text">
                Showing {{ displayTasks.length }} of {{ activeTasks.length }} tasks
              </span>
            </div>
          </div>
        </div>
      <button @click="openAddTaskModal" class="create-task-btn">Create task</button>
      <button
        type="button"
        @click="downloadPDF"
        class="download-pdf-btn"
        :disabled="pdfVisible"
      >{{ pdfVisible ? 'Generating PDF...' : 'Download PDF' }}</button>
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
        <colgroup>
          <col style="width: 2%">
          <col style="width: 7%">
          <col style="width: 7%">
          <col style="width: 68%">
          <col style="width: 4%">
          <col style="width: 5%">
          <col style="width: 4%">
          <col style="width: 3%">
        </colgroup>
        <tr>
          <th>S No.</th>
          <th>Sector/Division</th>
          <th>Description</th>
          <th>Action to be Taken</th>
          <th>Original Date</th>
          <th>Responsibility</th>
          <th>Review Date</th>
          <th>Status</th>
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
           'highlighted-row': String(task.id) === String($route.query.highlightTaskId),
           'search-highlight': searchQuery.length > 0 && isTaskInSearchResults(task.id),
           'agenda-range-row-highlight': showMeetingDashboardBar && meetingAgendaUiEnabled && taskInAgendaRange(task)
         }"
         @contextmenu.prevent="openTaskContextMenu(task, $event)">
      <table>
        <colgroup>
          <col style="width: 2%">
          <col style="width: 7%">
          <col style="width: 7%">
          <col style="width: 68%">
          <col style="width: 4%">
          <col style="width: 5%">
          <col style="width: 4%">
          <col style="width: 3%">
        </colgroup>
        <tr>
          <td><strong>{{ getDisplayIndex(index) }}</strong></td>
          <td><strong>{{ task.sector_division }}</strong></td>
          <td>
            <strong>{{ task.description }}</strong>
          </td>
          <td v-html="task.action_to_be_taken" class="action-content-cell" 
              @click="debugContent(task)"
              @dblclick.stop="onActionCellDblClick($event, task)"></td>
          <td class="original-date-cell" :style="pdfMode ? 'vertical-align: top;' : ''">
            <span :class="getHighlightClass(task.review_date)">{{ formatDate(task.original_date) }}</span>
          </td>
          <td class="responsibility-cell" :style="pdfMode ? 'vertical-align: top;' : ''">
            <span :class="getHighlightClass(task.review_date)">{{ task.responsibility }}</span>
          </td>
          <td class="review-date-cell" :style="pdfMode ? 'vertical-align: top;' : ''">
            <span :class="getHighlightClass(task.review_date)">{{ formatDate(task.review_date) }}</span>
          </td>
          <td
            v-if="showMeetingDashboardBar"
            class="meeting-pack-status-td"
            :class="{
              'meeting-pack-status-td--ready': meetingPackStatusTdReady(task),
              'meeting-pack-status-td--pending': meetingPackStatusTdPending(task)
            }"
            @dblclick.stop="openMeetingPackExplainer(task)"
          >
            <!-- No right-click on touch: small control on narrow viewports only (see .row-context-menu-mobile). -->
            <button
              type="button"
              class="row-context-menu-mobile"
              aria-label="Open task actions"
              @click.stop="openRowMenuFromControl(task, $event)"
            >
              ⋮
            </button>
            <template v-for="(packStats, packStatsIdx) in [normalizePackNodeStats(task)]">
              <div v-if="!packStats" :key="'mp-miss-' + packStatsIdx" class="meeting-pack-status-cell">
                <span class="meeting-pack-status-missing">—</span>
              </div>
              <div v-else :key="'mp-ok-' + packStatsIdx" class="meeting-pack-status-cell">
                <div class="meeting-pack-status-counts">
                  <span
                    class="meeting-pack-count meeting-pack-count--unresolved"
                    title="Unresolved nodes (review hub)"
                  >
                    <svg class="meeting-pack-glyph meeting-pack-glyph--red" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="3.5" fill="currentColor" /></svg>
                    <span class="meeting-pack-count-num">{{ packStats.unresolved_count }}</span>
                  </span>
                  <span class="meeting-pack-count-sep" aria-hidden="true">·</span>
                  <span
                    class="meeting-pack-count meeting-pack-count--resolved"
                    title="Resolved nodes"
                  >
                    <svg class="meeting-pack-glyph meeting-pack-glyph--green" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="3.5" fill="currentColor" /></svg>
                    <span class="meeting-pack-count-num">{{ packStats.resolved_count }}</span>
                  </span>
                  <span
                    v-if="packStats.no_action_nodes"
                    class="meeting-pack-info-wrap"
                    :title="meetingPackNoChangeTooltip"
                    role="img"
                    aria-label="No change. Ready to be published."
                  >
                    <span class="meeting-pack-info-icon">i</span>
                  </span>
                </div>
                <div v-if="meetingPackStatusShowSecondLine(task)" class="meeting-pack-status-message">
                  {{ meetingPackStatusSecondLineText(task) }}
                </div>
              </div>
            </template>
          </td>
          <td v-else class="legacy-status-td">
            <span :class="statusClass[task.status || 'unknown']">{{ formatStatus(task.status) }}</span>
            <button
              type="button"
              class="row-context-menu-mobile"
              aria-label="Open task actions"
              @click.stop="openRowMenuFromControl(task, $event)"
            >
              ⋮
            </button>
          </td>
        </tr>
      </table>
    </div>

    <div
      v-if="showMeetingDashboardBar && userRole === 'editor'"
      id="meeting-bottom-actions"
      class="meeting-bottom-actions no-print"
      role="region"
      aria-label="Meeting publish actions"
    >
      <div class="meeting-bottom-actions-inner">
        <button
          type="button"
          class="publish-dashboard-btn"
          :disabled="meetingPublishSaving"
          @click="publishMeetingDashboard"
        >
          {{ meetingPublishSaving ? 'Publishing…' : 'Submit (publish)' }}
        </button>
        <button
          type="button"
          class="reset-draft-btn"
          :disabled="meetingResetSaving"
          @click="openResetConfirm"
        >
          Reset to published
        </button>
      </div>
    </div>

    <!-- Global Action Menu (outside table structure) -->
    <div class="global-action-menu"
         :class="{ 'show': activeMenuId }"
         :style="menuPosition">
      <button @click="editTask(getCurrentTask()); forceHideMenu()" class="menu-item">Edit</button>
      <button v-if="canDelete(getCurrentTask())"
              @click="deleteTask(getCurrentTask()); forceHideMenu()"
              class="menu-item">Delete</button>
      <button
        v-if="!showMeetingDashboardBar && canSendForReview(getCurrentTask())"
        @click="openReviewModal(getCurrentTask()); forceHideMenu()"
        class="menu-item"
      >{{ getReviewButtonText(getCurrentTask()) }}</button>
      <button
        v-if="!showMeetingDashboardBar"
        @click="openCommentsModal(getCurrentTask()); forceHideMenu()"
        class="menu-item"
      >Reviews</button>
      <button v-if="canApprove(getCurrentTask())"
              @click="approveTask(getCurrentTask()); forceHideMenu()"
              class="menu-item">Approve</button>
      <button @click="openTagsModal(getCurrentTask())" class="menu-item tags">Tags</button>
      <template v-if="showMeetingDashboardBar && latestPublishedVersionId">
        <router-link
          class="menu-item"
          :to="{ name: 'NewTaskReviewHub', query: { dashboard_version_id: latestPublishedVersionId } }"
          @click.native="forceHideMenu()"
        >
          Review status
        </router-link>
      </template>
    </div>

    <!-- Centered Tags Modal -->
    <div v-if="showTagsModal" class="tags-modal-overlay" @click.self="closeTagsModal">
      <div class="tags-modal" role="dialog" aria-modal="true">
        <div class="tags-modal-header">
          <h3 class="tags-modal-title">Tags</h3>
          <button class="tags-modal-close" @click="closeTagsModal" aria-label="Close">×</button>
        </div>
        <div class="tags-modal-body">
          <template v-if="tagsModalTask && tagsModalTask.tags && tagsModalTask.tags.length">
            <div class="tags-modal-grid">
              <span v-for="t in tagsModalTask.tags" :key="t.id" class="tags-chip">{{ t.name }}</span>
            </div>
          </template>
          <div v-else class="tags-empty-state">No tags for this task yet</div>
        </div>
      </div>
    </div>

    <!-- Modals remain unchanged -->
    <NewTaskModal v-if="showTaskModal"
                  :task="currentTask"
                  :mode="taskModalMode"
                  :meeting-overlay-version-id="latestPublishedVersionId"
                  :pack-highlight-mode="packHighlightMode"
                  @close="closeTaskModal"
                  @save="handleTaskSaved" />
    <ReviewModal v-if="showReviewModal"
                 :task="currentTask"
                 @close="closeReviewModal"
                 @send="sendForReview" />
    <CommentsModal v-if="showCommentsModal"
                   :task="currentTask"
                   @close="closeCommentsModal" />

    <div v-if="showResetConfirmModal" class="meeting-reset-modal-overlay" @click.self="showResetConfirmModal = false">
      <div class="meeting-reset-modal" role="dialog" aria-modal="true" aria-labelledby="meeting-reset-title">
        <h3 id="meeting-reset-title" class="meeting-reset-modal-title">Discard draft changes?</h3>
        <p class="meeting-reset-modal-text">
          This restores the living draft to match the last published pack. Comments on published versions are not deleted.
        </p>
        <div class="meeting-reset-modal-actions">
          <button type="button" class="meeting-reset-cancel" @click="showResetConfirmModal = false">Cancel</button>
          <button type="button" class="meeting-reset-confirm" :disabled="meetingResetSaving" @click="confirmResetDraft">Reset</button>
        </div>
      </div>
    </div>

    <div v-if="showPostponeModal" class="meeting-reset-modal-overlay" @click.self="cancelPostponeModal">
      <div class="meeting-reset-modal" role="dialog" aria-modal="true">
        <h3 class="meeting-reset-modal-title">Postpone meeting?</h3>
        <p class="meeting-reset-modal-text">
          Move the published pack pointer from <strong>{{ postponeFromDate }}</strong> to <strong>{{ postponeToDate }}</strong>?
          Final dashboard will use the new date immediately.
        </p>
        <div class="meeting-reset-modal-actions">
          <button type="button" class="meeting-reset-cancel" @click="cancelPostponeModal">Cancel</button>
          <button type="button" class="meeting-reset-confirm" :disabled="postponeSaving" @click="confirmPostponeMeeting">
            {{ postponeSaving ? 'Saving…' : 'Confirm' }}
          </button>
        </div>
      </div>
    </div>



    <DashboardNodeCommentsModal
      :visible="commentsModalVisible"
      :version-id="latestPublishedVersionId"
      :stable-node-id="commentsModalStableId"
      :current-user-id="currentUserId"
      :user-role="userRole"
      :node-context="commentsModalNodeContext"
      :is-node-resolved="commentsModalNodeResolved"
      @close="closeDashboardCommentsModal"
      @submitted="onDashboardCommentSubmitted"
      @resolution-changed="onDashboardNodeResolutionChanged"
    />

    <!-- Assign Reviewer Modal (pack-level, triggered from node hover buttons) -->
    <div v-if="showAssignPackModal" class="meeting-reset-modal-overlay ntd-assign-pack-overlay" @click.self="closeAssignPackModal">
      <div class="meeting-reset-modal ntd-assign-pack-modal" role="dialog" aria-modal="true" aria-labelledby="ntd-assign-pack-title">
        <div class="ntd-assign-modal-header">
          <h3 id="ntd-assign-pack-title" class="ntd-assign-modal-title">Assign reviewer</h3>
          <button type="button" class="ntd-assign-modal-close" @click="closeAssignPackModal" aria-label="Close">×</button>
        </div>
        
        <div class="ntd-assign-pack-body">
          <div class="ntd-assign-current-section">
            <label class="ntd-assign-section-label">Current Reviewers</label>
            <div class="ntd-assign-current-list">
              <span v-if="!assignPackCurrentReviewers.length" class="ntd-assign-empty-text">N/A</span>
              <div v-else class="ntd-assign-reviewer-chips">
                <span v-for="u in assignPackCurrentReviewers" :key="u.id" class="ntd-reviewer-chip">
                  <span class="ntd-reviewer-avatar">{{ (u.name || "?")[0].toUpperCase() }}</span>
                  <span class="ntd-reviewer-name">{{ u.name }}</span>
                  <button
                    v-if="u.assignment_id"
                    type="button"
                    class="ntd-reviewer-remove"
                    title="Remove assignment"
                    aria-label="Remove assignment"
                    @click="removeAssignPack(u.assignment_id)"
                  >
                    ×
                  </button>
                </span>
              </div>
            </div>
          </div>

          <div class="ntd-assign-field">
            <label class="ntd-assign-section-label" for="ntd-assign-pack-select">Assign New Reviewer</label>
            <div class="ntd-assign-select-wrapper">
              <select
                id="ntd-assign-pack-select"
                v-model="assignPackSelectedUserId"
                class="ntd-assign-pack-select"
              >
                <option value="">— Select reviewer —</option>
                <option v-for="u in assignPackAvailableReviewers" :key="u.id" :value="u.id">{{ u.name }}</option>
              </select>
              <div class="ntd-assign-select-icon">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"></path></svg>
              </div>
            </div>
          </div>
        </div>

        <div class="ntd-assign-modal-footer">
          <button type="button" class="ntd-assign-btn-cancel" @click="closeAssignPackModal">Cancel</button>
          <button
            type="button"
            class="ntd-assign-btn-confirm"
            :disabled="assignPackSaving || !assignPackSelectedUserId"
            @click="submitAssignPack"
          >
            <span v-if="assignPackSaving" class="ntd-spinner"></span>
            {{ assignPackSaving ? 'Saving…' : 'Assign' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Explainer Modal -->
    <MeetingPackStatusExplainerModal
      :visible="explainerOpen"
      :task-id="explainerTaskId || ''"
      :version-id="latestPublishedVersionId || ''"
      :initial-stats="explainerInitialStats"
      :task-sector="explainerTaskSector"
      :task-description="explainerTaskDescription"
      @close="closeMeetingPackExplainer"
    />

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

    <button
      v-if="jumpFabVisible"
      type="button"
      class="scroll-jump-fab no-print"
      :aria-label="jumpFabMode === 'down' ? 'Jump to publish actions' : 'Jump to top'"
      :title="jumpFabMode === 'down' ? 'Jump to publish actions' : 'Jump to top'"
      @click="onJumpFabClick"
    >
      <svg
        v-if="jumpFabMode === 'down'"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>

    <!-- Inline Node Editor (floating overlay triggered by dblclick on action nodes) -->
    <InlineNodeEditor
      v-if="inlineEditNode && !pdfMode"
      :node-content="inlineEditNode.content"
      :task-id="inlineEditTask.id"
      :node-id="inlineEditNode.id"
      :stable-node-id="inlineEditNode.stable_node_id || ''"
      :anchor-rect="inlineEditAnchorRect"
      @saved="onInlineEditorSaved"
      @save-error="onInlineEditorSaveError"
      @cancelled="closeInlineEditor"
    />
  </div>
</template>

<script>
import NewTaskModal from '../components/NewTaskModal.vue'
import ReviewModal from '../components/ReviewModal.vue'
import CommentsModal from '../components/CommentsModal.vue'
import DashboardNodeCommentsModal from '../components/DashboardNodeCommentsModal.vue'
import MeetingPackStatusExplainerModal from '../components/MeetingPackStatusExplainerModal.vue'
import Datepicker from 'vuejs-datepicker'
import VDatePicker from 'v-calendar/src/components/DatePicker.vue'
import TentativeDateRangePicker from '../components/TentativeDateRangePicker.vue'
import FilterPrettySelect from '@/components/FilterPrettySelect.vue'
import InlineNodeEditor from '@/components/InlineNodeEditor.vue'
import 'v-calendar/src/styles/base.css'
// import ParticleBackground from './ParticleBackground.vue'
import { calendarYmdInTimeZone } from '@/utils/calendarYmd'
import { exportMeetingDashboardPdf } from '@/utils/meetingDashboardPdfExport'
import { isMeetingDashboardUiEnabled, isWebpackDevelopment } from '@/utils/meetingDashboardUi'
import {
  meetingHubHighlightClass,
  MEETING_HUB_HIGHLIGHT_CLASSES
} from '@/utils/meetingHubNodeHighlight'
import { reviewerScopedHubClass } from '@/utils/meetingReviewerNodeHighlight'
import {
  ymdFromDate,
  presetKeyToYmdRange,
  ymdPairToDateRange,
  taskMatchesReviewDateFilter,
  isDateFilterActive,
  countTasksMatchingDateFilter
} from '@/utils/tentativeReviewDateFilter'
import {
  FOLLOW_UP_STATUS_FILTER_OPTIONS,
  packModeToHubClass,
  packHighlightShowsHubColors,
  packHighlightRestrictsTaskList,
  shouldApplyMeetingHubTint,
  taskMatchesPackHighlightMode
} from '@/utils/meetingPackHighlightFilter'
import {
  buildPackHighlightNavTargets,
  stripPackHighlightNavFocusClass
} from '@/utils/meetingPackHighlightNav'

const REVIEW_DATE_QUICK_SELECT = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range' }
]

export default {
  name: 'NewTentativeDashboard',

  components: {
    NewTaskModal,
    ReviewModal,
    CommentsModal,
    DashboardNodeCommentsModal,
    MeetingPackStatusExplainerModal,
    Datepicker,
    VDatePicker,
    TentativeDateRangePicker,
    FilterPrettySelect,
    InlineNodeEditor,
    // ParticleBackground,
  },

  data () {
    return {
      selectedDate: new Date(),
      activeTasks: [],
      currentTask: null,
      completedTasks: [],
      showTaskModal: false,
      showReviewModal: false,
      showCommentsModal: false,
      taskModalMode: 'add',
      showCompletedTasks: false,
      activeMenuId: null,
      menuPosition: { top: '0px', left: '0px' },
      /** Anchor for context menu: offsets from task row top-left; updated on open for scroll sync. */
      menuAnchor: null,
      contextMenuRafId: null,
      pdfVisible: false,
      pdfMode: false,
      resizeTimeout: null,
      menuHideTimeout: null,
      // Scroll-jump FAB (separate from pack highlight navigator)
      jumpFabState: { visible: false, mode: 'down' },
      /** Meeting draft: show pack node chrome on draft HTML (default on). Toggle is next to Filter when meeting bar is visible. */
      packHighlightMode: 'all',
      packHighlightNavIndex: 0,
      packHighlightNavTargets: [],
      packHighlightNavInitialScrollDone: false,
      _packHighlightNavForceScroll: false,
      searchQuery: '',
      showSearchSuggestions: false,
      searchStats: null,
      filteredTasks: [],
      searchDebounceTimeout: null,
      searchIndex: null, // For fast search indexing
      
      // Filter system data
      showFilterDropdown: false,
      /** 'all' | 'preset' | 'range' — client-side review_date filter */
      reviewDateMode: 'all',
      reviewDatePresetKey: 'today',
      reviewDateFromYmd: '',
      reviewDateToYmd: '',
      calendarRangeValue: null,

      // Tags filter (NEW)
      selectedTagsFilter: [],
      allTagsForFilter: [],
      isLoadingTags: false,
      // Searchable dropdown state (filter panel)
      filterTagQuery: '',
      showFilterTagDropdown: false,
      filterTagDropdownFlip: false,
      // Tags popover state (action menu)
      showTagsForTaskId: null,
      tagsPopoverPosition: null,

      // Tags modal state
      showTagsModal: false,
      tagsModalTask: null,

      // Meeting dashboard (draft pack) — see New_Todo.md
      targetMeetingDate: '',
      persistedTargetMeetingDate: '',
      /** Product: agenda date-range highlight not required; keep false. Safe-delete dead code later (see New_Todo.md). */
      meetingAgendaUiEnabled: false,
      agendaDateFrom: '',
      agendaDateTo: '',
      showResetConfirmModal: false,
      showPostponeModal: false,
      postponeFromDate: '',
      postponeToDate: '',
      postponeSaving: false,
      meetingPublishSaving: false,
      meetingResetSaving: false,
      meetingDatesCache: [],
      latestPublishedVersionId: null,
      editorOverlay: {},
      /** From draft_editor_overlay; names for reviewer filter dropdown. */
      overlayUserDirectory: [],
      selectedReviewerUserId: '',
      assignedNavIndex: 0,
      commentsModalVisible: false,
      commentsModalStableId: '',
      commentsModalNodeContext: null,

      // Node right-click context state
      activeNodeStableId: null,

      // Assign reviewer (pack-level) state
      showAssignPackModal: false,
      assignPackStableId: '',
      assignPackSelectedUserId: '',
      assignPackSaving: false,
      assignPackReviewers: [],

      /** Tooltip for meeting pack "no action nodes" info control (exact product copy). */
      meetingPackNoChangeTooltip: 'No change.\n\nReady to be published.',

      // Meeting pack status explainer
      explainerOpen: false,
      explainerTaskId: null,
      explainerTaskSector: '',
      explainerTaskDescription: '',
      explainerInitialStats: null,

      // Inline node editor
      inlineEditTask: null,
      inlineEditNode: null,
      inlineEditAnchorRect: null
    }
  },
  watch: {
    agendaDateFrom () {
      if (this.showMeetingDashboardBar) this.applyAgendaNodeHighlights()
    },
    agendaDateTo () {
      if (this.showMeetingDashboardBar) this.applyAgendaNodeHighlights()
    },
    '$route.query.highlightTaskId'(newVal) {
      if (!newVal) {
        const highlightedRow = document.querySelector('.highlight-transition')
        if (highlightedRow) {
          highlightedRow.classList.remove('highlighted-row', 'highlight-transition')
        }
      }
    },
    activeTasks: {
      handler() {
        this.$nextTick(() => {
          this.applyAutoScaling()
          if (this.showMeetingDashboardBar) {
            this.applyAgendaNodeHighlights()
            this.scheduleApplyEditorOverlays()
          }
        })
      },
      deep: true
    },
    editorOverlay: {
      deep: true,
      handler() {
        this.scheduleApplyEditorOverlays()
      }
    },
    packHighlightMode() {
      this.scheduleApplyEditorOverlays()
    },
    selectedReviewerUserId () {
      if (this.showMeetingDashboardBar) this.scheduleApplyEditorOverlays()
    },
    assignedNavNodes: {
      handler (list) {
        if (!list.length) this.assignedNavIndex = 0
        else if (this.assignedNavIndex >= list.length) this.assignedNavIndex = 0
      }
    },
    '$route'() {
      this.forceHideMenu()
    }
  },
  computed: {
    assignPackCurrentReviewers () {
      const sid = this.assignPackStableId
      if (!sid || !this.editorOverlay) return []
      const o = this.editorOverlay[sid]
      return (o && o.assignment_users) || []
    },
    assignPackAvailableReviewers () {
      const currentIds = new Set(this.assignPackCurrentReviewers.map(u => u.id))
      return this.assignPackReviewers.filter(u => !currentIds.has(u.id))
    },
    // Filter tag suggestions: prefix match first, then contains, limit 20
    filteredFilterTagSuggestions () {
      const list = Array.isArray(this.allTagsForFilter) ? this.allTagsForFilter : []
      const q = (this.filterTagQuery || '').trim().toLowerCase()
      if (!q) return list.slice(0, 20)
      const prefix = []
      const contains = []
      list.forEach(t => {
        const name = (t.name || '').toLowerCase()
        if (name.startsWith(q)) prefix.push(t)
        else if (name.includes(q)) contains.push(t)
      })
      return prefix.concat(contains).slice(0, 20)
    },
    reviewDateQuickSelectOptions () {
      return REVIEW_DATE_QUICK_SELECT
    },
    reviewDateFilterContext () {
      return {
        mode: this.reviewDateMode,
        presetKey: this.reviewDatePresetKey,
        fromYmd: this.reviewDateFromYmd || '',
        toYmd: this.reviewDateToYmd || ''
      }
    },
    reviewDateFilterActive () {
      return isDateFilterActive(this.reviewDateFilterContext)
    },
    reviewDateSelectValue () {
      if (this.reviewDateMode === 'range') return 'custom'
      if (this.reviewDateMode === 'all') return 'all'
      return this.reviewDatePresetKey
    },
    followUpStatusSelectOptions () {
      return FOLLOW_UP_STATUS_FILTER_OPTIONS
    },
    packHighlightListFilterActive () {
      return this.showMeetingDashboardBar && packHighlightRestrictsTaskList(this.packHighlightMode)
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
    reviewerFilterOptions () {
      const base = [{ value: '', label: 'All nodes (full dashboard)' }]
      const dynamic = (this.assignmentReviewerOptions || []).map((u) => ({
        value: String(u.id),
        label: u.name
      }))
      return base.concat(dynamic)
    },
    assignedNavNodes () {
      const uid = this.selectedReviewerUserId
      if (!uid || !this.showMeetingDashboardBar) return []
      const want = Number(uid)
      const out = []
      const map = this.editorOverlay || {}
      const tasks = Array.isArray(this.activeTasks) ? this.activeTasks : []
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
    userRole () {
      let abc = this.getCookie('user_info')
      if (abc) {
        return JSON.parse(abc).role.toLowerCase()
      }
    },
    showMeetingDashboardBar () {
      return isMeetingDashboardUiEnabled()
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
    commentsModalNodeResolved () {
      const sid = this.commentsModalStableId
      if (!sid) return false
      const o = (this.editorOverlay || {})[sid]
      return !!(o && o.is_resolved === true)
    },
    statusClass() {
      return {
        draft: 'status-draft',
        under_review: 'status-review',
        final_review: 'status-final-review',
        approved: 'status-approved',
        completed: 'status-completed',
        unknown: 'status-unknown'
      }
    },
    displayTasks() {
      let tasks = this.activeTasks

      if (this.reviewDateFilterActive) {
        tasks = tasks.filter(task => taskMatchesReviewDateFilter(task, this.reviewDateFilterContext))
      }

      if (this.selectedTagsFilter && this.selectedTagsFilter.length > 0) {
        tasks = tasks.filter(task => {
          if (!task || !Array.isArray(task.tags) || task.tags.length === 0) return false
          const ids = task.tags.map(t => t.id)
          return ids.some(id => this.selectedTagsFilter.includes(id))
        })
      }

      if (this.packHighlightListFilterActive) {
        tasks = tasks.filter(task =>
          taskMatchesPackHighlightMode(task, this.editorOverlay, this.packHighlightMode)
        )
      }

      if (this.showMeetingDashboardBar && this.selectedReviewerUserId) {
        const want = Number(this.selectedReviewerUserId)
        if (Number.isFinite(want)) {
          const involvedTaskIds = new Set(this.assignedNavNodes.map(n => n.new_task_id))
          tasks = tasks.filter(t => t && involvedTaskIds.has(t.id))
        }
      }

      if (this.searchQuery.length > 0) {
        tasks = this.filteredTasks.filter(task => this.taskPassesFilterPanelWithSearch(task))
      }

      return tasks
    },

    activeFiltersCount() {
      let count = 0
      if (this.reviewDateFilterActive) count++
      if (this.selectedTagsFilter && this.selectedTagsFilter.length > 0) count++
      if (this.packHighlightListFilterActive) count++
      if (this.showMeetingDashboardBar && this.selectedReviewerUserId) count++
      return count
    },
    reviewDateQuickSelectOptionsWithCounts () {
      return this.reviewDateQuickSelectOptions.map(opt => ({
        ...opt,
        count: this.datePresetOptionCount(opt.value)
      }))
    },
    searchSuggestions() {
      if (!this.searchQuery || this.searchQuery.length < 2) return []
      
      const query = this.searchQuery.toLowerCase()
      const suggestions = []
      
      // Search in descriptions
      this.activeTasks.forEach(task => {
        if (task.description.toLowerCase().includes(query)) {
          suggestions.push({
            id: `desc-${task.id}`,
            text: task.description,
            type: 'Description',
            context: task.sector_division,
            taskId: task.id
          })
        }
      })
      
      // Search in sectors
      this.activeTasks.forEach(task => {
        if (task.sector_division.toLowerCase().includes(query)) {
          suggestions.push({
            id: `sector-${task.id}`,
            text: task.sector_division,
            type: 'Sector',
            context: task.description.substring(0, 50) + '...',
            taskId: task.id
          })
        }
      })
      
      // Search in action content (strip HTML for better matching)
      this.activeTasks.forEach(task => {
        const actionText = this.stripHtmlTags(task.action_to_be_taken)
        if (actionText.toLowerCase().includes(query)) {
          const matchedText = this.extractMatchedText(actionText, query)
          suggestions.push({
            id: `action-${task.id}`,
            text: matchedText,
            type: 'Action',
            context: task.description,
            taskId: task.id
          })
        }
      })
      
      // Remove duplicates and limit to 8 suggestions
      const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.taskId === suggestion.taskId && s.type === suggestion.type)
      )
      
      return uniqueSuggestions.slice(0, 8)
    },
    packHighlightNavFabVisible () {
      return (
        this.showMeetingDashboardBar &&
        packHighlightShowsHubColors(this.packHighlightMode) &&
        !this.pdfMode &&
        this.packHighlightNavTargets.length > 0
      )
    },
    packHighlightNavCount () {
      return this.packHighlightNavTargets.length
    }
    ,
    jumpFabVisible () {
      return (
        this.showMeetingDashboardBar &&
        this.userRole === 'editor' &&
        !this.pdfMode &&
        this.jumpFabState &&
        this.jumpFabState.visible === true
      )
    },
    jumpFabMode () {
      return (this.jumpFabState && this.jumpFabState.mode) || 'down'
    }
    ,
    packColorCounts () {
      const nodes = this.editorOverlay || {}
      let red = 0
      let green = 0
      let blue = 0
      Object.keys(nodes).forEach((sid) => {
        const o = nodes[sid]
        if (!o) return
        const assigned = Array.isArray(o.assignment_users) && o.assignment_users.length > 0
        const commented = (o.comment_count || 0) > 0
        if (assigned && commented) green++
        else if (assigned && !commented) red++
        else if (!assigned && commented) blue++
      })
      return { red, green, blue }
    }
  },

  watch: {
    pdfMode (v) {
      if (v && this.$el) stripPackHighlightNavFocusClass(this.$el)
    }
  },

  created () {
    console.log('Route Query:', this.$route.query)
    this.fetchTasksByDate()
  },

  mounted() {
    // Re-apply scaling on window resize
    window.addEventListener('resize', this.handleResize)
    
    // Add click outside handler to close menu
    document.addEventListener('click', this.handleClickOutside)
    document.addEventListener('keydown', this.onDocumentKeydownContextMenu)
    this._onPackHighlightNavKeydown = (e) => this.onPackHighlightNavDocumentKeydown(e)
    document.addEventListener('keydown', this._onPackHighlightNavKeydown)

    this._onScrollRepositionContextMenu = () => this.scheduleContextMenuReposition()
    window.addEventListener('scroll', this._onScrollRepositionContextMenu, true)
    if (this.$el) {
      this.$el.addEventListener('scroll', this._onScrollRepositionContextMenu, true)
    }
    
    if (this.$route.query.highlightTaskId) {
      const row = document.querySelector(`[data-task-id="${this.$route.query.highlightTaskId}"]`)
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
        row.classList.add('highlight-transition')
      }
    }

    this.scheduleFocusNodeFromRoute()

    // Position reviewer badges after mount and initial render
    this.$nextTick(() => {
      // Wait for DOM to be fully updated
      setTimeout(() => {
        this.displayTasks.forEach(task => {
          this.positionReviewerBadges(task.id);
        });
      }, 100);
    });

    // Add scroll event listener with debounce
    this.handleScroll = this.debounce(() => {
      this.displayTasks.forEach(task => {
        this.positionReviewerBadges(task.id);
      });

      this.updateJumpFabState()
    }, 100);
    
    window.addEventListener('scroll', this.handleScroll);
    // Initialize jump FAB state once on mount
    this.updateJumpFabState()
    
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
    document.removeEventListener('keydown', this.onDocumentKeydownContextMenu)
    if (this._onPackHighlightNavKeydown) {
      document.removeEventListener('keydown', this._onPackHighlightNavKeydown)
      this._onPackHighlightNavKeydown = null
    }
    if (this._onScrollRepositionContextMenu) {
      window.removeEventListener('scroll', this._onScrollRepositionContextMenu, true)
      if (this.$el) {
        this.$el.removeEventListener('scroll', this._onScrollRepositionContextMenu, true)
      }
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
    // Cleanup esc listener if modal was open
    if (this._onEscKey) {
      document.removeEventListener('keydown', this._onEscKey)
      this._onEscKey = null
    }
  },

  updated() {
    // Reposition badges when the component updates
    this.$nextTick(() => {
      this.displayTasks.forEach(task => {
        this.positionReviewerBadges(task.id);
      });
      if (this.showMeetingDashboardBar) {
        this.applyAgendaNodeHighlights()
      }
    });
  },

  methods: {
    updateJumpFabState () {
      if (!this.showMeetingDashboardBar || this.pdfMode || this.userRole !== 'editor') {
        this.jumpFabState = { visible: false, mode: 'down' }
        return
      }

      const y = window.scrollY || 0
      const viewportH = window.innerHeight || 0
      const docH = Math.max(
        document.body ? document.body.scrollHeight : 0,
        document.documentElement ? document.documentElement.scrollHeight : 0
      )

      const bottomBufferPx = 140
      const nearBottom = y + viewportH >= docH - bottomBufferPx
      const pastTopThreshold = y >= 320

      if (nearBottom) {
        this.jumpFabState = { visible: true, mode: 'up' }
        return
      }

      if (pastTopThreshold) {
        this.jumpFabState = { visible: true, mode: 'down' }
        return
      }

      this.jumpFabState = { visible: false, mode: 'down' }
    },

    onJumpFabClick () {
      if (this.jumpFabMode === 'up') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      const el = document.getElementById('meeting-bottom-actions')
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
      }
    },
    handleResize() {
      this.scheduleContextMenuReposition()
      // Debounce resize events
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout)
      }
      this.resizeTimeout = setTimeout(() => {
        this.applyAutoScaling()
        this.scheduleContextMenuReposition()
      }, 150)
    },

    toggleExpand (taskId) {
      this.$set(this.expandedRows, taskId, !this.expandedRows[taskId])
      console.log(this.expandedRows)
    },
    getCookie (name) {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) {
        let encodedValue = parts.pop().split(';').shift()
        return decodeURIComponent(encodedValue)
      }
    },

    toDateInputValue (raw) {
      if (raw == null || raw === '') return ''
      const s = String(raw).trim()
      // Plain date from API / <input type="date"> — no timezone shift.
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
      // ISO datetimes: use IST calendar day (avoid taking the UTC YYYY-MM-DD prefix).
      if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
        const d = new Date(s)
        if (isNaN(d.getTime())) return ''
        return calendarYmdInTimeZone(d, 'Asia/Kolkata')
      }
      const d = new Date(s)
      if (isNaN(d.getTime())) return ''
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },

    async fetchMeetingDatesCache () {
      if (!this.showMeetingDashboardBar) return
      try {
        const { data } = await this.$http.secured.get('/meeting_dashboard/meeting_dates')
        this.meetingDatesCache = data.meeting_dates || []
      } catch (e) {
        this.meetingDatesCache = []
      }
    },

    meetingDateActive (ymd) {
      if (!ymd) return false
      const want = this.toDateInputValue(ymd)
      return (this.meetingDatesCache || []).some((row) => this.toDateInputValue(row.meeting_date) === want)
    },

    async fetchDraftEditorOverlay () {
      if (!this.showMeetingDashboardBar || !this.latestPublishedVersionId) {
        this.editorOverlay = {}
        this.overlayUserDirectory = []
        this.scheduleApplyEditorOverlays()
        return
      }
      try {
        const { data } = await this.$http.secured.get('/meeting_dashboard/draft_editor_overlay', {
          params: { new_dashboard_version_id: this.latestPublishedVersionId }
        })
        this.editorOverlay = data.nodes || {}
        this.overlayUserDirectory = Array.isArray(data.overlay_user_directory)
          ? data.overlay_user_directory
          : []
      } catch (e) {
        this.editorOverlay = {}
        this.overlayUserDirectory = []
      }
      this.scheduleApplyEditorOverlays()
    },

    /** Coalesce overlay DOM passes when editorOverlay / tasks / toggles churn in the same tick. */
    scheduleApplyEditorOverlays () {
      if (!this.showMeetingDashboardBar) return
      if (this._scheduleEditorOverlayPending) return
      this._scheduleEditorOverlayPending = true
      this.$nextTick(() => {
        this._scheduleEditorOverlayPending = false
        this.applyEditorOverlays()
      })
    },

    applyEditorOverlays () {
      if (!this.showMeetingDashboardBar || !this.$el || !this.$el.querySelectorAll) return
      const root = this.$el
      root.querySelectorAll('.action-content-cell .action-node').forEach((el) => {
        el.classList.remove(
          'meeting-overlay-node',
          ...MEETING_HUB_HIGHLIGHT_CLASSES,
          'meeting-pack-resolved',
          'tentative-meeting-node-flex'
        )
        el.querySelectorAll('.tentative-node-actions').forEach((x) => x.remove())
        const b = el.querySelector('.meeting-comment-badge')
        if (b) b.remove()
        el.querySelectorAll('.meeting-pack-resolution-chip').forEach((x) => x.remove())
        el.querySelectorAll('.meeting-pack-marker-with-tick').forEach((slot) => {
          const parent = slot.parentNode
          if (!parent) return
          while (slot.firstChild) parent.insertBefore(slot.firstChild, slot)
          parent.removeChild(slot)
        })
      })
      const map = this.editorOverlay || {}
      const mode = this.packHighlightMode
      this.$nextTick(() => {
        root.querySelectorAll('.action-content-cell .action-node[data-stable-node-id]').forEach((el) => {
          const sid = el.getAttribute('data-stable-node-id')
          if (!sid) return

          // Inject node actions regardless of overlay data (for hover)
          el.classList.add('tentative-meeting-node-flex')
          const actions = document.createElement('div')
          actions.className = 'tentative-node-actions no-print'

          // Assign reviewer button
          const assignBtn = document.createElement('button')
          assignBtn.type = 'button'
          assignBtn.className = 'tentative-node-icon-btn tentative-node-assign-btn'
          assignBtn.setAttribute('aria-label', 'Assign reviewer to this node')
          assignBtn.title = 'Assign reviewer'
          assignBtn.textContent = '👤'
          assignBtn.addEventListener('click', (ev) => {
            ev.stopPropagation()
            ev.preventDefault()
            this.openAssignPackModal(sid)
          })
          actions.appendChild(assignBtn)

          // Expand button (handles comments + details)
          const expandBtn = document.createElement('button')
          expandBtn.type = 'button'
          expandBtn.className = 'tentative-node-icon-btn'
          expandBtn.setAttribute('aria-label', 'Expand node')
          expandBtn.title = 'Expand'
          expandBtn.innerHTML = '+'
          expandBtn.addEventListener('click', (ev) => {
            ev.stopPropagation()
            ev.preventDefault()
            this.openDashboardCommentsModal(sid)
          })
          actions.appendChild(expandBtn)

          el.appendChild(actions)

          const o = map[sid]
          if (!o) return
          const hasA = o.assignment_users && o.assignment_users.length
          const hasC = (o.comment_count || 0) > 0
          if (!hasA && !hasC) return
          el.classList.add('meeting-overlay-node')
          const globalHub = meetingHubHighlightClass(!!hasA, !!hasC)
          const reviewerSel = this.selectedReviewerUserId
          const hub =
            reviewerSel ? reviewerScopedHubClass(o, reviewerSel) : globalHub
          const applyTint = shouldApplyMeetingHubTint(mode, hub)
          if (applyTint) {
            el.classList.add(hub)
            if (o.is_resolved === true) el.classList.add('meeting-pack-resolved')
          }
          /* Resolved only: small tick beside .node-marker; no "!?" for unresolved. */
          if (o.is_resolved === true) {
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
      if (!root || !this.showMeetingDashboardBar) {
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

    async loadMeetingDraftSettings () {
      if (!this.showMeetingDashboardBar) return
      try {
        const { data } = await this.$http.secured.get('/meeting_dashboard/draft_settings')
        if (data && data.target_meeting_date) {
          const v = this.toDateInputValue(data.target_meeting_date)
          if (v) {
            this.targetMeetingDate = v
            this.persistedTargetMeetingDate = v
          }
        }
      } catch (e) {
        console.warn('Could not load meeting draft settings:', e)
      }
    },

    async onTargetMeetingDateChange () {
      const next = this.targetMeetingDate
      if (!next) return
      const prev = this.persistedTargetMeetingDate
      if (prev && prev !== next && this.meetingDateActive(prev)) {
        this.postponeFromDate = prev
        this.postponeToDate = next
        this.showPostponeModal = true
        return
      }
      await this.persistTargetMeetingDate()
      this.persistedTargetMeetingDate = next
      await this.fetchMeetingDatesCache()
    },

    async persistTargetMeetingDate () {
      if (!this.targetMeetingDate) return
      try {
        await this.$http.secured.patch('/meeting_dashboard/draft_settings', {
          target_meeting_date: this.targetMeetingDate
        })
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || 'Could not save target meeting date'
        this.$toast.error(msg)
      }
    },

    cancelPostponeModal () {
      this.showPostponeModal = false
      this.targetMeetingDate = this.persistedTargetMeetingDate
    },

    async confirmPostponeMeeting () {
      this.postponeSaving = true
      try {
        await this.$http.secured.post('/meeting_dashboard/reschedule', {
          from_meeting_date: this.postponeFromDate,
          to_meeting_date: this.postponeToDate
        })
        await this.persistTargetMeetingDate()
        this.persistedTargetMeetingDate = this.targetMeetingDate
        this.showPostponeModal = false
        await this.fetchMeetingDatesCache()
        this.$toast.success('Meeting date updated.')
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || 'Reschedule failed'
        this.$toast.error(msg)
      } finally {
        this.postponeSaving = false
      }
    },

    async publishMeetingDashboard () {
      if (this.userRole !== 'editor') return
      this.meetingPublishSaving = true
      try {
        const payload = {}
        if (this.targetMeetingDate) payload.target_meeting_date = this.targetMeetingDate
        await this.$http.secured.post('/meeting_dashboard/publish', payload)
        this.$toast.success('Published.')
        await this.fetchTasksByDate()
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || 'Publish failed'
        this.$toast.error(msg)
      } finally {
        this.meetingPublishSaving = false
      }
    },

    openResetConfirm () {
      if (this.userRole !== 'editor') return
      this.showResetConfirmModal = true
    },

    async confirmResetDraft () {
      this.meetingResetSaving = true
      try {
        await this.$http.secured.post('/meeting_dashboard/reset_draft')
        this.showResetConfirmModal = false
        this.$toast.success('Draft reset to last published pack.')
        await this.fetchTasksByDate()
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || 'Reset failed'
        this.$toast.error(msg)
      } finally {
        this.meetingResetSaving = false
      }
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



    async onDashboardCommentSubmitted () {
      if (this.showMeetingDashboardBar) {
        await this.fetchTasksByDate()
        return
      }
      this.fetchDraftEditorOverlay()
    },

    async onDashboardNodeResolutionChanged () {
      if (this.showMeetingDashboardBar) {
        await this.fetchTasksByDate()
        return
      }
      this.fetchDraftEditorOverlay()
    },

    truncatePlainText (str, maxChars) {
      const s = String(str || '').trim()
      if (!s) return ''
      if (s.length <= maxChars) return s
      return s.slice(0, maxChars) + '…'
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
      const lists = [this.activeTasks, this.completedTasks]
      for (const list of lists) {
        if (!Array.isArray(list)) continue
        for (const task of list) {
          const node = this.findNodeInTaskTreeByStableId(task, stableId)
          if (node) return this.buildCommentsModalNodeContext(task, stableId)
        }
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

    closeDashboardCommentsModal () {
      this.commentsModalVisible = false
      this.commentsModalNodeContext = null
    },

    /** Called when user clicks "Expand" after right-clicking on an action-node. */
    onNodeContextExpand () {
      const stableId = this.activeNodeStableId
      if (!stableId) return
      this.activeNodeStableId = null
      this.openDashboardCommentsModal(stableId)
    },

    async openAssignPackModal (stableNodeId) {
      if (!stableNodeId || !this.latestPublishedVersionId) return
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
      if (!this.latestPublishedVersionId || !this.assignPackStableId || !this.assignPackSelectedUserId) {
        this.$toast && this.$toast.error('Choose a reviewer.')
        return
      }
      this.assignPackSaving = true
      try {
        await this.$http.secured.post('/meeting_dashboard/assignments', {
          new_dashboard_version_id: this.latestPublishedVersionId,
          stable_node_id: this.assignPackStableId,
          user_id: Number(this.assignPackSelectedUserId)
        })
        this.$toast && this.$toast.success('Reviewer assigned.')
        this.closeAssignPackModal()
        await this.fetchDraftEditorOverlay()
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || 'Assignment failed'
        this.$toast && this.$toast.error(msg)
      } finally {
        this.assignPackSaving = false
      }
    },

    async removeAssignPack (assignmentId) {
      if (!assignmentId) return
      this.assignPackSaving = true
      try {
        await this.$http.secured.delete(`/meeting_dashboard/assignments/${assignmentId}`)
        this.$toast && this.$toast.success('Assignment removed.')
        await this.fetchDraftEditorOverlay()
        // If we are currently showing tags for the same node, we might want to refresh.
        // Here fetchDraftEditorOverlay covers it.
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || 'Failed to remove assignment'
        this.$toast && this.$toast.error(msg)
      } finally {
        this.assignPackSaving = false
      }
    },

    async fetchTasksByDate() {
      try {
        // Sort tasks by review_date (earliest first)
        const sortTasksByReviewDate = (tasks) => {
          return tasks.sort((a, b) => {
            const dateA = new Date(a.review_date)
            const dateB = new Date(b.review_date)
            return dateA - dateB
          })
        }

        if (isMeetingDashboardUiEnabled()) {
          const response = await this.$http.secured.get('/meeting_dashboard/draft')
          let active = response.data.active || []
          let completed = response.data.completed || []
          if (this.selectedTagsFilter && this.selectedTagsFilter.length) {
            const tagSet = new Set(this.selectedTagsFilter)
            const passes = (task) => {
              const tags = task.tags || []
              return tags.some(t => tagSet.has(t.id))
            }
            active = active.filter(passes)
            completed = completed.filter(passes)
          }
          this.activeTasks = sortTasksByReviewDate([...active])
          this.completedTasks = sortTasksByReviewDate([...completed])
          if (isWebpackDevelopment()) {
            this.activeTasks.forEach((t) => {
              if (t && t.pack_node_stats == null) {
                console.warn('[NewTentativeDashboard] Task missing pack_node_stats (meeting draft):', t.id)
              }
            })
          }
          if (response.data.draft_settings && response.data.draft_settings.target_meeting_date) {
            const synced = this.toDateInputValue(response.data.draft_settings.target_meeting_date)
            if (synced) {
              this.targetMeetingDate = synced
              this.persistedTargetMeetingDate = synced
            }
          }
          const lp = response.data.latest_published
          this.latestPublishedVersionId = lp && lp.id != null ? lp.id : null
          await this.fetchMeetingDatesCache()
          await this.fetchDraftEditorOverlay()
        } else {
          const params = {
            date: this.selectedDate.toISOString().split('T')[0]
          }
          if (this.selectedTagsFilter && this.selectedTagsFilter.length) {
            params['tags[]'] = this.selectedTagsFilter.slice()
          }
          const response = await this.$http.secured.get('/tasks', { params })
          this.activeTasks = sortTasksByReviewDate(response.data.active)
          this.completedTasks = sortTasksByReviewDate(response.data.completed)
        }
        
        // Build search index for fast searching
        this.buildSearchIndex()
        
        // Debug: Check for tasks without status
        this.activeTasks.forEach((task, index) => {
          if (!task || !task.status) {
            console.warn(`Task at index ${index} has no status:`, task);
          }
        });
        
        // Apply auto-scaling after tasks are loaded
        this.$nextTick(() => {
          this.applyAutoScaling()
          if (this.showMeetingDashboardBar) {
            this.applyAgendaNodeHighlights()
            this.scheduleApplyEditorOverlays()
          }
          this.scheduleFocusNodeFromRoute()
        })
      } catch (error) {
        console.error('Error fetching tasks:', error)
      }
    },

    applyAutoScaling() {
      // ⚠️ TEMPORARILY DISABLED - Testing if auto-scaling interferes with hierarchical display
      console.log('Auto-scaling temporarily disabled for testing')
      
      // Wait for DOM to be fully rendered (unreachable code commented out)
      /*
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
      */
    },

    debugContent(task) {
      console.log('🔍 Debug Content for Task:', task.id)
      console.log('Raw HTML:', task.action_to_be_taken)
      
      // Parse the HTML to analyze structure
      if (task.action_to_be_taken) {
        const parser = new DOMParser()
        const doc = parser.parseFromString(task.action_to_be_taken, 'text/html')
        const actionNodes = doc.querySelectorAll('.action-node')
        
        console.log(`Found ${actionNodes.length} action nodes:`)
        actionNodes.forEach((node, index) => {
          const markerEl = node.querySelector('.node-marker')
          const contentEl = node.querySelector('.node-content')
          const marker = markerEl ? markerEl.textContent : 'No marker'
          const content = contentEl ? contentEl.textContent : 'No content'
          const classes = node.className
          console.log(`  ${index + 1}. Marker: "${marker}", Content: "${content}", Classes: "${classes}"`)
        })
      }
    },

    /* ---- Inline Node Editor ---- */
    onActionCellDblClick (event, task) {
      if (this.pdfMode || this.inlineEditNode) return
      if (!task.meeting_dashboard_draft) return
      const actionNodeEl = event.target.closest('.action-node')
      if (!actionNodeEl) return
      const stableId = actionNodeEl.getAttribute('data-stable-node-id')
      if (!stableId) return
      const node = this.findNodeInTaskTreeByStableId(task, stableId)
      if (!node || !node.id || node.id <= 0) return
      this.inlineEditTask = task
      this.inlineEditNode = node
      this.inlineEditAnchorRect = actionNodeEl.getBoundingClientRect()
    },

    async onInlineEditorSaved () {
      const scrollY = window.scrollY
      this.closeInlineEditor()
      await this.fetchTasksByDate()
      this.$nextTick(() => { window.scrollTo(0, scrollY) })
      this.$toast.success('Node updated')
    },

    onInlineEditorSaveError (msg) {
      const text = Array.isArray(msg) ? msg.join(', ') : String(msg)
      this.$toast.error(text)
    },

    closeInlineEditor () {
      this.inlineEditTask = null
      this.inlineEditNode = null
      this.inlineEditAnchorRect = null
    },

    openAddTaskModal () {
      this.currentTask = null
      this.taskModalMode = 'add'
      this.showTaskModal = true
    },
    getMarker(number, style) {
      if (style === 'lower-alpha') return String.fromCharCode(96 + number);
      if (style === 'lower-roman') return this.toRoman(number);
      return number;
    },

    toRoman(num) {
      const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
      return roman[num - 1] || num;
    },
    
    // ========================================
    // FILTER SYSTEM METHODS
    // ========================================
    
    toggleFilterDropdown() {
      this.showFilterDropdown = !this.showFilterDropdown
      if (this.showFilterDropdown) {
        this.$nextTick(() => {
          document.addEventListener('click', this.handleFilterClickOutside)
        })
        this.loadTagsForFilter()
        this.filterTagQuery = ''
        this.showFilterTagDropdown = false
      } else {
        document.removeEventListener('click', this.handleFilterClickOutside)
      }
    },

    closeFilterDropdownAfterSelection () {
      if (!this.showFilterDropdown) return
      this.showFilterDropdown = false
      document.removeEventListener('click', this.handleFilterClickOutside)
    },
    
    handleFilterClickOutside(event) {
      if (this.$refs.filterContainer && !this.$refs.filterContainer.contains(event.target)) {
        this.showFilterDropdown = false
        document.removeEventListener('click', this.handleFilterClickOutside)
      }
    },

    // Open/close tag suggestions within filter
    openFilterTagDropdown () {
      this.showFilterTagDropdown = true
      // Decide whether to flip above based on viewport space
      this.$nextTick(() => {
        const inputEl = this.$el.querySelector('.tag-search-input')
        if (inputEl) {
          const rect = inputEl.getBoundingClientRect()
          const viewportHeight = window.innerHeight
          const estimatedDropdownHeight = 200
          this.filterTagDropdownFlip = (rect.bottom + estimatedDropdownHeight > viewportHeight - 10)
        }
      })
      // Close when clicking outside of the tag area
      if (!this._onFilterTagOutside) {
        this._onFilterTagOutside = (e) => {
          const root = this.$refs.tagFilterField
          if (root && !root.contains(e.target)) {
            this.showFilterTagDropdown = false
            document.removeEventListener('click', this._onFilterTagOutside)
            this._onFilterTagOutside = null
          }
        }
      }
      document.addEventListener('click', this._onFilterTagOutside)
    },
    onFilterTagBlur (e) {
      // Defer closing to allow click selection inside dropdown
      requestAnimationFrame(() => {
        const root = this.$refs.tagFilterField
        if (root && !root.contains(document.activeElement)) {
          this.closeFilterTagDropdown()
        }
      })
    },
    closeFilterTagDropdown () {
      this.showFilterTagDropdown = false
      if (this._onFilterTagOutside) {
        document.removeEventListener('click', this._onFilterTagOutside)
        this._onFilterTagOutside = null
      }
    },
    
    applyFilters() {
      console.log('Filters applied:', {
        reviewDate: this.reviewDateFilterContext,
        tags: this.selectedTagsFilter
      })
    },

    clearAllFilters() {
      this.reviewDateMode = 'all'
      this.reviewDatePresetKey = 'today'
      this.reviewDateFromYmd = ''
      this.reviewDateToYmd = ''
      this.calendarRangeValue = null
      this.selectedTagsFilter = []
      if (this.showMeetingDashboardBar) {
        this.selectedReviewerUserId = ''
        this.assignedNavIndex = 0
      }
    },

    clearDateFilter() {
      this.reviewDateMode = 'all'
      this.reviewDatePresetKey = 'today'
      this.reviewDateFromYmd = ''
      this.reviewDateToYmd = ''
      this.calendarRangeValue = null
    },

    onPackHighlightModeChange () {
      this.packHighlightNavIndex = 0
      this._packHighlightNavForceScroll = true
      this.applyFilters()
      this.scheduleApplyEditorOverlays()
    },

    onTentativePackHighlightSelect (val) {
      this.packHighlightMode = val
      this.onPackHighlightModeChange()
      this.closeFilterDropdownAfterSelection()
    },

    onTentativeReviewerSelect (val) {
      this.selectedReviewerUserId = val
      this.onReviewerFilterChange()
      this.closeFilterDropdownAfterSelection()
    },

    onReviewerFilterChange () {
      this.assignedNavIndex = 0
      if (this.showMeetingDashboardBar) {
        this.scheduleApplyEditorOverlays()
      }
      if (this.selectedReviewerUserId && this.assignedNavNodes.length) {
        this.$nextTick(() => this.assignedNavScrollToCurrent())
      }
    },

    getReviewerFilterLabel () {
      const row = this.reviewerFilterOptions.find(
        (o) => String(o.value) === String(this.selectedReviewerUserId)
      )
      return (row && row.label) || 'Reviewer'
    },

    clearReviewerFilter () {
      this.selectedReviewerUserId = ''
      this.assignedNavIndex = 0
      this.scheduleApplyEditorOverlays()
    },

    assignedNavScrollToCurrent () {
      const item = this.assignedNavNodes[this.assignedNavIndex]
      if (!item) return
      this.scrollToStableNode(item.new_task_id, item.stable_node_id)
    },

    getPackHighlightFilterLabel () {
      const row = FOLLOW_UP_STATUS_FILTER_OPTIONS.find(o => o.value === this.packHighlightMode)
      return (row && row.label) || this.packHighlightMode
    },

    clearPackHighlightListFilter () {
      this.packHighlightMode = 'all'
      this.onPackHighlightModeChange()
    },

    datePresetOptionCount (value) {
      if (value === 'all' || value === 'custom') return this.activeTasks.length
      return countTasksMatchingDateFilter(this.activeTasks, {
        mode: 'preset',
        presetKey: value,
        fromYmd: '',
        toYmd: ''
      })
    },

    onReviewDatePresetChangeWrapper (val) {
      this.onReviewDatePresetChange({ target: { value: val } })
    },

    onReviewDatePresetChange (e) {
      const v = e.target.value
      if (v === 'custom') {
        this.reviewDateMode = 'range'
        this.reviewDateFromYmd = ''
        this.reviewDateToYmd = ''
        this.calendarRangeValue = null
        this.applyFilters()
        this.closeFilterDropdownAfterSelection()
        return
      }
      if (v === 'all') {
        this.reviewDateMode = 'all'
        this.reviewDateFromYmd = ''
        this.reviewDateToYmd = ''
        this.calendarRangeValue = null
        this.applyFilters()
        this.closeFilterDropdownAfterSelection()
        return
      }
      this.reviewDateMode = 'preset'
      this.reviewDatePresetKey = v
      const { fromYmd, toYmd } = presetKeyToYmdRange(v)
      this.reviewDateFromYmd = fromYmd
      this.reviewDateToYmd = toYmd
      this.calendarRangeValue = ymdPairToDateRange(fromYmd, toYmd)
      this.applyFilters()
      this.closeFilterDropdownAfterSelection()
    },

    onReviewCalendarInput (val) {
      if (val && val.start && val.end) {
        this.reviewDateMode = 'range'
        this.reviewDateFromYmd = ymdFromDate(val.start)
        this.reviewDateToYmd = ymdFromDate(val.end)
        this.calendarRangeValue = val
      } else {
        this.calendarRangeValue = val
        if (!val) {
          this.reviewDateMode = 'all'
          this.reviewDateFromYmd = ''
          this.reviewDateToYmd = ''
        }
      }
      this.applyFilters()
      this.closeFilterDropdownAfterSelection()
    },

    onReviewBoundChange () {
      this.reviewDateMode = 'range'
      if (this.reviewDateFromYmd && this.reviewDateToYmd) {
        this.calendarRangeValue = ymdPairToDateRange(this.reviewDateFromYmd, this.reviewDateToYmd)
      } else {
        this.calendarRangeValue = null
      }
      this.applyFilters()
    },

    getReviewDateFilterLabel () {
      if (this.reviewDateMode === 'preset') {
        const row = REVIEW_DATE_QUICK_SELECT.find(o => o.value === this.reviewDatePresetKey)
        return (row && row.label) || this.reviewDatePresetKey
      }
      const f = this.reviewDateFromYmd
      const t = this.reviewDateToYmd
      const ds = (ymd) => {
        if (!ymd) return ''
        const d = new Date(`${ymd}T12:00:00`)
        return !Number.isNaN(d.getTime())
          ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
          : ymd
      }
      if (f && t) {
        if (f === t) return ds(f)
        return `${ds(f)} – ${ds(t)}`
      }
      if (f) return `On or after ${ds(f)}`
      if (t) return `On or before ${ds(t)}`
      return 'Custom range'
    },

    taskPassesFilterPanelWithSearch (task) {
      if (this.reviewDateFilterActive && !taskMatchesReviewDateFilter(task, this.reviewDateFilterContext)) {
        return false
      }
      if (this.selectedTagsFilter && this.selectedTagsFilter.length > 0) {
        if (!task || !Array.isArray(task.tags) || task.tags.length === 0) return false
        const ids = task.tags.map(t => t.id)
        if (!ids.some(id => this.selectedTagsFilter.includes(id))) return false
      }
      if (this.packHighlightListFilterActive && !taskMatchesPackHighlightMode(task, this.editorOverlay, this.packHighlightMode)) {
        return false
      }
      return true
    },

    // Load all tags for the filter chips
    async loadTagsForFilter () {
      // Build tag list from currently loaded tasks so only in-use tags appear
      try {
        this.isLoadingTags = true
        const idToName = new Map()
        const source = Array.isArray(this.activeTasks) ? this.activeTasks : []
        source.forEach(task => {
          if (task && Array.isArray(task.tags)) {
            task.tags.forEach(t => {
              if (t && typeof t.id === 'number' && t.name) {
                idToName.set(t.id, t.name)
              }
            })
          }
        })
        // Convert to sorted array by name
        this.allTagsForFilter = Array.from(idToName, ([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      } finally {
        this.isLoadingTags = false
      }
    },

    // Select a tag from suggestions
    selectFilterTag (tag) {
      if (!tag || typeof tag.id !== 'number') return
      if (!this.selectedTagsFilter.includes(tag.id)) {
        this.selectedTagsFilter = [...this.selectedTagsFilter, tag.id]
        this.applyFilters()
        this.closeFilterDropdownAfterSelection()
      }
    },

    // Toggle a tag id in the selection
    toggleTagFilter (tagId) {
      const id = Number(tagId)
      if (this.selectedTagsFilter.includes(id)) {
        this.selectedTagsFilter = this.selectedTagsFilter.filter(tid => tid !== id)
      } else {
        this.selectedTagsFilter = [...this.selectedTagsFilter, id]
      }
      this.applyFilters()
    },

    // Remove a single tag from Active Filters summary
    clearOneTagFilter (tagId) {
      this.selectedTagsFilter = this.selectedTagsFilter.filter(tid => tid !== tagId)
      this.applyFilters()
    },
    
    async downloadPDF () {
      try {
        await exportMeetingDashboardPdf({
          fileName: 'dashboard.pdf',
          // Tentative export removes Status; use 7-col ratios aligned with current UI.
          columnWidths: [2, 7, 7, 71, 4, 5, 4],
          prepareRowClone: (rowClone) => this.prepareTentativePdfRowClone(rowClone),
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
    editTask (task) {
      if (!task) return;
      this.currentTask = { ...task }
      this.taskModalMode = 'edit'
      this.showTaskModal = true
    },
    async handleTaskSaved () {
      // Close modal
      this.closeTaskModal()
      // Refresh task list
      await this.fetchTasksByDate()
      // Optional: Show success message
      this.$toast.success('Task saved successfully')
    },

    async deleteTask (task) {
      const taskId = task && task.id
      if (!taskId) return
      if (confirm('Are you sure you want to delete this task?')) {
        try {
          if (task.meeting_dashboard_draft) {
            await this.$http.secured.delete(`/meeting_dashboard/tasks/${taskId}`)
          } else {
            await this.$http.secured.delete(`/task/${taskId}`)
          }
          this.$toast.success('Task deleted successfully!')
          await this.fetchTasksByDate()
        } catch (error) {
          console.error('Error deleting task:', error)
          this.$toast.error('Failed to delete task.')
        }
      }
    },

    openReviewModal (task) {
      if (!task) return
      if (task.meeting_dashboard_draft) {
        this.$toast.info('Send for review is not available for meeting-draft tasks yet.')
        return
      }
      this.currentTask = task
      this.showReviewModal = true
    },

    async sendForReview (reviewerId) {
      if (this.currentTask && this.currentTask.meeting_dashboard_draft) {
        this.$toast.info('Send for review is not available for meeting-draft tasks yet. Use the legacy Tentative dashboard or publish flow when wired.')
        return
      }
      try {
        const response = await this.$http.secured.post(`/task/${this.currentTask.id}/send_for_review`, {
          reviewer_id: reviewerId
        })
        
        if (response.data.success) {
          this.$toast.success(response.data.message)
          this.closeReviewModal()
          await this.fetchTasksByDate()
          
          // Navigate to the first review page (for now, we'll enhance this later)
          if (response.data.review_ids && response.data.review_ids.length > 0) {
            this.$router.push(`/review/${response.data.review_ids[0]}`)
          } else {
            // Fallback: navigate to task list
            this.$toast.info('Task sent for review successfully')
          }
        }
      } catch (error) {
        console.error('Error sending for review:', error)
        if (error.response && error.response.data && error.response.data.error) {
          this.$toast.error(error.response.data.error)
        } else {
          this.$toast.error('Failed to send task for review')
        }
      }
    },

    openCommentsModal (task) {
      if (!task) return
      if (task.meeting_dashboard_draft) {
        this.$toast.info('Legacy review comments are not attached to meeting-draft tasks yet.')
        return
      }
      this.currentTask = task
      this.showCommentsModal = true
    },

    async approveTask (task) {
      if (!task) return
      if (task.meeting_dashboard_draft) {
        this.$toast.info('Approve via legacy review is not available for meeting-draft tasks yet.')
        return
      }
      try {
        // Find the active review for this task
        const reviewsResponse = await this.$http.secured.get('/reviews')
        const activeReview = reviewsResponse.data.find(review => 
          review.task.id === task.id && review.status === 'pending'
        )
        
        if (activeReview) {
          const response = await this.$http.secured.post(`/review/${activeReview.id}/approve`)
          if (response.data.success) {
            this.$toast.success(response.data.message)
            await this.fetchTasksByDate()
          }
        } else {
          // Fallback to old approve method if no review found
        await this.$http.secured.post(`/task/${task.id}/approve`)
        await this.fetchTasksByDate()
        }
      } catch (error) {
        console.error('Error approving task:', error)
        if (error.response && error.response.data && error.response.data.error) {
          this.$toast.error(error.response.data.error)
        } else {
          this.$toast.error('Failed to approve task')
        }
      }
    },

    closeTaskModal () {
      this.showTaskModal = false
      this.currentTask = null
    },

    closeReviewModal () {
      this.showReviewModal = false
    },

    closeCommentsModal () {
      this.showCommentsModal = false
    },

    canDelete (task) {
      return task && this.userRole === 'editor' && task.status === 'draft'
    },

    canSendForReview (task) {
      // Allow editors to send for review when task is 'draft' OR when it's 'under_review' (for re-review)
      // Allow reviewers to send for review when task is 'draft' only
      if (!task) return false;
      
      if (this.userRole === 'editor') {
        return task.status === 'draft' || task.status === 'under_review'
      } else if (this.userRole === 'reviewer') {
        return task.status === 'draft'
      }
      
      return false
    },

    getReviewButtonText (task) {
      if (!task) return 'Send for Review';
      
      if (task.status === 'under_review') {
        return 'Send for Re-review';
      } else {
        return 'Send for Review';
      }
    },

    canApprove (task) {
      return task && (
        (this.userRole === 'reviewer' && task.status === 'under_review') ||
        (this.userRole === 'final_reviewer' && task.status === 'final_review')
      )
    },

    formatDate (date) {
      if (!date) return '-'
      return new Date(date).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    },
    formatStatus(status) {
      if (!status) return 'Unknown';
      const statusMap = {
        draft: 'Editor',
        under_review: 'Reviewer',
        final_review: 'Review',
        approved: 'Approved',
        completed: 'Completed'
      };
      return statusMap[status] || status;
    },

    /**
     * Meeting draft: normalized pack_node_stats from GET /meeting_dashboard/draft, or null if absent.
     */
    normalizePackNodeStats (task) {
      if (!task || task.pack_node_stats == null || typeof task.pack_node_stats !== 'object') return null
      const s = task.pack_node_stats
      return {
        unresolved_count: Number(s.unresolved_count) || 0,
        resolved_count: Number(s.resolved_count) || 0,
        assigned_without_comment_count: Number(s.assigned_without_comment_count) || 0,
        no_action_nodes: s.has_action_nodes === false
      }
    },

    meetingPackStatusShowSecondLine (task) {
      const stats = this.normalizePackNodeStats(task)
      return !!(stats && !stats.no_action_nodes)
    },

    meetingPackStatusIsFullyClear (stats) {
      if (!stats || stats.no_action_nodes) return false
      return stats.unresolved_count === 0 && stats.assigned_without_comment_count === 0
    },

    meetingPackStatusTdReady (task) {
      return this.meetingPackStatusIsFullyClear(this.normalizePackNodeStats(task))
    },

    meetingPackStatusTdPending (task) {
      const stats = this.normalizePackNodeStats(task)
      if (!stats || stats.no_action_nodes) return false
      return !this.meetingPackStatusIsFullyClear(stats)
    },

    meetingPackStatusSecondLineText (task) {
      const stats = this.normalizePackNodeStats(task)
      if (!this.meetingPackStatusShowSecondLine(task)) return ''
      return this.meetingPackStatusIsFullyClear(stats) ? 'Ready to be published' : 'Pending Action'
    },

    openMeetingPackExplainer(task) {
      if (!this.showMeetingDashboardBar || !this.latestPublishedVersionId) return
      const stats = this.normalizePackNodeStats(task)
      if (!stats) return

      this.explainerTaskId = task.id
      this.explainerTaskSector = task.sector_division || ''
      this.explainerTaskDescription = task.description || ''
      this.explainerInitialStats = stats
      this.explainerOpen = true
    },

    closeMeetingPackExplainer() {
      this.explainerOpen = false
      this.explainerTaskId = null
    },

    /** PDF export: strip Status (and Actions if still present) so clone matches 7-column jsPDF layout. */
    prepareTentativePdfRowClone (rowClone) {
      rowClone.querySelectorAll('.action-node.pack-highlight-nav-focus').forEach((el) => {
        el.classList.remove('pack-highlight-nav-focus')
      })
      const tableInRow = rowClone.querySelector('table')
      const mainRow = tableInRow && tableInRow.rows[0]
      if (!mainRow) return
      const n = mainRow.children.length
      if (n >= 9) {
        mainRow.removeChild(mainRow.children[8])
        mainRow.removeChild(mainRow.children[7])
      } else if (n === 8) {
        mainRow.removeChild(mainRow.children[7])
      }
    },

    clampContextMenuPosition (left, top) {
      const w = 180
      const h = 240
      const vw = window.innerWidth
      const vh = window.innerHeight
      const clampedLeft = Math.max(10, Math.min(left, vw - w - 10))
      const clampedTop = Math.max(10, Math.min(top, vh - h - 10))
      return { left: clampedLeft, top: clampedTop }
    },

    applyMenuPositionFromClientPoint (clientX, clientY, rowEl) {
      if (!rowEl || typeof clientX !== 'number' || typeof clientY !== 'number') return
      const rr = rowEl.getBoundingClientRect()
      this.menuAnchor = {
        taskId: rowEl.getAttribute('data-task-id'),
        offsetX: clientX - rr.left,
        offsetY: clientY - rr.top
      }
      this.syncContextMenuPositionFromAnchor()
    },

    syncContextMenuPositionFromAnchor () {
      if (!this.menuAnchor || !this.activeMenuId) return
      const tid = this.menuAnchor.taskId
      const rowEl = this.$el && this.$el.querySelector
        ? this.$el.querySelector(`.table-row[data-task-id="${tid}"]`)
        : null
      if (!rowEl) {
        this.forceHideMenu()
        return
      }
      const rr = rowEl.getBoundingClientRect()
      const left = rr.left + this.menuAnchor.offsetX
      const top = rr.top + this.menuAnchor.offsetY
      const { left: L, top: T } = this.clampContextMenuPosition(left, top)
      this.menuPosition = {
        position: 'fixed',
        top: `${T}px`,
        left: `${L}px`,
        zIndex: '99999'
      }
    },

    scheduleContextMenuReposition () {
      if (!this.activeMenuId) return
      if (this.contextMenuRafId != null) return
      this.contextMenuRafId = window.requestAnimationFrame(() => {
        this.contextMenuRafId = null
        this.syncContextMenuPositionFromAnchor()
      })
    },

    openTaskContextMenu (task, event) {
      if (!task || !event) return
      // Detect whether the right-click landed on an action-node inside action-content-cell.
      // If so, show "Expand" and "Assign reviewer" entries at the top of the task menu.
      const targetNode = event.target && event.target.closest && event.target.closest('.action-node')
      this.activeNodeStableId = (targetNode && targetNode.closest('.action-content-cell'))
        ? (targetNode.getAttribute('data-stable-node-id') || null)
        : null
      if (this.menuHideTimeout) {
        clearTimeout(this.menuHideTimeout)
        this.menuHideTimeout = null
      }
      this.showTagsForTaskId = null
      const rowEl = event.currentTarget && event.currentTarget.classList.contains('table-row')
        ? event.currentTarget
        : (this.$el && this.$el.querySelector(`.table-row[data-task-id="${task.id}"]`))
      this.activeMenuId = task.id
      this.applyMenuPositionFromClientPoint(event.clientX, event.clientY, rowEl)
    },

    /** Mobile / no right-click: open same menu anchored to the ⋮ control. */
    openRowMenuFromControl (task, event) {
      if (!task || !event || !event.currentTarget) return
      if (this.menuHideTimeout) {
        clearTimeout(this.menuHideTimeout)
        this.menuHideTimeout = null
      }
      this.showTagsForTaskId = null
      const rowEl = this.$el && this.$el.querySelector(`.table-row[data-task-id="${task.id}"]`)
      if (!rowEl) return
      const br = event.currentTarget.getBoundingClientRect()
      const rr = rowEl.getBoundingClientRect()
      const clientX = Math.min(br.right - 4, rr.right - 8)
      const clientY = Math.min(br.bottom + 2, rr.bottom - 8)
      this.activeMenuId = task.id
      this.applyMenuPositionFromClientPoint(clientX, clientY, rowEl)
    },

    forceHideMenu () {
      if (this.menuHideTimeout) {
        clearTimeout(this.menuHideTimeout)
        this.menuHideTimeout = null
      }
      if (this.contextMenuRafId != null) {
        window.cancelAnimationFrame(this.contextMenuRafId)
        this.contextMenuRafId = null
      }
      this.activeMenuId = null
      this.menuAnchor = null
      this.showTagsForTaskId = null
      this.activeNodeStableId = null
    },

    handleClickOutside (event) {
      if (!this.activeMenuId) return
      const menu = document.querySelector('.global-action-menu.show')
      if (menu && !menu.contains(event.target)) {
        this.forceHideMenu()
      }
    },

    onDocumentKeydownContextMenu (e) {
      if (e.key !== 'Escape') return
      if (this.showTagsModal) return
      if (this.activeMenuId) {
        e.preventDefault()
        this.forceHideMenu()
      }
    },

    getCurrentTask() {
      if (!this.activeMenuId || !this.activeTasks || !Array.isArray(this.activeTasks)) {
        return null
      }
      const menuId = this.activeMenuId
      return this.activeTasks.find(task => task && String(task.id) === String(menuId)) || null
    },

    // Open a tags popover from the action menu
    openTagsPopover(task, event) {
      if (!task) return
      // Position the popover directly under the clicked Tags button
      if (event && event.target) {
        const rect = event.target.getBoundingClientRect()
        const belowTop = rect.bottom + 6
        const aboveTopCandidate = rect.top - 6
        const left = rect.left
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const popoverWidth = 240
        const popoverHeight = 180 // estimated max height

        // Choose below by default, but flip above if not enough space
        let top = belowTop
        if (belowTop + popoverHeight > viewportHeight - 10) {
          top = Math.max(10, aboveTopCandidate - popoverHeight)
        }

        this.tagsPopoverPosition = {
          position: 'fixed',
          top: `${top}px`,
          left: `${Math.max(10, Math.min(left, viewportWidth - popoverWidth - 10))}px`,
          zIndex: '100000'
        }
      } else {
        this.tagsPopoverPosition = this.menuPosition
      }
      this.showTagsForTaskId = task.id
    },
    getTagsPopoverPosition() {
      return this.tagsPopoverPosition || {}
    },

    // Modal open/close handlers
    openTagsModal(task) {
      if (!task) return
      this.tagsModalTask = task
      this.showTagsModal = true
      // ensure kebab closes
      this.forceHideMenu()
      // lock scroll
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      // esc to close
      if (!this._onEscKey) {
        this._onEscKey = (e) => { if (e.key === 'Escape') this.closeTagsModal() }
      }
      document.addEventListener('keydown', this._onEscKey)
    },
    closeTagsModal() {
      this.showTagsModal = false
      this.tagsModalTask = null
      // unlock scroll
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      if (this._onEscKey) {
        document.removeEventListener('keydown', this._onEscKey)
        this._onEscKey = null
      }
    },

    getHighlightClass(reviewDate) {
      const today = new Date();
      const review = reviewDate ? new Date(reviewDate) : null;
      const isToday = review && review.getFullYear() === today.getFullYear() && review.getMonth() === today.getMonth() && review.getDate() === today.getDate();
      return ['yellow-bg-bold', isToday ? 'red-text' : 'black-text'];
    },

    handleSearchInput() {
      // Clear previous debounce timeout
      if (this.searchDebounceTimeout) {
        clearTimeout(this.searchDebounceTimeout)
      }
      
      // Debounce search for better performance
      this.searchDebounceTimeout = setTimeout(() => {
        this.performSearch()
      }, 150)
    },

    performSearch() {
      if (!this.searchQuery || this.searchQuery.trim().length === 0) {
        this.filteredTasks = []
        this.searchStats = null
        return
      }

      const query = this.searchQuery.toLowerCase().trim()
      const queryWords = query.split(/\s+/).filter(word => word.length > 0)
      
      // Use search index if available for faster performance
      if (this.searchIndex) {
        this.filteredTasks = this.searchUsingIndex(queryWords)
      } else {
        this.filteredTasks = this.searchUsingBruteForce(queryWords)
      }
      
      // Calculate search statistics
      this.calculateSearchStats(queryWords)
    },

    searchUsingIndex(queryWords) {
      // Fast search using pre-built index
      const matchedTaskIds = new Set()
      
      queryWords.forEach(word => {
        if (this.searchIndex[word]) {
          this.searchIndex[word].forEach(taskId => {
            matchedTaskIds.add(taskId)
          })
        }
      })
      
      return this.activeTasks.filter(task => matchedTaskIds.has(task.id))
    },

    searchUsingBruteForce(queryWords) {
      return this.activeTasks.filter(task => {
        // Check if all query words are found in any of the searchable fields
        return queryWords.every(word => {
          const descriptionMatch = task.description.toLowerCase().includes(word)
          const sectorMatch = task.sector_division.toLowerCase().includes(word)
          const actionMatch = this.stripHtmlTags(task.action_to_be_taken).toLowerCase().includes(word)
          
          return descriptionMatch || sectorMatch || actionMatch
        })
      })
    },

    calculateSearchStats(queryWords) {
      if (!this.filteredTasks.length) {
        this.searchStats = null
        return
      }

      let descriptionMatches = 0
      let sectorMatches = 0
      let actionMatches = 0

      this.filteredTasks.forEach(task => {
        const description = task.description.toLowerCase()
        const sector = task.sector_division.toLowerCase()
        const action = this.stripHtmlTags(task.action_to_be_taken).toLowerCase()

        queryWords.forEach(word => {
          if (description.includes(word)) descriptionMatches++
          if (sector.includes(word)) sectorMatches++
          if (action.includes(word)) actionMatches++
        })
      })

      this.searchStats = {
        descriptionMatches,
        sectorMatches,
        actionMatches
      }
    },

    buildSearchIndex() {
      // Build a fast search index for better performance
      this.searchIndex = {}
      
      this.activeTasks.forEach(task => {
        const words = this.extractSearchableWords(task)
        words.forEach(word => {
          if (!this.searchIndex[word]) {
            this.searchIndex[word] = new Set()
          }
          this.searchIndex[word].add(task.id)
        })
      })
    },

    extractSearchableWords(task) {
      const words = new Set()
      
      // Extract words from description
      const descWords = task.description.toLowerCase().match(/\b\w+\b/g) || []
      descWords.forEach(word => words.add(word))
      
      // Extract words from sector
      const sectorWords = task.sector_division.toLowerCase().match(/\b\w+\b/g) || []
      sectorWords.forEach(word => words.add(word))
      
      // Extract words from action content (strip HTML)
      const actionText = this.stripHtmlTags(task.action_to_be_taken)
      const actionWords = actionText.toLowerCase().match(/\b\w+\b/g) || []
      actionWords.forEach(word => words.add(word))
      
      return Array.from(words)
    },

    stripHtmlTags(html) {
      if (!html) return ''
      const div = document.createElement('div')
      div.innerHTML = html
      return div.textContent || div.innerText || ''
    },

    extractMatchedText(text, query) {
      const index = text.toLowerCase().indexOf(query.toLowerCase())
      if (index === -1) return text.substring(0, 60) + '...'
      
      const start = Math.max(0, index - 20)
      const end = Math.min(text.length, index + query.length + 40)
      let extracted = text.substring(start, end)
      
      if (start > 0) extracted = '...' + extracted
      if (end < text.length) extracted = extracted + '...'
      
      return extracted
    },

    handleSearchBlur() {
      // Delay hiding suggestions to allow for clicks
      setTimeout(() => {
        this.showSearchSuggestions = false
      }, 200)
    },

    clearSearch() {
      this.searchQuery = ''
      this.filteredTasks = []
      this.searchStats = null
      this.showSearchSuggestions = false
      
      if (this.searchDebounceTimeout) {
        clearTimeout(this.searchDebounceTimeout)
      }
    },

    selectSuggestion(suggestion) {
      this.searchQuery = suggestion.text
      this.showSearchSuggestions = false
      this.performSearch()
      
      // Scroll to the selected task
      this.$nextTick(() => {
        const taskElement = document.querySelector(`[data-task-id="${suggestion.taskId}"]`)
        if (taskElement) {
          taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          taskElement.classList.add('search-highlight')
          setTimeout(() => {
            taskElement.classList.remove('search-highlight')
          }, 2000)
        }
      })
    },

    isTaskInSearchResults(taskId) {
      return this.filteredTasks.some(task => task.id === taskId)
    },

    getDisplayIndex(index) {
      return index + 1
    },

    // Add new method to parse action nodes and their reviewers
    parseActionNodes(task) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(task.action_to_be_taken, 'text/html');
      const actionNodes = doc.querySelectorAll('.action-node');
      
      return Array.from(actionNodes).map(node => {
        const contentElement = node.querySelector('.node-content');
        const content = contentElement && contentElement.textContent ? contentElement.textContent.trim() : '';
        const hasReviewer = node.classList.contains('has-reviewer');
        const reviewerName = hasReviewer ? task.reviewer_info : null;
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

    // Add method to position reviewer badges
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
  }
}
</script>
<style scoped>
/* Main container */
.dashboard-container {
  padding: 1.5rem;
  min-height: calc(100vh - 4rem);
}

 /* Top action buttons container - Removed card styling */
.dashboard-actions {
  display: flex;
  justify-content: flex-end;
   align-items: center;
   gap: 0.75rem;
  margin-bottom: 1.5rem;
   /* Removed card styling - no background, padding, shadow, border */
}

 /* Create task button - compact styling like FinalDashboard */
.create-task-btn {
   padding: 1rem 1rem;
   background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  border: none;
   border-radius: 6px;
   cursor: pointer;
   font-weight: 600;
   font-size: 0.85rem;
   transition: all 0.2s ease;
   box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.create-task-btn:hover {
   background: linear-gradient(135deg, #047857 0%, #059669 100%);
   transform: translateY(-1px);
   box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
}

.create-task-btn::before {
  content: "+";
  font-weight: bold;
  margin-right: 0.5rem;
}


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


/* ========================================
   WORLD-CLASS FILTER SYSTEM STYLES
   ======================================== */

.filter-container {
  position: relative;
  display: inline-block;
}

.filter-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.625rem 1rem;
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.88rem;
  line-height: 1.2;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  box-shadow: 0 2px 6px rgba(30, 58, 138, 0.22);
  min-width: 108px;
  min-height: 40px;
  justify-content: center;
}

.filter-btn:hover {
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(30, 58, 138, 0.28);
}

.filter-btn.active {
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.24), 0 6px 12px rgba(30, 58, 138, 0.22);
}

.filter-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(191, 219, 254, 0.95), 0 0 0 6px rgba(30, 64, 175, 0.46);
}

.dropdown-arrow {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-arrow.rotated {
  transform: rotate(180deg);
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
  font-size: 0.7rem;
  font-weight: 700;
  animation: badgePulse 0.6s ease-out;
}

@keyframes badgePulse {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.filter-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(340px, calc(100vw - 1.5rem));
  max-height: min(85vh, 720px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding-bottom: 12px;
  background: #f1f5f9;
  border-radius: 12px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(15, 23, 42, 0.06);
  border: 1px solid #e2e8f0;
  z-index: 1000;
  animation: dropdownSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-section--review-date .filter-review-date-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.filter-preset-select {
  width: 100%;
  padding: 0.5rem 0.65rem;
  min-height: 40px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 0.9rem;
  color: #374151;
  background: #fff;
}

.filter-preset-select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
}

.filter-tag-search-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.filter-tag-search-row .tag-search-input {
  max-width: 100%;
  flex: 1;
}

.filter-tag-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

@keyframes dropdownSlideIn {
  0% { 
    opacity: 0; 
    transform: translateY(-10px) scale(0.95); 
  }
  100% { 
    opacity: 1; 
    transform: translateY(0) scale(1); 
  }
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  background: #ffffff;
  color: #0f172a;
  border-bottom: 1px solid #e2e8f0;
  border-radius: 12px 12px 0 0;
}

.filter-header h4 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
}

.clear-filters-btn {
  background: #ffffff;
  border: 1px solid #dbe3ef;
  color: #1d4ed8;
  padding: 0.42rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.clear-filters-btn:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1e40af;
}

.clear-filters-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.filter-section {
  padding: 14px 16px;
  margin: 0 12px 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}

.filter-header + .filter-section {
  margin-top: 12px;
}

.filter-section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 10px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
  color: #0f172a;
  font-weight: 600;
  font-size: 0.86rem;
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
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.filter-option:hover {
  background: #f9fafb;
  border-color: #e5e7eb;
}

.filter-option.selected {
  background: #eff6ff;
  border-color: #3b82f6;
}

.filter-radio {
  width: 18px;
  height: 18px;
  accent-color: #3b82f6;
  cursor: pointer;
}

.filter-option-text {
  flex: 1;
  font-size: 0.9rem;
  color: #374151;
  font-weight: 500;
}

.filter-count {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 400;
}

.custom-date-section {
  margin-top: 0.75rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.date-picker-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.custom-date-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  transition: all 0.2s ease;
}

.custom-date-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.date-picker-wrapper svg {
  position: absolute;
  left: 0.75rem;
  color: #6b7280;
  pointer-events: none;
}

.active-filters-summary {
  padding: 12px 16px;
  margin: 0 12px 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
  color: #374151;
  font-weight: 600;
  font-size: 0.82rem;
}

.active-filters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.active-filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.65rem;
  background: #eef2ff;
  color: #1e3a8a;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 500;
  border: 1px solid #c7d2fe;
}

.remove-filter-btn {
  background: #ffffff;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.remove-filter-btn:hover {
  background: #1e3a8a;
  color: white;
  border-color: #1e3a8a;
}

.remove-filter-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
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

.filter-results-summary {
  padding: 10px 16px;
  margin: 0 12px 4px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
  text-align: center;
}

.results-text {
  font-size: 0.82rem;
  color: #475569;
  font-weight: 500;
}

.filter-tags-state {
  color: #64748b;
  font-size: 0.86rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .filter-dropdown {
    width: min(340px, calc(100vw - 1rem));
    right: 0;
  }
  
  .filter-btn {
    min-width: 100px;
    padding: 0.55rem 0.85rem;
  }
}

@media (max-width: 480px) {
  .filter-dropdown {
    width: calc(100vw - 1rem);
    right: -0.25rem;
  }
  
  .filter-section {
    padding: 12px 14px;
    margin-left: 10px;
    margin-right: 10px;
  }
  
  .filter-header {
    padding: 0.72rem 0.85rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .filter-btn,
  .clear-filters-btn,
  .remove-filter-btn,
  .dropdown-arrow,
  .filter-dropdown,
  .filter-badge {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}


.pdf-capture-mode td:nth-child(4) {
  overflow: visible !important;
  padding: 5px !important;
}

/* Preserve block layout for generic wrappers; never force .action-node to block — it must stay flex
   or marker+content collapse to a narrow column and text only uses part of the cell width in PDF.
   /deep/ required: action column is v-html — scoped [data-v] selectors do not match injected nodes. */
.pdf-capture-mode td:nth-child(4) /deep/ table,
.pdf-capture-mode td:nth-child(4) /deep/ p,
.pdf-capture-mode td:nth-child(4) /deep/ div:not(.action-node) {
  display: block !important;
}
.pdf-capture-mode td:nth-child(4) /deep/ *:not(table):not(p):not(div) {
  /* Removed display: inline-block !important; as it breaks inline span wrapping with background colors */
}

 /* Compact Government Style Table Headers */
.table-headers {
   background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  margin-bottom: 0.5rem;
   border-radius: 8px 8px 0 0;
   width: 100%;
   box-sizing: border-box;
   box-shadow: 0 2px 8px rgba(0,0,0,0.05);
   overflow: hidden;
}

.table-headers table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
   margin: 0;
}

.table-headers th {
   color: white;
   font-size: 0.65rem;
   font-weight: 600;
  text-align: left;
   padding: 0.85rem 0.5rem;
  white-space: normal;
   border-right: 1px solid rgba(255, 255, 255, 0.2);
   background: transparent;
   line-height: 1.3;
 }

 .table-headers th:last-child {
   border-right: none;
 }

 /* Compact Table rows */
.table-row {
  background: white;
   border-radius: 0;
   margin: 0.5rem 0;
   box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  text-align: center;
   width: 100%;
   box-sizing: border-box;
   border: 1px solid #e9ecef;
   overflow: visible; /* Allow action menus to extend outside row */
 }

 .table-row:last-child {
   border-radius: 0 0 8px 8px;
}

.table-row table {
   width: 100%;
   margin: 0;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
}

.table-row > table > tr > td,
.table-row > table > tbody > tr > td {
   padding: 0.75rem;
   color: #495057;
   font-size: 0.8rem;
  vertical-align: top !important; /* Match NewFinalDashboard: PDF clone + export util rely on consistent cell alignment */
   line-height: 1.4;
  white-space: normal;
  word-break: break-word;
   border-right: 1px solid #f8f9fa;
   background: white;
   overflow: hidden;
 }



 .table-row > table > tr > td:last-child,
 .table-row > table > tbody > tr > td:last-child {
   border-right: none;
 }

 /* Column widths (2/7/7/68/4/5/4/3) — keep header/rows aligned */
.table-headers th:nth-child(1),
.table-row > table > tr > td:nth-child(1),
.table-row > table > tbody > tr > td:nth-child(1) {
  width: 2% !important;
}

.table-headers th:nth-child(2),
.table-row > table > tr > td:nth-child(2),
.table-row > table > tbody > tr > td:nth-child(2) {
 width: 7% !important;
}

.table-headers th:nth-child(3),
.table-row > table > tr > td:nth-child(3),
.table-row > table > tbody > tr > td:nth-child(3) {
  width: 7% !important;
}

.table-headers th:nth-child(4),
.table-row > table > tr > td:nth-child(4),
.table-row > table > tbody > tr > td:nth-child(4) {
 width: 68% !important;
  min-width: 400px;
  overflow: hidden !important;
  word-wrap: break-word;
  white-space: normal;
  text-align: left !important;
}

.table-headers th:nth-child(5),
.table-row > table > tr > td:nth-child(5),
.table-row > table > tbody > tr > td:nth-child(5) {
  width: 4% !important;
}

.table-headers th:nth-child(6),
.table-row > table > tr > td:nth-child(6),
.table-row > table > tbody > tr > td:nth-child(6) {
  width: 5% !important;
}

.table-headers th:nth-child(7),
.table-row > table > tr > td:nth-child(7),
.table-row > table > tbody > tr > td:nth-child(7) {
  width: 4% !important;
}

.table-headers th:nth-child(8),
.table-row > table > tr > td:nth-child(8),
.table-row > table > tbody > tr > td:nth-child(8) { width: 3% !important; }


.status-draft {
  color: #a53412 !important;
  background-color: #ebbf80;
  padding: 12px 8px;
  border-radius: 24px;
  font-size: 0.8rem;
  font-weight: bolder;
}

.status-review {
  color: #1e40af !important;
  background-color: #dbeafe;
  padding: 12px 7px;
  border-radius: 24px;
  font-size: 0.55rem;
  font-weight: bolder;
}

.status-final-review {
  color: #5b21b6 !important;
  background-color: #ede9fe;
  padding: 12px 8px;
  border-radius: 4px;
  font-size: 0.55rem;
  font-weight: bold;
}

.status-unknown {
  color: #6B7280 !important;
  background-color: #F3F4F6;
  padding: 12px 8px;
  border-radius: 24px;
  font-size: 0.8rem;
  font-weight: bolder;
}

.status-approved {
  color: #047857 !important;
  background-color: #d1fae5;
  padding: 12px 8px;
  border-radius: 24px;
  font-size: 0.8rem;
  font-weight: bolder;
  border: 1px solid #10b981;
  letter-spacing: 0.02em;
  display: inline-block;
  min-width: 80px;
  text-align: center;
}

.status-editor {
  color: #a15a00 !important;
  background-color: #f6c08b;
  padding: 12px 8px;
  border-radius: 24px;
  font-size: 0.8rem;
  font-weight: bolder;
  border: 1px solid #f6c08b;
  letter-spacing: 0.02em;
  display: inline-block;
  min-width: 80px;
  text-align: center;
}

.status-reviewer {
  color: #2563eb !important;
  background-color: #e3edff;
  padding: 12px 8px;
  border-radius: 24px;
  font-size: 0.8rem;
  font-weight: bolder;
  border: 1px solid #2563eb;
  letter-spacing: 0.02em;
  display: inline-block;
  min-width: 80px;
  text-align: center;
}

/* Meeting pack-aware status column (replaces legacy status text when meeting UI is on) */
.meeting-pack-status-td {
  position: relative;
  vertical-align: middle;
  padding: 0.35rem 0.25rem !important;
}

.meeting-pack-status-td--ready {
  background-color: #d1fae5 !important;
}

.meeting-pack-status-td--pending {
  background-color: #ffedd5 !important;
}

.meeting-pack-status-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  justify-content: center;
  min-height: 2.5rem;
}

.meeting-pack-status-missing {
  color: #9ca3af;
  font-size: 1rem;
}

.meeting-pack-status-counts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 4px;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.2;
}

.meeting-pack-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.meeting-pack-count--unresolved {
  color: #b91c1c;
}

.meeting-pack-count--resolved {
  color: #047857;
}

.meeting-pack-glyph {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
}

.meeting-pack-count-sep {
  color: #9ca3af;
  font-weight: 400;
  user-select: none;
}

.meeting-pack-info-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 2px;
  cursor: help;
}

.meeting-pack-info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  font-size: 0.58rem;
  font-weight: 700;
  font-style: italic;
  line-height: 1;
}

.meeting-pack-status-message {
  font-size: 0.62rem;
  font-weight: 600;
  color: #374151;
  line-height: 1.2;
}

.meeting-pack-status-td--ready .meeting-pack-status-message {
  color: #065f46;
}

.table-row > table > tr > td:nth-child(8),
.table-row > table > tbody > tr > td:nth-child(8) {
  padding: 0.5rem 0.35rem !important;
  text-align: left !important;
  vertical-align: top !important;
  overflow: visible !important;
  position: relative;
  font-size: 0.62rem;
}

.table-row > table > tr > td,
.table-row > table > tbody > tr > td {
  text-align: left;
}

.meeting-highlight-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-right: 0.75rem;
  font-size: 0.8rem;
  color: #374151;
  cursor: pointer;
  user-select: none;
}
.meeting-highlight-toggle input {
  cursor: pointer;
}

/* Narrow viewports: ⋮ opens the same menu as row right-click (see openRowMenuFromControl). */
.row-context-menu-mobile {
  display: none;
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #f1f5f9;
  color: #475569;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  z-index: 3;
  align-items: center;
  justify-content: center;
}
.legacy-status-td {
  position: relative;
}
@media (max-width: 768px) {
  .row-context-menu-mobile {
    display: inline-flex;
  }
}

/* Global Action Menu - Outside table structure */
.global-action-menu {
  position: fixed;
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 0.375rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  min-width: 180px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.15s ease; /* Faster transition */
  z-index: 99999 !important; /* Highest possible z-index */
  pointer-events: none; /* Prevent interaction when hidden */
  /* Add a small padding area to help with hover */
  padding: 0.25rem 0;
}

/* Tags popover styles */
.tags-popover {
  position: fixed;
  width: 240px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
  padding: 6px 0;
  overflow: hidden; /* clip inner overflow */
}
.tags-popover-list {
  max-height: 144px; /* about 3 items */
  overflow-y: auto;
  /* Match filter dropdown scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #c7d2fe #f1f5f9;
  overflow-x: hidden; /* prevent horizontal scroll */
}
.tags-popover-list::-webkit-scrollbar { width: 8px; }
.tags-popover-list::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
.tags-popover-list::-webkit-scrollbar-thumb { background-color: #c7d2fe; border-radius: 4px; border: 2px solid #f1f5f9; }
.tags-popover-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-size: 13px;
  color: #1f2937;
  background: transparent;
  border: none;
  white-space: normal; /* allow wrap */
  word-break: break-word; /* break long tokens */
}
.tags-popover-item + .tags-popover-item { border-top: 1px solid #f3f4f6; }
.tags-popover-empty {
  color:#6b7280;
  font-size:12px;
  padding:8px 12px;
}

/* Tags Centered Modal */
.tags-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
}
.tags-modal {
  width: min(560px, 92vw);
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
  overflow: hidden;
}
.tags-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  color: #fff;
}
.tags-modal-title { font-size: 1rem; font-weight: 600; }
.tags-modal-close {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}
.tags-modal-body {
  padding: 16px;
}
.tags-modal-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tags-chip {
  border: 1px solid #c7d2fe;
  background: #eef2ff;
  color: #1e40af;
  border-radius: 9999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
}
.tags-empty-state {
  color: #6b7280;
  font-size: 0.9rem;
  text-align: center;
  padding: 24px 8px;
}

.global-action-menu.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto; /* Enable interaction when visible */
}

/* Remove old action-menu styles since we're using global menu */
.action-menu {
  display: none !important;
}

.menu-item {
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  font-size: 0.875rem;
  transition: all 0.2s;
  cursor: pointer;
  display: block;
  border-radius: 0.25rem;
  margin: 0.25rem;
}

.menu-item:nth-child(1) {
  color: #3B82F6;
  font-weight: bold;
}
.menu-item:nth-child(1):hover {
  background-color: #d7e1ef;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.menu-item:nth-child(2) {
  color: #EF4444;
  font-weight: bold;
}
.menu-item:nth-child(2):hover {
  background-color: #f5d8d8;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
}

.menu-item:nth-child(3) {
  font-weight: bold;
  color: #10B981;
}
.menu-item:nth-child(3):hover {
  background-color: #e2f5ee;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
}

.menu-item:nth-child(4) {
  color: #8B5CF6;
  font-weight: bold;
}
.menu-item.tags {
  color: #1E40AF; /* indigo-800 */
  font-weight: bold;
}
.menu-item.tags:hover {
  background: #E0E7FF; /* indigo-100 */
  color: #3730A3; /* indigo-800 darker */
}

/* Expand: teal highlight for node right-click primary action */
.menu-item--expand {
  color: #0d9488 !important; /* teal-600 */
  font-weight: 700 !important;
  display: flex !important;
  align-items: center;
  gap: 6px;
}
.menu-item--expand:hover {
  background-color: #ccfbf1 !important; /* teal-100 */
  box-shadow: 0 2px 4px rgba(13, 148, 136, 0.15) !important;
}
.menu-item-icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  stroke-width: 2.2;
}
/* Thin separator inside the action menu */
.menu-sep {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 8px;
}

/* Assign pack modal overrides (reuses meeting-reset-modal base styles) */
.ntd-assign-pack-overlay {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
}

.ntd-assign-pack-modal {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 440px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.ntd-assign-modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ntd-assign-modal-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.ntd-assign-modal-close {
  background: #f8fafc;
  border: none;
  color: #64748b;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.ntd-assign-modal-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.ntd-assign-pack-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.ntd-assign-current-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ntd-assign-section-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.ntd-assign-empty-text {
  font-size: 0.875rem;
  color: #94a3b8;
  font-style: italic;
}

.ntd-assign-reviewer-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ntd-reviewer-chip {
  display: inline-flex;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 4px 8px 4px 6px;
  border-radius: 9999px;
  gap: 6px;
  transition: all 0.2s ease-in-out;
}
.ntd-reviewer-chip:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.ntd-reviewer-remove {
  background: transparent;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 2px;
  line-height: 1;
}
.ntd-reviewer-remove:hover {
  background: #fee2e2;
  color: #ef4444;
  transform: scale(1.1);
}

.ntd-reviewer-avatar {
  width: 24px;
  height: 24px;
  background: #6366f1;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.ntd-reviewer-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
}

.ntd-assign-field {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ntd-assign-select-wrapper {
  position: relative;
}

.ntd-assign-pack-select {
  width: 100%;
  appearance: none;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  font-size: 0.9375rem;
  color: #0f172a;
  outline: none;
  transition: all 0.2s;
  cursor: pointer;
}

.ntd-assign-pack-select:focus {
  border-color: #6366f1;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.ntd-assign-select-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #94a3b8;
}

.ntd-assign-modal-footer {
  padding: 1.25rem 1.5rem;
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #f1f5f9;
}

.ntd-assign-btn-cancel {
  padding: 0.625rem 1.25rem;
  border-radius: 10px;
  background: transparent;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.ntd-assign-btn-cancel:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.ntd-assign-btn-confirm {
  padding: 0.625rem 1.5rem;
  border-radius: 10px;
  background: #4f46e5;
  border: none;
  color: white;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ntd-assign-btn-confirm:hover:not(:disabled) {
  background: #4338ca;
  box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
}

.ntd-assign-btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ntd-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: ntd-spin 0.6s linear infinite;
}

@keyframes ntd-spin {
  to { transform: rotate(360deg); }
}
.pdf-capture-mode /deep/ ul {
  list-style: none !important;
  padding-left: 1.5em;
}
.pdf-capture-mode /deep/ ul li::before {
  content: '• ';
  color: #222;
  font-size: 1em;
  margin-right: 4px;
}

.pdf-capture-mode /deep/ ol {
  list-style: none !important;
  counter-reset: pdfcounter;
  padding-left: 1.5em;
}
.pdf-capture-mode /deep/ ol li {
  counter-increment: pdfcounter;
}
.pdf-capture-mode /deep/ ol li::before {
  content: counter(pdfcounter) ". ";
  color: #222;
  font-size: 1em;
  margin-right: 4px;
}

.menu-item:nth-child(4):hover {
  background-color: #F5F3FF;
  box-shadow: 0 2px 4px rgba(139, 92, 246, 0.1);
}

.highlighted-row {
  background-color: #F8FAFC;
  border: 1px solid #3B82F6;
}

.table-row:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

 /* Action Content Styling - Compact with Auto-scaling */
.action-content-cell {
  text-align: left !important;
  vertical-align: top !important;
   padding: 0.75rem !important;
   overflow: hidden !important;
   word-wrap: break-word;
   line-height: 1.4;
   max-width: 100% !important;
   position: relative;
   box-sizing: border-box;
   /* Smooth transition for scaling */
   transition: transform 0.3s ease;
 }

 .action-content-cell ul, .action-content-cell ol {
   margin: 6px 0;
   padding-left: 0;
   list-style: none;
 }

 .action-content-cell li {
   margin: 3px 0;
   list-style: none;
  display: flex;
  align-items: flex-start;
   line-height: 1.3;
 }

 .action-content-cell .list-marker {
   font-weight: 600;
   margin-right: 6px;
   min-width: 18px;
   color: #1e40af;
  flex-shrink: 0;
 }

 /* Compact table styling within action content (excludes preserved complex tables) */
 .action-content-cell table:not(.dashboard-import-table) {
   width: 100% !important;
   max-width: 100% !important;
   border-collapse: collapse !important;
   margin: 0.4rem 0 !important;
   font-size: 0.75rem !important;
   table-layout: auto !important;
   overflow-wrap: break-word !important;
   transition: transform 0.3s ease;
   transform-origin: top left;
 }

 .action-content-cell table:not(.dashboard-import-table) th,
 .action-content-cell table:not(.dashboard-import-table) td {
   border: 1px solid #222 !important;
   padding: 3px !important;
   text-align: center !important;
   vertical-align: middle !important;
   word-wrap: break-word !important;
   overflow-wrap: break-word !important;
   font-size: 10px !important;
 }

 .action-content-cell table:not(.dashboard-import-table) th {
   background-color: #f3f4f6 !important;
   font-weight: 600 !important;
   font-size: 0.7rem !important;
 }

 .action-content-cell table:not(.dashboard-import-table) td {
   font-size: 0.7rem !important;
 }

/* 🎯 UNIFIED: Clean Action Node Hierarchical Styling with DEEP SELECTORS */
.action-content-cell /deep/ .action-node {
   display: flex !important;
   align-items: baseline !important;
  margin: 4px 0 !important;
  padding: 2px 0 !important;
   line-height: 1.4 !important;
  font-size: inherit !important; /* Prevent auto-scaling interference */
  transition: all 0.2s ease-in-out;
  border: 1px solid transparent;
  position: relative;
  border-radius: 4px;
 }

.action-content-cell /deep/ .action-node:hover {
  border-color: rgba(66, 153, 225, 0.5) !important;
  box-shadow: 0 0 8px rgba(66, 153, 225, 0.3) !important;
  transform: scale(1.01) !important;
  background-color: rgba(66, 153, 225, 0.02) !important;
  z-index: 10;
}

@media print {
  .action-content-cell /deep/ .action-node {
    border-color: transparent !important;
    box-shadow: none !important;
    transform: none !important;
    background-color: transparent !important;
  }
}

.action-content-cell /deep/ .tentative-node-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  z-index: 15;
}

.action-content-cell /deep/ .action-node:hover .tentative-node-actions {
  opacity: 0.6;
}

.action-content-cell /deep/ .tentative-node-actions:hover {
  opacity: 1 !important;
}

@media print {
  .action-content-cell /deep/ .tentative-node-actions {
    display: none !important;
  }
}

.action-content-cell /deep/ .tentative-node-icon-btn {
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.action-content-cell /deep/ .tentative-node-icon-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.action-content-cell /deep/ .action-node .node-marker {
   flex-shrink: 0 !important;
   margin-right: 8px !important;
   font-weight: bold !important;
   min-width: 24px !important;
  display: inline-flex !important;
  align-items: baseline !important;
  line-height: inherit !important;
  text-align: left !important;
 }

.action-content-cell /deep/ .action-node .node-content {
   flex: 1 !important;
   min-width: 0 !important;
   word-break: break-word !important;
  line-height: inherit !important;
   color: #000 !important;
 }

/* 📐 ENHANCED: Hierarchical indentation with DEEP SELECTORS - REDUCED SPACING! */
.action-content-cell /deep/ .action-node.level-1 { 
  margin-left: 0px !important; 
  /* background-color: rgba(59, 130, 246, 0.02) !important; */
}
.action-content-cell /deep/ .action-node.level-2 { 
  margin-left: 20px !important; 
  /* background-color: rgba(16, 185, 129, 0.02) !important; */
  /* border-left: 2px solid rgba(16, 185, 129, 0.3) !important; */
  padding-left: 4px !important;
}
.action-content-cell /deep/ .action-node.level-3 { 
  margin-left: 40px !important; 
  /* background-color: rgba(245, 158, 11, 0.02) !important; */
  /* border-left: 2px solid rgba(139, 92, 246, 0.3) !important; */
  padding-left: 6px !important;
}
.action-content-cell /deep/ .action-node.level-4 { 
  margin-left: 60px !important; 
  /* background-color: rgba(245, 158, 11, 0.02) !important; */
  /* border-left: 2px solid rgba(245, 158, 11, 0.3) !important; */
  padding-left: 6px !important;
}
.action-content-cell /deep/ .action-node.level-5 { 
  margin-left: 80px !important; 
  /* background-color: rgba(239, 68, 68, 0.02) !important; */
  /* border-left: 2px solid rgba(239, 68, 68, 0.3) !important; */
  padding-left: 6px !important;
}

/* 🔧 HIGH SPECIFICITY: Override rules for table context - REDUCED SPACING! */
table .action-content-cell /deep/ .action-node.level-2,
td .action-content-cell /deep/ .action-node.level-2 {
  margin-left: 20px !important;
  padding-left: 4px !important;
  /* background-color: rgba(16, 185, 129, 0.05) !important; */
  /* border-left: 3px solid rgba(16, 185, 129, 0.4) !important; */
}
table .action-content-cell /deep/ .action-node.level-3,
td .action-content-cell /deep/ .action-node.level-3 {
  margin-left: 40px !important;
  padding-left: 6px !important;
  /* background-color: rgba(245, 158, 11, 0.05) !important; */
  /* border-left: 3px solid rgba(139, 92, 246, 0.4) !important; */
}
table .action-content-cell /deep/ .action-node.level-4,
td .action-content-cell /deep/ .action-node.level-4 {
  margin-left: 60px !important;
  padding-left: 6px !important;
  /* background-color: rgba(139, 92, 246, 0.05) !important; */
  /* border-left: 3px solid rgba(245, 158, 11, 0.4) !important; */
}

/* 🎨 UNIFIED: List style colors with DEEP SELECTORS (clear visual hierarchy) */
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

/* 📅 Review date styling with DEEP SELECTORS - yellow highlight */
.action-content-cell /deep/ .action-node .node-content .review-date {
   font-size: 0.85em !important;
   color: #333 !important;
   font-weight: 700 !important;
   margin-left: 8px !important;
  /* background-color: #ffeb3b !important; */
   padding: 2px 6px !important;
   border-radius: 4px !important;
   display: inline-block !important;
   line-height: 1.2 !important;
 }

.action-content-cell /deep/ .action-node .node-content .review-date.today {
  color: #d32f2f !important; /* Red text for today */
   font-weight: 600 !important;
}

/* ✅ Completed nodes styling with DEEP SELECTORS - GREEN COLOR */
.action-content-cell /deep/ .action-node.completed { 
  color: green !important;
  /* background-color: rgba(16, 185, 129, 0.1) !important; */
  /* border-left: 3px solid #10b981 !important; Green left border */
  border-radius: 4px !important;
  padding: 4px 8px !important;
}
.action-content-cell /deep/ .action-node.completed .node-content { 
  color: rgb(0, 255, 0) !important;
  font-weight: 500 !important; /* Slightly bold */
}
.action-content-cell /deep/ .action-node.completed .node-marker { 
  /* color: #10b981 !important; */
  font-weight: 600 !important;
}

/* 🔧 FALLBACK: Alternative deep selector syntaxes for maximum compatibility - REDUCED SPACING! */
.action-content-cell >>> .action-node.level-2 { 
  margin-left: 20px !important; 
  /* background-color: rgba(16, 185, 129, 0.02) !important; */
  /* border-left: 2px solid rgba(16, 185, 129, 0.3) !important; */
  padding-left: 2px !important;
}
.action-content-cell >>> .action-node.level-3 { 
  margin-left: 40px !important; 
  /* background-color: rgba(245, 158, 11, 0.02) !important; */
  /* border-left: 2px solid rgba(245, 158, 11, 0.3) !important; */
  padding-left: 2px !important;
}
.action-content-cell >>> .action-node.level-4 { 
  margin-left: 60px !important; 
  /* background-color: rgba(139, 92, 246, 0.02) !important; */
  /* border-left: 2px solid rgba(245, 158, 11, 0.3) !important; */
  padding-left: 2px !important;
 }

/* 💪 NUCLEAR OPTION: Global styles that bypass scoping entirely - REDUCED SPACING! */
td.action-content-cell .action-node.level-2 { 
  margin-left: 20px !important; 
  /* background-color: rgba(16, 185, 129, 0.02) !important; */
  /* border-left: 2px solid rgba(16, 185, 129, 0.3) !important; */
  padding-left: 2px !important;
}
td.action-content-cell .action-node.level-3 { 
  margin-left: 40px !important; 
  /* background-color: rgba(245, 158, 11, 0.02) !important; */
  /* border-left: 2px solid rgba(245, 158, 11, 0.3) !important; */
  padding-left: 2px !important;
}
td.action-content-cell .action-node.level-4 { 
  margin-left: 60px !important; 
  /* background-color: rgba(139, 92, 246, 0.02) !important; */
  /* border-left: 2px solid rgba(245, 158, 11, 0.3) !important; */
  padding-left: 2px !important;
}
 
 .action-content-cell p { margin: 0.25em 0 !important; }
 .action-content-cell br { line-height: 1.2 !important; }

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

 /* Ensure auto-scaled content maintains proper spacing and structure */
 .action-content-cell.auto-scaled-small /deep/ .action-node,
 .action-content-cell.auto-scaled-tiny /deep/ .action-node {
   margin: 2px 0 !important;
   padding: 1px 0 !important;
   display: flex !important;
   align-items: flex-start !important;
 }

 /* Preserve hierarchical indentation even when scaled - REDUCED SPACING! */
 .action-content-cell.auto-scaled-small /deep/ .action-node.level-1,
 .action-content-cell.auto-scaled-tiny /deep/ .action-node.level-1 { margin-left: 0 !important; }
 .action-content-cell.auto-scaled-small /deep/ .action-node.level-2,
 .action-content-cell.auto-scaled-tiny /deep/ .action-node.level-2 { margin-left: 6px !important; }
 .action-content-cell.auto-scaled-small /deep/ .action-node.level-3,
 .action-content-cell.auto-scaled-tiny /deep/ .action-node.level-3 { margin-left: 12px !important; }
 .action-content-cell.auto-scaled-small /deep/ .action-node.level-4,
 .action-content-cell.auto-scaled-tiny /deep/ .action-node.level-4 { margin-left: 18px !important; }

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
.table-row > table > tr > td:nth-child(4),
.table-row > table > tbody > tr > td:nth-child(4) {
  min-width: 400px !important;
  width: 68% !important;
  max-width: none !important;
}

.download-pdf-btn {
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

.download-pdf-btn:hover {
   background: linear-gradient(135deg, #047857 0%, #059669 100%);
   transform: translateY(-1px);
   box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
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
.pdf-capture-mode .action-content-cell /deep/ table,
.pdf-capture-mode .action-content-cell /deep/ table table {
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
/* Flex row: default min-width:auto can prevent .node-content from using remaining cell width in capture */
.pdf-capture-mode .action-content-cell /deep/ .action-node .node-content {
  min-width: 0 !important;
  flex: 1 1 0% !important;
}
.pdf-capture-mode td:nth-child(4) /deep/ * {
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}

.pdf-capture-mode td:nth-child(4) /deep/ div,
.pdf-capture-mode td:nth-child(4) /deep/ p,
.pdf-capture-mode td:nth-child(4) /deep/ table {
  white-space: pre-line !important;
  max-width: 100% !important;
}

.pdf-capture-mode td:nth-child(4) /deep/ span,
.pdf-capture-mode td:nth-child(4) /deep/ b,
.pdf-capture-mode td:nth-child(4) /deep/ strong,
.pdf-capture-mode td:nth-child(4) /deep/ i,
.pdf-capture-mode td:nth-child(4) /deep/ em,
.pdf-capture-mode td:nth-child(4) /deep/ u,
.pdf-capture-mode td:nth-child(4) /deep/ font,
.pdf-capture-mode td:nth-child(4) /deep/ a {
  white-space: normal !important;
  max-width: none !important;
  -webkit-box-decoration-break: clone !important;
  box-decoration-break: clone !important;
}
.pdf-capture-mode /deep/ ul,
.pdf-capture-mode /deep/ ol {
  padding-left: 18px !important;
  margin: 0.2em 0 !important;
}
.pdf-capture-mode /deep/ li {
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  white-space: pre-line !important;
  max-width: 100% !important;
}
.pdf-capture-mode .action-content-cell /deep/ table th,
.pdf-capture-mode .action-content-cell /deep/ table td {
  font-size: 9px !important;
  padding: 2px 3px !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  white-space: pre-line !important;
  max-width: 100% !important;
}

/* Table styling for tables inside 'Action to be Taken' (dashboard and PDF) */
/* Excludes .dashboard-import-table so preserved Word/LibreOffice tables keep their native layout */
.action-content-cell table:not(.dashboard-import-table),
.action-content-cell table:not(.dashboard-import-table) th,
.action-content-cell table:not(.dashboard-import-table) td,
.pdf-capture-mode .action-content-cell /deep/ table:not(.dashboard-import-table),
.pdf-capture-mode .action-content-cell /deep/ table:not(.dashboard-import-table) th,
.pdf-capture-mode .action-content-cell /deep/ table:not(.dashboard-import-table) td {
  border: 1px solid #222 !important;
  border-collapse: collapse !important;
  padding: 3px !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  text-align: center !important;
  vertical-align: top !important;
}

.action-content-cell table:not(.dashboard-import-table) {
  width: 100% !important;
  table-layout: fixed !important;
  margin: 0 !important;
}

.action-content-cell th {
  background: #f2f2f2 !important;
  font-weight: 600 !important;
  color: #222 !important;
}

/* Ensure nested tables also get the same styling (exclude preserved complex tables) */
.action-content-cell table:not(.dashboard-import-table) table,
.action-content-cell table:not(.dashboard-import-table) th,
.action-content-cell table:not(.dashboard-import-table) td {
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
.pdf-capture-mode .action-content-cell /deep/ * {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  line-height: 1.1 !important;
}

/* Keep small gap above/below tables so "Expenditure status..." and "Aug-25 targets..." stay separated */
.pdf-capture-mode .action-content-cell /deep/ table {
  margin-top: 6px !important;
  margin-bottom: 6px !important;
}

.pdf-capture-mode /deep/ p,
.pdf-capture-mode /deep/ li,
.pdf-capture-mode /deep/ div {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  line-height: 1.1 !important;
}

.search-actions-row {
  display: flex;
  align-items: stretch;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
  width: 100%;
  position: relative;
  flex-wrap: wrap;
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
  flex: 0 0 auto;
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

.responsibility-cell {
  position: relative;
  padding: 0.75rem !important;
  min-height: 50px;
  overflow: visible !important; /* Ensure badges are visible */
}

/* Only keep the highlight-connection class since it's still used */
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

/* Hide reviewer badges in action content for TentativeDashboard */
.action-content-cell /deep/ .reviewer-badge-parallel {
  display: none !important;
}

/* But keep the reviewer badges in the responsibility cell visible */
.responsibility-cell .reviewer-badge-parallel {
  display: inline-block !important;
  background-color: #ffeb3b !important;
  font-weight: bold !important;
  border-radius: 4px !important;
  padding: 2px 6px !important;
  color: #000000 !important;
  margin: 2px 0 !important;
  opacity: 1 !important;
  transition: all 0.2s ease !important;
  cursor: pointer !important;
  z-index: 10 !important;
  position: absolute !important;
  left: 6px !important;
  width: calc(100% - 12px) !important;
  text-align: left !important;
  box-sizing: border-box !important;
}

/* Tag suggestions (Filter -> Tags) */
.filter-tag-suggest-dropdown {
  position: relative;
  margin-bottom: 8px;
  z-index: 8;
}
.filter-tag-suggest-dropdown.flip .filter-tag-suggest-list {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  right: 0;
}
.filter-tag-suggest-dropdown:not(.flip) .filter-tag-suggest-list {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
}
.filter-tag-suggest-list {
  /* ~3 items visible; rest scroll */
  max-height: min(40vh, 196px);
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 25px rgba(0,0,0,0.12);
  padding: 4px 0;
  overflow-x: hidden;
  z-index: 9;
}
.filter-tag-suggest-item {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  min-height: 40px;
  padding: 10px 14px;
  margin: 0;
  font-size: 0.86rem;
  color: #1f2937;
  cursor: pointer;
}
.filter-tag-suggest-item:hover { background: #f9fafb; }
.filter-tag-suggest-item:focus-visible {
  outline: none;
  background: #eff6ff;
  box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.45);
}
.filter-tag-suggest-empty {
  padding: 8px;
  color: #6b7280;
  font-size: 12px;
}
.filter-tag-suggest-item.selected,
.filter-tag-suggest-item:disabled {
  color: #9ca3af;
  background: #fafafa;
  cursor: not-allowed;
}

/* Subtle custom scrollbar just for the dropdown */
.filter-tag-suggest-list::-webkit-scrollbar {
  width: 8px;
}
.filter-tag-suggest-list::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 10px;
}
.filter-tag-suggest-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 10px;
}

/* Styled search input for Tags filter */
.tag-search-input {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  min-height: 40px;
  padding: 10px 36px 10px 40px; /* left room for icon */
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  background: #fff url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>') no-repeat 12px center;
}
.tag-search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}
</style>

<!--
  Meeting pack highlights MUST be unscoped: v-html injects .action-node without Vue [data-v-*].
  Scoped + /deep/ did not reliably style those nodes in devtools (classes present, no paint).
  Prefix .new-tentative-dashboard avoids touching NewFinalDashboard / legacy dashboards.
-->
<style>
.new-tentative-dashboard .action-content-cell .action-node.meeting-overlay-node {
  position: relative;
  border-radius: 6px;
  padding: 2px 4px;
}
/* Review hub parity: red = assigned pending comment; green = assigned + commented; blue = commented unassigned */
.new-tentative-dashboard .action-content-cell .action-node.meeting-hub-red {
  background: rgba(254, 202, 202, 0.9) !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}
.new-tentative-dashboard .action-content-cell .action-node.meeting-hub-green {
  background: rgba(187, 247, 208, 0.9) !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}
.new-tentative-dashboard .action-content-cell .action-node.meeting-hub-blue {
  background: rgba(191, 219, 254, 0.9) !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}
/* Pack highlight navigator: must beat hub tint rules (they use outline: none !important). */
.new-tentative-dashboard .action-content-cell .action-node.pack-highlight-nav-focus {
  outline: 3px solid #000000 !important;
  outline-offset: -3px !important;
  position: relative;
  z-index: 1;
}
.new-tentative-dashboard .pack-highlight-nav-fab {
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
.new-tentative-dashboard .pack-highlight-nav-fab-btn {
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
.new-tentative-dashboard .pack-highlight-nav-fab-btn:hover {
  background: #f8fafc;
  border-color: #475569;
  color: #0f172a;
}
.new-tentative-dashboard .pack-highlight-nav-fab-btn svg {
  width: 22px;
  height: 22px;
}
.new-tentative-dashboard .pack-highlight-nav-fab-counter {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  line-height: 1.2;
  user-select: none;
}
.new-tentative-dashboard.dashboard-pdf-capture .pack-highlight-nav-fab,
.pdf-capture-mode .new-tentative-dashboard .pack-highlight-nav-fab {
  display: none !important;
}

.meeting-bottom-actions {
  margin-top: 18px;
  padding: 16px 0 6px;
  border-top: 1px solid #e2e8f0;
}
.meeting-bottom-actions-inner {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.scroll-jump-fab {
  position: fixed;
  right: 18px;
  bottom: 24px;
  width: 46px;
  height: 46px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.18);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100030;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.pack-highlight-nav-fab + .scroll-jump-fab {
  /* When both FABs are visible, keep them side-by-side (two vertical columns). */
  right: 86px;
  bottom: 24px;
}
.scroll-jump-fab:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.22);
}
.scroll-jump-fab:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18), 0 14px 34px rgba(15, 23, 42, 0.22);
  border-color: rgba(37, 99, 235, 0.45);
}
.scroll-jump-fab svg {
  width: 20px;
  height: 20px;
}
.new-tentative-dashboard.dashboard-pdf-capture .scroll-jump-fab,
.pdf-capture-mode .new-tentative-dashboard .scroll-jump-fab {
  display: none !important;
}
.new-tentative-dashboard.dashboard-pdf-capture .action-content-cell .action-node.pack-highlight-nav-focus,
.pdf-capture-mode .new-tentative-dashboard .action-content-cell .action-node.pack-highlight-nav-focus {
  outline: none !important;
  z-index: auto;
}
/* Group marker + tick so flex row does not push the tick toward .node-content */
.new-tentative-dashboard .action-content-cell .action-node .meeting-pack-marker-with-tick {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  gap: 2px;
  margin-right: 8px;
  line-height: 1;
}
.new-tentative-dashboard .action-content-cell .action-node .meeting-pack-marker-with-tick .node-marker {
  margin-right: 0 !important;
}
/* Pack resolution: green tick only (no "!?" for unresolved). */
.new-tentative-dashboard .action-content-cell .action-node .meeting-pack-resolution-chip {
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
.new-tentative-dashboard .action-content-cell .action-node .meeting-pack-resolution-chip--resolved {
  color: #15803d;
}
.new-tentative-dashboard .action-content-cell .action-node .meeting-pack-resolution-tick {
  width: 12px;
  height: 12px;
  display: block;
}
/* PDF / capture: strip highlights (live page only). */
.new-tentative-dashboard.dashboard-pdf-capture .action-content-cell .action-node.meeting-hub-red,
.new-tentative-dashboard.dashboard-pdf-capture .action-content-cell .action-node.meeting-hub-green,
.new-tentative-dashboard.dashboard-pdf-capture .action-content-cell .action-node.meeting-hub-blue,
.pdf-capture-mode .new-tentative-dashboard .action-content-cell .action-node.meeting-hub-red,
.pdf-capture-mode .new-tentative-dashboard .action-content-cell .action-node.meeting-hub-green,
.pdf-capture-mode .new-tentative-dashboard .action-content-cell .action-node.meeting-hub-blue {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
  opacity: 1 !important;
}
.new-tentative-dashboard.dashboard-pdf-capture .action-content-cell .action-node.meeting-hub-red .node-content,
.new-tentative-dashboard.dashboard-pdf-capture .action-content-cell .action-node.meeting-hub-green .node-content,
.new-tentative-dashboard.dashboard-pdf-capture .action-content-cell .action-node.meeting-hub-blue .node-content,
.pdf-capture-mode .new-tentative-dashboard .action-content-cell .action-node.meeting-hub-red .node-content,
.pdf-capture-mode .new-tentative-dashboard .action-content-cell .action-node.meeting-hub-green .node-content,
.pdf-capture-mode .new-tentative-dashboard .action-content-cell .action-node.meeting-hub-blue .node-content {
  box-shadow: none !important;
  background: transparent !important;
  outline: none !important;
}
.new-tentative-dashboard.dashboard-pdf-capture .action-content-cell .meeting-pack-resolution-chip,
.pdf-capture-mode .new-tentative-dashboard .action-content-cell .meeting-pack-resolution-chip {
  display: none !important;
}
.new-tentative-dashboard.dashboard-pdf-capture .action-content-cell .meeting-comment-badge,
.pdf-capture-mode .new-tentative-dashboard .action-content-cell .meeting-comment-badge {
  display: none !important;
}
</style>

<!-- GLOBAL TABLE BOUNDARY STYLES: Not scoped, only border/padding, no background/color override -->
<!-- Excludes .dashboard-import-table so preserved Word/LibreOffice tables keep their native layout -->
<style>
.action-content-cell table:not(.dashboard-import-table),
.action-content-cell table:not(.dashboard-import-table) th,
.action-content-cell table:not(.dashboard-import-table) td,
.pdf-capture-mode .action-content-cell table:not(.dashboard-import-table),
.pdf-capture-mode .action-content-cell table:not(.dashboard-import-table) th,
.pdf-capture-mode .action-content-cell table:not(.dashboard-import-table) td {
  border: 1px solid #222 !important;
  border-collapse: collapse !important;
  padding: 3px !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  text-align: center !important;
  vertical-align: top !important;
}
</style>

<!-- ADVANCED SEARCH SYSTEM STYLES -->
<style>
.search-container {
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 10;
  width: 100%;
}

.search-wrapper {
  position: relative;
  width: 100%;
}

.search-input-group {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.search-input-group:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.search-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #6b7280;
  margin-right: 0.5rem;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  color: #1f2937;
  padding: 0.25rem;
}

.search-input::placeholder {
  color: #9ca3af;
}

.clear-search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  margin-left: 0.25rem;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  color: #4b5563;
}

.search-results-info {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #6b7280;
}

.results-count {
  font-weight: 500;
  color: #4b5563;
}

.search-stats {
  color: #6b7280;
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
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-meta {
  font-size: 0.8125rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.suggestion-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #9ca3af;
  margin-left: 0.75rem;
  transition: all 0.2s ease;
}

.suggestion-item:hover .suggestion-icon {
  color: #3b82f6;
  transform: translateX(2px);
}

/* Search highlight animation for matched tasks */
.search-highlight {
  animation: searchPulse 2s ease-in-out;
}

@keyframes searchPulse {
  0%, 100% {
    background-color: transparent;
    box-shadow: none;
  }
  25% {
    background-color: rgba(59, 130, 246, 0.1);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  }
  50% {
    background-color: rgba(59, 130, 246, 0.15);
    box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.15);
  }
  75% {
    background-color: rgba(59, 130, 246, 0.1);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
}

/* Responsive design for search */
@media (max-width: 768px) {
  .search-input-group {
    padding: 0.5rem 0.75rem;
  }
  
  .search-icon {
    width: 32px;
    height: 32px;
    margin-right: 0.5rem;
  }
  
  .search-input {
    font-size: 0.875rem;
  }
  
  .search-results-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
  }
  
  .search-stats {
    font-size: 0.75rem;
  }
  
  .suggestion-item {
    padding: 0.5rem 0.75rem;
  }
  
  .suggestion-title {
    font-size: 0.875rem;
  }
  
  .suggestion-meta {
    font-size: 0.75rem;
  }
}

/* Keyboard navigation support */
.search-suggestions:focus-within .suggestion-item:focus {
  background: #eff6ff;
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

/* Loading state for search */
.search-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Empty state styling */
.search-suggestions:empty::after {
  content: 'No suggestions found';
  display: block;
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  font-style: italic;
}

/* Smooth transitions for all search elements */
.search-container * {
  transition: all 0.2s ease;
}

/* Enhanced focus states for accessibility */
.search-input:focus {
  outline: none;
}

.search-wrapper:focus-within {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Performance optimizations */
.search-suggestions {
  will-change: transform, opacity;
  transform: translateZ(0);
}

.suggestion-item {
  will-change: transform, background-color;
}

/* —— Meeting dashboard bar (new flow) —— */
.meeting-dashboard-bar {
  margin: 0 1rem 0.75rem;
  padding: 0.35rem 0;
  font-size: 0.88rem;
  color: #0f172a;
  background: transparent;
  border: none;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.meeting-bar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
}
.meeting-bar-row-main {
  justify-content: space-between;
}
.meeting-bar-field {
  display: inline-flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: #334155;
}
.meeting-bar-label {
  font-weight: 600;
  color: #0f172a;
}
.meeting-bar-sublabel {
  font-size: 0.75rem;
  color: #64748b;
}
.meeting-date-input {
  padding: 0.35rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.85rem;
}
.toolbar-date-slot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(255, 251, 235, 0.95) 100%);
  border-radius: 12px;
  box-shadow: 0 10px 22px rgba(245, 158, 11, 0.10);
  white-space: nowrap;
}
.toolbar-date-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #334155;
}
.toolbar-date-input {
  padding: 0.35rem 0.55rem;
  border-radius: 10px;
  border: 1px solid rgba(245, 158, 11, 0.45);
  font-size: 0.85rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.75);
  color: #0f172a;
}
.toolbar-date-input:focus {
  outline: none;
  border-color: rgba(245, 158, 11, 0.75);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.22);
}
.meeting-bar-hint {
  flex: 1 1 200px;
  color: #475569;
  font-size: 0.82rem;
}
.meeting-bar-hint code {
  font-size: 0.78rem;
}
.meeting-import-link {
  margin-left: 0.35rem;
  font-weight: 600;
  color: #1d4ed8;
}
.meeting-bar-row-main {
  display: none;
}
.meeting-dashboard-bar .live-status-actions {
  margin-left: auto;
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.meeting-dashboard-bar .live-status-action-link--import {
  font-weight: 800;
  border-color: rgba(15, 23, 42, 0.10);
  background: rgba(248, 250, 252, 0.92);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
}
.meeting-dashboard-bar .live-status-action-link--import::before {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(99, 102, 241, 0.14));
  box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.18);
}
.meeting-dashboard-bar .new-final-live-status {
  /* Mirror Final: no card, just a clean row + subtle divider */
  position: relative;
  padding: 8px 2px 10px;
}
.meeting-dashboard-bar .new-final-live-status::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.20), rgba(16, 185, 129, 0.14), rgba(239, 68, 68, 0.14));
  opacity: 0.7;
}
.meeting-dashboard-bar .live-status-label {
  font-weight: 800;
  color: #0b1220;
  letter-spacing: 0.01em;
}
.meeting-dashboard-bar .live-status-badges {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.meeting-dashboard-bar .live-status-badge {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.10);
  user-select: none;
  position: relative;
}
.meeting-dashboard-bar .live-status-badge-icon {
  position: absolute;
  inset: 0;
  border-radius: 999px;
}
.meeting-dashboard-bar .live-status-badge-count {
  font-variant-numeric: tabular-nums;
  font-weight: 900;
  font-size: 0.95rem;
  color: #0b1220;
  position: relative;
  z-index: 1;
}
.meeting-dashboard-bar .live-status-badge--green { background: rgba(187, 247, 208, 0.98); }
.meeting-dashboard-bar .live-status-badge--blue  { background: rgba(191, 219, 254, 0.98); }
.meeting-dashboard-bar .live-status-badge--red   { background: rgba(254, 202, 202, 0.98); }
.meeting-dashboard-bar .live-status-badge--green .live-status-badge-icon { box-shadow: inset 0 0 0 7px rgba(34, 197, 94, 0.24); }
.meeting-dashboard-bar .live-status-badge--blue  .live-status-badge-icon { box-shadow: inset 0 0 0 7px rgba(59, 130, 246, 0.24); }
.meeting-dashboard-bar .live-status-badge--red   .live-status-badge-icon { box-shadow: inset 0 0 0 7px rgba(239, 68, 68, 0.24); }
.meeting-dashboard-bar .new-final-review-hub-link {
  margin-left: auto;
  font-size: 0.85rem;
  font-weight: 800;
  color: #0b1220;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(37, 99, 235, 0.22);
  background: linear-gradient(135deg, rgba(219, 234, 254, 0.95) 0%, rgba(236, 253, 245, 0.9) 100%);
  box-shadow: 0 12px 26px rgba(37, 99, 235, 0.10);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.meeting-dashboard-bar .new-final-review-hub-link:hover {
  border-color: rgba(37, 99, 235, 0.35);
  box-shadow: 0 16px 36px rgba(37, 99, 235, 0.14);
}
.meeting-dashboard-bar .new-final-review-hub-link::before {
  content: '';
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.28), rgba(16, 185, 129, 0.20));
  box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.22);
}
.meeting-bar-clear-btn,
.meeting-bar-ghost-btn {
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #fff;
  cursor: pointer;
  font-size: 0.8rem;
}
.meeting-bar-ghost-btn.active {
  background: #dbeafe;
  border-color: #93c5fd;
}
.meeting-bar-row-tools {
  border-top: 1px dashed #bfdbfe;
  padding-top: 0.5rem;
  align-items: center;
}
.comment-nav-arrows {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.comment-nav-pos {
  font-size: 0.8rem;
  color: #475569;
}
.meeting-review-status-link {
  margin-left: auto;
  font-weight: 600;
  color: #1d4ed8;
  text-decoration: none;
  font-size: 0.85rem;
}
.meeting-review-status-link:hover {
  text-decoration: underline;
}
.meeting-bar-actions {
  border-top: 1px dashed #bfdbfe;
  padding-top: 0.5rem;
}
.publish-dashboard-btn {
  padding: 0.45rem 1rem;
  border: none;
  border-radius: 8px;
  background: #1d4ed8;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
}
.publish-dashboard-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.reset-draft-btn {
  padding: 0.45rem 1rem;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
  margin-left: 0.5rem;
}
.reset-draft-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.table-row.agenda-range-row-highlight {
  outline: 2px solid #fbbf24;
  outline-offset: 1px;
  border-radius: 4px;
}
.action-content-cell /deep/ .action-node.agenda-range-node-highlight {
  box-shadow: 0 0 0 2px #fbbf24;
  border-radius: 6px;
}
/* Pack meeting overlays: see unscoped block `.new-tentative-dashboard` (v-html nodes lack scoped data-v). */
.action-content-cell /deep/ .meeting-comment-badge {
  display: none;
}
.action-content-cell /deep/ .action-node.comment-nav-flash {
  animation: meetingCommentFlash 1.5s ease-out;
}
@keyframes meetingCommentFlash {
  0% { box-shadow: 0 0 0 4px #3b82f6; }
  100% { box-shadow: 0 0 0 0 transparent; }
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

/* Keep preserved Word/LibreOffice tables at native grid width and scroll horizontally. */
.action-content-cell div[style*="overflow-x: auto"] {
  overflow-x: auto !important;
  max-width: 100% !important;
}

/* Match NewEnhancedNodeItem.vue rich-text-display: preserved tables still need visible grid lines. */
.action-content-cell table.dashboard-import-table {
  width: auto !important;
  max-width: none !important;
  table-layout: auto !important;
  border-collapse: collapse !important;
}

/* PDF capture must fit preserved tables into Action column; do not keep max-content width. */
.pdf-capture-mode .action-content-cell /deep/ div[style*="overflow-x: auto"] {
  overflow: visible !important;
  max-width: 100% !important;
}

.pdf-capture-mode .action-content-cell /deep/ table.dashboard-import-table {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  table-layout: auto !important;
}

.action-content-cell table.dashboard-import-table th,
.action-content-cell table.dashboard-import-table td {
  white-space: normal !important;
  border: 1px solid #222 !important;
  box-sizing: border-box !important;
}

.action-content-cell table.dashboard-import-table th {
  background-color: inherit !important;
}

/* Safety: never render inline editor in PDF capture or print */
.pdf-capture-mode .inline-editor-backdrop,
.dashboard-pdf-capture .inline-editor-backdrop {
  display: none !important;
}
@media print {
  .inline-editor-backdrop {
    display: none !important;
  }
}
</style>
