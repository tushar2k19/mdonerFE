<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="comments-modal">
      <div class="modal-header">
        <h3>Comments</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div ref="commentsContainer" class="comments-container">
        <div v-if="comments.length === 0" class="no-comments">
          No comments yet. Be the first to comment!
        </div>

        <div v-else>
          <div
            v-for="comment in comments"
            :key="comment.id"
            class="comment-item"
            :class="{
              'own-comment': isCurrentUserComment(comment),
              'being-edited': editingCommentId === comment.id
            }"
          >
            <div class="comment-header">
              <div class="user-info">
                <div class="user-avatar">{{ getUserInitials(comment.user_name) }}</div>
                <span class="user-name">{{ comment.user_name }}</span>
                <span class="comment-date">{{ formatDate(comment.created_at) }}</span>
              </div>

              <div v-if="isCurrentUserComment(comment)" class="comment-actions">
                <button
                  v-if="editingCommentId !== comment.id"
                  class="action-btn edit-btn"
                  @click="startEditing(comment)"
                >
                  Edit
                </button>
                <button
                  class="action-btn delete-btn"
                  @click="deleteComment(comment.id)"
                >
                  Delete
                </button>
              </div>
            </div>

            <div v-if="editingCommentId === comment.id" class="edit-comment-form">
              <textarea
                v-model="editedContent"
                class="comment-input"
                rows="3"
              ></textarea>
              <div class="edit-date-picker">
                <div class="date-label">Review Date:</div>
                <div class="date-input-wrapper">
                  <Datepicker
                    v-model="editedReviewDate"
                    :format="'dd MMM yyyy'"
                    :monday-first="true"
                    input-class="date-input"
                  >
                    <template v-slot:beforeCalendarHeader>
                      <div class="calendar-header">Select Review Date</div>
                    </template>
                  </Datepicker>
                </div>
              </div>
              <div class="edit-actions">
                <button class="action-btn cancel-btn" @click="cancelEditing">
                  Cancel
                </button>
                <button class="action-btn save-btn" @click="updateComment(comment.id)">
                  Save
                </button>
              </div>
            </div>
            <div v-else>
              <div class="comment-content">
                {{ comment.content }}
              </div>
              <div class="review-date">
                Review Date: {{ formatDate(comment.review_date, false) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="comment-input-section">
        <div class="input-row">
          <div class="textarea-wrapper">
        <textarea
          v-model="newComment"
          class="comment-input"
          placeholder="Write a comment..."
          rows="3"
          @keydown.enter.exact.prevent="submitComment"
        ></textarea>
          </div>
            <Datepicker
              v-model="newCommentReviewDate"
              :format="'dd MMM yyyy'"
              :monday-first="true"
              input-class="date-input"
              ref="datepicker"
            />
          </div>
        </div>

        <button
          class="submit-btn"
          @click="submitComment"
          :disabled="!newComment.trim() || !newCommentReviewDate"
        >
          Post Comment
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import Datepicker from 'vuejs-datepicker';

export default {
  name: 'CommentsModal',

  components: {
    Datepicker
  },

  props: {
    task: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      comments: [],
      newComment: '',
      newCommentReviewDate: new Date(), // Added for new comments
      editingCommentId: null,
      editedContent: '',
      editedReviewDate: null, // Added for editing comments
      currentUser: null
    }
  },

  async created() {
    await this.fetchComments()
    const userInfo = this.getCookie('user_info')
    this.currentUser = userInfo ? JSON.parse(userInfo) : null
  },

  methods: {
    async fetchComments() {
      try {
        const response = await this.$http.secured.get(`/task/${this.task.id}/comments`)
        // Sort comments by creation date
        this.comments = response.data.sort((a, b) =>
          new Date(a.created_at) - new Date(b.created_at)
        )
      } catch (error) {
        console.error('Error fetching comments:', error)
        this.$toast.error('Failed to load comments')
      }
    },

    async submitComment() {
      // Validate both comment content and review date
      if (!this.newComment.trim() || !this.newCommentReviewDate) return

      try {
        const response = await this.$http.secured.post(`/task/${this.task.id}/comments`, {
          comment: {
            content: this.newComment.trim(),
            review_date: this.newCommentReviewDate
          }
        })
        this.comments.push(response.data)
        // Reset form after successful submission
        this.newComment = ''
        this.newCommentReviewDate = new Date() // Reset to current date
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      } catch (error) {
        console.error('Error posting comment:', error)
        this.$toast.error('Failed to post comment')
      }
    },

    async updateComment(commentId) {
      // Validate both content and review date for updates
      if (!this.editedContent.trim() || !this.editedReviewDate) return

      try {
        await this.$http.secured.put(`/task/${this.task.id}/comments/${commentId}`, {
          comment: {
            content: this.editedContent.trim(),
            review_date: this.editedReviewDate
          }
        })
        // Update the comment in the local array
        const index = this.comments.findIndex(c => c.id === commentId)
        if (index !== -1) {
          this.comments[index].content = this.editedContent
          this.comments[index].review_date = this.editedReviewDate
        }
        this.cancelEditing()
      } catch (error) {
        console.error('Error updating comment:', error)
        this.$toast.error('Failed to update comment')
      }
    },

    async deleteComment(commentId) {
      if (!confirm('Are you sure you want to delete this comment?')) return

      try {
        await this.$http.secured.delete(`/task/${this.task.id}/comments/${commentId}`)
        this.comments = this.comments.filter(c => c.id !== commentId)
      } catch (error) {
        console.error('Error deleting comment:', error)
        this.$toast.error('Failed to delete comment')
      }
    },

    startEditing(comment) {
      this.editingCommentId = comment.id
      this.editedContent = comment.content
      this.editedReviewDate = new Date(comment.review_date) // Set the current review date when starting edit
    },

    cancelEditing() {
      this.editingCommentId = null
      this.editedContent = ''
      this.editedReviewDate = null
    },

    scrollToBottom() {
      const container = this.$refs.commentsContainer
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    },

    // Updated to handle both date-only and datetime formats
    formatDate(date, includeTime = true) {
      if (!date) return '-'
      const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }
      if (includeTime) {
        options.hour = '2-digit'
        options.minute = '2-digit'
      }
      return new Date(date).toLocaleString('en-IN', options)
    },

    getUserInitials(name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    },

    isCurrentUserComment(comment) {
      return this.currentUser['username'].toLowerCase() ===
        comment.user_name.toLowerCase()
    },

    getCookie(name) {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) {
        return decodeURIComponent(parts.pop().split(';').shift())
      }
    }
  }
}
</script>

<style scoped>
/* Base Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.comments-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

/* Modal Header */
.modal-header {
  background: rgba(0, 128, 128, 0.16);
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #040548;
}

.close-btn {
  background: none;
  border: none;
  color: black;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: black;
  color: white;
  transform: rotate(90deg);
}

/* Comments Container */
.comments-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  padding-bottom: 0;
  scroll-behavior: smooth;
}

.no-comments {
  text-align: center;
  color: #6b7280;
  padding: 2rem;
}

/* Comment Items */
.comment-item {
  background: rgba(0, 70, 128, 0.05);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid rgba(0, 70, 128, 0.1);
  width: 95%;
}

.comment-item.own-comment {
  background: rgba(1, 9, 16, 0.07);
  border: 1px solid rgba(0, 70, 128, 0.2);
  margin-left: auto;
}

/* User Info and Header */
.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: #004680;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
}

.own-comment .user-avatar {
  background: #003666;
}

.user-name {
  font-weight: 500;
  color: #374151;
}

.comment-date {
  color: #6b7280;
  font-size: 0.875rem;
}

/* Comment Content */
.comment-content {
  color: #1f2937;
  line-height: 1.5;
}

.review-date {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #4b5563;
  background-color: rgba(0, 70, 128, 0.05);
  border-radius: 6px;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.review-date::before {
  content: "📅";  /* Calendar emoji as an icon */
  font-size: 1rem;
}

.calendar-header {
  padding: 0.5rem;
  text-align: center;
  font-weight: 500;
  color: #374151;
}

/* Action Buttons */
.comment-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
}

.edit-btn {
  background: #004680;
}

.edit-btn:hover {
  background: #003666;
}

.delete-btn {
  background: #dc3545;
}

.delete-btn:hover {
  background: #bd2130;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.save-btn {
  background: #004680;
}

.save-btn:hover {
  background: #003666;
}

/* Input Section */
.comment-input-section {
  padding: 1.5rem;
  background: white;
  border-top: 1px solid #e5e7eb;
  position: sticky;
  bottom: 0;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.comment-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  resize: vertical;
  min-height: 60px;
  max-height: 150px;
  margin-bottom: 0.5rem;
  font-family: inherit;
}

.comment-input:focus {
  outline: none;
  border-color: #004680;
  box-shadow: 0 0 0 3px rgba(0, 70, 128, 0.1);
}

.submit-btn {
  background: #004680;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-btn:hover {
  background: #003666;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Edit Form */
.edit-comment-form {
  margin-top: 0.75rem;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

/* Responsive Styles */
@media (max-width: 640px) {
  .comments-modal {
    width: 95%;
    height: 95vh;
  }

  .user-info {
    flex-wrap: wrap;
  }

  .comment-date {
    width: 100%;
    margin-left: 40px;
  }

  .review-date-picker {
    position: relative;
    display: flex;
    align-items: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.5rem;
    margin-top: 0.5rem;
  }

  .date-input {
    width: 100%;
  }
}
</style>
