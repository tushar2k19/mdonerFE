<template>
  <div class="comment-trail">
    <div class="trail-header">
      <h4>Comment Thread</h4>
      <span class="comment-count">{{ trail.comments.length }} comment{{ trail.comments.length !== 1 ? 's' : '' }}</span>
    </div>
    
    <div class="comments-list">
      <div 
        v-for="comment in trail.comments" 
        :key="comment.id" 
        class="comment-item"
        :class="{ 'resolved': comment.resolved }"
      >
        <div class="comment-header">
          <div class="comment-author">{{ comment.user_name }}</div>
          <div class="comment-date">{{ formatDate(comment.created_at) }}</div>
        </div>
        
        <div class="comment-content">
          {{ comment.content }}
        </div>
        
        <div class="comment-actions" v-if="!comment.resolved">
          <button @click="resolveComment(comment)" class="btn-resolve">
            Mark as Resolved
          </button>
        </div>
      </div>
    </div>
    
    <div class="add-comment-section" v-if="!isResolved">
      <textarea 
        v-model="newComment"
        placeholder="Add a comment..."
        class="comment-input"
        rows="3"
      ></textarea>
      <div class="comment-actions">
        <button 
          @click="addComment" 
          :disabled="!newComment.trim()"
          class="btn btn-primary"
        >
          Add Comment
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CommentTrail',
  
  props: {
    trail: {
      type: Object,
      required: true
    }
  },
  
  data () {
    return {
      newComment: '',
      isResolved: false
    }
  },
  
  computed: {
    hasUnresolvedComments () {
      return this.trail.comments.some(comment => !comment.resolved)
    }
  },
  
  methods: {
    addComment () {
      if (this.newComment.trim()) {
        this.$emit('add-comment', this.trail.id, this.newComment.trim())
        this.newComment = ''
      }
    },
    
    resolveComment (comment) {
      this.$emit('resolve-comment', comment.id)
    },
    
    formatDate (date) {
      return new Date(date).toLocaleString('en-US', {
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
.comment-trail {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.trail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.trail-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.comment-count {
  font-size: 12px;
  color: #64748b;
}

.comments-list {
  margin-bottom: 16px;
}

.comment-item {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.comment-item.resolved {
  opacity: 0.7;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-author {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.comment-date {
  font-size: 11px;
  color: #64748b;
}

.comment-content {
  font-size: 13px;
  color: #1e293b;
  line-height: 1.5;
  margin-bottom: 8px;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-resolve {
  padding: 4px 8px;
  border: none;
  background: #10b981;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-resolve:hover {
  background: #059669;
}

.add-comment-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
}

.comment-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  resize: vertical;
  margin-bottom: 8px;
  font-family: inherit;
}

.comment-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 