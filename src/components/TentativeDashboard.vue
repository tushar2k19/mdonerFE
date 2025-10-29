<template>
  <div class="dashboard-container">
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
      <!-- Action Buttons -->
      <div class="dashboard-actions-inline">
        <div class="filter-container" ref="filterContainer">
          <button 
            class="filter-btn"
            @click="toggleFilterDropdown"
            :class="{ 'active': showFilterDropdown }"
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
          <div v-if="showFilterDropdown" class="filter-dropdown" @click.stop>
            <div class="filter-header">
              <h4>Filter Tasks</h4>
              <button @click="clearAllFilters" class="clear-filters-btn">
                Clear All
              </button>
            </div>
            
            <!-- Status Filter -->
            <div class="filter-section">
              <div class="filter-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Status</span>
              </div>
              <div class="filter-options">
                <label 
                  v-for="status in statusOptions" 
                  :key="status.value"
                  class="filter-option"
                  :class="{ 'selected': selectedStatus === status.value }"
                >
                  <input 
                    type="radio" 
                    :value="status.value" 
                    v-model="selectedStatus"
                    @change="applyFilters"
                    class="filter-radio"
                  />
                  <span class="filter-option-text">{{ status.label }}</span>
                  <span class="filter-count">({{ getStatusCount(status.value) }})</span>
                </label>
              </div>
            </div>
            
            <!-- Review Date Filter -->
            <div class="filter-section">
              <div class="filter-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2V5M16 2V5M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Review Date</span>
              </div>
              <div class="filter-options">
                <label 
                  v-for="dateOption in dateOptions" 
                  :key="dateOption.value"
                  class="filter-option"
                  :class="{ 'selected': selectedDateFilter === dateOption.value }"
                >
                  <input 
                    type="radio" 
                    :value="dateOption.value" 
                    v-model="selectedDateFilter"
                    @change="applyFilters"
                    class="filter-radio"
                  />
                  <span class="filter-option-text">{{ dateOption.label }}</span>
                  <span class="filter-count">({{ getDateFilterCount(dateOption.value) }})</span>
                </label>
                
                <!-- Custom Date Picker -->
                <div v-if="selectedDateFilter === 'custom'" class="custom-date-section">
                  <div class="date-picker-wrapper">
                    <input 
                      type="date" 
                      v-model="customDate"
                      @change="applyFilters"
                      class="custom-date-input"
                      :max="maxDate"
                    />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 2V5M16 2V5M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Tags Filter (Searchable dropdown, no creation) -->
            <div class="filter-section" ref="tagFilterField">
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
                    class="form-control tag-search-input"
                    placeholder="Search tags..."
                    style="max-width:320px;"
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
                <div v-if="selectedTagsFilter.length" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
                  <span
                    v-for="tid in selectedTagsFilter"
                    :key="tid"
                    class="active-filter-tag"
                  >
                    {{ (allTagsForFilter.find(t => t.id === tid) || {}).name || 'Tag' }}
                    <button @click.stop="clearOneTagFilter(tid)" class="remove-filter-btn">×</button>
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
                <span v-if="selectedStatus !== 'all'" class="active-filter-tag">
                  {{ getStatusLabel(selectedStatus) }}
                  <button @click="clearStatusFilter" class="remove-filter-btn">×</button>
                </span>
                <span v-if="selectedDateFilter !== 'all'" class="active-filter-tag">
                  {{ getDateFilterLabel(selectedDateFilter) }}
                  <button @click="clearDateFilter" class="remove-filter-btn">×</button>
                </span>
                <span
                  v-for="tid in selectedTagsFilter"
                  :key="tid"
                  class="active-filter-tag"
                >
                  {{ (allTagsForFilter.find(t => t.id === tid) || {}).name || 'Tag' }}
                  <button @click="clearOneTagFilter(tid)" class="remove-filter-btn">×</button>
                </span>
              </div>
            </div>
            
            <!-- Results Summary -->
            <div class="filter-results-summary">
              <span class="results-text">
                Showing {{ filteredTasks.length }} of {{ activeTasks.length }} tasks
              </span>
            </div>
          </div>
        </div>
      <button @click="openAddTaskModal" class="create-task-btn">Create task</button>
      <button @click="downloadPDF" class="download-pdf-btn">Download PDF</button>
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
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </table>
    </div>

    <!-- Table Rows -->
    <div v-for="(task, index) in displayTasks"
         :key="task.id"
         :data-task-id="task.id"
         class="table-row"
         :class="{ 
           'highlighted-row': String(task.id) === String($route.query.highlightTaskId),
           'search-highlight': searchQuery.length > 0 && isTaskInSearchResults(task.id)
         }">
      <table>
        <tr>
          <td><strong>{{ getDisplayIndex(index) }}</strong></td>
          <td><strong>{{ task.sector_division }}</strong></td>
          <td>
            <strong>{{ task.description }}</strong>
          </td>
          <td v-html="task.action_to_be_taken" class="action-content-cell" 
              @click="debugContent(task)"></td>
          <td class="original-date-cell" :style="pdfMode ? 'vertical-align: top;' : ''">
            <span :class="getHighlightClass(task.review_date)">{{ formatDate(task.original_date) }}</span>
          </td>
          <td class="responsibility-cell" :style="pdfMode ? 'vertical-align: top;' : ''">
            <span :class="getHighlightClass(task.review_date)">{{ task.responsibility }}</span>
          </td>
          <td class="review-date-cell" :style="pdfMode ? 'vertical-align: top;' : ''">
            <span :class="getHighlightClass(task.review_date)">{{ formatDate(task.review_date) }}</span>
          </td>
          <td><span :class="statusClass[task.status || 'unknown']">{{ formatStatus(task.status) }}</span></td>
          <td class="actions-cell">
            <div class="action-menu-container">
              <button class="action-trigger"
                      :class="{ 'active': activeMenuId === task.id }"
                      @mouseenter="showActionMenu(task.id, $event)"
                      @mouseleave="hideActionMenu(task.id)"
                      :data-task-id="task.id">
                ⋮
              </button>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Global Action Menu (outside table structure) -->
    <div class="global-action-menu" 
         :class="{ 'show': activeMenuId }"
         :style="menuPosition"
         @mouseenter="keepMenuOpen"
         @mouseleave="hideActionMenu(activeMenuId)">
      <button @click="editTask(getCurrentTask()); forceHideMenu()" class="menu-item">Edit</button>
      <button v-if="canDelete(getCurrentTask())"
              @click="deleteTask(activeMenuId); forceHideMenu()"
              class="menu-item">Delete</button>
      <button v-if="canSendForReview(getCurrentTask())"
              @click="openReviewModal(getCurrentTask()); forceHideMenu()"
              class="menu-item">{{ getReviewButtonText(getCurrentTask()) }}</button>
      <button @click="openCommentsModal(getCurrentTask()); forceHideMenu()"
              class="menu-item">Reviews</button>
      <button v-if="canApprove(getCurrentTask())"
              @click="approveTask(getCurrentTask()); forceHideMenu()"
              class="menu-item">Approve</button>
      <button @click="openTagsModal(getCurrentTask())" class="menu-item tags">Tags</button>
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
    <TaskModal v-if="showTaskModal"
               :task="currentTask"
               :mode="taskModalMode"
               @close="closeTaskModal"
               @save="handleTaskSaved" />
    <ReviewModal v-if="showReviewModal"
                 :task="currentTask"
                 @close="closeReviewModal"
                 @send="sendForReview" />
    <CommentsModal v-if="showCommentsModal"
                   :task="currentTask"
                   @close="closeCommentsModal" />
  </div>
</template>

<script>
import TaskModal from '../components/TaskModal.vue'
import ReviewModal from '../components/ReviewModal.vue'
import CommentsModal from '../components/CommentsModal.vue'
import Datepicker from 'vuejs-datepicker'
// import ParticleBackground from './ParticleBackground.vue'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'


export default {
  name: 'TentativeDashboard',

  components: {
    TaskModal,
    ReviewModal,
    CommentsModal,
    Datepicker,
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
      pdfVisible: false,
      resizeTimeout: null,
      menuHideTimeout: null,
      searchQuery: '',
      showSearchSuggestions: false,
      searchSuggestions: [],
      searchStats: null,
      filteredTasks: [],
      searchDebounceTimeout: null,
      searchIndex: null, // For fast search indexing
      
      // Filter system data
      showFilterDropdown: false,
      selectedStatus: 'all',
      selectedDateFilter: 'all',
      customDate: '',
      maxDate: new Date().toISOString().split('T')[0], // Today's date for max constraint
      
      // Filter options
      statusOptions: [
        { value: 'all', label: 'All Statuses' },
        { value: 'draft', label: 'Draft' },
        { value: 'under_review', label: 'Under Review' },
        { value: 'approved', label: 'Approved' },
        { value: 'completed', label: 'Completed' }
      ],
      dateOptions: [
        { value: 'all', label: 'All Dates' },
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'tomorrow', label: 'Tomorrow' },
        { value: 'custom', label: 'Custom Date' }
      ],

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
      tagsModalTask: null
    }
  },
  watch: {
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
        })
      },
      deep: true
    }
  },
  computed: {
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
    userRole () {
      let abc = this.getCookie('user_info')
      if (abc) {
        return JSON.parse(abc).role.toLowerCase()
      }
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
      // Apply both search and filter
      let tasks = this.activeTasks
      
      // Apply status filter
      if (this.selectedStatus !== 'all') {
        tasks = tasks.filter(task => task.status === this.selectedStatus)
      }
      
      // Apply date filter
      if (this.selectedDateFilter !== 'all') {
        tasks = this.filterTasksByDate(tasks)
      }
      
      // NEW: Apply tags filter (ANY match)
      if (this.selectedTagsFilter && this.selectedTagsFilter.length > 0) {
        tasks = tasks.filter(task => {
          if (!task || !Array.isArray(task.tags) || task.tags.length === 0) return false
          const ids = task.tags.map(t => t.id)
          return ids.some(id => this.selectedTagsFilter.includes(id))
        })
      }
      
      // Apply search filter
      if (this.searchQuery.length > 0) {
        tasks = this.filteredTasks.filter(task => {
          // Check if task passes status filter
          if (this.selectedStatus !== 'all' && task.status !== this.selectedStatus) {
            return false
          }
          // Check if task passes date filter
          if (this.selectedDateFilter !== 'all' && !this.taskMatchesDateFilter(task)) {
            return false
          }
          return true
        })
      }
      
      return tasks
    },
    
    activeFiltersCount() {
      let count = 0
      if (this.selectedStatus !== 'all') count++
      if (this.selectedDateFilter !== 'all') count++
      if (this.selectedTagsFilter && this.selectedTagsFilter.length > 0) count++
      return count
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
    
    if (this.$route.query.highlightTaskId) {
      const row = document.querySelector(`[data-task-id="${this.$route.query.highlightTaskId}"]`)
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' })
        row.classList.add('highlight-transition')
      }
    }

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
    });
  },

  methods: {
    handleResize() {
      // Debounce resize events
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout)
      }
      this.resizeTimeout = setTimeout(() => {
        this.applyAutoScaling()
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
    async fetchTasksByDate() {
      try {
        const params = {
          date: this.selectedDate.toISOString().split('T')[0]
        }
        if (this.selectedTagsFilter && this.selectedTagsFilter.length) {
          // Send as repeated query keys so Rails parses as an Array: tags[]=1&tags[]=2
          params['tags[]'] = this.selectedTagsFilter.slice()
        }
        const response = await this.$http.secured.get('/tasks', { params })

        // Sort tasks by review_date (earliest first)
        const sortTasksByReviewDate = (tasks) => {
          return tasks.sort((a, b) => {
            const dateA = new Date(a.review_date)
            const dateB = new Date(b.review_date)
            return dateA - dateB
          })
        }

        this.activeTasks = sortTasksByReviewDate(response.data.active)
        this.completedTasks = sortTasksByReviewDate(response.data.completed)
        
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
        // Close dropdown when clicking outside
        this.$nextTick(() => {
          document.addEventListener('click', this.handleFilterClickOutside)
        })
      // Recompute tags in-use every time filter opens
      this.loadTagsForFilter()
      // prepare dropdown query each open
      this.filterTagQuery = ''
      this.showFilterTagDropdown = false
      } else {
        document.removeEventListener('click', this.handleFilterClickOutside)
      }
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
      // This method is called when filter options change
      // The actual filtering is handled in the computed displayTasks property
      console.log('Filters applied:', {
        status: this.selectedStatus,
        dateFilter: this.selectedDateFilter,
        customDate: this.customDate,
        tags: this.selectedTagsFilter
      })
    // No refetch needed for local filters (status/date/tags)
    },
    
    clearAllFilters() {
      this.selectedStatus = 'all'
      this.selectedDateFilter = 'all'
      this.customDate = ''
    this.selectedTagsFilter = []
    },
    
    clearStatusFilter() {
      this.selectedStatus = 'all'
    },
    
    clearDateFilter() {
      this.selectedDateFilter = 'all'
      this.customDate = ''
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
    
    filterTasksByDate(tasks) {
      if (this.selectedDateFilter === 'all') return tasks
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      return tasks.filter(task => {
        if (!task.review_date) return false
        
        const taskDate = new Date(task.review_date)
        taskDate.setHours(0, 0, 0, 0)
        
        switch (this.selectedDateFilter) {
          case 'today':
            return taskDate.getTime() === today.getTime()
          case 'yesterday':
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            return taskDate.getTime() === yesterday.getTime()
          case 'tomorrow':
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)
            return taskDate.getTime() === tomorrow.getTime()
          case 'custom':
            if (!this.customDate) return false
            const customDate = new Date(this.customDate)
            customDate.setHours(0, 0, 0, 0)
            return taskDate.getTime() === customDate.getTime()
          default:
            return true
        }
      })
    },
    
    taskMatchesDateFilter(task) {
      if (this.selectedDateFilter === 'all') return true
      if (!task.review_date) return false
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const taskDate = new Date(task.review_date)
      taskDate.setHours(0, 0, 0, 0)
      
      switch (this.selectedDateFilter) {
        case 'today':
          return taskDate.getTime() === today.getTime()
        case 'yesterday':
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          return taskDate.getTime() === yesterday.getTime()
        case 'tomorrow':
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          return taskDate.getTime() === tomorrow.getTime()
        case 'custom':
          if (!this.customDate) return false
          const customDate = new Date(this.customDate)
          customDate.setHours(0, 0, 0, 0)
          return taskDate.getTime() === customDate.getTime()
        default:
          return true
      }
    },
    
    getStatusCount(status) {
      if (status === 'all') return this.activeTasks.length
      return this.activeTasks.filter(task => task.status === status).length
    },
    
    getDateFilterCount(dateFilter) {
      if (dateFilter === 'all') return this.activeTasks.length
      return this.filterTasksByDate(this.activeTasks).length
    },
    
    getStatusLabel(status) {
      const option = this.statusOptions.find(opt => opt.value === status)
      return option ? option.label : status
    },
    
    getDateFilterLabel(dateFilter) {
      if (dateFilter === 'custom' && this.customDate) {
        return `Custom: ${new Date(this.customDate).toLocaleDateString()}`
      }
      const option = this.dateOptions.find(opt => opt.value === dateFilter)
      return option ? option.label : dateFilter
    },
    async downloadPDF() {
      try {
        const orientation = 'l';
        const pdf = new jsPDF(orientation, 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const marginX = 5;
        const marginY = 10;
        const usableWidth = pageWidth - marginX * 2;
        let position = marginY;

        pdf.setFontSize(12);
        pdf.setFont('Arial', 'bold');

        const headerText = 'DASHBOARD MEETING POINTS (MDoNER)';
        const headerWidth = pdf.getTextWidth(headerText);
        pdf.setFillColor(255, 255, 0);
        pdf.rect(104, 6, headerWidth + 1.25, 6, 'F');
        pdf.text(headerText, pageWidth / 2, marginY, { align: 'center' });

        // Date header
        const today = new Date();
        const options = { timeZone: 'Asia/Kolkata' };
        const formattedDate = today.toLocaleDateString('en-IN', options)
          .replace(/\//g, '.')
          .replace(/\b(\d)\b/g, '0$1');
        pdf.setFillColor(255, 255, 0);
        pdf.rect(pageWidth - marginX - 30.2, marginY - 4.5, 30.2, 6, 'F');
        pdf.text(`As on ${formattedDate}`, pageWidth - marginX, marginY, { align: 'right' });

        position += 1;

        // --- Custom Table Headers ---
        // Use precise manual placement for each header
        const columnWidths = [4, 9, 9, 135, 8, 9, 8]; // in mm
        const headers = [
          'S No.',
          'Sector/Division',
          'Description',
          'Action to be Taken',
          'Original Date',
          'Responsibility',
          'Review Date'
        ];
        const sumWidths = columnWidths.reduce((a, b) => a + b, 0);
        const scalingFactor = usableWidth / sumWidths;
        const scaledColumnWidths = columnWidths.map(w => w * scalingFactor);
        const headerOffsets = [0, 7.5, 17.5, -5, -27.5, -16.5, -7.5]; // mm, tweak as needed
        let xPosition = marginX;
        pdf.setFontSize(7.5);
        pdf.setFont('Arial', 'bold');
        // First loop: draw all header rectangles
        for (let i = 0; i < headers.length; i++) {
          const cellWidth = scaledColumnWidths[i];
          pdf.setFillColor(59, 130, 246);
          pdf.rect(xPosition, position, cellWidth, 8, 'F');
          xPosition += cellWidth;
        }
        // Second loop: draw all header texts (after rectangles)
        xPosition = marginX;
        for (let i = 0; i < headers.length; i++) {
          const cellWidth = scaledColumnWidths[i];
          const textX = xPosition + cellWidth / 2 + (headerOffsets[i] || 0);
          pdf.setTextColor(0, 0, 0);
          pdf.text(headers[i], textX + 3, position + 5.5, { align: 'center' });
          xPosition += cellWidth;
        }
        position += 8;

        // --- Process Rows ---
        const rows = document.querySelectorAll('.table-row');
        if (!rows.length) return;

        for (let i = 0; i < rows.length; i++) {
          const rowClone = rows[i].cloneNode(true);
          // Remove Status and Actions columns (8, 9) ONLY from the main row, not nested tables
          const tableInRow = rowClone.querySelector('table');
          const mainRow = tableInRow && tableInRow.rows[0];
          if (mainRow && mainRow.children.length >= 9) {
            // Remove 9th and 8th td (Status and Actions) from the main row only
            mainRow.removeChild(mainRow.children[8]); // 9th column (Actions)
            mainRow.removeChild(mainRow.children[7]); // 8th column (Status)
          }

          // Set fixed widths and enforce wrapping for all cells
          const tds = tableInRow.querySelectorAll('tr > td:not(table table td)');
          tds.forEach((td, index) => {
            td.style.width = `${scaledColumnWidths[index]}mm`;
            td.style.maxWidth = `${scaledColumnWidths[index]}mm`;
            td.style.minWidth = `${scaledColumnWidths[index]}mm`;
            td.style.boxSizing = 'border-box';
            td.style.wordBreak = 'break-word';
            td.style.overflowWrap = 'break-word';
            td.style.whiteSpace = 'pre-line';
            td.style.verticalAlign = 'middle';
            // Set vertical alignment based on column type
            // if (index === 3 || index === 4 || index === 5) { // Original Date, Responsibility, Review Date columns
              
            // } else {
            //   td.style.verticalAlign = 'top';
            // }
            td.style.fontSize = '10px';
            td.style.lineHeight = '1.3';
            td.style.padding = '2px 4px';
          });

          // Action column (index 3)
          const actionColumn = tableInRow.querySelector('td:nth-child(4)');
          if (actionColumn) {
            actionColumn.style.width = `${scaledColumnWidths[3]}mm`;
            actionColumn.style.maxWidth = `${scaledColumnWidths[3]}mm`;
            actionColumn.style.minWidth = `${scaledColumnWidths[3]}mm`;
            actionColumn.style.wordBreak = 'break-word';
            actionColumn.style.overflowWrap = 'break-word';
            actionColumn.style.whiteSpace = 'pre-line';
            actionColumn.style.fontSize = '10px';
            actionColumn.style.lineHeight = '1.3';
            actionColumn.style.verticalAlign = 'top';
            // Also apply to all nested elements
            actionColumn.querySelectorAll('*').forEach(el => {
              el.style.wordBreak = 'break-word';
              el.style.overflowWrap = 'break-word';
              el.style.whiteSpace = 'pre-line';
              el.style.fontSize = '10px';
              el.style.lineHeight = '1.3';
              el.style.maxWidth = '100%';
            });
          }

          // Add .pdf-capture-mode for PDF-specific styles
          rowClone.classList.add('pdf-capture-mode');
          tableInRow.style.tableLayout = 'fixed';
          tableInRow.style.width = `${usableWidth}mm`;
          tableInRow.style.maxWidth = `${usableWidth}mm`;
          tableInRow.style.borderCollapse = 'collapse';

          // Temporary container
          const tempDiv = document.createElement('div');
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          tempDiv.style.background = '#fff';
          tempDiv.style.width = `${usableWidth}mm`;
          rowClone.style.width = `${usableWidth}mm`;
          tempDiv.appendChild(rowClone);
          document.body.appendChild(tempDiv);

          try {
            const canvas = await html2canvas(rowClone, {
              scale: 2,
              useCORS: true,
              backgroundColor: null,
              width: usableWidth * 3.78, // px per mm
              logging: true,
              allowTaint: true,
              letterRendering: true,
              fontFamilyCSS: '*',
              onclone: (clonedDoc) => {
                clonedDoc.body.style.overflow = 'visible';
                clonedDoc.body.style.position = 'static';
              }
            });

            // Page management (unchanged)
            let renderedHeight = 0;
            while (renderedHeight < canvas.height) {
              const sliceHeightPx = Math.min(
                ((pageHeight - position - 10) * canvas.width) / usableWidth,
                canvas.height - renderedHeight
              );

              const sliceCanvas = document.createElement('canvas');
              sliceCanvas.width = canvas.width;
              sliceCanvas.height = sliceHeightPx;
              const sliceCtx = sliceCanvas.getContext('2d');
              sliceCtx.drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

              const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 1.0);
              const sliceImgHeight = (sliceHeightPx * usableWidth) / canvas.width;

              pdf.addImage(sliceImgData, 'JPEG', marginX, position, usableWidth + 1, sliceImgHeight);

              renderedHeight += sliceHeightPx;
              position += sliceImgHeight;

              if (renderedHeight < canvas.height) {
                pdf.addPage(orientation, 'a4');
                position = marginY;
                xPosition = marginX;
                pdf.setFontSize(12);
                pdf.setFont('Arial', 'bold');
                // Main title
                const headerText = 'DASHBOARD MEETING POINTS (MDoNER)';
                const headerWidth = pdf.getTextWidth(headerText);
                pdf.setFillColor(255, 255, 0);
                pdf.rect(104, 6, headerWidth + 1.25, 6, 'F');
                pdf.text(headerText, pageWidth / 2, marginY, { align: 'center' });
                // Date header
                const today = new Date();
                const options = { timeZone: 'Asia/Kolkata' };
                const formattedDate = today.toLocaleDateString('en-IN', options)
                  .replace(/\//g, '.')
                  .replace(/\b(\d)\b/g, '0$1');
                pdf.setFillColor(255, 255, 0);
                pdf.rect(pageWidth - marginX - 30.2, marginY - 4.5, 30.2, 6, 'F');
                pdf.text(`As on ${formattedDate}`, pageWidth - marginX, marginY, { align: 'right' });
                position += 1;
                pdf.setFontSize(7.5);
                pdf.setFont('Arial', 'bold');
                xPosition = marginX;
                headers.forEach((header, index) => {
                  const cellWidth = scaledColumnWidths[index];
                  const textWidth = pdf.getTextWidth(header);
                  pdf.setFillColor(59, 130, 246);
                  pdf.rect(xPosition, position, cellWidth, 8, 'F');
                  // Center header text in the cell, with optional offset
                  const textX = xPosition + cellWidth / 2 + (headerOffsets[index] || 0);
                  pdf.text(header, textX, position + 5.5, { align: 'center' });
                  xPosition += cellWidth;
                });
                position += 10;
              }
            }
            document.body.removeChild(tempDiv);
          } catch (error) {
            console.error(`Row ${i} error:`, error);
            document.body.removeChild(tempDiv);
          }
        }
        pdf.save('dashboard.pdf');
      } catch (error) {
        console.error('PDF generation failed:', error);
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

    async deleteTask (taskId) {
      if (confirm('Are you sure you want to delete this task?')) {
        try {
          await this.$http.secured.delete(`/task/${taskId}`)
          this.$toast.success('Task deleted successfully!')
          await this.fetchTasksByDate()
        } catch (error) {
          console.error('Error deleting task:', error)
          this.$toast.error('Failed to delete task.')
        }
      }
    },

    openReviewModal (task) {
      if (!task) return;
      this.currentTask = task
      this.showReviewModal = true
    },

    async sendForReview (reviewerId) {
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
      if (!task) return;
      this.currentTask = task
      this.showCommentsModal = true
    },

    async approveTask (task) {
      if (!task) return;
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

    showActionMenu(taskId, event) {
      // Clear any pending hide timeout
      if (this.menuHideTimeout) {
        clearTimeout(this.menuHideTimeout);
        this.menuHideTimeout = null;
      }
      // Reset tags popover whenever menu is opened/hovered
      this.showTagsForTaskId = null;

      // Calculate global position for the dropdown
      const trigger = event ? event.target : document.querySelector(`[data-task-id="${taskId}"]`);
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        const menuWidth = 180;
        const menuHeight = 200; // Approximate menu height
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate position with viewport boundary checks
        // Position menu directly below the trigger with slight overlap to prevent gaps
        let top = rect.bottom + 2; // Reduced gap
        let left = rect.right - menuWidth;
        
        // Adjust if menu would go off-screen
        if (left < 10) {
          left = rect.left; // Align to left of trigger
        }
        if (top + menuHeight > viewportHeight) {
          top = rect.top - menuHeight - 2; // Show above trigger with reduced gap
        }
        
        this.menuPosition = {
          position: 'fixed',
          top: `${Math.max(10, top)}px`,
          left: `${Math.max(10, Math.min(left, viewportWidth - menuWidth - 10))}px`,
          zIndex: '99999'
        };
      }
      this.activeMenuId = taskId;
    },

    hideActionMenu(taskId) {
      // Add a delay before hiding to allow mouse movement to menu
      this.menuHideTimeout = setTimeout(() => {
      if (this.activeMenuId === taskId) {
        this.activeMenuId = null;
        this.showTagsForTaskId = null;
      }
      }, 300); // 300ms delay
    },

    keepMenuOpen() {
      // Clear the hide timeout when hovering over menu
      if (this.menuHideTimeout) {
        clearTimeout(this.menuHideTimeout);
        this.menuHideTimeout = null;
      }
    },

    forceHideMenu() {
      // Immediately hide menu (for clicks, etc.)
      if (this.menuHideTimeout) {
        clearTimeout(this.menuHideTimeout);
        this.menuHideTimeout = null;
      }
      this.activeMenuId = null;
      this.showTagsForTaskId = null;
    },

    handleClickOutside(event) {
      // Close menu if clicking outside of menu or trigger
      if (this.activeMenuId) {
        const menu = document.querySelector('.global-action-menu.show');
        const trigger = document.querySelector(`[data-task-id="${this.activeMenuId}"]`);
        
        if (menu && !menu.contains(event.target) && 
            trigger && !trigger.contains(event.target)) {
          this.forceHideMenu();
          this.showTagsForTaskId = null;
        }
      }
    },

    getCurrentTask() {
      if (!this.activeMenuId || !this.activeTasks || !Array.isArray(this.activeTasks)) {
        return null;
      }
      return this.activeTasks.find(task => task && task.id === this.activeMenuId) || null;
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

      // Get all action nodes in this task
      const actionNodes = actionCell.querySelectorAll('.action-node');
      actionNodes.forEach(node => {
        if (node.classList.contains('has-reviewer')) {
          const reviewerName = node.dataset.reviewerName;
          if (!reviewerName) return;

          // Create reviewer badge
          const badge = document.createElement('div');
          badge.className = 'reviewer-badge-parallel yellow-bg-bold';
          badge.textContent = reviewerName;

          // Apply inline styles directly
          Object.assign(badge.style, {
            backgroundColor: '#ffeb3b',
            fontWeight: 'bold',
            borderRadius: '4px',
            padding: '2px 6px',
            display: 'inline-block',
            color: '#000000',
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


 /* Filter button - compact styling like FinalDashboard */
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


.filter-btn:hover {
   background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
   transform: translateY(-1px);
   box-shadow: 0 4px 8px rgba(30, 58, 138, 0.3);
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
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(30, 58, 138, 0.2);
  min-width: 120px;
  justify-content: center;
}

.filter-btn:hover {
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(30, 58, 138, 0.3);
}

.filter-btn.active {
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
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
  width: 380px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e7eb;
  z-index: 1000;
  animation: dropdownSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
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
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom: 1px solid #e5e7eb;
}

.filter-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.clear-filters-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-filters-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.filter-section {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
}

.filter-section:last-child {
  border-bottom: none;
}

.filter-section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: #374151;
  font-weight: 600;
  font-size: 0.9rem;
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
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: #374151;
  font-weight: 600;
  font-size: 0.85rem;
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
  padding: 0.5rem 0.75rem;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid #bfdbfe;
}

.remove-filter-btn {
  background: none;
  border: none;
  color: #1e40af;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.remove-filter-btn:hover {
  background: #1e40af;
  color: white;
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
  padding: 1rem 1.5rem;
  background: #f0f9ff;
  border-top: 1px solid #e0f2fe;
  text-align: center;
}

.results-text {
  font-size: 0.85rem;
  color: #0369a1;
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 768px) {
  .filter-dropdown {
    width: 320px;
    right: -50px;
  }
  
  .filter-btn {
    min-width: 100px;
    padding: 0.875rem 1.25rem;
  }
}

@media (max-width: 480px) {
  .filter-dropdown {
    width: 280px;
    right: -80px;
  }
  
  .filter-section {
    padding: 1rem;
  }
  
  .filter-header {
    padding: 1rem;
  }
}


.pdf-capture-mode td:nth-child(4) {
  overflow: visible !important;
  padding: 5px !important;
}

.pdf-capture-mode td:nth-child(4) * {
  transform-origin: top left !important;
  display: inline-block !important; /* Required for proper scaling */
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
   padding: 0.75rem;
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

.table-row td {
   padding: 0.75rem;
   color: #495057;
   font-size: 0.8rem;
  vertical-align: top;
   line-height: 1.4;
  white-space: normal;
  word-break: break-word;
   border-right: 1px solid #f8f9fa;
   background: white;
   overflow: hidden;
 }



 .table-row td:last-child {
   border-right: none;
 }

 /* Optimized Column widths - Maximum space for Action column */
.table-headers th:nth-child(1),
 .table-row td:nth-child(1) { 
   width: 5%; 
   min-width: 50px;
 }

.table-headers th:nth-child(2),
 .table-row td:nth-child(2) { 
   width: 10%; 
   min-width: 100px;
 }

.table-headers th:nth-child(3),
 .table-row td:nth-child(3) { 
   width: 12%; 
   min-width: 120px;
 }

.table-headers th:nth-child(4),
 .table-row td:nth-child(4) { 
   width: 55%; 
   min-width: 400px;
   overflow: hidden !important;
   word-wrap: break-word;
   white-space: normal;
   text-align: left !important;
 }

.table-headers th:nth-child(5),
 .table-row td:nth-child(5) { 
   width: 6%; 
   min-width: 70px;
 }

.table-headers th:nth-child(6),
 .table-row td:nth-child(6) { 
   width: 8%; 
   min-width: 90px;
 }

.table-headers th:nth-child(7),
 .table-row td:nth-child(7) { 
   width: 4%; 
   min-width: 50px;
 }

.table-headers th:nth-child(8),
.table-row td:nth-child(8) { width: 8%; }

.table-headers th:nth-child(9),
.table-row td:nth-child(9) { width: 5%; }


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

/* Actions cell styling */
.actions-cell {
  padding: 1rem 0.8rem !important;
  text-align: center !important;
  vertical-align: top !important;
  overflow: visible !important;
  position: static !important; /* Remove stacking context */
}

.table-row td:nth-child(8) {
  padding: 1rem 0.8rem !important;
  text-align: left !important;
  vertical-align: top !important;
  overflow: visible !important;
  position: relative;
}

.action-menu-container {
  position: static; /* Remove stacking context */
  overflow: visible !important;
  display: flex;
  justify-content: center;
  align-items: center;
}

.action-trigger {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B7280;
  font-size: 1.25rem;
  transition: all 0.2s;
  cursor: pointer;
}

.action-trigger:hover {
  background: #F3F4F6;
  color: #374151;
  transform: scale(1.1);
}

/* Active state when menu is open */
.action-trigger.active {
  background: #EBF4FF;
  color: #2563EB;
  transform: scale(1.1);
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
.pdf-capture-mode ul {
  list-style: none !important;
  padding-left: 1.5em;
}
.pdf-capture-mode ul li::before {
  content: '• ';
  color: #222;
  font-size: 1em;
  margin-right: 4px;
}

.pdf-capture-mode ol {
  list-style: none !important;
  counter-reset: pdfcounter;
  padding-left: 1.5em;
}
.pdf-capture-mode ol li {
  counter-increment: pdfcounter;
}
.pdf-capture-mode ol li::before {
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

 /* Compact table styling within action content */
 .action-content-cell table {
   width: 100% !important;
   max-width: 100% !important;
   border-collapse: collapse !important;
   margin: 0.4rem 0 !important;
   font-size: 0.75rem !important;
   table-layout: auto !important;
   overflow-wrap: break-word !important;
   /* Smooth transition for table scaling */
   transition: transform 0.3s ease;
   transform-origin: top left;
 }

 .action-content-cell table th,
 .action-content-cell table td {
   border: 1px solid #222 !important;
   padding: 3px !important;
   text-align: center !important;
   vertical-align: middle !important;
   word-wrap: break-word !important;
   overflow-wrap: break-word !important;
   font-size: 10px !important;
 }

 .action-content-cell table th {
   background-color: #f3f4f6 !important;
   font-weight: 600 !important;
   font-size: 0.7rem !important;
 }

 .action-content-cell table td {
   font-size: 0.7rem !important;
 }

/* 🎯 UNIFIED: Clean Action Node Hierarchical Styling with DEEP SELECTORS */
.action-content-cell /deep/ .action-node {
   display: flex !important;
   align-items: flex-start !important;
  margin: 4px 0 !important;
  padding: 2px 0 !important;
   line-height: 1.4 !important;
  font-size: inherit !important; /* Prevent auto-scaling interference */
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
 .table-row td:nth-child(4) {
   min-width: 400px !important; /* Force minimum width for action column */
   width: 55% !important;
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

/* PDF Export: Strict fixed layout and wrapping for .pdf-capture-mode */
.pdf-capture-mode table {
  table-layout: fixed !important;
  width: 100% !important;
  border-collapse: collapse !important;
  border: 1px solid #ddd !important;
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
  /* Action to be Taken column: max width, strict wrapping */
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  white-space: pre-line !important;
  font-size: 10px !important;
  line-height: 1.3 !important;
  vertical-align: top !important;
  max-width: 90mm !important;
  min-width: 90mm !important;
  width: 90mm !important;
}
.pdf-capture-mode td * {
  word-break: break-word !important;
  overflow-wrap: break-word !important;
  white-space: pre-line !important;
  max-width: 100% !important;
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
.pdf-capture-mode table table {
  table-layout: fixed !important;
  width: 100% !important;
  border-collapse: collapse !important;
}
.pdf-capture-mode table table th, .pdf-capture-mode table table td {
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

/* PDF-specific: Remove all vertical gap between lines in action content for testing */
.pdf-capture-mode .action-content-cell *,
.pdf-capture-mode .action-node,
.pdf-capture-mode .action-node * {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  line-height: 1.1 !important;
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
  max-height: 156px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 25px rgba(0,0,0,0.12);
  padding: 4px 0;
  overflow-x: hidden;
}
.filter-tag-suggest-item {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 10px 14px;
  margin: 0;
  font-size: 13px;
  color: #1f2937;
  cursor: pointer;
}
.filter-tag-suggest-item:hover { background: #f9fafb; }
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

<!-- GLOBAL TABLE BOUNDARY STYLES: Not scoped, only border/padding, no background/color override -->
<style>
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
</style>
