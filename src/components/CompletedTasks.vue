<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h2>Completed Tasks</h2>
      <div class="date-filter">
        <datepicker
          v-model="selectedDate"
          class="date-picker"
          @selected="fetchCompletedTasks"
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
        <th>Completed At</th>
        <th>Actions</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="(task, index) in completedTasks" :key="task.id">
        <td>{{ index + 1 }}</td>
        <td>{{ task.sector_division }}</td>
        <td>{{ task.description }}</td>
        <td v-html="task.action_to_be_taken"></td>
        <td>{{ formatDate(task.original_date) }}</td>
        <td>{{ task.responsibility }}</td>
        <td>{{ formatDate(task.review_date) }}</td>
        <td>{{ formatDateTime(task.completed_at) }}</td>
        <td>
          <div class="action-buttons">
            <button
              @click="markAsIncomplete(task)"
              class="btn btn-sm btn-warning"
            >
              Mark Incomplete
            </button>
          </div>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import Datepicker from 'vuejs-datepicker'

export default {
  name: 'CompletedTasks',

  components: {
    Datepicker
  },

  data() {
    return {
      selectedDate: new Date(),
      completedTasks: []
    }
  },

  created() {
    this.fetchCompletedTasks()
  },

  methods: {
    async fetchCompletedTasks() {
      try {
        const response = await this.$http.secured.get('/tasks/completed', {
          params: {
            date: this.selectedDate.toISOString().split('T')[0]
          }
        })
        this.completedTasks = response.data.tasks
      } catch (error) {
        console.error('Error fetching completed tasks:', error)
      }
    },

    async markAsIncomplete(task) {
      if (confirm('Are you sure you want to mark this task as incomplete? It will need to go through the review process again.')) {
        try {
          await this.$http.secured.post(`/task/${task.id}/mark_incomplete`)
          await this.fetchCompletedTasks()
        } catch (error) {
          console.error('Error marking task as incomplete:', error)
        }
      }
    },

    formatDate(date) {
      if (!date) return '-'
      return new Date(date).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },

    formatDateTime(date) {
      if (!date) return '-'
      return new Date(date).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
