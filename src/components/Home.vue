<template>
  <div class="government-portal">
    <!-- Gentle Floating Background Elements -->
    <div class="floating-element-1"></div>
    <div class="floating-element-2"></div>
    <div class="floating-element-3"></div>
    
    <!-- Keep Original Header Structure -->
    <header class="portal-header">
      <div class="tricolor-bar"></div>
      <div class="header-content">
        <div class="emblem-section">
          <div class="ashoka-chakra">
            <div class="chakra-spokes">
              <div v-for="n in 24" :key="n" class="spoke" :style="{ transform: `rotate(${n * 15}deg)` }"></div>
            </div>
            <div class="chakra-center"></div>
          </div>
          <div class="title-section">
            <h1 class="main-title">Task Management Dashboard</h1>
            <p class="subtitle">Ministry of Development of North Eastern Region</p>
          </div>
        </div>
        
        <div class="header-info">
          <div class="date-display">
            <span class="date-label">Today</span>
            <span class="current-date">{{ getCurrentDate() }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Original Stats Grid with Original Headings -->
    <section class="stats-grid">
      <div class="stat-card primary-stat">
        <div class="stat-decoration"></div>
        <div class="stat-icon-container">
          <span class="stat-icon">📊</span>
        </div>
        <div class="stat-content">
          <h3 class="stat-number">{{ totalTasks }}</h3>
          <p class="stat-title">Total Tasks</p>
          <span class="stat-subtitle">Active approved tasks</span>
        </div>
        <div class="stat-indicator">
          <span class="indicator active">Active</span>
        </div>
      </div>

      <div class="stat-card secondary-stat">
        <div class="stat-decoration"></div>
        <div class="stat-icon-container">
          <span class="stat-icon">📋</span>
        </div>
        <div class="stat-content">
          <h3 class="stat-number">{{ totalSubtasks }}</h3>
          <p class="stat-title">Action Items</p>
          <span class="stat-subtitle">Total sub-items</span>
        </div>
        <div class="stat-indicator">
          <span class="indicator progress">In Progress</span>
        </div>
      </div>

      <div class="stat-card success-stat">
        <div class="stat-decoration"></div>
        <div class="stat-icon-container">
          <span class="stat-icon">✅</span>
        </div>
        <div class="stat-content">
          <h3 class="stat-number">{{ overallProgress }}%</h3>
          <p class="stat-title">Overall Progress</p>
          <span class="stat-subtitle">{{ totalCompletedSubtasks }}/{{ totalSubtasks }} completed</span>
        </div>
        <div class="stat-indicator">
          <span class="indicator success">On Track</span>
        </div>
      </div>
    </section>

    <!-- Original Analytics Grid with Original Headings -->
    <section class="analytics-dashboard">
      <div class="progress-analytics">
        <div class="analytics-header">
          <h3>Task Completion Progress</h3>
          <p>Real-time progress tracking</p>
        </div>
        
        <div class="progress-items-grid">
          <div 
            v-for="task in progressTasks.slice(0, 6)" 
            :key="task && task.id" 
            class="progress-item-card"
          >
            <div class="item-header">
              <h4>{{ task.description.length > 25 ? task.description.substring(0, 25) + '...' : task.description }}</h4>
              <span class="sector-tag">{{ task.sector_division }}</span>
            </div>
            <div class="progress-visualization">
              <div class="circular-progress">
                <svg width="50" height="50" viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#e5e7eb" stroke-width="3"/>
                  <circle 
                    cx="25" cy="25" r="20" fill="none" 
                    stroke="#ff6600" stroke-width="3"
                    stroke-dasharray="125.6" 
                    :stroke-dashoffset="125.6 - (125.6 * (task && task.progress) / 100)"
                    transform="rotate(-90 25 25)"
                  />
                </svg>
                <span class="progress-value">{{ task && task.progress }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="overall-analytics">
        <div class="analytics-header">
          <h3>Overall Completion</h3>
          <p>System-wide progress</p>
        </div>
        
        <div class="main-progress-visual">
          <div class="large-progress-circle">
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="70" fill="none" stroke="#e5e7eb" stroke-width="6"/>
              <circle 
                cx="90" cy="90" r="70" fill="none" 
                stroke="url(#tricolor-gradient)" stroke-width="6"
                stroke-dasharray="439.8" 
                :stroke-dashoffset="439.8 - (439.8 * overallProgress / 100)"
                transform="rotate(-90 90 90)"
              />
              <defs>
                <linearGradient id="tricolor-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:#ff6600"/>
                  <stop offset="50%" style="stop-color:#ffffff"/>
                  <stop offset="100%" style="stop-color:#138808"/>
                </linearGradient>
              </defs>
            </svg>
            <div class="center-info">
              <span class="main-progress">{{ overallProgress }}%</span>
              <span class="progress-description">Complete</span>
            </div>
          </div>
          
          <div class="completion-summary">
            <div class="summary-item completed">
              <span class="summary-icon">✅</span>
              <div class="summary-details">
                <span class="summary-number">{{ totalCompletedSubtasks }}</span>
                <span class="summary-label">Completed</span>
              </div>
            </div>
            <div class="summary-item pending">
              <span class="summary-icon">⏳</span>
              <div class="summary-details">
                <span class="summary-number">{{ totalSubtasks - totalCompletedSubtasks }}</span>
                <span class="summary-label">Remaining</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Original Search Section -->
    <section class="search-interface">
      <div class="search-container">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="✨ Search tasks by description, sector, or responsibility... 🚀"
            class="enhanced-search-input"
          >
          <span class="search-decorator">🎯</span>
        </div>
      </div>
    </section>

    <!-- Original Approved Tasks Section -->
    <div class="projects-section-govt">
      <div class="section-header-govt">
        <h2 class="approved-tasks-title">🎯 Approved Tasks ✅</h2>
        <p class="task-count-display">📊 {{ approvedTasks.length }} Active Tasks 🔥</p>
      </div>
      
      <div class="loading-state-govt" v-if="loading">
        <div class="govt-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-center">🇮🇳</div>
        </div>
        <p>Loading tasks...</p>
      </div>

      <div class="projects-grid-govt" v-else>
        <div 
          v-for="task in approvedTasks" 
          :key="task && task.id"
          @click="openTaskDetails(task)"
          class="project-card-govt"
        >
          <div class="project-content-govt">
            <h4 class="project-title-govt">{{ task.description }}</h4>
            
            <div class="project-details-govt">
              <div class="detail-row-govt">
                <span class="detail-label">Sector:</span>
                <span class="detail-value">{{ task.sector_division }}</span>
              </div>
              <div class="detail-row-govt">
                <span class="detail-label">Review Date:</span>
                <span class="detail-value">{{ formatDate(task.review_date) }}</span>
              </div>
              <div class="detail-row-govt">
                <span class="detail-label">Responsibility:</span>
                <span class="detail-value">{{ task.responsibility }}</span>
              </div>
            </div>

            <div class="project-progress-govt">
              <div class="progress-header-govt">
                <span class="progress-label-main">Progress</span>
                <div class="progress-stats">
                  <span class="progress-percentage">{{ getTaskProgress(task) }}%</span>
                  <span class="progress-fraction">({{ getCompletedSubtasks(task) }}/{{ getTotalSubtasks(task) }})</span>
                </div>
              </div>
              <div class="progress-bar-container">
                <div class="progress-track-govt">
                  <div class="progress-fill-animated" :style="{ width: getTaskProgress(task) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="project-footer-govt">
            <button @click.stop="openTaskDetails(task)" class="govt-action-btn">
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Original Task Details Modal -->
    <div v-if="selectedTask" class="modal-overlay" @click="closeTaskDetails">
      <div class="task-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedTask.description }}</h3>
          <button @click="closeTaskDetails" class="close-btn">✕</button>
        </div>
        
        <div class="modal-content">
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
          </div>

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
      selectedTaskReviewers: []
    }
  },
  
  computed: {
    approvedTasks() {
      if (!this.tasks || !Array.isArray(this.tasks)) return [];
      
      if (!this.searchQuery) {
        return this.tasks
      }
      
      return this.tasks.filter(task => {
        try {
          return (task.description && task.description.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
                 (task.sector_division && task.sector_division.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
                 (task.responsibility && task.responsibility.toLowerCase().includes(this.searchQuery.toLowerCase()))
        } catch (error) {
          console.warn('Error filtering task:', task && task.id, error)
          return false
        }
      })
    },

    totalTasks() {
      return this.tasks.length
    },

    totalSubtasks() {
      if (!this.tasks || !Array.isArray(this.tasks)) return 0;
      return this.approvedTasks.reduce((total, task) => {
        try {
          return total + this.getTotalSubtasks(task);
        } catch (error) {
          console.warn('Error calculating total subtasks for task:', task && task.id, error)
          return total;
        }
      }, 0);
    },

    totalCompletedSubtasks() {
      if (!this.tasks || !Array.isArray(this.tasks)) return 0;
      return this.approvedTasks.reduce((total, task) => {
        try {
          return total + this.getCompletedSubtasks(task);
        } catch (error) {
          console.warn('Error calculating completed subtasks for task:', task && task.id, error)
          return total;
        }
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
    }
  },

  async created() {
    // Load tasks immediately without blocking UI
    setTimeout(async () => {
      try {
        await this.loadTasks()
      } catch (error) {
        console.error('Error in created hook:', error)
        this.loading = false
      }
    }, 100)
  },

  mounted() {
    if (this.loading) {
      setTimeout(() => {
        if (this.loading) {
          console.warn('Tasks taking too long to load, setting loading to false')
          this.loading = false
        }
      }, 10000)
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
        
        if (!this.$http || !this.$http.secured) {
          console.warn('HTTP service not available, using empty tasks')
          this.tasks = []
          return
        }

        const response = await this.$http.secured.get('/tasks/approved')
        
        if (response && response.data && response.data.tasks) {
          this.tasks = response.data.tasks.map(task => {
            try {
              return {
                ...task,
                action_nodes: this.processActionNodes(task.action_nodes || []),
                total_subtasks: this.getTotalSubtasks(task),
                completed_subtasks: this.getCompletedSubtasks(task),
                progress_percentage: this.getTaskProgress(task)
              }
            } catch (taskError) {
              console.warn('Error processing task:', task && task.id, taskError)
              return {
                ...task,
                action_nodes: [],
                total_subtasks: 0,
                completed_subtasks: 0,
                progress_percentage: 0
              }
            }
          })
        } else {
          this.tasks = []
        }
      } catch (error) {
        console.error('Error loading tasks:', error)
        this.tasks = []
        if (this.$toast) {
          this.$toast.error('Failed to load tasks')
        }
      } finally {
        this.loading = false
      }
    },

    processActionNodes(nodes, depth = 0) {
      if (!nodes || !Array.isArray(nodes) || depth > 10) return [];
      return nodes.map(node => {
        try {
          return {
            ...node,
            content: this.stripHtmlTags(node.content || ''),
            children: node.children ? this.processActionNodes(node.children, depth + 1) : [],
            completed: node.completed || false
          }
        } catch (error) {
          console.warn('Error processing action node:', error)
          return {
            ...node,
            content: '',
            children: [],
            completed: false
          }
        }
      })
    },

    countNodesRecursive(nodes, depth = 0) {
      if (!nodes || !Array.isArray(nodes) || depth > 10) return 0;
      let count = 0;
      nodes.forEach(node => {
        if (!node) return;
        count += 1;
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          count += this.countNodesRecursive(node.children, depth + 1);
        }
      });
      return count;
    },

    countCompletedNodesRecursive(nodes, depth = 0) {
      if (!nodes || !Array.isArray(nodes) || depth > 10) return 0;
      let count = 0;
      nodes.forEach(node => {
        if (!node) return;
        if (node.completed) count += 1;
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          count += this.countCompletedNodesRecursive(node.children, depth + 1);
        }
      });
      return count;
    },

    getTotalSubtasks(task) {
      try {
        if (!task || !task.current_version || !task.current_version.action_nodes) return 0
        return this.countNodesRecursive(task.current_version.action_nodes)
      } catch (error) {
        console.warn('Error calculating total subtasks:', error)
        return 0
      }
    },

    getCompletedSubtasks(task) {
      try {
        if (!task || !task.current_version || !task.current_version.action_nodes) return 0
        return this.countCompletedNodesRecursive(task.current_version.action_nodes)
      } catch (error) {
        console.warn('Error calculating completed subtasks:', error)
        return 0
      }
    },

    getTaskProgress(task) {
      try {
        if (!task || !task.current_version || !task.current_version.action_nodes) return 0;
        const completed = this.getCompletedSubtasks(task);
        const total = this.getTotalSubtasks(task);
        if (total === 0 || isNaN(completed) || isNaN(total)) return 0;
        const progress = Math.round((completed / total) * 1000) / 10;
        return isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress));
      } catch (error) {
        console.warn('Error calculating task progress:', error)
        return 0
      }
    },

    stripHtmlTags(html) {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      return doc.body.textContent || ''
    },

    async openTaskDetails(task) {
      this.selectedTask = task
      this.selectedTaskReviewers = []
      
      try {
        await this.fetchTaskReviewers(task && task.id)
      } catch (error) {
        console.error('Error fetching reviewers:', error)
      }
    },

    closeTaskDetails() {
      this.selectedTask = null
      this.selectedTaskReviewers = []
    },

    async fetchTaskReviewers(taskId) {
      try {
        const response = await this.$http.secured.get('/reviews')
        
        if (response.data && response.data.data) {
          const taskReviews = response.data.data.filter(review => 
            review.task && review.task.id === taskId
          )
          
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

    generateTaskCode(task) {
      return `TASK-${String(task && task.id).padStart(4, '0')}`;
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
      return task.action_to_be_taken || 'No action items defined';
    }
  }
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FFF5F0 0%, #FFF8F5 30%, #FFFBF8 70%, #FFFFFF 100%);
  position: relative;
}

.home-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  min-height: 100vh;
  background: 
    radial-gradient(circle at 20% 20%, rgba(255, 102, 0, 0.04) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(19, 136, 8, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 40% 60%, rgba(255, 248, 245, 0.08) 0%, transparent 50%);
  animation: nightSky 20s ease-in-out infinite;
  z-index: -1;
  pointer-events: none;
}

.home-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(2px 2px at 20px 30px, rgba(255, 102, 0, 0.3), transparent),
    radial-gradient(2px 2px at 40px 70px, rgba(19, 136, 8, 0.3), transparent),
    radial-gradient(1px 1px at 90px 40px, rgba(0, 0, 128, 0.3), transparent),
    radial-gradient(1px 1px at 130px 80px, rgba(255, 255, 255, 0.2), transparent),
    radial-gradient(2px 2px at 160px 30px, rgba(255, 102, 0, 0.2), transparent);
  background-repeat: repeat;
  background-size: 200px 100px;
  animation: floatingDots 25s linear infinite;
  z-index: -1;
  pointer-events: none;
  opacity: 0.4;
}

@keyframes floatingDots {
  0% { transform: translateY(0px) translateX(0px); }
  100% { transform: translateY(-100px) translateX(50px); }
}

.home-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(2px 2px at 20px 30px, rgba(255, 102, 0, 0.3), transparent),
    radial-gradient(2px 2px at 40px 70px, rgba(19, 136, 8, 0.3), transparent),
    radial-gradient(1px 1px at 90px 40px, rgba(0, 0, 128, 0.3), transparent),
    radial-gradient(1px 1px at 130px 80px, rgba(255, 255, 255, 0.2), transparent),
    radial-gradient(2px 2px at 160px 30px, rgba(255, 102, 0, 0.2), transparent);
  background-repeat: repeat;
  background-size: 200px 100px;
  animation: floatingDots 25s linear infinite;
  z-index: -1;
  pointer-events: none;
  opacity: 0.4;
}

@keyframes floatingDots {
  0% { transform: translateY(0px) translateX(0px); }
  100% { transform: translateY(-100px) translateX(50px); }
}

@keyframes nightSky {
  0%, 100% { 
    transform: scale(1) rotate(0deg);
    opacity: 0.7;
  }
  50% { 
    transform: scale(1.1) rotate(1deg);
    opacity: 1;
  }
}

/* Decorative Section Separators */
.section-separator {
  position: relative;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
}

.section-separator::before {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  background: rgba(255, 102, 0, 0.4);
  border-radius: 50%;
  animation: pulse1 2s ease-in-out infinite;
}

.section-separator::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 150px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 102, 0, 0.2), rgba(19, 136, 8, 0.2), transparent);
  animation: fadeInOut 3s ease-in-out infinite;
}

@keyframes pulse1 {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.5); }
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.8; }
}

/* Gentle Floating Background Elements */
.government-portal::before {
  content: '';
  position: absolute;
  top: 10%;
  left: 5%;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(255, 248, 245, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  animation: floatUpDown 15s ease-in-out infinite;
  z-index: -2;
}

.government-portal::after {
  content: '';
  position: absolute;
  top: 60%;
  right: 8%;
  width: 40px;
  height: 40px;
  background: radial-gradient(circle, rgba(255, 251, 248, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  animation: floatLeftRight 18s ease-in-out infinite reverse;
  z-index: -2;
}

/* Add more floating elements */
.home-container .floating-element-1 {
  position: absolute;
  top: 30%;
  right: 15%;
  width: 30px;
  height: 30px;
  background: linear-gradient(45deg, rgba(255, 248, 245, 0.1), transparent);
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  animation: gentleDrift 20s ease-in-out infinite;
  z-index: -2;
}

.home-container .floating-element-2 {
  position: absolute;
  top: 80%;
  left: 10%;
  width: 50px;
  height: 20px;
  background: linear-gradient(90deg, rgba(255, 251, 248, 0.08), transparent);
  border-radius: 50px;
  animation: slowBob 25s ease-in-out infinite;
  z-index: -2;
}

.home-container .floating-element-3 {
  position: absolute;
  top: 45%;
  left: 3%;
  width: 25px;
  height: 25px;
  background: radial-gradient(ellipse, rgba(255, 248, 245, 0.12) 0%, transparent 60%);
  border-radius: 50%;
  animation: gentleWave 22s ease-in-out infinite;
  z-index: -2;
}

@keyframes floatUpDown {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-30px) rotate(90deg); }
  50% { transform: translateY(-15px) rotate(180deg); }
  75% { transform: translateY(-40px) rotate(270deg); }
}

@keyframes floatLeftRight {
  0%, 100% { transform: translateX(0px) translateY(0px); }
  25% { transform: translateX(-25px) translateY(-10px); }
  50% { transform: translateX(-15px) translateY(20px); }
  75% { transform: translateX(-35px) translateY(-5px); }
}

@keyframes gentleDrift {
  0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
  33% { transform: translate(20px, -15px) rotate(120deg); }
  66% { transform: translate(-10px, 10px) rotate(240deg); }
}

@keyframes slowBob {
  0%, 100% { transform: translateY(0px) scaleX(1); }
  50% { transform: translateY(-20px) scaleX(1.1); }
}

@keyframes gentleWave {
  0%, 100% { transform: translate(0px, 0px) scale(1); }
  25% { transform: translate(15px, -10px) scale(1.1); }
  50% { transform: translate(30px, 5px) scale(0.9); }
  75% { transform: translate(10px, -20px) scale(1.05); }
}
/* =============================================
   🇮🇳 GOVERNMENT PORTAL STYLING
   ============================================= */

.government-portal {
  width: 100%;
  background: linear-gradient(135deg, #FFF8F5 0%, #FFFBF8 50%, #FFFFFF 100%);
  padding: 0;
  margin: 0;
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  box-sizing: border-box;
}

/* Enhanced Portal Header */
.portal-header {
  background: linear-gradient(135deg, #FAF7F3 0%, #FCFAF7 30%, #FEFCFA 70%, #FFFFFF 100%);
  box-shadow: 
    0 8px 32px rgba(250, 247, 243, 0.4),
    0 4px 16px rgba(250, 247, 243, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border-bottom: 3px solid rgba(250, 247, 243, 0.6);
  padding: 16px 32px;
  z-index: 100;
  backdrop-filter: blur(15px);
  border-radius: 0 0 24px 24px;
  margin: 0 20px;
  border: 2px solid rgba(250, 247, 243, 0.4);
  position: relative;
}

.tricolor-bar {
  height: 6px;
  background: linear-gradient(90deg, #ff6600 33.33%, #ffffff 33.33%, #ffffff 66.66%, #138808 66.66%);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  width: 100%;
  box-sizing: border-box;
}

.emblem-section {
  display: flex;
  align-items: center;
  gap: 24px;
}

.ashoka-chakra {
  width: 80px;
  height: 80px;
  position: relative;
  background: radial-gradient(circle, #000080 30%, #1e40af 70%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 128, 0.3);
  animation: chakraRotate 30s linear infinite;
}

@keyframes chakraRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.chakra-spokes {
  position: absolute;
  width: 100%;
  height: 100%;
}

.spoke {
  position: absolute;
  width: 2px;
  height: 30px;
  background: white;
  left: 50%;
  top: 10px;
  transform-origin: 50% 30px;
  border-radius: 1px;
}

.chakra-center {
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  border: 2px solid #000080;
  z-index: 2;
}

.title-section {
  text-align: left;
}

.main-title {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #ff6600, #138808);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 4px 0;
}

.subtitle {
  font-size: 1.1rem;
  color: #1e293b;
  font-weight: 600;
  margin: 0;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 24px;
}

.date-display {
  background: rgba(255, 255, 255, 0.9);
  padding: 16px 20px;
  border-radius: 12px;
  border: 2px solid #ff6600;
  text-align: center;
  box-shadow: 0 4px 16px rgba(255, 102, 0, 0.2);
}

.date-label {
  display: block;
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
  margin-bottom: 4px;
}

.current-date {
  display: block;
  font-size: 1rem;
  color: #1e293b;
  font-weight: 700;
}

.notification-area {
  position: relative;
}

.bell-container {
  background: #ff6600;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.bell-container:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 24px rgba(255, 102, 0, 0.4);
}

.bell-icon {
  font-size: 1.5rem;
  color: white;
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #dc2626;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  border: 2px solid white;
}

/* Enhanced Statistics Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  padding: 32px;
  width: 100%;
  box-sizing: border-box;
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 28px 24px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideInUp 0.6s ease-out;
}

@keyframes slideInUp {
  0% { opacity: 0; transform: translateY(30px); }
  100% { opacity: 1; transform: translateY(0); }
}

.stat-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.15);
}

.stat-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  border-radius: 20px 20px 0 0;
}

.primary-stat {
  border-color: #ff6600;
}

.primary-stat .stat-decoration {
  background: linear-gradient(90deg, #ff6600, #ff9933);
}

.secondary-stat {
  border-color: #000080;
}

.secondary-stat .stat-decoration {
  background: linear-gradient(90deg, #000080, #4169e1);
}

.success-stat {
  border-color: #138808;
}

.success-stat .stat-decoration {
  background: linear-gradient(90deg, #138808, #22c55e);
}

.stat-icon-container {
  margin-bottom: 20px;
}

.stat-icon {
  font-size: 3rem;
  width: 80px;
  height: 80px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
}

.stat-card:hover .stat-icon {
  transform: scale(1.1) rotate(5deg);
}

.primary-stat .stat-icon {
  background: linear-gradient(135deg, #ff6600, #ff9933);
}

.secondary-stat .stat-icon {
  background: linear-gradient(135deg, #000080, #4169e1);
}

.success-stat .stat-icon {
  background: linear-gradient(135deg, #138808, #22c55e);
}

.stat-content {
  margin-bottom: 16px;
}

.stat-number {
  font-size: 3rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
  margin: 0 0 8px 0;
  font-family: 'Inter', sans-serif;
}

.stat-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #374151;
  margin: 0 0 6px 0;
}

.stat-subtitle {
  font-size: 0.95rem;
  color: #64748b;
  font-weight: 500;
}

.stat-indicator {
  display: flex;
  justify-content: flex-end;
}

.indicator {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.indicator.active {
  background: rgba(34, 197, 94, 0.1);
  color: #059669;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.indicator.progress {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.indicator.success {
  background: rgba(34, 197, 94, 0.1);
  color: #059669;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

/* Analytics Dashboard */
.analytics-dashboard {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  padding: 24px;
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

.analytics-dashboard::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 102, 0, 0.3), rgba(19, 136, 8, 0.3), transparent);
  animation: pulseGlow 3s ease-in-out infinite 1s;
}

.analytics-dashboard::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 60%;
  background: linear-gradient(180deg, transparent, rgba(255, 102, 0, 0.2), transparent);
  z-index: 0;
  animation: verticalPulse 4s ease-in-out infinite;
}

@keyframes verticalPulse {
  0%, 100% { opacity: 0.2; height: 40%; }
  50% { opacity: 0.6; height: 80%; }
}

.progress-analytics, .overall-analytics {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(255, 219, 187, 0.4);
  border: 2px solid rgba(255, 219, 187, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out;
  backdrop-filter: blur(10px);
  z-index: 1;
}

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.progress-analytics::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #ff6600, #138808);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.5s ease;
}

.progress-analytics::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(255, 102, 0, 0.05) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(50%, -50%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.progress-analytics:hover::after {
  opacity: 1;
}

.progress-analytics:hover::before {
  transform: scaleX(1);
}

.progress-analytics:hover, .overall-analytics:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
  border-color: #ff6600;
}

.analytics-header {
  margin-bottom: 24px;
  position: relative;
}

.analytics-header::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, #ff6600, #138808);
  transition: width 0.4s ease;
}

.progress-analytics:hover .analytics-header::after {
  width: 80px;
}

.analytics-header h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
  transition: color 0.3s ease;
}

.progress-analytics:hover .analytics-header h3 {
  color: #ff6600;
}

.analytics-header p {
  color: #64748b;
  margin: 0;
  font-size: 0.95rem;
  transition: color 0.3s ease;
}

.progress-analytics:hover .analytics-header p {
  color: #475569;
}

.progress-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  min-height: 200px;
  position: relative;
}

/* Add content placeholder when no tasks */
.progress-analytics .progress-items-grid:empty::before {
  content: 'No active tasks to display';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
  opacity: 0.8;
}

.progress-item-card {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.progress-item-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ff6600, transparent);
  transition: left 0.5s ease;
}

.progress-item-card:hover::before {
  left: 100%;
}

.progress-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 102, 0, 0.15);
  border-color: #ff6600;
  background: linear-gradient(135deg, #ffffff 0%, #fef7f0 100%);
}

/* Add subtle icon effects */
.progress-item-card .icon,
.progress-item-card i,
.progress-item-card svg {
  transition: transform 0.3s ease, color 0.3s ease;
}

.progress-item-card:hover .icon,
.progress-item-card:hover i,
.progress-item-card:hover svg {
  transform: scale(1.1);
  color: #ff6600;
}

.item-header h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.sector-tag {
  background: #ff6600;
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.progress-visualization {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.circular-progress {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-value {
  position: absolute;
  font-size: 0.8rem;
  font-weight: 700;
  color: #1e293b;
}

.main-progress-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.large-progress-circle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-info {
  position: absolute;
  text-align: center;
}

.main-progress {
  display: block;
  font-size: 2.5rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
}

.progress-description {
  display: block;
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 600;
}

.completion-summary {
  display: flex;
  gap: 32px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-icon {
  font-size: 1.5rem;
}

.summary-details {
  display: flex;
  flex-direction: column;
}

.summary-number {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.summary-label {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 600;
}

/* Search Interface */
.search-interface {
  padding: 24px;
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

.search-decorator {
  font-size: 1.2rem;
  margin-right: 12px;
  animation: targetPulse 3s ease-in-out infinite;
}

@keyframes targetPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

.search-interface::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 102, 0, 0.3), rgba(19, 136, 8, 0.3), transparent);
  animation: pulseGlow 3s ease-in-out infinite 2s;
}

.search-interface::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 102, 0, 0.3), rgba(19, 136, 8, 0.3), transparent);
  animation: pulseGlow 3s ease-in-out infinite 3s;
}

.search-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(255, 219, 187, 0.4);
  border: 2px solid rgba(255, 219, 187, 0.3);
  backdrop-filter: blur(10px);
  z-index: 1;
  position: relative;
  transition: all 0.3s ease;
}

.search-container::before {
  content: '🔍';
  position: absolute;
  top: -10px;
  left: 20px;
  font-size: 1.5rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 12px;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(255, 219, 187, 0.3);
  animation: searchPulse 2s ease-in-out infinite;
}

@keyframes searchPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.search-container:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
  border-color: #ff6600;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
}

.search-input-wrapper::before {
  content: '✨';
  position: absolute;
  right: 16px;
  font-size: 1rem;
  opacity: 0;
  transition: opacity 0.3s ease;
  animation: sparkle 2s ease-in-out infinite;
}

.search-input-wrapper:focus-within::before {
  opacity: 1;
}

@keyframes sparkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.search-input-wrapper:focus-within {
  border-color: #ff6600;
  box-shadow: 0 8px 24px rgba(255, 102, 0, 0.15);
  transform: scale(1.01);
}

.search-icon {
  font-size: 1.2rem;
  color: #64748b;
  margin-left: 16px;
  transition: color 0.3s ease;
}

.search-input-wrapper:focus-within .search-icon {
  color: #ff6600;
}

.search-enhanced {
  position: relative;
}

.search-enhanced::before {
  content: '🌟';
  position: absolute;
  top: -12px;
  left: 20px;
  font-size: 1.5rem;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 12px;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(255, 219, 187, 0.3);
  animation: starTwinkle 2s ease-in-out infinite;
}

@keyframes starTwinkle {
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
}

.search-decorator {
  font-size: 1.2rem;
  margin-right: 12px;
  animation: targetPulse 3s ease-in-out infinite;
}

@keyframes targetPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

.enhanced-search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 16px;
  font-size: 1rem;
  background: transparent;
  color: #1e293b;
  font-weight: 500;
}

.enhanced-search-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

/* Projects Section */
.projects-section-govt {
  padding: 32px;
  width: 100%;
  box-sizing: border-box;
}

.section-header-govt {
  margin-bottom: 32px;
  padding: 32px;
  min-height: 150px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(255, 219, 187, 0.4);
  border: 2px solid rgba(255, 219, 187, 0.3);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.section-header-govt::before {
  content: '🎯';
  position: absolute;
  top: -8px;
  right: 20px;
  font-size: 1.8rem;
  background: rgba(34, 197, 94, 0.1);
  padding: 10px;
  border-radius: 50%;
  animation: approvedBounce 3s ease-in-out infinite;
}

@keyframes approvedBounce {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-5px) rotate(5deg); }
  75% { transform: translateY(-2px) rotate(-3deg); }
}

.section-header-govt h2 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.section-header-govt p {
  color: #64748b;
  margin: 0;
}

.loading-state-govt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}

.govt-spinner {
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 24px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #ff6600;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.projects-grid-govt {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
}

.project-card-govt {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 2px solid #e5e7eb;
  transition: all 0.3s ease;
  cursor: pointer;
}

.project-card-govt:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
  border-color: #ff6600;
}

.project-content-govt {
  padding: 24px;
}

.project-title-govt {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 20px 0;
  line-height: 1.3;
}

.project-details-govt {
  margin-bottom: 24px;
}

.detail-row-govt {
  display: flex;
  margin-bottom: 12px;
  font-size: 0.9rem;
}

.detail-label {
  font-weight: 600;
  color: #64748b;
  min-width: 120px;
}

.detail-value {
  color: #1e293b;
  font-weight: 500;
}

.project-progress-govt {
  margin-bottom: 20px;
}

.progress-header-govt {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-label-main {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}

.progress-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-percentage {
  font-size: 1.1rem;
  font-weight: 700;
  color: #ff6600;
}

.progress-fraction {
  font-size: 0.8rem;
  color: #64748b;
}

.progress-bar-container {
  position: relative;
}

.progress-track-govt {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill-animated {
  height: 100%;
  background: linear-gradient(90deg, #ff6600, #138808);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.project-footer-govt {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e5e7eb;
}

.govt-action-btn {
  background: #ff6600;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.govt-action-btn:hover {
  background: #e55500;
  transform: translateX(2px);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.task-modal {
  background: white;
  border-radius: 16px;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #ff6600, #138808);
  color: white;
  border-radius: 16px 16px 0 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-content {
  padding: 24px;
}

.task-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meta-value {
  font-size: 0.95rem;
  color: #1e293b;
  font-weight: 500;
}

.reviewers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reviewer-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.reviewer-badge {
  background: #ff6600;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.action-items-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 24px;
}

.action-items-section h4 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.action-content-display {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .analytics-dashboard {
    grid-template-columns: 1fr;
  }
  
  .projects-grid-govt {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
  
  .header-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .projects-grid-govt {
    grid-template-columns: 1fr;
  }
  
  .completion-summary {
    flex-direction: column;
    gap: 16px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    padding: 24px 16px;
  }
  
  .main-title {
    font-size: 2rem;
  }
  
  .ashoka-chakra {
    width: 60px;
    height: 60px;
  }
  
  .stat-number {
    font-size: 2.5rem;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 16px;
  }
  
  .emblem-section {
    flex-direction: column;
    gap: 16px;
  }
}
</style>