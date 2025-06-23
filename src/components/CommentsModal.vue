<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="comments-modal">
      <div class="modal-header">
        <h3>Comment Trails</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div ref="trailsContainer" class="trails-container">
        <div v-if="commentTrails.length === 0" class="no-trails">
          No comment trails yet. Comments will appear here when reviews are conducted.
        </div>

        <div v-else>
          <div
            v-for="trail in commentTrails"
            :key="trail.id"
            class="trail-item"
            @click="navigateToReview(trail)"
          >
            <div class="trail-header">
              <div class="trail-info">
                <div class="review-badge">Review #{{ trail.review.id }}</div>
                <span class="trail-date">{{ formatDate(trail.created_at) }}</span>
              </div>
              <div class="trail-stats">
                <span class="comment-count">{{ trail.comments.length }} comment{{ trail.comments.length !== 1 ? 's' : '' }}</span>
                <span class="trail-status" :class="getTrailStatusClass(trail)">{{ getTrailStatus(trail) }}</span>
              </div>
            </div>

            <div class="trail-preview">
              <div class="reviewer-info">
                <strong>Reviewer:</strong> {{ trail.review.reviewer_name || 'Unassigned' }}
              </div>
              <div class="review-summary" v-if="trail.review.summary">
                <strong>Summary:</strong> {{ trail.review.summary }}
              </div>
              <div class="latest-comments" v-if="trail.comments.length > 0">
                <div class="comment-preview" v-for="comment in trail.comments.slice(0, 2)" :key="comment.id">
                  <span class="comment-author">{{ comment.user_name }}:</span>
                  <span class="comment-text">{{ truncateText(comment.content, 80) }}</span>
                </div>
                <div v-if="trail.comments.length > 2" class="more-comments">
                  +{{ trail.comments.length - 2 }} more comment{{ trail.comments.length - 2 !== 1 ? 's' : '' }}
                </div>
              </div>
            </div>

            <div class="trail-actions">
              <button class="view-review-btn" @click.stop="navigateToReview(trail)">
                <span>📄</span> View Review
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <p class="footer-note">
          💡 Click on any trail to view the full review and add comments
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CommentsModal',

  props: {
    task: {
      type: Object,
      required: true
    }
  },

  data () {
    return {
      commentTrails: [],
      currentUser: null
    }
  },

  async created () {
    await this.fetchCommentTrails()
    const userInfo = this.getCookie('user_info')
    this.currentUser = userInfo ? JSON.parse(userInfo) : null
  },

  methods: {
    async fetchCommentTrails () {
      try {
        const response = await this.$http.secured.get(`/task/${this.task.id}/comment_trails`)
        this.commentTrails = response.data.trails || []
      } catch (error) {
        console.error('Error fetching comment trails:', error)
        this.$toast.error('Failed to load comment trails')
      }
    },

    navigateToReview (trail) {
      // Navigate to the review page
      this.$router.push(`/review/${trail.review.id}`)
      this.$emit('close')
    },

    getTrailStatus (trail) {
      if (trail.review.status === 'approved') return 'Approved'
      if (trail.review.status === 'rejected') return 'Rejected'
      if (trail.review.status === 'pending') return 'Pending'
      return 'Unknown'
    },

    getTrailStatusClass (trail) {
      const status = trail.review.status
      return {
        'status-approved': status === 'approved',
        'status-rejected': status === 'rejected',
        'status-pending': status === 'pending'
      }
    },

    truncateText (text, maxLength) {
      if (text.length <= maxLength) return text
      return text.substring(0, maxLength) + '...'
    },

    formatDate (date) {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    getCookie (name) {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
      return null
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
}

.comments-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.trails-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  max-height: 60vh;
}

.no-trails {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
  font-style: italic;
}

.trail-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 1rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.trail-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.trail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.trail-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.review-badge {
  background: #3b82f6;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.trail-date {
  font-size: 0.875rem;
  color: #64748b;
}

.trail-stats {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.comment-count {
  font-size: 0.75rem;
  color: #64748b;
  background: #e2e8f0;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.trail-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
}

.status-approved {
  background: #dcfce7;
  color: #166534;
}

.status-rejected {
  background: #fef2f2;
  color: #dc2626;
}

.status-pending {
  background: #fef3c7;
  color: #d97706;
}

.trail-preview {
  margin-bottom: 1rem;
}

.reviewer-info {
  font-size: 0.875rem;
  color: #374151;
  margin-bottom: 0.5rem;
}

.review-summary {
  font-size: 0.875rem;
  color: #374151;
  margin-bottom: 0.5rem;
}

.latest-comments {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.5rem;
}

.comment-preview {
  font-size: 0.8125rem;
  color: #4b5563;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.comment-author {
  font-weight: 600;
  color: #374151;
}

.comment-text {
  margin-left: 0.5rem;
}

.more-comments {
  font-size: 0.75rem;
  color: #6b7280;
  font-style: italic;
  margin-top: 0.25rem;
}

.trail-actions {
  display: flex;
  justify-content: flex-end;
}

.view-review-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.view-review-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0 0 16px 16px;
}

.footer-note {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
}

.trails-container::-webkit-scrollbar {
  width: 6px;
}

.trails-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.trails-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.trails-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
