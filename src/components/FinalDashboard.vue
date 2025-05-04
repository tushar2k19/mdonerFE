<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h2>Final Dashboard</h2>
      <div class="date-filter">
        <datepicker
          v-model="selectedDate"
          class="date-picker"
          @selected="fetchApprovedTasks"
        ></datepicker>
      </div>
    </div>

    <table class="dashboard-table">
      <thead>
      <tr>
        <th>S No.</th>
        <th>Sector/Division</th>
        <th>Description</th>
        <th>Action to be Taken</th>
        <th>Original Date</th>
        <th>Responsibility</th>
        <th>Review Date</th>
        <th>Actions</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(task, index) in approvedTasks" :key="task.id">
        <td>{{ index + 1 }}</td>
        <td>{{ task.sector_division }}</td>
        <td>{{ task.description }}</td>
        <td v-html="task.action_to_be_taken"></td>
        <td>{{ formatDate(task.original_date) }}</td>
        <td>{{ task.responsibility }}</td>
        <td>{{ formatDate(task.review_date) }}</td>
        <td>
          <div class="action-buttons">
            <button
              @click="openCommentsModal(task)"
              class="btn btn-sm"
            >
              Comments
            </button>
            <button
              @click="markAsComplete(task)"
              class="btn btn-sm btn-success"
            >
              Mark Complete
            </button>
          </div>
        </td>
      </tr>
      </tbody>
    </table>

    <!-- Comments Modal -->
    <CommentsModal
      v-if="showCommentsModal"
      :task="currentTask"
      @close="closeCommentsModal"
    />
  </div>
</template>

<script>
import Datepicker from 'vuejs-datepicker'
import CommentsModal from '../components/CommentsModal.vue'

export default {
  name: 'FinalDashboard',

  components: {
    Datepicker,
    CommentsModal
  },

  data() {
    return {
      selectedDate: new Date(),
      approvedTasks: [],
      currentTask: null,
      showCommentsModal: false
    }
  },

  created() {
    this.fetchApprovedTasks()
  },

  methods: {
    async fetchApprovedTasks() {
      try {
        const response = await this.$http.secured.get('/tasks/approved', {
          params: {
            date: this.selectedDate.toISOString().split('T')[0]
          }
        })
        this.approvedTasks = response.data.tasks
      } catch (error) {
        console.error('Error fetching approved tasks:', error)
      }
    },

    async markAsComplete(task) {
      try {
        await this.$http.secured.post(`/task/${task.id}/complete`)
        await this.fetchApprovedTasks()
      } catch (error) {
        console.error('Error marking task as complete:', error)
      }
    },

    openCommentsModal(task) {
      this.currentTask = task
      this.showCommentsModal = true
    },

    closeCommentsModal() {
      this.showCommentsModal = false
      this.currentTask = null
    },

    formatDate(date) {
      if (!date) return '-'
      return new Date(date).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 0.875rem;
}

.date-filter {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>
