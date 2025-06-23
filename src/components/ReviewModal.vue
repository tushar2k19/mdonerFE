<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Send for Review</h3>
        <button class="btn-close" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>Select Reviewer</label>
          <div class="select-wrapper">
            <select
              v-model="selectedReviewer"
              class="form-control"
              :class="{ 'has-value': selectedReviewer }"
            >
              <option value="">Select a reviewer</option>
              <option
                v-for="reviewer in reviewers"
                :key="reviewer.id"
                :value="reviewer.id"
              >
                {{ reviewer.name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close')" class="btn btn-cancel">
          Cancel
        </button>
        <button
          @click="sendForReview"
          class="btn btn-primary"
          :disabled="!selectedReviewer"
        >
          Send for Review
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReviewModal',

  props: {
    task: {
      type: Object,
      required: true
    }
  },

  data () {
    return {
      reviewers: [],
      selectedReviewer: ''
    }
  },

  created () {
    this.fetchReviewers()
  },

  methods: {
    async fetchReviewers () {
      try {
        const response = await this.$http.secured.get('/users/reviewers')
        this.reviewers = response.data
        console.log(this.reviewers)
      } catch (error) {
        console.error('Error fetching reviewers:', error)
      }
    },

    sendForReview () {
      if (this.selectedReviewer) {
        this.$emit('send', this.selectedReviewer)
      }
    }
  }
}
</script>

<style scoped>
.modal-overlay {
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
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
  border: 1px solid rgba(0, 70, 128, 0.1);
  overflow: hidden;
}

.modal-header {
  background: rgba(0, 128, 128, 0.16);
  padding: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #040548;
  font-weight: 700;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn-close {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: black;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.btn-close:hover {
  background: black;
  color: white;
  transform: rotate(90deg);
}

.modal-body {
  padding: 1.5rem;
  background: linear-gradient(
    to bottom,
    rgba(0, 70, 128, 0.05),
    rgba(0, 54, 102, 0.02)
  );
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 500;
  font-size: 0.95rem;
}

.select-wrapper {
  position: relative;
  background: white;
  border-radius: 8px;
}

.select-wrapper::after {
  content: '▼';
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #004680;
  pointer-events: none;
  font-size: 0.8rem;
  transition: transform 0.2s ease;
}

.select-wrapper:hover::after {
  transform: translateY(-50%) rotate(180deg);
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(0, 70, 128, 0.2);
  border-radius: 8px;
  font-size: 0.95rem;
  color: #1f2937;
  appearance: none;
  background-color: white;
  transition: all 0.2s ease;
  cursor: pointer;
}

.form-control option {
  background-color: white;
  color: #1f2937;
  padding: 12px;
  font-size: 0.95rem;
}

.form-control option:first-child {
  color: #6B7280;
}

.form-control:focus {
  outline: none;
  border-color: #004680;
  box-shadow: 0 0 0 3px rgba(0, 70, 128, 0.1);
}

.form-control.has-value {
  border-color: #004680;
  background: rgba(0, 70, 128, 0.05);
}

.modal-footer {
  padding: 1.25rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: white;
}

.btn {
  padding: 0.675rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.925rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.btn-cancel:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

.btn-primary {
  background: #004680;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 70, 128, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: #003666;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 70, 128, 0.3);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.form-control option:hover,
.form-control option:focus {
  background-color: rgba(0, 70, 128, 0.05);
}

.form-control option:checked {
  background-color: rgba(0, 70, 128, 0.1);
  color: #1f2937;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .modal-content {
    width: 95%;
    margin: 1rem;
  }

  .modal-footer {
    flex-direction: column-reverse;
  }

  .btn {
    width: 100%;
  }
}
</style>
