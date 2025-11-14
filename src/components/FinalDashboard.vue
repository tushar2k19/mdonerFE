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
         class="table-row"
         :class="{ 
           'search-highlight': searchQuery.length > 0 && isTaskInSearchResults(task.id)
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
  </div>
</template>

<script>
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default {
  name: 'FinalDashboard',

  data () {
    return {
      selectedDate: new Date(),
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
      fdFilterTagDropdownFlip: false
      ,
      // Row tags popover
      showRowTagsPopover: false,
      rowTagsPopoverTask: null,
      rowTagsPopoverStyle: {}
    }
  },

  watch: {
    approvedTasks: {
      handler() {
        this.$nextTick(() => {
          this.applyAutoScaling()
        })
      },
      deep: true
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
      
      // Apply filters first
      if (this.hasActiveFilters) {
        tasks = this.applyFiltersToTasks(tasks)
      }
      
      // Then apply search
      if (this.searchQuery.length > 0) {
        tasks = this.filteredTasks
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
             (this.selectedTagsFilter && this.selectedTagsFilter.length > 0)
    },
    activeFiltersCount() {
      let count = 0
      if (this.filters.reviewDate !== 'all') count++
      if (this.selectedTagsFilter && this.selectedTagsFilter.length > 0) count++
      return count
    },
    fdFilteredFilterTagSuggestions () {
      const q = (this.filterTagQuery || '').trim().toLowerCase()
      if (!q) return this.allTagsForFilter.slice(0, 20)
      const starts = this.allTagsForFilter.filter(t => t.name.toLowerCase().startsWith(q))
      const contains = this.allTagsForFilter.filter(t => !t.name.toLowerCase().startsWith(q) && t.name.toLowerCase().includes(q))
      return [...starts, ...contains].slice(0, 20)
    }
  },

  created () {
    this.fetchApprovedTasks()
  },

  mounted() {
    // Re-apply scaling on window resize
    window.addEventListener('resize', this.handleResize)
    
    // Add click outside handler for filter dropdown
    document.addEventListener('click', this.handleClickOutside)

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

    async fetchApprovedTasks() {
      try {
        const response = await this.$http.secured.get('/tasks/approved', {
          params: {
            date: this.selectedDate.toISOString().split('T')[0]
          }
        })
        
        // Debug: Log the actual data received
        console.log('Raw approved tasks data:', response.data.tasks)
        
        // Sort tasks by review_date (earliest first)
        const sortTasksByReviewDate = (tasks) => {
          return tasks.sort((a, b) => {
            const dateA = new Date(a.review_date)
            const dateB = new Date(b.review_date)
            return dateA - dateB
          })
        }

        this.approvedTasks = sortTasksByReviewDate(response.data.tasks)
        
        // Debug: Log processed tasks with review dates
        console.log('Processed approved tasks with review dates:', this.approvedTasks.map(task => ({
          id: task.id,
          description: task.description,
          review_date: task.review_date,
          review_date_type: typeof task.review_date,
          review_date_parsed: task.review_date ? new Date(task.review_date) : null
        })))
        
        // Apply auto-scaling after tasks are loaded
        this.$nextTick(() => {
          this.applyAutoScaling()
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
      
      // Create a temporary element to process the HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = content
      
      // Process hierarchical lists similar to TentativeDashboard
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

    async downloadPDF() {
      this.pdfVisible = true
      this.pdfMode = true
      
      try {
        await this.$nextTick()
        
        const element = document.querySelector('.dashboard-container')
        if (!element) {
          throw new Error('Dashboard container not found')
        }
        
        // Clone the element for PDF generation
        const clonedElement = element.cloneNode(true)
        clonedElement.style.width = '1200px'
        clonedElement.style.backgroundColor = 'white'
        clonedElement.style.padding = '20px'
        
        // Hide action buttons and modify for PDF
        const actionElements = clonedElement.querySelectorAll('.dashboard-actions')
        actionElements.forEach(el => {
          el.style.display = 'none'
        })
        
        // Process PDF content
        const iframe = document.createElement('iframe')
        iframe.style.position = 'absolute'
        iframe.style.left = '-9999px'
        iframe.style.width = '1200px'
        iframe.style.height = '800px'
        document.body.appendChild(iframe)
        
        const doc = iframe.contentDocument
        doc.open()
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Final Dashboard</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .dashboard-container { max-width: 1200px; margin: 0 auto; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 11px; vertical-align: middle !important; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .table-headers th { background-color: #4a90e2; color: white; }
              .status-approved { background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; }
              .action-content-cell { max-width: 300px; word-wrap: break-word; }
              .list-marker { font-weight: bold; margin-right: 5px; }
              .yellow-bg-bold { background: #ffeb3b !important; font-weight: bold !important; border-radius: 4px; padding: 2px 6px; display: inline-block; vertical-align: middle; }
            </style>
          </head>
          <body class="pdf-capture-mode">
            <h1 style="text-align: center; color: #333; margin-bottom: 30px;">Final Dashboard - Approved Tasks</h1>
            <p style="text-align: center; color: #666; margin-bottom: 30px;">Generated on ${new Date().toLocaleDateString()}</p>
            ${clonedElement.outerHTML}
          </body>
          </html>
        `)
        doc.close()
        
        setTimeout(async () => {
          try {
            const canvas = await html2canvas(doc.body, {
              width: 1200,
              height: doc.body.scrollHeight,
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff'
            })
            
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const marginX = 10
            const usableWidth = pageWidth - (marginX * 2)
            
            let position = 20
            let renderedHeight = 0
            
            while (renderedHeight < canvas.height) {
              const sliceHeightPx = Math.min(canvas.height - renderedHeight, (pageHeight - 40) * canvas.width / usableWidth)
              
              const sliceCanvas = document.createElement('canvas')
              sliceCanvas.width = canvas.width
              sliceCanvas.height = sliceHeightPx
              const sliceCtx = sliceCanvas.getContext('2d')
              sliceCtx.drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)
              
              const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 1.0)
              const sliceImgHeight = (sliceHeightPx * usableWidth) / canvas.width
              
              pdf.addImage(sliceImgData, 'JPEG', marginX, position, usableWidth + 1, sliceImgHeight)
              
              renderedHeight += sliceHeightPx
              
              if (renderedHeight < canvas.height) {
                pdf.addPage()
                position = 20
              }
            }
            
            pdf.save('final-dashboard.pdf')
            document.body.removeChild(iframe)
          } catch (error) {
            console.error('PDF generation failed:', error)
            document.body.removeChild(iframe)
          }
        }, 1000)
        
      } catch (error) {
        console.error('PDF generation failed:', error)
      } finally {
        this.pdfVisible = false
        this.pdfMode = false
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
</style>

<style>
.pdf-capture-mode .yellow-bg-bold {
  background: #ffeb3b !important;
  font-weight: bold !important;
  border-radius: 4px !important;
  padding: 2px 6px !important;
  display: inline-block !important;
  vertical-align: middle !important;
}
.pdf-capture-mode .red-text {
  color: #d32f2f !important;
}
.pdf-capture-mode .black-text {
  color: #222 !important;
}

/* Ensure bold styling for S.No, Sector/Division, and Description columns in PDF */
.pdf-capture-mode td:nth-child(1) strong,
.pdf-capture-mode td:nth-child(2) strong,
.pdf-capture-mode td:nth-child(3) strong {
  font-weight: bold !important;
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
</style>
