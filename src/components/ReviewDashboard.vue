<template>
  <div class="review-dashboard">
    <!-- Header Section - More Compact -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="page-title">
          <i class="fas fa-clipboard-check"></i>
          Review Dashboard
        </h1>
        <p class="page-subtitle">Manage and track review progress across all tasks</p>
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="main-content">
      <!-- Status Legend -->
      <!-- <div class="status-legend">
        <div class="legend-title">Status Guide:</div>
        <div class="legend-items">
          <div class="legend-item" data-tooltip="No response from reviewer yet">
            <span class="status-indicator pending"></span>
            <span>Pending Review</span>
          </div>
          <div class="legend-item" data-tooltip="Reviewer has added comments/requested changes">
            <span class="status-indicator with-comments"></span>
            <span>With Comments</span>
          </div>
          <div class="legend-item" data-tooltip="Review has been approved">
            <span class="status-indicator approved"></span>
            <span>Approved</span>
          </div>
          <div class="legend-item" data-tooltip="Review forwarded to another reviewer">
            <span class="status-indicator forwarded"></span>
            <span>Forwarded</span>
          </div>
        </div>
      </div> -->

      <!-- Search and Filter Controls -->
      <div class="controls-section">
        <!-- Filter Controls -->
        <div class="filter-controls">
          <div class="filter-buttons-container">
            <div class="filter-buttons">
              <button 
                class="filter-btn"
                :class="{ active: activeFilter === 'all' }"
                @click="setFilter('all')"
              >
                <i class="fas fa-list"></i>
                <span>All Reviews</span>
                <span class="count">({{ filteredReviews.length }})</span>
              </button>
              <button 
                class="filter-btn"
                :class="{ active: activeFilter === 'pending' }"
                @click="setFilter('pending')"
              >
                <i class="fas fa-clock"></i>
                <span>Pending</span>
                <span class="count">({{ pendingCount }})</span>
              </button>
              <button 
                class="filter-btn"
                :class="{ active: activeFilter === 'approved' }"
                @click="setFilter('approved')"
              >
                <i class="fas fa-check-circle"></i>
                <span>Approved</span>
                <span class="count">({{ approvedCount }})</span>
              </button>
              <button 
                class="filter-btn"
                :class="{ active: activeFilter === 'with-comments' }"
                @click="setFilter('with-comments')"
              >
                <i class="fas fa-comments"></i>
                <span>With Comments</span>
                <span class="count">({{ withCommentsCount }})</span>
              </button>
            </div>
          </div>
          
          <!-- Search Bar and Controls - Moved to extreme right -->
          <div class="search-and-controls">
            <!-- Search Bar -->
            <div class="search-section">
              <div class="search-input-wrapper">
                <i class="fas fa-search search-icon"></i>
                <input 
                  type="text" 
                  class="search-input"
                  placeholder="Search by task description..."
                  v-model="searchQuery"
                  @input="onSearchInput"
                >
                <button 
                  v-if="searchQuery" 
                  class="clear-search-btn"
                  @click="clearSearch"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div class="control-actions">
              <!-- Items per page selector -->
              <div class="items-per-page">
                <label>Show:</label>
                <select v-model="pageSize" @change="onPageSizeChange" class="page-size-select">
                  <option :value="10">10</option>
                  <option :value="20">20</option>
                  <option :value="50">50</option>
                </select>
                <span>per page</span>
              </div>
              
              <button class="refresh-btn" @click="loadReviews" :disabled="loading">
                <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Loading reviews...</span>
        </div>
      </div>

      <!-- Reviews Table -->
      <div v-else class="table-container">
        <div class="table-wrapper">
          <table class="reviews-table">
            <thead>
              <tr>
                <th class="task-col">Task Description</th>
                <th class="date-col">Review Date</th>
                <th v-if="showReviewerColumn" class="reviewer-col">Reviewer</th>
                <th class="submitted-col">Submitted</th>
                <th class="status-col">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="paginatedReviews.length === 0" class="no-data-row">
                <td :colspan="showReviewerColumn ? 5 : 4" class="no-data">
                  <div class="no-data-content">
                    <i class="fas fa-inbox"></i>
                    <span>No reviews found for the selected filter</span>
                  </div>
                </td>
              </tr>
              <tr 
                v-for="review in paginatedReviews" 
                :key="review.id"
                class="review-row clickable-row"
                :class="getRowClass(review)"
                @click="viewReview(review.id)"
              >
                <!-- Task Description -->
                <td class="task-col">
                  <div class="task-info">
                    <div class="task-title">{{ review.task.description }}</div>
                    <div class="task-meta">
                      <span class="sector">{{ review.task.sector_division }}</span>
                      <span class="responsibility">{{ review.task.responsibility }}</span>
                    </div>
                  </div>
                </td>

                <!-- Task Review Date -->
                <td class="date-col">
                  <div class="date-info">
                    <span class="date-value">{{ formatDate(review.task.review_date) }}</span>
                    <span class="date-label">Review Due</span>
                  </div>
                </td>

                <!-- Reviewer Column (only for editors) -->
                <td v-if="showReviewerColumn" class="reviewer-col">
                  <div class="reviewer-info">
                    <i class="fas fa-user"></i>
                    <span>{{ review.reviewer.name }}</span>
                  </div>
                </td>

                <!-- Submitted On -->
                <td class="submitted-col">
                  <div class="date-info">
                    <span class="date-value">{{ formatDate(review.created_at) }}</span>
                    <span class="date-label">Submitted</span>
                  </div>
                </td>

                <!-- Status Column (moved to last) -->
                <td class="status-col">
                  <div class="status-badge" :class="getStatusClass(review)">
                    <i :class="getStatusIcon(review)"></i>
                    <span class="status-text">{{ getStatusText(review) }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination-container">
          <div class="pagination-info">
            Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, filteredReviews.length) }} 
            of {{ filteredReviews.length }} reviews
          </div>
          <div class="pagination-controls">
            <button 
              class="page-btn"
              :disabled="currentPage === 1"
              @click="goToPage(1)"
              title="First page"
            >
              <i class="fas fa-angle-double-left"></i>
            </button>
            <button 
              class="page-btn"
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
              title="Previous page"
            >
              <i class="fas fa-angle-left"></i>
            </button>
            
            <div class="page-numbers">
              <button
                v-for="page in visiblePages"
                :key="page"
                class="page-number"
                :class="{ active: page === currentPage, dots: page === '...' }"
                @click="page !== '...' && goToPage(page)"
                :disabled="page === '...'"
              >
                {{ page }}
              </button>
            </div>
            
            <button 
              class="page-btn"
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
              title="Next page"
            >
              <i class="fas fa-angle-right"></i>
            </button>
            <button 
              class="page-btn"
              :disabled="currentPage === totalPages"
              @click="goToPage(totalPages)"
              title="Last page"
            >
              <i class="fas fa-angle-double-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReviewDashboard',
  
  data() {
    return {
      reviews: [],
      loading: true,
      activeFilter: 'all',
      currentPage: 1,
      pageSize: 10,
      currentUserRole: null,
      searchQuery: '',
      searchDebounceTimer: null
    }
  },

  computed: {
    // Role-based column visibility
    showReviewerColumn() {
      return this.currentUserRole === 'editor'
    },

    // Filter counts
    pendingCount() {
      return this.reviews.filter(review => review.status === 'pending' && this.getCommentCount(review) === 0).length
    },
    
    approvedCount() {
      return this.reviews.filter(review => review.status === 'approved').length
    },
    
    withCommentsCount() {
      return this.reviews.filter(review => this.getCommentCount(review) > 0 && review.status !== 'approved').length
    },

    // Filtered reviews based on active filter and search
    filteredReviews() {
      let filtered = [...this.reviews]
      
      // Apply search filter first
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase().trim()
        filtered = filtered.filter(review => 
          review.task && review.task.description && 
          review.task.description.toLowerCase().includes(query)
        )
      }
      
      // Apply status filter
      switch (this.activeFilter) {
        case 'pending':
          filtered = filtered.filter(review => 
            review.status === 'pending' && this.getCommentCount(review) === 0
          )
          break
        case 'approved':
          filtered = filtered.filter(review => review.status === 'approved')
          break
        case 'with-comments':
          filtered = filtered.filter(review => 
            this.getCommentCount(review) > 0 && review.status !== 'approved'
          )
          break
        case 'all':
        default:
          // No filtering
          break
      }

      return filtered
    },

    // Pagination
    totalPages() {
      return Math.ceil(this.filteredReviews.length / this.pageSize)
    },

    paginatedReviews() {
      const start = (this.currentPage - 1) * this.pageSize
      const end = start + this.pageSize
      return this.filteredReviews.slice(start, end)
    },

    visiblePages() {
      const total = this.totalPages
      const current = this.currentPage
      const delta = 2
      
      if (total <= 7) {
        // Show all pages if total is small
        return Array.from({ length: total }, (_, i) => i + 1)
      }
      
      const range = []
      const rangeWithDots = []
      
      // Always show first page
      if (current > delta + 2) {
        rangeWithDots.push(1)
        rangeWithDots.push('...')
      } else {
        for (let i = 1; i <= Math.min(current + delta, total); i++) {
          rangeWithDots.push(i)
        }
      }
      
      // Show pages around current
      if (current > delta + 2 && current < total - delta - 1) {
        for (let i = current - delta; i <= current + delta; i++) {
          rangeWithDots.push(i)
        }
      }
      
      // Always show last page
      if (current < total - delta - 1) {
        rangeWithDots.push('...')
        rangeWithDots.push(total)
      } else if (current <= delta + 2) {
        // Already handled above
      } else {
        for (let i = Math.max(current - delta, 1); i <= total; i++) {
          if (!rangeWithDots.includes(i)) {
            rangeWithDots.push(i)
          }
        }
      }
      
      return [...new Set(rangeWithDots)]
    }
  },

  created() {
    this.getCurrentUserRole()
    this.restoreStateFromQuery()
    this.loadReviews()
  },

  watch: {
    activeFilter() {
      this.currentPage = 1 // Reset pagination when filter changes
      this.updateQueryParams()
    },
    
    currentPage() {
      this.updateQueryParams()
    },
    
    pageSize() {
      this.updateQueryParams()
    },
    
    searchQuery() {
      this.currentPage = 1 // Reset pagination when search changes
      this.updateQueryParams()
    }
  },

  methods: {
    getCurrentUserRole() {
      try {
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')
        this.currentUserRole = userInfo.role || 'editor'
      } catch (error) {
        console.error('Error parsing user info:', error)
        this.currentUserRole = 'editor'
      }
    },

    async loadReviews() {
      try {
        this.loading = true
        const response = await this.$http.secured.get('/reviews')
        
        if (response.data.success) {
          // Sort reviews by task review_date (nearest first), then by created_at (latest first)
          this.reviews = response.data.data.sort((a, b) => {
            // Primary sort: Task review date (nearest first)
            const dateA = new Date(a.task.review_date || '9999-12-31')
            const dateB = new Date(b.task.review_date || '9999-12-31')
            
            if (dateA.getTime() !== dateB.getTime()) {
              return dateA - dateB
            }
            
            // Secondary sort: Within same task, latest review first
            const createdA = new Date(a.created_at)
            const createdB = new Date(b.created_at)
            return createdB - createdA
          })
        } else {
          this.$toast.error('Failed to load reviews')
          this.reviews = []
        }
      } catch (error) {
        console.error('Error loading reviews:', error)
        this.$toast.error('Error loading reviews')
        this.reviews = []
      } finally {
        this.loading = false
      }
    },

    setFilter(filter) {
      this.activeFilter = filter
    },

    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page
      }
    },

    viewReview(reviewId) {
      // Preserve current state in query params before navigating
      this.updateQueryParams()
      this.$router.push(`/review/${reviewId}`)
    },

    restoreStateFromQuery() {
      const query = this.$route.query
      
      if (query.page) {
        this.currentPage = parseInt(query.page) || 1
      }
      
      if (query.pageSize) {
        this.pageSize = parseInt(query.pageSize) || 10
      }
      
      if (query.filter) {
        this.activeFilter = query.filter
      }
      
      if (query.search) {
        this.searchQuery = query.search
      }
    },

    updateQueryParams() {
      const query = {
        page: this.currentPage,
        pageSize: this.pageSize,
        filter: this.activeFilter
      }
      
      if (this.searchQuery.trim()) {
        query.search = this.searchQuery.trim()
      }
      
      // Only update if query actually changed
      if (JSON.stringify(query) !== JSON.stringify(this.$route.query)) {
        this.$router.replace({ query }).catch(() => {})
      }
    },

    onPageSizeChange() {
      this.currentPage = 1 // Reset to first page when changing page size
    },

    onSearchInput() {
      // Debounce search input for better performance
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer)
      }
      
      this.searchDebounceTimer = setTimeout(() => {
        // Search will trigger through watcher
      }, 300)
    },

    clearSearch() {
      this.searchQuery = ''
    },

    getStatusClass(review) {
      const commentCount = this.getCommentCount(review)
      
      if (review.status === 'approved') return 'approved'
      if (review.status === 'forwarded') return 'forwarded'
      if (commentCount > 0) return 'with-comments'
      return 'pending'
    },

    getStatusIcon(review) {
      const commentCount = this.getCommentCount(review)
      
      if (review.status === 'approved') return 'fas fa-check-circle'
      if (review.status === 'forwarded') return 'fas fa-share'
      if (commentCount > 0) return 'fas fa-comments'
      return 'fas fa-clock'
    },

    getStatusText(review) {
      const commentCount = this.getCommentCount(review)
      
      if (review.status === 'approved') return 'Approved'
      if (review.status === 'forwarded') return 'Forwarded'
      if (commentCount > 0) return 'With Comments'
      return 'Pending'
    },

    getRowClass(review) {
      return `status-${this.getStatusClass(review)}`
    },

    getCommentCount(review) {
      // Assuming comment_trail data is included in the review response
      return (review.comment_trail && review.comment_trail.comments && review.comment_trail.comments.length) || 0
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A'
      
      const date = new Date(dateString)
      const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }
      return date.toLocaleDateString('en-IN', options)
    }
  }
}
</script>

<style scoped>
/* Government Theme Styling with improved design */

.review-dashboard {
  background: #f8f9fa;
  min-height: 100vh;
  font-family: 'Segoe UI', 'Arial', 'Helvetica', sans-serif;
  width: 100%;
  overflow-x: hidden;
  font-size: 15px;
}

/* Header Section - More Compact */
.dashboard-header {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  color: white;
  padding: 1.5rem 0;
  margin-bottom: 0;
  width: 100vw;
  position: relative;
  left: 50%;
  right: 50%;
  margin-left: -50vw;
  margin-right: -50vw;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
}

.page-title {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-subtitle {
  font-size: 1rem;
  opacity: 0.9;
  margin: 0;
  font-weight: 400;
}

/* Main Content Container */
.main-content {
  max-width: 1600px;
  margin: 0 auto;
  padding: 1.5rem;
}

/* Status Legend */
.status-legend {
  margin-bottom: 2.5rem;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.legend-title {
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  position: relative;
  cursor: help;
  transition: all 0.2s ease;
  font-size: 1rem;
  font-weight: 500;
}

.legend-item:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  transform: translateY(-1px);
}

.legend-item:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  white-space: nowrap;
  z-index: 10;
  margin-bottom: 0.5rem;
}

.status-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.pending { background: #f59e0b; }
.status-indicator.with-comments { background: #ef4444; }
.status-indicator.approved { background: #10b981; }
.status-indicator.forwarded { background: #3b82f6; }

/* Search and Filter Controls */
.controls-section {
  margin-bottom: 1.5rem;
}

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filter-buttons-container {
  display: flex;
  justify-content: center;
}

.filter-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.filter-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1e40af;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.filter-btn.active {
  border-color: #1e40af;
  background: #1e40af;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
}

.filter-btn .count {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 700;
}

.filter-btn.active .count {
  background: rgba(255, 255, 255, 0.25);
}

/* Search and Controls Row */
.search-and-controls {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.search-section {
  max-width: 400px;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 1rem;
}

.clear-search-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.clear-search-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.control-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.items-per-page {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
  color: #374151;
  font-weight: 500;
}

.page-size-select {
  padding: 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-size-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: #059669;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  font-size: 0.95rem;
  box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);
}

.refresh-btn:hover:not(:disabled) {
  background: #047857;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loading State */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 5rem;
}

.loading-spinner {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #6b7280;
  font-size: 1.2rem;
  font-weight: 500;
}

/* Table Container */
.table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

/* Table Styling */
.reviews-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1rem;
}

.reviews-table thead {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 2px solid #e5e7eb;
}

.reviews-table th {
  padding: 1.5rem 1rem;
  text-align: left;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  font-size: 1rem;
  letter-spacing: 0.05em;
}

.reviews-table td {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

/* Clickable Row Styling */
.clickable-row {
  cursor: pointer;
  transition: all 0.3s ease;
}

.clickable-row:hover {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.clickable-row:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
}

/* Column Widths - Status moved to last */
/* Table Column Widths - Increased table width and redistributed columns */
.task-col { width: 40%; }
.date-col { width: 20%; }
.reviewer-col { width: 20%; }
.submitted-col { width: 20%; }
.status-col { width: 20%; }

/* Status Badge - Improved styling */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  white-space: nowrap;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.status-badge.pending {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border-color: #f59e0b;
}

.status-badge.with-comments {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
  border-color: #ef4444;
}

.status-badge.approved {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
  border-color: #10b981;
}

.status-badge.forwarded {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  border-color: #3b82f6;
}

/* Task Info */
.task-info {
  max-width: 100%;
}

.task-title {
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
  line-height: 1.4;
  font-size: 1.2rem;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.95rem;
  color: #6b7280;
}

.sector, .responsibility {
  font-weight: 500;
}

/* Date Info */
.date-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.date-value {
  font-weight: 600;
  color: #111827;
  font-size: 1.05rem;
}

.date-label {
  font-size: 0.95rem;
  color: #6b7280;
  font-weight: 500;
}

/* Reviewer Info */
.reviewer-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #374151;
  font-weight: 500;
  font-size: 1.05rem;
}

/* No Data State */
.no-data-row td {
  padding: 4rem;
  text-align: center;
}

.no-data-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  color: #6b7280;
}

.no-data-content i {
  font-size: 4rem;
  opacity: 0.5;
}

.no-data-content span {
  font-size: 1.2rem;
  font-weight: 500;
}

/* Enhanced Pagination */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-top: 2px solid #e5e7eb;
}

.pagination-info {
  color: #6b7280;
  font-size: 1rem;
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-btn, .page-number {
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover:not(:disabled), .page-number:hover:not(.dots) {
  background: #f3f4f6;
  border-color: #9ca3af;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-number.active {
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  color: white;
  border-color: #1e40af;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
}

.page-number.dots {
  cursor: default;
  background: transparent;
  border: none;
  color: #9ca3af;
}

.page-number.dots:hover {
  background: transparent;
  transform: none;
  box-shadow: none;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

/* Mobile Responsive - Enhanced */
@media (max-width: 768px) {
  .dashboard-header {
    padding: 2rem 0;
  }
  
  .header-content {
    padding: 0 1rem;
  }
  
  .main-content {
    padding: 1rem;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .legend-items {
    justify-content: center;
    gap: 1rem;
  }
  
  .legend-item {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
  
  .filter-buttons {
    justify-content: center;
    gap: 0.75rem;
  }
  
  .filter-btn {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }
  
  .search-and-controls {
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .search-section {
    max-width: none;
    width: 100%;
    margin-left: 0;
  }
  
  .control-actions {
    justify-content: center;
    width: 100%;
  }
  
  .table-wrapper {
    overflow-x: auto;
  }
  
  .reviews-table {
    min-width: 700px;
  }
  
  .reviews-table th,
  .reviews-table td {
    padding: 1rem 0.75rem;
  }
  
  .task-title {
    font-size: 1rem;
  }
  
  .pagination-container {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
    padding: 1.5rem;
  }
  
  .pagination-controls {
    justify-content: center;
  }
  
  .page-btn, .page-number {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    min-width: 36px;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding: 0.5rem;
  }
  
  .header-content {
    padding: 0 0.5rem;
  }
  
  .page-title {
    font-size: 1.75rem;
  }
  
  .filter-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
    gap: 0.5rem;
  }
  
  .filter-btn .count {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
  }
  
  .search-input {
    font-size: 0.875rem;
    padding: 0.875rem 2.5rem 0.875rem 2.5rem;
  }
  
  .reviews-table {
    font-size: 0.875rem;
    min-width: 600px;
  }
  
  .status-badge {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
  }
  
  .items-per-page {
    font-size: 0.875rem;
  }
  
  .page-size-select {
    font-size: 0.875rem;
    padding: 0.5rem;
  }
  
  .refresh-btn {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }
  
  .legend-item:hover::after {
    bottom: auto;
    top: 100%;
    margin-top: 0.5rem;
    margin-bottom: 0;
  }
}

/* Row Status Styling - Enhanced */
.review-row.status-pending {
  border-left: 4px solid #f59e0b;
}

.review-row.status-with-comments {
  border-left: 4px solid #ef4444;
}

.review-row.status-approved {
  border-left: 4px solid #10b981;
}

.review-row.status-forwarded {
  border-left: 4px solid #3b82f6;
}
</style>

