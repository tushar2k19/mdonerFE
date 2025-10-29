<template>
  <!-- Orange Gradient Background with Texture - Matching Signin Page -->
  <div class="dashboard-background">
    <div class="floating-shapes" aria-hidden="true">
      <div class="floating-circle circle-1"></div>
      <div class="floating-circle circle-2"></div>
      <div class="floating-circle circle-3"></div>
      <div class="floating-triangle triangle-1"></div>
      <div class="floating-triangle triangle-2"></div>
      <div class="floating-square square-1"></div>
      <div class="floating-square square-2"></div>
    </div>
    
    <!-- Main Content -->
    <main class="main-content pt-5 pb-6 md:pt-6 md:pb-8 relative z-10">
      <!-- Header Box with Orange Gradient and Depth -->
      <div class="dashboard-header-box mb-8">
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
          <div class="flex items-center gap-4">
            <!-- National Emblem PNG Image with Spinning Animation -->
            <img src="@/assets/logo.png" alt="National Emblem" style="width: 50px; height: 50px; animation: rotate 3s linear infinite; object-fit: contain;" />
            <div>
              <h1 class="text-3xl font-bold tricolor-text">Task Management Dashboard</h1>
              <p class="text-orange-100">Ministry of Development of North Eastern Region</p>
            </div>
          </div>
          <div class="bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-xl p-4 text-center shadow-lg date-card-header">
            <p class="font-semibold text-white today-text">Today</p>
            <p class="text-sm text-orange-100 date-text">{{ getCurrentDate() }}</p>
          </div>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div class="bg-white p-5 rounded-xl shadow-sm stat-card-orange transition-all duration-300 hover:-translate-y-1 border-l-4 border-orange-500">
          <div class="flex justify-between items-start">
            <div class="flex flex-col">
              <p class="text-gray-500 font-medium text-base">Total Tasks</p>
              <p class="text-5xl font-bold text-gray-900 my-3">{{ totalTasks }}</p>
              <p class="text-sm text-gray-400">Active approved tasks</p>
        </div>
            <div class="p-3 rounded-full bg-orange-50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
      </div>
          </div>
          <div class="mt-4 text-right">
            <span class="px-3 py-1 text-xs font-semibold rounded-full bg-orange-50 text-orange-700">ACTIVE</span>
        </div>
      </div>

        <div class="bg-white p-5 rounded-xl shadow-sm stat-card-blue transition-all duration-300 hover:-translate-y-1 border-l-4 border-blue-500">
          <div class="flex justify-between items-start">
            <div class="flex flex-col">
              <p class="text-gray-500 font-medium text-base">Action Items</p>
              <p class="text-5xl font-bold text-gray-900 my-3">{{ totalSubtasks }}</p>
              <p class="text-sm text-gray-400">Total sub-items</p>
        </div>
            <div class="p-3 rounded-full bg-blue-50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
          </div>
          <div class="mt-4 text-right">
            <span class="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">IN PROGRESS</span>
      </div>
    </div>

        <div class="bg-white p-5 rounded-xl shadow-sm stat-card-green transition-all duration-300 hover:-translate-y-1 border-l-4 border-green-500">
          <div class="flex justify-between items-start">
            <div class="flex flex-col">
              <p class="text-gray-500 font-medium text-base">Overall Progress</p>
              <p class="text-5xl font-bold text-gray-900 my-3">{{ overallProgress }}%</p>
              <p class="text-sm text-gray-400">{{ totalCompletedSubtasks }}/{{ totalSubtasks }} completed</p>
        </div>
            <div class="p-3 rounded-full bg-green-50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
              </div>
          <div class="mt-4 text-right">
            <span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700">ON TRACK</span>
            </div>
          </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div class="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col">
          <h2 class="text-xl font-semibold text-gray-800 mb-1">Task Completion Progress</h2>
          <p class="text-gray-500 text-sm mb-4">Real-time progress tracking</p>
          
          <div v-if="loading" class="text-center border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center flex-1">
            <div class="flex flex-col items-center">
              <div class="loading-spinner-new"></div>
              <p class="text-gray-500 mt-4">Loading tasks...</p>
        </div>
      </div>

          <div v-else-if="progressTasks.length === 0" class="text-center border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center flex-1">
            <p class="text-gray-500">No active tasks to display</p>
        </div>
          
          <div v-else class="flex-1">
            <div v-for="task in progressTasks" :key="task.id" class="progress-entry-new mb-4">
              <div class="flex justify-between items-center mb-2">
                <div class="flex-1">
                  <div class="font-semibold text-gray-800 text-sm">{{ task.description }}</div>
                  <div class="text-xs text-gray-500">{{ task.sector_division }}</div>
            </div>
                <span class="text-sm font-semibold text-blue-600 ml-4">{{ task.progress }}%</span>
          </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500" :style="{ width: task.progress + '%' }"></div>
        </div>
          </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col">
          <h2 class="text-xl font-semibold text-gray-800 mb-1">Overall Completion</h2>
          <p class="text-gray-500 text-sm mb-4">System-wide progress</p>
          <div class="flex flex-col items-center justify-center my-4">
            <div class="relative flex items-center justify-center">
              <svg height="160" width="160">
                <circle stroke="#e6e6e6" fill="transparent" stroke-width="12" r="65" cx="80" cy="80"></circle>
                <circle 
                  stroke="#22c55e" 
                  fill="transparent" 
                  stroke-width="12" 
                  :stroke-dasharray="circumference" 
                  :style="{ strokeDashoffset: strokeDashoffset, strokeLinecap: 'round' }" 
                  r="65" 
                  cx="80" 
                  cy="80" 
                  transform="rotate(-90 80 80)"
                  class="transition-all duration-1000"
                ></circle>
              </svg>
              <span class="absolute text-3xl font-bold text-gray-700">{{ overallProgress }}%</span>
            </div>
            <p class="mt-4 text-lg text-gray-600 font-medium">Complete</p>
          </div>
          <div class="flex justify-around pt-4 border-t border-gray-200 text-center">
            <div>
              <p class="flex items-center justify-center gap-2 font-bold text-lg text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ totalCompletedSubtasks }}
              </p>
              <p class="text-sm text-gray-500">Completed</p>
            </div>
            <div>
              <p class="flex items-center justify-center gap-2 font-bold text-lg text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ totalSubtasks - totalCompletedSubtasks }}
              </p>
              <p class="text-sm text-gray-500">Remaining</p>
            </div>
      </div>
    </div>

        <div class="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <div>
              <h2 class="text-xl font-semibold text-gray-800 mb-1 flex items-center gap-2">
                Approved Tasks 
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </h2>
              <p class="text-sm text-gray-500">🔥 {{ approvedTasks.length }} Active Tasks</p>
            </div>
            <div class="relative w-full md:w-auto md:max-w-xs">
        <input 
          v-model="searchQuery" 
          type="text" 
                placeholder="Search tasks by description, sector..." 
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400" 
              />
              <span class="absolute left-3 top-1/2 text-gray-400 pointer-events-none" style="transform: translateY(-50%); display: flex; align-items: center;">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
      </div>
    </div>

          <div v-if="loading" class="text-center py-20 border-2 border-dashed border-gray-200 rounded-lg">
            <div class="flex flex-col items-center">
              <div class="loading-spinner-new"></div>
              <p class="text-gray-500 mt-4">Loading tasks...</p>
            </div>
      </div>
      
          <div v-else-if="approvedTasks.length === 0" class="text-center py-20 border-2 border-dashed border-gray-200 rounded-lg">
            <p class="text-gray-500">No approved tasks found</p>
      </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="task in approvedTasks" 
          :key="task.id"
              class="task-card-new bg-white border border-gray-200 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div class="flex justify-between items-start mb-3">
                <span class="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{{ generateTaskCode(task) }}</span>
                <span class="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">Approved</span>
          </div>

              <h3 class="font-semibold text-gray-800 mb-3 line-clamp-2">{{ task.description }}</h3>
              
              <div class="space-y-2 text-sm mb-4">
                <div class="flex items-start">
                  <span class="text-gray-500 font-medium w-24 flex-shrink-0">Sector:</span>
                  <span class="text-gray-700">{{ task.sector_division }}</span>
              </div>
                <div class="flex items-start">
                  <span class="text-gray-500 font-medium w-24 flex-shrink-0">Review:</span>
                  <span class="text-gray-700">{{ formatDate(task.review_date) }}</span>
              </div>
                <div class="flex items-start">
                  <span class="text-gray-500 font-medium w-24 flex-shrink-0">Owner:</span>
                  <span class="text-gray-700">{{ task.responsibility }}</span>
              </div>
            </div>

              <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-xs text-gray-500">Progress</span>
                  <span class="text-xs font-semibold text-gray-700">{{ getTaskProgress(task) }}%</span>
              </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500" :style="{ width: getTaskProgress(task) + '%' }"></div>
              </div>
                <p class="text-xs text-gray-500 mt-1">{{ getCompletedSubtasks(task) }}/{{ getTotalSubtasks(task) }} items completed</p>
          </div>

              <button @click="openTaskDetails(task)" class="relative z-10 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-300">
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
    </main>

    <!-- Task Details Modal -->
    <div v-if="selectedTask" class="modal-overlay" @click="closeTaskDetails">
      <div class="task-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedTask.description }}</h3>
          <button @click="closeTaskDetails" class="close-btn">✕</button>
        </div>
        
        <div class="modal-content">
          <!-- Task Meta Information Grid -->
          <div class="task-meta-grid">
            <div class="meta-item">
              <span class="meta-label">Task ID:</span>
              <span class="meta-value">{{ generateTaskCode(selectedTask) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Sector:</span>
              <span class="meta-value">{{ selectedTask.sector_division }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Review Date:</span>
              <span class="meta-value">{{ formatDate(selectedTask.review_date) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Responsibility:</span>
              <span class="meta-value">{{ selectedTask.responsibility }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Progress:</span>
              <span class="meta-value">{{ getTaskProgress(selectedTask) }}% ({{ getCompletedSubtasks(selectedTask) }}/{{ getTotalSubtasks(selectedTask) }} items)</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Reviewed By:</span>
              <div class="reviewers-list">
                <span v-if="selectedTaskReviewers.length === 0" class="meta-value">No reviewers yet</span>
                <div v-else class="reviewer-badges">
                  <span v-for="reviewer in selectedTaskReviewers" :key="reviewer.id" class="reviewer-badge">
                    {{ reviewer.name }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Tags meta box (right after Reviewed By) -->
            <div class="meta-item tags-meta" @mouseenter="showAllTagsDropdown = true" @mouseleave="showAllTagsDropdown = false">
              <span class="meta-label">Tags:</span>
              <div class="tags-compact-row" ref="tagsCompactRow">
                <template v-if="selectedTaskTags.length">
                  <span v-for="t in visibleTags" :key="t.id" class="tag-chip">{{ t.name }}</span>
                  <span v-if="hiddenTagsCount > 0" class="tag-chip more-chip">+{{ hiddenTagsCount }} more</span>

                  <!-- Hover dropdown with all tags -->
                  <div v-if="showAllTagsDropdown && hiddenTagsCount > 0" class="all-tags-popover">
                    <span v-for="t in hiddenTags" :key="'hidden-' + t.id" class="tag-chip large">{{ t.name }}</span>
                  </div>
                </template>
                <span v-else class="meta-value">No tags</span>
              </div>
            </div>
          </div>

          <!-- Action Items Section -->
          <div class="action-items-section">
            <h4>Action Items</h4>
            <div class="action-content-display" v-html="getFormattedActionItems(selectedTask)"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home',
  
  data() {
    return {
      tasks: [],
      loading: true,
      searchQuery: '',
      selectedTask: null,
      selectedTaskReviewers: [],
      showAllTagsDropdown: false,
      visibleTagCount: 0,
      _onResizeTags: null
    }
  },
  
  computed: {
    approvedTasks() {
      if (!this.searchQuery) {
        return this.tasks
      }
      return this.tasks.filter(task => 
        (task.description && task.description.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (task.sector_division && task.sector_division.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (task.responsibility && task.responsibility.toLowerCase().includes(this.searchQuery.toLowerCase()))
      )
    },

    totalTasks() {
      return this.tasks.length
    },

    totalSubtasks() {
      return this.approvedTasks.reduce((total, task) => {
        return total + this.getTotalSubtasks(task);
      }, 0);
    },

    totalCompletedSubtasks() {
      return this.approvedTasks.reduce((total, task) => {
        return total + this.getCompletedSubtasks(task);
      }, 0);
    },

    overallProgress() {
      if (this.totalSubtasks === 0) return 0;
      return Math.round((this.totalCompletedSubtasks / this.totalSubtasks) * 1000) / 10;
    },

    progressTasks() {
      return this.approvedTasks.map(task => ({
        ...task,
        progress: this.getTaskProgress(task)
      }))
    },

    // Circular progress calculations
    circumference() {
      const radius = 65;
      return 2 * Math.PI * radius;
    },

    strokeDashoffset() {
      const progress = this.overallProgress || 0;
      return this.circumference - (progress / 100) * this.circumference;
    },

    recentTaskDescriptions() {
      return this.tasks.slice(0, 5).map(task => ({
          id: task.id,
        description: task.description.length > 40 ? 
          task.description.substring(0, 40) + '...' : 
          task.description
        }))
    },

    sampleSubtasks() {
      const allSubtasks = []
      this.tasks.forEach(task => {
        if (task.current_version && task.current_version.action_nodes) {
          const taskSubtasks = this.extractSubtasksRecursive(task.current_version.action_nodes)
          allSubtasks.push(...taskSubtasks)
        }
      })
      return allSubtasks.slice(0, 5).map(subtask => 
        subtask.length > 50 ? subtask.substring(0, 50) + '...' : subtask
      )
    },

    // Tags for selected task (safe fallback)
    selectedTaskTags() {
      if (!this.selectedTask || !Array.isArray(this.selectedTask.tags)) return []
      return this.selectedTask.tags
    },
    visibleTags() {
      const count = Math.max(0, Math.min(this.visibleTagCount, this.selectedTaskTags.length))
      return this.selectedTaskTags.slice(0, count)
    },
    hiddenTagsCount() {
      const count = Math.max(0, Math.min(this.visibleTagCount, this.selectedTaskTags.length))
      const extra = this.selectedTaskTags.length - count
      return extra > 0 ? extra : 0
    },
    hiddenTags() {
      const count = Math.max(0, Math.min(this.visibleTagCount, this.selectedTaskTags.length))
      if (this.selectedTaskTags.length <= count) return []
      return this.selectedTaskTags.slice(count)
    }
  },

  async created() {
    await this.loadTasks()
  },

  mounted() {
    // Ensure scrolling is enabled when Home component mounts
    // This fixes the issue where signin page disables scrolling
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
    document.body.style.height = 'auto'
    document.documentElement.style.height = 'auto'

    // Recompute tag fit on resize
    this._onResizeTags = this.debounce(() => {
      this.computeVisibleTags()
    }, 150)
    window.addEventListener('resize', this._onResizeTags)
  },

  beforeDestroy() {
    if (this._onResizeTags) {
      window.removeEventListener('resize', this._onResizeTags)
      this._onResizeTags = null
    }
  },

  methods: {
    getCurrentDate() {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return new Date().toLocaleDateString('en-US', options);
    },

    async loadTasks() {
      try {
        this.loading = true
        const response = await this.$http.secured.get('/tasks/approved')
        
        if (response.data.tasks) {
          this.tasks = response.data.tasks.map(task => ({
            ...task,
            action_nodes: this.processActionNodes(task.action_nodes || []),
            total_subtasks: this.getTotalSubtasks(task),
            completed_subtasks: this.getCompletedSubtasks(task),
            progress_percentage: this.getTaskProgress(task)
          }))
        }
      } catch (error) {
        console.error('Error loading tasks:', error)
        this.$toast.error('Failed to load tasks')
      } finally {
        this.loading = false
      }
    },

    processActionNodes(nodes) {
      if (!nodes) return [];
      return nodes.map(node => ({
        ...node,
        content: this.stripHtmlTags(node.content || ''),
        children: node.children ? this.processActionNodes(node.children) : [],
        completed: node.completed || false
      }))
    },

    countNodesRecursive(nodes) {
      if (!nodes) return 0;
      let count = 0;
      nodes.forEach(node => {
        count += 1;
        if (node.children && node.children.length > 0) {
          count += this.countNodesRecursive(node.children);
        }
      });
      return count;
    },

    countCompletedNodesRecursive(nodes) {
      if (!nodes) return 0;
      let count = 0;
      nodes.forEach(node => {
        if (node.completed) count += 1;
        if (node.children && node.children.length > 0) {
          count += this.countCompletedNodesRecursive(node.children);
        }
      });
      return count;
    },

    getTotalSubtasks(task) {
      if (task.current_version && task.current_version.action_nodes) {
        return this.countNodesRecursive(task.current_version.action_nodes)
      }
      return 0
    },

    getCompletedSubtasks(task) {
      if (task.current_version && task.current_version.action_nodes) {
        return this.countCompletedNodesRecursive(task.current_version.action_nodes)
      }
      return 0
    },

    getTaskProgress(task) {
      if (!task.current_version || !task.current_version.action_nodes) return 0;
      const completed = this.getCompletedSubtasks(task);
      const total = this.getTotalSubtasks(task);
      if (total === 0) return 0;
      return Math.round((completed / total) * 1000) / 10;
    },

    extractSubtasksRecursive(nodes) {
      const subtasks = []
      nodes.forEach(node => {
        subtasks.push(node.content || 'Untitled item')
        if (node.children && node.children.length > 0) {
          subtasks.push(...this.extractSubtasksRecursive(node.children))
        }
      })
      return subtasks
    },

    stripHtmlTags(html) {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      return doc.body.textContent || ''
    },

    async openTaskDetails(task) {
      this.selectedTask = task
      this.selectedTaskReviewers = []
      
      // Fetch reviewers for this task
      try {
        await this.fetchTaskReviewers(task.id)
      } catch (error) {
        console.error('Error fetching reviewers:', error)
      }

      // Compute how many tags fit after modal renders
      this.$nextTick(() => {
        setTimeout(() => this.computeVisibleTags(), 0)
      })
    },

    closeTaskDetails() {
      this.selectedTask = null
      this.selectedTaskReviewers = []
    },

    async fetchTaskReviewers(taskId) {
      try {
        // Get all reviews for this task to find distinct reviewers
        const response = await this.$http.secured.get('/reviews')
        
        if (response.data && response.data.data) {
          const taskReviews = response.data.data.filter(review => 
            review.task && review.task.id === taskId
          )
          
          // Extract unique reviewers
          const reviewersMap = new Map()
          taskReviews.forEach(review => {
            if (review.reviewer) {
              reviewersMap.set(review.reviewer.id, {
                id: review.reviewer.id,
                name: review.reviewer.name,
                email: review.reviewer.email
              })
            }
          })
          
          this.selectedTaskReviewers = Array.from(reviewersMap.values())
        }
      } catch (error) {
        console.error('Error fetching task reviewers:', error)
        this.selectedTaskReviewers = []
      }
    },

    getTaskActionHTML(task) {
      return task.action_to_be_taken || 'No action items defined';
    },

    viewTask(task) {
      // Implement view task logic
      console.log('Viewing task:', task.id);
    },

    getCircleStyle() {
      // Convert percentage to degrees (360 * percentage/100)
      // Start from -90 degrees (top) and go clockwise
      const progress = (this.overallProgress || 0) * 3.6;
      return {
        '--progress': `${progress}deg`
      };
    },

    generateTaskCode(task) {
      return `TASK-${String(task.id).padStart(4, '0')}`;
    },

    formatDate(date) {
      if (!date) return 'Not set';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },

    getFormattedActionItems(task) {
      // Use the same action_to_be_taken HTML that TentativeDashboard uses
      // This already contains the properly formatted action nodes with indentation
      return task.action_to_be_taken || 'No action items defined';
    },

    // Compute how many tag chips fit within the row, leaving room for "+N more" if needed
    computeVisibleTags() {
      if (!this.$refs.tagsCompactRow) {
        this.visibleTagCount = this.selectedTaskTags.length
        return
      }
      const container = this.$refs.tagsCompactRow
      const maxWidth = container.clientWidth || 0
      if (maxWidth === 0) {
        this.visibleTagCount = this.selectedTaskTags.length
        return
      }

      const gap = 8 // match CSS gap in .tags-compact-row
      const safetyBuffer = 6 // px buffer to prevent off-by-one flicker
      let used = 0
      let count = 0

      // Helper: measure chip width with same class
      const measureChip = (text, extraClass = '') => {
        const el = document.createElement('span')
        el.className = `tag-chip${extraClass ? ' ' + extraClass : ''}`
        el.style.visibility = 'hidden'
        el.style.position = 'absolute'
        el.style.pointerEvents = 'none'
        el.textContent = text
        container.appendChild(el)
        const w = el.getBoundingClientRect().width
        container.removeChild(el)
        return Math.ceil(w)
      }

      const total = this.selectedTaskTags.length
      if (total === 0) {
        this.visibleTagCount = 0
        return
      }

      // Pre-measure all tag widths once
      const widths = this.selectedTaskTags.map(t => measureChip(t.name))

      // Pass 1: reserve space for worst-case "+N more" (max remaining digits)
      const maxRemaining = Math.max(0, total - 1)
      const worstMoreWidth = maxRemaining > 0
        ? gap + measureChip(`+${maxRemaining} more`, 'more-chip') + safetyBuffer
        : 0

      for (let i = 0; i < total; i++) {
        const chipWidth = widths[i]
        const nextUsed = used === 0 ? chipWidth : used + gap + chipWidth
        const remaining = total - (i + 1)
        const reserve = remaining > 0 ? worstMoreWidth : 0
        if (nextUsed + reserve <= maxWidth) {
          used = nextUsed
          count = i + 1
        } else {
          break
        }
      }

      // Pass 2: with the final remaining count, see if we can fit one more
      // using the exact "+N more" width (which is <= worstMoreWidth)
      let remaining = Math.max(0, total - count)
      if (remaining === 0) {
        this.visibleTagCount = count
        return
      }
      const exactMoreWidth = gap + measureChip(`+${remaining} more`, 'more-chip') + safetyBuffer
      // Try to add as many as possible with exact reservation
      while (count < total) {
        const chipWidth = widths[count]
        const nextUsed = used === 0 ? chipWidth : used + gap + chipWidth
        remaining = total - (count + 1)
        const reserve = remaining > 0 ? exactMoreWidth : 0
        if (nextUsed + reserve <= maxWidth) {
          used = nextUsed
          count += 1
        } else {
          break
        }
      }
      this.visibleTagCount = count
    },

    // Simple debounce utility
    debounce(fn, wait) {
      let t
      return (...args) => {
        clearTimeout(t)
        t = setTimeout(() => fn.apply(this, args), wait)
      }
    }
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

/* Tailwind CSS CDN utility classes */
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  max-width: 100%;
}

@media (min-width: 640px) {
  .container { 
    max-width: 100%;
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

@media (min-width: 768px) {
  .container { 
    max-width: 100%;
    padding-left: 2.5rem;
    padding-right: 2.5rem;
  }
}

@media (min-width: 1024px) {
  .container { 
    max-width: 100%;
    padding-left: 3rem;
    padding-right: 3rem;
  }
}

@media (min-width: 1280px) {
  .container { 
    max-width: 100%;
    padding-left: 4rem;
    padding-right: 4rem;
  }
}

@media (min-width: 1536px) {
  .container { 
    max-width: 100%;
    padding-left: 5rem;
    padding-right: 5rem;
  }
}

/* Tailwind utilities */
.mx-auto { margin-left: auto; margin-right: auto; }
.p-6 { padding: 1.5rem; }
.p-4 { padding: 1rem; }
.p-3 { padding: 0.75rem; }
.p-5 { padding: 1.25rem; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.py-20 { padding-top: 5rem; padding-bottom: 5rem; }
.pl-10 { padding-left: 2.5rem; }
.pr-4 { padding-right: 1rem; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-8 { margin-bottom: 2rem; }
.mt-1 { margin-bottom: 0.25rem; }
.mt-4 { margin-top: 1rem; }
.ml-4 { margin-left: 1rem; }
.my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
.my-3 { margin-top: 0.75rem; margin-bottom: 0.75rem; }
.my-4 { margin-top: 1rem; margin-bottom: 1rem; }
.gap-2 { gap: 0.5rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }
.gap-8 { gap: 2rem; }
.grid { display: grid; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1 1 0%; }
.flex-shrink-0 { flex-shrink: 0; }
.flex-grow { flex-grow: 1; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }
.space-y-2 > * + * { margin-top: 0.5rem; }
.w-full { width: 100%; }
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.w-24 { width: 6rem; }
.w-5 { width: 1.25rem; }
.w-6 { width: 1.5rem; }
.w-8 { width: 2rem; }
.h-2 { height: 0.5rem; }
.h-5 { height: 1.25rem; }
.h-6 { height: 1.5rem; }
.h-7 { height: 1.75rem; }
.h-8 { height: 2rem; }
.h-full { height: 100%; }
/* Removed min-h-screen utility to prevent scroll issues */
.min-w-fit { min-width: fit-content; }
.relative { position: relative; }
.absolute { position: absolute; }
.top-1\/2 { top: 50%; }
.left-3 { left: 0.75rem; }
.z-10 { z-index: 10; }
.cursor-pointer { cursor: pointer; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-2xl { border-radius: 1rem; }
.rounded-full { border-radius: 9999px; }
.border { border-width: 1px; }
.border-2 { border-width: 2px; }
.border-l-4 { border-left-width: 4px; }
.border-t { border-top-width: 1px; }
.border-dashed { border-style: dashed; }
.border-gray-200 { border-color: #e5e7eb; }
.border-gray-300 { border-color: #d1d5db; }
.border-orange-500 { border-color: #f97316; }
.border-blue-500 { border-color: #3b82f6; }
.border-green-500 { border-color: #22c55e; }
.bg-white { background-color: #ffffff; }
.bg-gray-200 { background-color: #e5e7eb; }
.bg-orange-100 { background-color: #ffedd5; }
.bg-orange-50 { background-color: #fff7ed; }
.bg-blue-100 { background-color: #dbeafe; }
.bg-blue-50 { background-color: #eff6ff; }
.bg-green-50 { background-color: #f0fdf4; }
.bg-green-100 { background-color: #dcfce7; }
.bg-indigo-50 { background-color: #eef2ff; }
.bg-indigo-600 { background-color: #4f46e5; }
.bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
.bg-gradient-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
.from-blue-500 { --tw-gradient-from: #3b82f6; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(59, 130, 246, 0)); }
.from-green-500 { --tw-gradient-from: #22c55e; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(34, 197, 94, 0)); }
.to-indigo-600 { --tw-gradient-to: #4f46e5; }
.to-emerald-600 { --tw-gradient-to: #059669; }
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
.text-5xl { font-size: 3rem; line-height: 1; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.text-white { color: #ffffff; }
.text-gray-400 { color: #9ca3af; }
.text-gray-500 { color: #6b7281; }
.text-gray-700 { color: #374151; }
.text-gray-800 { color: #1f2937; }
.text-gray-900 { color: #111827; }
.text-orange-500 { color: #f97316; }
.text-orange-600 { color: #ea580c; }
.text-orange-700 { color: #c2410c; }
.text-orange-800 { color: #9a3412; }
.text-blue-500 { color: #3b82f6; }
.text-blue-600 { color: #2563eb; }
.text-blue-700 { color: #1d4ed8; }
.text-blue-800 { color: #1e40af; }
.text-green-500 { color: #22c55e; }
.text-green-600 { color: #16a34a; }
.text-green-700 { color: #15803d; }
.text-green-800 { color: #166534; }
.text-indigo-600 { color: #4f46e5; }
.text-center { text-align: center; }
.whitespace-nowrap { white-space: nowrap; }
/* Removed overflow-y-auto utility to prevent internal scrolling */
.shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); }
.transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.duration-300 { transition-duration: 300ms; }
.duration-500 { transition-duration: 500ms; }
.duration-1000 { transition-duration: 1000ms; }
.transform { transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y)); }
.-translate-y-1 { --tw-translate-y: -0.25rem; }
.-translate-y-1\/2 { --tw-translate-y: -50%; }
.hover\:bg-indigo-700:hover { background-color: #4338ca; }
.hover\:shadow-lg:hover { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1); }
.hover\:shadow-xl:hover { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); }
.hover\:-translate-y-1:hover { --tw-translate-y: -0.25rem; }
.focus\:outline-none:focus { outline: 2px solid transparent; outline-offset: 2px; }
.focus\:ring-2:focus { box-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color); }
.focus\:ring-indigo-400:focus { --tw-ring-color: #818cf8; }

.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }

@media (min-width: 768px) {
  .md\:p-8 { padding: 2rem; }
  .md\:py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  .md\:px-12 { padding-left: 3rem; padding-right: 3rem; }
  .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md\:flex-row { flex-direction: row; }
  .md\:items-center { align-items: center; }
  .md\:w-auto { width: auto; }
  .md\:max-w-xs { max-width: 20rem; }
}

@media (min-width: 1024px) {
  .lg\:px-16 { padding-left: 4rem; padding-right: 4rem; }
  .lg\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .lg\:col-span-2 { grid-column: span 2 / span 2; }
  .lg\:col-span-3 { grid-column: span 3 / span 3; }
}

@media (min-width: 1280px) {
  .xl\:px-20 { padding-left: 5rem; padding-right: 5rem; }
}
</style>

<!-- Unscoped styles to hide scrollbars globally on dashboard -->
<style>
html, body {
  scroll-behavior: auto !important;
  overflow-x: hidden;
}

.dashboard-background,
.dashboard-background * {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
  scroll-behavior: auto !important;
}

.dashboard-background::-webkit-scrollbar,
.dashboard-background *::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
</style>

<style scoped>
* {
  font-family: 'Poppins', sans-serif;
  scrollbar-width: none !important; /* Remove scrollbars in Firefox */
  -ms-overflow-style: none !important; /* Remove scrollbars in IE/Edge */
  scroll-behavior: auto !important; /* Disable smooth scrolling */
}

*::-webkit-scrollbar {
  display: none !important; /* Remove scrollbars in Chrome/Safari/Opera */
  width: 0 !important;
  height: 0 !important;
}

/* Dashboard background with animated gradient - Matching Signin Page */
.dashboard-background {
  background: linear-gradient(-45deg, #FFB366, #FFC78A, #FFD9A8, #FFE8C5);
  background-size: 400% 400%;
  animation: gradientShift 8s ease infinite;
  position: static;
  overflow-x: hidden !important; /* Prevent horizontal scroll */
  overflow-y: visible !important; /* Allow vertical scroll */
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  scroll-behavior: auto !important; /* Disable smooth scrolling */
}

/* White dot texture overlay - matching signin page */
.dashboard-background::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.57) 4.5px, transparent 4.5px),
    radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.54) 3.5px, transparent 3.5px),
    radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.55) 4px, transparent 4px),
    radial-gradient(circle at 60% 30%, rgba(255, 255, 255, 0.53) 3.5px, transparent 3.5px),
    radial-gradient(circle at 30% 70%, rgba(255, 255, 255, 0.54) 3.5px, transparent 3.5px);
  background-size: 50px 50px, 80px 80px, 70px 70px, 100px 100px, 75px 75px;
  animation: float 20s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}

/* Soft glow overlay - matching signin page */
.dashboard-background::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at 10% 20%, rgba(255, 255, 255, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 80%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.06) 0%, transparent 70%);
  animation: wave 25s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}

.main-content {
  width: 100%;
  max-width: 100%;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  box-sizing: border-box;
  overflow: visible !important;
  position: relative;
  z-index: 10;
}

/* Dashboard Header Box with Orange Gradient and Depth */
.dashboard-header-box {
  background: linear-gradient(135deg, rgba(255, 200, 160, 0.08), rgba(255, 210, 180, 0.08), rgba(255, 220, 195, 0.08), rgba(255, 230, 210, 0.08));
  background-size: 200% 200%;
  animation: headerGradientShift 10s ease infinite;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  padding: 1.25rem 2rem;
  border-radius: 20px;
  box-shadow: 
    0 8px 25px rgba(255, 140, 66, 0.08),
    0 4px 12px rgba(255, 140, 66, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  position: relative;
  overflow: visible;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
}

.dashboard-header-box:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 12px 35px rgba(255, 140, 66, 0.12),
    0 6px 18px rgba(255, 140, 66, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

/* Indian Tricolor Text Gradient */
.tricolor-text {
  background: linear-gradient(to right, 
    #FF9933 0%,
    #FF9933 33%,
    #FFFFFF 33%,
    #FFFFFF 66%,
    #138808 66%,
    #138808 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  -webkit-text-stroke: 0.5px rgba(0, 0, 0, 0.3);
  text-stroke: 0.5px rgba(0, 0, 0, 0.3);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

/* Subtle outline for Today text */
.today-text {
  text-shadow: 
    -0.5px -0.5px 0 rgba(0, 0, 0, 0.2),
    0.5px -0.5px 0 rgba(0, 0, 0, 0.2),
    -0.5px 0.5px 0 rgba(0, 0, 0, 0.2),
    0.5px 0.5px 0 rgba(0, 0, 0, 0.2);
}

/* Texture overlay for header box */
.dashboard-header-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 15% 25%, rgba(255, 255, 255, 0.15) 2px, transparent 2px),
    radial-gradient(circle at 75% 65%, rgba(255, 255, 255, 0.12) 1.5px, transparent 1.5px),
    radial-gradient(circle at 45% 80%, rgba(255, 255, 255, 0.13) 2px, transparent 2px),
    radial-gradient(circle at 85% 35%, rgba(255, 255, 255, 0.11) 1.5px, transparent 1.5px);
  background-size: 60px 60px, 90px 90px, 75px 75px, 110px 110px;
  pointer-events: none;
  z-index: 1;
}

/* Subtle glow effect */
.dashboard-header-box::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at 20% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 70%, rgba(255, 255, 255, 0.1) 0%, transparent 60%);
  pointer-events: none;
  z-index: 1;
}

/* Ensure content is above overlays */
.dashboard-header-box > div {
  position: relative;
  z-index: 2;
}

/* Date card inside header */
.date-card-header {
  background: rgba(255, 255, 255, 0.2) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.date-card-header:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  transform: scale(1.02);
}

@keyframes headerGradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@media (min-width: 768px) {
  .main-content {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .main-content {
    padding-left: 1.75rem;
    padding-right: 1.75rem;
  }
}

@media (min-width: 1280px) {
  .main-content {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-15px) rotate(2deg); }
  66% { transform: translateY(8px) rotate(-1deg); }
}

@keyframes wave {
  0%, 100% { 
    transform: translateX(0px) translateY(0px) scale(1);
    opacity: 0.3;
  }
  25% { 
    transform: translateX(-20px) translateY(-10px) scale(1.1);
    opacity: 0.5;
  }
  50% { 
    transform: translateX(10px) translateY(-5px) scale(0.9);
    opacity: 0.4;
  }
  75% { 
    transform: translateX(-5px) translateY(5px) scale(1.05);
    opacity: 0.6;
  }
}

/* Stat Cards with colorful left borders */
.stat-card-orange {
  border-left: 5px solid #f97316;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.stat-card-blue {
  border-left: 5px solid #3b82f6;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.stat-card-green {
  border-left: 5px solid #22c55e;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
}

.stat-card-orange:hover {
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
}

.stat-card-blue:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.stat-card-green:hover {
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
}


/* Floating Shapes Animation - Matching Signin Page */
.floating-shapes {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 2;
  overflow: visible;
}

.floating-circle,
.floating-triangle,
.floating-square {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(2px);
  animation: floatShape 20s ease-in-out infinite;
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.4);
}

.circle-1 {
  width: 110px;
  height: 110px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
  animation-duration: 25s;
}

.circle-2 {
  width: 85px;
  height: 85px;
  top: 60%;
  right: 15%;
  animation-delay: -5s;
  animation-duration: 30s;
}

.circle-3 {
  width: 130px;
  height: 130px;
  top: 40%;
  left: 80%;
  animation-delay: -10s;
  animation-duration: 35s;
}

.floating-triangle {
  width: 70px;
  height: 70px;
  border-radius: 0;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.triangle-1 {
  top: 30%;
  right: 25%;
  animation-delay: -15s;
  animation-duration: 20s;
}

.triangle-2 {
  top: 70%;
  left: 60%;
  animation-delay: -8s;
  animation-duration: 28s;
}

.floating-square {
  width: 95px;
  height: 95px;
  border-radius: 10px;
}

.square-1 {
  top: 10%;
  right: 30%;
  animation-delay: -12s;
  animation-duration: 32s;
}

.square-2 {
  top: 85%;
  left: 40%;
  animation-delay: -18s;
  animation-duration: 26s;
}

@keyframes floatShape {
  0%, 100% {
    transform: translateY(0px) translateX(0px) rotate(0deg);
    opacity: 0.7;
  }
  25% {
    transform: translateY(-30px) translateX(20px) rotate(90deg);
    opacity: 0.9;
  }
  50% {
    transform: translateY(-10px) translateX(-15px) rotate(180deg);
    opacity: 0.8;
  }
  75% {
    transform: translateY(-25px) translateX(10px) rotate(270deg);
    opacity: 1;
  }
}

/* Date Card Styles */

/* Ashok Chakra rotation animation */
.ashok-chakra {
  animation: rotate 3s linear infinite !important;
  transform-origin: center !important;
}

.ashok-chakra-container {
  position: relative;
  z-index: 10;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Hover shadows for cards */
.hover-shadow-orange:hover {
  box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.2), 0 4px 6px -4px rgba(249, 115, 22, 0.1);
}

.hover-shadow-blue:hover {
  box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2), 0 4px 6px -4px rgba(59, 130, 246, 0.1);
}

.hover-shadow-green:hover {
  box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.2), 0 4px 6px -4px rgba(34, 197, 94, 0.1);
}

/* New loading spinner */
.loading-spinner-new {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Progress entry hover - NO HEIGHT CONSTRAINTS */
.progress-entry-new {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  transition: all 0.2s ease;
  height: auto !important;
  overflow: visible !important;
}

.progress-entry-new:hover {
  background: #f1f5f9;
  transform: translateX(4px);
}

/* Task card hover effects - overflow visible for clickable buttons */
.task-card-new {
  position: relative;
  overflow: visible; /* Allow buttons to be clickable */
  height: auto !important;
}

.task-card-new::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s;
  pointer-events: none; /* Prevent blocking clicks */
}

.task-card-new:hover::before {
  left: 100%;
}

/* Line clamp utility */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Date card responsive */
.date-card {
  width: 100%;
  max-width: 100%;
}

@media (min-width: 768px) {
  .date-card {
    width: auto;
    min-width: 280px;
  }
}

.date-text {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

/* Ensure all grid containers don't overflow */
.grid {
  width: 100%;
  max-width: 100%;
}

/* Prevent any element from causing horizontal overflow */
* {
  box-sizing: border-box;
}

.dashboard-background * {
  max-width: 100%;
}

/* Allow cards to stretch to match height in grid, but no max-height constraints */
.grid > div {
  max-height: none !important;
}

/* ABSOLUTELY NO INTERNAL SCROLLBARS - ONLY MAIN PAGE SCROLL */
.dashboard-background > *,
.dashboard-background > main,
.dashboard-background > main > *,
.dashboard-background > main > * > *,
.dashboard-background > main > * > * > *,
.dashboard-background > main > * > * > * > * {
  overflow-y: visible !important;
  overflow-x: hidden !important; /* Prevent horizontal overflow on all children */
  max-height: none !important;
  height: auto !important;
}

/* Exception: Allow modal to have its own scroll */
.modal-overlay,
.task-modal {
  overflow-y: auto !important;
  overflow-x: hidden !important;
}

/* Prevent horizontal scroll globally - use /deep/ to override scoped styles */
html, body {
  overflow-x: hidden !important;
  max-width: 100%;
}

/* Force remove ALL internal scrollbars */
.dashboard-background,
.dashboard-background * {
  scrollbar-width: none !important; /* Firefox */
  -ms-overflow-style: none !important; /* IE and Edge */
}

.dashboard-background::-webkit-scrollbar,
.dashboard-background *::-webkit-scrollbar {
  display: none !important; /* Chrome, Safari, Opera */
  width: 0 !important;
  height: 0 !important;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.task-modal {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 18px;
  padding: 32px;
  max-width: 90%;
  width: 100%;
  max-height: 90vh;
  margin: 2vh 0; /* Add vertical margin */
  overflow-y: auto; /* Keep modal scroll for long content */
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 32px rgba(31, 38, 135, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  z-index: 10001;
  position: relative;
  animation: modalFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalFadeIn {
  0% { opacity: 0; transform: scale(0.95) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(56, 189, 248, 0.15);
}

.modal-header h3 {
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  font-family: 'Poppins', 'Inter', Arial, sans-serif;
  letter-spacing: 0.01em;
}

.close-btn {
  background: rgba(239, 68, 68, 0.1);
  border: none;
  font-size: 1.8rem;
  color: #ef4444;
  cursor: pointer;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-weight: 700;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  transform: scale(1.1);
}

.modal-content {
  margin-bottom: 24px;
}

.task-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.meta-item {
  background: rgba(248, 250, 252, 0.8);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  transition: all 0.2s ease;
}

.meta-item:hover {
  background: rgba(241, 245, 249, 0.9);
  border-color: rgba(56, 189, 248, 0.3);
  transform: translateY(-2px);
}

.meta-label {
  font-size: 0.95rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: 'Poppins', 'Inter', Arial, sans-serif;
}

.meta-value {
  font-size: 1.1rem;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.4;
}

.reviewers-list {
  margin-top: 4px;
}

.reviewer-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.reviewer-badge {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
  transition: all 0.2s ease;
}

.reviewer-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Tags meta styles */
.tags-meta {
  position: relative;
}
.tags-compact-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  min-height: 32px;
}
.tag-chip {
  border: 1px solid #c7d2fe;
  background: #eef2ff;
  color: #1e40af;
  border-radius: 9999px;
  padding: 4px 10px;
  font-size: 12px;
  white-space: nowrap;
}
.tag-chip.large {
  padding: 6px 12px;
  font-size: 13px;
}
.more-chip {
  background: #e0e7ff;
  color: #3730a3;
  border-color: #c7d2fe;
}
.all-tags-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
  padding: 10px;
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  z-index: 20000;
  max-height: 180px;
  overflow-y: auto;
}

.action-items-section {
  margin-top: 32px;
  background: rgba(248, 250, 252, 0.6);
  border-radius: 16px;
  padding: 28px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
}

.action-items-section h4 {
  font-size: 1.4rem;
  font-weight: 700;
  background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 20px;
  font-family: 'Poppins', 'Inter', Arial, sans-serif;
  letter-spacing: 0.01em;
}

.action-content-display {
  font-size: 1rem;
  color: #374151;
  line-height: 1.6;
  background: white;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  /* Removed max-height and overflow-y to prevent internal scrolling */
}

/* Style for action content HTML formatting */
.action-content-display ol,
.action-content-display ul {
  margin: 16px 0;
  padding-left: 24px;
}

.action-content-display li {
  margin: 8px 0;
  line-height: 1.5;
}

.action-content-display strong {
  color: #1e293b;
  font-weight: 600;
}

.action-content-display em {
  color: #475569;
  font-style: italic;
}
</style>

