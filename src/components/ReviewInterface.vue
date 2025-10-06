<template>
  <div class="review-container">
    <!-- Loading State -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Loading review...</span>
      </div>
    </div>

    <!-- Review Content - Only show when data is loaded -->
    <div v-else-if="isDataReady" class="review-main">
      <!-- Review Header - Government Style -->
      <div class="review-header">
        <div class="review-title">
          <h2>Review: {{ task.description }}</h2>
          <div class="version-info">
            <span class="version-badge">Version {{ review.task_version.version_number }}</span>
            <span class="status-badge" :class="'status-' + review.status">{{ review.status }}</span>
          </div>
        </div>
        
        <div class="task-meta">
          <div class="meta-row">
          <div class="meta-item">
            <span class="meta-label">Sector/Division:</span>
            <span class="meta-value">{{ task.sector_division || 'N/A' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Responsibility:</span>
            <span class="meta-value">{{ task.responsibility || 'N/A' }}</span>
          </div>
          </div>
          <div class="meta-row">
          <div class="meta-item">
            <span class="meta-label">Review Date:</span>
            <span class="meta-value">{{ formatDate(task.review_date) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Reviewer:</span>
            <span class="meta-value">{{ review.reviewer.name }}</span>
            </div>
          </div>
        </div>

        <div class="controls-section">
          <button @click="toggleEdit" class="btn btn-secondary" v-if="!isReviewApproved">
            {{ editEnabled ? '🔒 Disable Edit' : '🔓 Enable Edit' }}
          </button>
          <button @click="toggleDiff" class="btn btn-secondary">
            {{ showDiff ? '👁️ Hide Diff' : '👁️ Show Diff' }}
          </button>
          <!-- Forward Review button moved here -->
          <button @click="forwardReview" class="btn btn-primary" v-if="canForward && !isReviewApproved">
            📤 Forward Review
          </button>
          <!-- Manual save button -->
          <button @click="saveChanges" class="btn btn-success" v-if="hasChanges && !isReviewApproved">
            💾 Save Changes
          </button>
        </div>
      </div>

      <!-- Content Area with Single Scrolling -->
      <div class="review-content" :class="{ 'card-locked': isReviewApproved || !editEnabled }">
        <div class="content-header">
          <h3>Action Items to be Taken</h3>
          <p v-if="showDiff && review.base_version" class="diff-description">
            Showing changes between Version {{ review.base_version.version_number }} and Version {{ review.task_version.version_number }}
          </p>
          <p v-else-if="showDiff && !review.base_version" class="diff-description">
            Showing first review - all content is new
          </p>
        </div>

        <!-- Locked overlay if approved or edit is disabled -->
        <div v-if="isReviewApproved || !editEnabled" class="locked-overlay">
          <i class="fas fa-lock"></i>
          <span v-if="isReviewApproved">This review is approved and cannot be edited.</span>
          <span v-else>Editing is disabled for this review.</span>
        </div>

        <!-- Enhanced Node Editor - Single Scrollable Area -->
        <div class="editor-container">
          <EnhancedNodeEditor
            :initial-nodes="reviewNodes"
            :readonly="!editEnabled || isReviewApproved"
            :show-diff="showDiff"
            :diff-data="diffData"
            :task-version-id="review.task_version.id"
            :hide-sort-by-date="true"
            :hide-sort-button="true"
            :current-reviewer-id="review.reviewer.id"
            :reviewer-type="review.reviewer_type"
            :assigned-node-ids="parseAssignedNodeIds(review.assigned_node_ids)"
            :permission-mode="true"
            @nodes-changed="onNodesChanged"
            ref="nodeEditor"
          />
        </div>
      </div>

      <!-- Comments Section - Hidden by Default with Indicators -->
      <div class="comment-section">
        <div class="comment-header" @click="toggleCommentSection">
          <h3>Comments & Discussion</h3>
          <div class="comment-status">
            <!-- Show unresolved comments indicator -->
            <span v-if="unresolvedCommentsCount > 0" class="unresolved-indicator">
              {{ unresolvedCommentsCount }} Unresolved
            </span>
            <!-- Show total comments count -->
            <span v-if="comments.length > 0 && unresolvedCommentsCount === 0" class="resolved-indicator">
              {{ comments.length }} Resolved
            </span>
            <button class="btn btn-ghost">
            {{ showComments ? '🔽 Hide Comments' : '🔼 Show Comments' }}
          </button>
          </div>
        </div>
        
        <div v-if="showComments" class="comment-content">
          <!-- Existing Comments -->
          <div v-if="comments.length > 0" class="comments-list">
            <div v-for="comment in comments" :key="comment.id" class="comment-item">
              <!-- Comment Header with User Info and Actions -->
              <div class="comment-header-new">
                <div class="comment-user-info">
                  <i class="fas fa-user comment-user-icon"></i>
                  <strong class="comment-user-name">{{ comment.user_name }}</strong>
                  <span class="comment-date">{{ formatDate(comment.created_at) }}</span>
                </div>
                <div class="comment-actions" v-if="!isReviewApproved">
                  <!-- Resolve button - shown to reviewers and editors -->
                  <button 
                    v-if="canResolveComments"
                    @click="toggleCommentResolution(comment.id)"
                    :class="['resolve-btn', { 'resolved': comment.resolved }]"
                    :title="comment.resolved ? 'Mark as unresolved' : 'Mark as resolved'"
                  >
                    {{ comment.resolved ? '✓' : '○' }}
                  </button>
                  
                  <!-- Edit button - shown only to comment author -->
                  <button 
                    v-if="canEditComment(comment.user_id)"
                    @click="startEditComment(comment)"
                    class="edit-btn"
                    title="Edit comment"
                  >
                    ✏️
                  </button>
                  
                  <!-- Delete button - shown only to comment author -->
                  <button 
                    v-if="canEditComment(comment.user_id)"
                    @click="deleteComment(comment.id)"
                    class="delete-btn"
                    title="Delete comment"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <!-- Comment Body Container -->
              <div class="comment-body">
                <!-- Referenced Node Content (if exists) -->
                <div v-if="comment.references_node && comment.referenced_node" class="referenced-content">
                  <div class="reference-content-display">
                    <span v-if="comment.referenced_node.counter" class="reference-counter">
                      {{ comment.referenced_node.counter }}{{ comment.referenced_node.counter !== '•' ? '.' : '' }}
                    </span>
                    <span
                      class="reference-text clickable-node-ref"
                      :class="{ 'reference-deleted': !comment.referenced_node.exists }"
                      v-if="comment.referenced_node.exists"
                      @click="scrollToActionNode(comment.action_node_id)"
                      title="Scroll to this action item above"
                    >
                      {{ comment.referenced_node.content }}
                    </span>
                    <span v-else class="reference-text reference-deleted">
                      This action item has been deleted
                    </span>
                  </div>
                </div>
                
                <!-- Actual Comment Content -->
              <div v-if="editingCommentId === comment.id && !isReviewApproved" class="edit-comment-form">
                <textarea
                  v-model="editingContent"
                  class="edit-comment-input"
                  rows="3"
                  @keydown.ctrl.enter="saveCommentEdit(comment.id)"
                  @keydown.esc="cancelCommentEdit"
                ></textarea>
                <div class="edit-comment-actions">
                  <button @click="cancelCommentEdit" class="btn btn-secondary btn-small">Cancel</button>
                  <button @click="saveCommentEdit(comment.id)" class="btn btn-primary btn-small">Save</button>
                </div>
              </div>
                <div v-else class="comment-text" :class="{ 'resolved-comment': comment.resolved }">
                {{ comment.content }}
                <!-- <span
                  v-if="comment.references_node && comment.referenced_node && comment.referenced_node.exists"
                  class="comment-node-ref"
                  @click="scrollToAndHighlightNode(comment.action_node_id)"
                  title="Scroll to this action item above"
                >
                  <i class="fas fa-link"></i>
                  <span class="ref-content">{{ comment.referenced_node.content }}</span>
                </span>
                <span
                  v-else-if="comment.references_node && comment.referenced_node && !comment.referenced_node.exists"
                  class="comment-node-ref reference-deleted"
                  title="This action item has been deleted"
                >
                  <i class="fas fa-unlink"></i>
                  <span class="ref-content">(Action item deleted)</span>
                </span> -->
              </div>
              </div>
            </div>
          </div>
          
          <!-- No Comments State -->
          <div v-else class="no-comments">
            <p>No comments yet. Be the first to add a comment!</p>
          </div>
          
          <!-- Add New Comment -->
          <div class="add-comment-section" v-if="!isReviewApproved">
            <div class="comment-form">
              <textarea
                v-model="newComment"
                placeholder="Add a comment about this review..."
                class="comment-input"
                rows="3"
                @keydown.ctrl.enter="addNewComment"
              ></textarea>
              <div class="comment-form-actions">
                <div class="comment-options">
                  <label class="checkbox-label">
                    <input type="checkbox" v-model="commentForSpecificNode">
                    <span>Comment on specific action item</span>
                  </label>
                  <!-- Compact Node Dropdown -->
                  <div v-if="commentForSpecificNode" class="compact-node-dropdown-wrapper" ref="nodeDropdownWrapper">
                    <div class="compact-node-dropdown-selected" @click="toggleNodeDropdown">
                      <span v-if="selectedNodeId">
                        <span class="node-counter">{{ getNodeDisplayCounter(selectedNodeId) }}</span>
                        <span class="node-preview">{{ getNodeFirstLine(selectedNodeId) }}</span>
                      </span>
                      <span v-else class="placeholder">Select action item...</span>
                      <i class="fas fa-chevron-down dropdown-arrow"></i>
                    </div>
                    <div v-if="showNodeDropdown" class="compact-node-dropdown-list">
                      <div
                        v-for="node in reviewNodes"
                        :key="node.id"
                        :class="['compact-node-dropdown-item', { selected: selectedNodeId === node.id }]"
                        @click="selectNodeId(node.id)"
                      >
                        <div class="node-item-content">
                          <span class="node-counter">{{ node.display_counter || node.id }}.</span>
                          <span class="node-preview">{{ getNodeFirstLine(node.id) }}</span>
                        </div>
                        <div class="node-item-indicator">
                          <i v-if="selectedNodeId === node.id" class="fas fa-check"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="comment-buttons">
                  <button @click="clearComment" class="btn btn-secondary">Cancel</button>
                  <button @click="addNewComment" class="btn btn-primary" :disabled="!newComment.trim()">
                    💬 Add Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Simplified Review Actions - Only show approve button for reviewers after comments -->
      <div v-if="canApprove && !isReviewApproved" class="approve-section">
        <button @click="approveReview" class="btn btn-success btn-large">
          ✅ Approve Review
          </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="error-state">
      <div class="error-message">
        <h3>Unable to Load Review</h3>
        <p>The review data could not be loaded. Please try refreshing the page.</p>
        <button @click="loadReviewData" class="btn btn-primary">
          🔄 Retry
        </button>
      </div>
    </div>

    <!-- Forward Review Modal -->
    <div v-if="showForwardModal" class="modal-overlay" @click.self="closeForwardModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Forward Review</h3>
          <button class="btn-close" @click="closeForwardModal">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Select Reviewer to Forward To</label>
            <div class="select-wrapper">
              <select
                v-model="selectedForwardReviewer"
                class="form-control"
                :class="{ 'has-value': selectedForwardReviewer }"
              >
                <option value="">Select a reviewer</option>
                <option
                  v-for="reviewer in availableReviewers"
                  :key="reviewer.id"
                  :value="reviewer.id"
                >
                  {{ reviewer.name }}
                </option>
              </select>
            </div>
            <p class="help-text">The review will be forwarded to the selected reviewer for additional review.</p>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeForwardModal" class="btn btn-cancel">
            Cancel
          </button>
          <button
            @click="submitForwardReview"
            class="btn btn-primary"
            :disabled="!selectedForwardReviewer"
          >
            📤 Forward Review
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import EnhancedNodeEditor from './EnhancedNodeEditor.vue'
import CommentTrail from './CommentTrail.vue'

export default {
  name: 'ReviewInterface',
  
  components: {
    EnhancedNodeEditor,
    CommentTrail
  },

  props: {
    reviewId: {
      type: [Number, String],
      required: true
    }
  },

  data () {
    return {
      review: null,
      task: null,
      reviewNodes: [],
      diffData: null,
      commentTrails: [],
      comments: [],
      editEnabled: true,
      showDiff: true, // Show diff by default
      showComments: false, // Hide comments by default
      loading: true,
      hasChanges: false,
      // Comment form data
      newComment: '',
      commentForSpecificNode: false,
      selectedNodeId: '',
      // Edit comment data
      editingCommentId: null,
      editingContent: '',
      // Forward review data
      showForwardModal: false,
      selectedForwardReviewer: '',
      availableReviewers: [],
      showNodeDropdown: false,
      highlightedNodeId: null,
      highlightTimeout: null,
    }
  },

  computed: {
    canForward() {
      return this.review && this.review.status === 'pending'
    },
    
    isDataReady() {
      return !this.loading && this.review && this.task && this.review.task_version && this.review.reviewer
    },

    // Count unresolved comments
    unresolvedCommentsCount() {
      return this.comments.filter(comment => !comment.resolved).length
    },

    // Add user role and permission checks - using cookies like other components
    currentUserInfo() {
      const userInfoCookie = this.getCookie('user_info')
      // console.log('🍪 Raw user_info cookie:', userInfoCookie)
      
      if (userInfoCookie) {
        try {
          // The cookie might be URL encoded, so decode it first
          const decodedCookie = decodeURIComponent(userInfoCookie)
          // console.log('🔓 Decoded cookie:', decodedCookie)
          
          // The user_info cookie contains a JSON string, so we need to parse it twice
          // First parse gets us the JSON string, second parse gets us the actual object
          let parsed = JSON.parse(decodedCookie)
          // console.log('🔄 First parse result:', parsed, typeof parsed)
          
          // If it's still a string, parse it again
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed)
            // console.log('🔄 Second parse result:', parsed)
          }
          
          // console.log('✅ Final parsed user info:', parsed)
          return parsed
        } catch (error) {
          console.error('❌ Error parsing user_info cookie:', error)
          // console.log('🔍 Cookie content:', userInfoCookie)
          return null
        }
      }
      // console.log('❌ No user_info cookie found')
      return null
    },

    currentUserRole() {
      const role = this.currentUserInfo ? this.currentUserInfo.role : 'editor'
      // console.log('👤 Current user role:', role)
      return typeof role === 'string' ? role.toLowerCase() : 'editor'
    },

    currentUserId() {
      const userId = this.currentUserInfo ? this.currentUserInfo.id : null
      // console.log('🆔 Current user ID:', userId)
      return userId
    },

    isReviewer() {
      return this.currentUserRole === 'reviewer' && 
             this.review && 
             this.review.reviewer && 
             this.currentUserId &&
             this.review.reviewer.id === this.currentUserId
    },

    isEditor() {
      return this.currentUserRole === 'editor' && 
             this.review && 
             this.review.task_version && 
             this.currentUserId &&
             this.review.task_version.editor_id === this.currentUserId
    },

    canApprove() {
      return this.isReviewer && this.review && this.review.status === 'pending'
    },

    canSendForReReview() {
      return this.isEditor && this.hasChanges && this.review && this.review.status === 'pending'
    },

    canResolveComments() {
      // Both reviewers and editors can resolve comments, but reviewers have primary responsibility
      return this.isReviewer || this.isEditor
    },

    // Check if current user can edit/delete a specific comment
    canEditComment() {
      return (commentUserId) => {
        // console.log('🔍 Debug canEditComment:', {
        //   currentUserId: this.currentUserId,
        //   commentUserId: commentUserId,
        //   canEdit: this.currentUserId && this.currentUserId === commentUserId
        // })
        return this.currentUserId && this.currentUserId === commentUserId
      }
    },
    // Freeze all editing if review is approved
    isReviewApproved() {
      return this.review && this.review.status === 'approved'
    }
  },

  async created() {
    // console.log('ReviewInterface created with reviewId:', this.reviewId)
    await this.loadReviewData()
  },

  // Add watcher for route changes to handle navigation between different reviews
  watch: {
    '$route'(to, from) {
      // console.log('Route changed from', from.params.id, 'to', to.params.id)
      // Only reload if the review ID actually changed
      if (to.params.id !== from.params.id) {
        // console.log('Review ID changed, reloading data...')
        this.loadReviewData()
      }
    }
  },

  methods: {
    async loadReviewData () {
      try {
        this.loading = true
        // console.log('Loading review data for ID:', this.reviewId)
        
        const response = await this.$http.secured.get(`/review/${this.reviewId}`)
        
        // console.log('Review API response:', response.data)
        
        if (response.data.success) {
          const data = response.data.data
          this.review = data.review
          this.task = data.task
          this.diffData = data.diff
          this.commentTrails = data.comment_trails || []
          
          // Process nodes with diff status
          this.reviewNodes = this.flattenNodesWithDiff(data.nodes)
          
          // Load comments for this review
          await this.loadComments()
          
          // console.log('Review data loaded successfully:', {
          //   review: this.review,
          //   task: this.task,
          //   nodes: this.reviewNodes,
          //   diff: this.diffData
          // })
          
          // Debug user roles and permissions
          // console.log('🔍 Debug user permissions:', {
          //   currentUserRole: this.currentUserRole,
          //   currentUserInfo: this.currentUserInfo,
          //   userId: this.currentUserId,
          //   reviewerId: this.review.reviewer ? this.review.reviewer.id : null,
          //   editorId: this.review.task_version ? this.review.task_version.editor_id : null,
          //   isReviewer: this.isReviewer,
          //   isEditor: this.isEditor,
          //   canApprove: this.canApprove,
          //   canSendForReReview: this.canSendForReReview
          // })
          
          // Debug diff data
          // console.log('🎨 Debug diff data:', {
          //   diffData: this.diffData,
          //   addedNodes: this.diffData && this.diffData.added_nodes ? this.diffData.added_nodes.length : 0,
          //   modifiedNodes: this.diffData && this.diffData.modified_nodes ? this.diffData.modified_nodes.length : 0,
          //   removedNodes: this.diffData && this.diffData.removed_nodes ? this.diffData.removed_nodes.length : 0
          // })
          
          // Debug each node's diff status
          // this.reviewNodes.forEach(node => {
          //   console.log(`📝 Node ${node.id}: "${node.content ? node.content.substring(0, 50) : 'no content'}..." - diff_status: ${node.diff_status}`)
          // })
        } else {
          console.error('API returned success: false')
          this.$toast.error('Failed to load review data')
        }
      } catch (error) {
        console.error('Error loading review:', error)
        
        // Handle authentication errors specifically
        if (error.response && error.response.status === 404 && 
            error.response.data && error.response.data.exception && 
            error.response.data.exception.includes('RecordNotFound') &&
            error.response.data.exception.includes('User without an ID')) {
          console.error('🔐 Authentication error: User not found')
          this.$toast.error('Please sign in to access reviews')
          this.$router.push('/signin')
          return
        }
        
        this.$toast.error('Failed to load review')
      } finally {
        this.loading = false
      }
    },

    getCookie (name) {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) {
        let encodedValue = parts.pop().split(';').shift()
        return decodeURIComponent(encodedValue)
      }
    },

    flattenNodesWithDiff (treeNodes) {
      const result = []
      
      const flattenRecursive = (nodes) => {
        nodes.forEach(nodeItem => {
          result.push(nodeItem.node)
          if (nodeItem.children && nodeItem.children.length > 0) {
            flattenRecursive(nodeItem.children)
          }
        })
      }
      
      flattenRecursive(treeNodes)
      return result
    },

    toggleEdit () {
      this.editEnabled = !this.editEnabled
      if (!this.editEnabled && this.hasChanges) {
        this.saveChanges()
      }
    },

    toggleDiff () {
      this.showDiff = !this.showDiff
    },

    onNodesChanged (nodesData) {
      this.hasChanges = true
      this.reviewNodes = nodesData
    },

    async saveChanges () {
      if (!this.hasChanges) return
      
      try {
        const response = await this.$http.secured.put(`/review/${this.reviewId}`, {
          nodes_data: this.reviewNodes.map(node => ({
            ...node,
            content: node.content,
            level: node.level,
            list_style: node.list_style,
            node_type: node.node_type || 'rich_text',
            parent_id: node.parent_id,
            position: node.position,
            review_date: node.review_date,
            completed: node.completed,
            reviewer_id: node.reviewer_id // Preserve reviewer_id
          })),
          status: 'pending'
        })
        
        if (response.data.success) {
          this.hasChanges = false
          this.$toast.success('Changes saved')
        }
      } catch (error) {
        console.error('Error saving changes:', error)
        this.$toast.error('Failed to save changes')
      }
    },

    async approveReview () {
      if (confirm('Are you sure you want to approve this review?')) {
        try {
          // Save any pending changes first
          if (this.hasChanges) {
            await this.saveChanges()
          }
          
          const response = await this.$http.secured.post(`/review/${this.reviewId}/approve`)
          
          if (response.data.success) {
            this.$toast.success('Review approved successfully')
            this.$emit('review-completed')
            // Navigate back or refresh
            this.$router.push('/')
          }
        } catch (error) {
          console.error('Error approving review:', error)
          this.$toast.error('Failed to approve review')
        }
      }
    },

    async forwardReview () {
      // Load available reviewers and show modal
      await this.loadAvailableReviewers()
      this.showForwardModal = true
    },

    async loadAvailableReviewers () {
      try {
        const response = await this.$http.secured.get('/users/reviewers')
        // Filter out the current reviewer to avoid forwarding to themselves
        this.availableReviewers = response.data.filter(reviewer => 
          reviewer.id !== (this.review.reviewer ? this.review.reviewer.id : null)
        )
      } catch (error) {
        console.error('Error loading reviewers:', error)
        this.$toast.error('Failed to load reviewers')
        this.availableReviewers = []
      }
    },

    closeForwardModal () {
      this.showForwardModal = false
      this.selectedForwardReviewer = ''
    },

    async submitForwardReview () {
      if (!this.selectedForwardReviewer) {
        this.$toast.error('Please select a reviewer')
        return
      }

      try {
        const response = await this.$http.secured.post(`/review/${this.reviewId}/forward`, {
          new_reviewer_id: this.selectedForwardReviewer
        })

        if (response.data.success) {
          this.$toast.success('Review forwarded successfully')
          this.closeForwardModal()
          // Optionally navigate back or refresh
          this.$router.push('/')
        } else {
          this.$toast.error(response.data.error || 'Failed to forward review')
        }
      } catch (error) {
        console.error('Error forwarding review:', error)
        this.$toast.error('Failed to forward review')
      }
    },

    async sendForReReview () {
      if (confirm('Save your changes and notify the reviewer for re-review?')) {
        try {
          // Save any pending changes first
          if (this.hasChanges) {
            await this.saveChanges()
          }
          
          // Update review status to indicate editor has made changes
          const response = await this.$http.secured.put(`/review/${this.reviewId}`, {
            status: 'pending',
            editor_changes: true
          })
          
          if (response.data.success) {
            this.$toast.success('Changes saved and reviewer notified')
            // Optionally reload the review data
            await this.loadReviewData()
          }
        } catch (error) {
          console.error('Error sending for re-review:', error)
          this.$toast.error('Failed to send for re-review')
        }
      }
    },

    async loadComments () {
      try {
        // console.log('🔄 Loading comments for review:', this.reviewId)
        const response = await this.$http.secured.get(`/review/${this.reviewId}/comments`)
        // console.log('📥 Comments API response:', response.data)
        
        if (response.data.success) {
          this.comments = response.data.comments || []
          // console.log('✅ Comments loaded successfully:', this.comments.length, 'comments')
          // console.log('📋 Comments data:', this.comments)
          
          // Debug each comment's user_id for permission checking
          this.comments.forEach((comment, index) => {
            // console.log(`💬 Comment ${index + 1}:`, {
            //   id: comment.id,
            //   content: comment.content ? comment.content.substring(0, 50) + '...' : 'no content',
            //   user_id: comment.user_id,
            //   user_name: comment.user_name,
            //   canEdit: this.canEditComment(comment.user_id),
            //   currentUserId: this.currentUserId
            // })
          })
        } else {
          console.error('❌ Failed to load comments:', response.data)
          this.comments = []
        }
      } catch (error) {
        console.error('❌ Error loading comments:', error)
        
        // Handle authentication errors
        if (error.response && error.response.status === 404) {
          console.error('🔐 Authentication error while loading comments')
          this.$toast.error('Please sign in to view comments')
        } else {
          this.$toast.error('Failed to load comments')
        }
        this.comments = []
      }
    },

    toggleCommentSection() {
      this.showComments = !this.showComments
    },

    async addNewComment () {
      if (!this.newComment.trim()) {
        this.$toast.error('Please enter a comment')
        return
      }

      try {
        const commentData = {
          content: this.newComment.trim(),
          action_node_id: this.commentForSpecificNode ? this.selectedNodeId : null
        }

        // console.log('💬 Adding new comment:', commentData)
        const response = await this.$http.secured.post(`/review/${this.reviewId}/comments`, commentData)
        // console.log('📤 Add comment response:', response.data)
        
        if (response.data.success) {
          this.$toast.success('Comment added successfully')
          // Add the new comment to the list
          this.comments.push(response.data.comment)
          // console.log('✅ Comment added to list. Total comments:', this.comments.length)
          // Clear the form
          this.clearComment()
        } else {
          console.error('❌ Failed to add comment:', response.data)
          this.$toast.error('Failed to add comment')
        }
      } catch (error) {
        console.error('❌ Error adding comment:', error)
        this.$toast.error('Failed to add comment')
      }
    },

    async toggleCommentResolution (commentId) {
      try {
        const response = await this.$http.secured.put(`/comment/${commentId}/resolve`)
        
        if (response.data.success) {
          // Find and update the comment in our list
          const comment = this.comments.find(c => c.id === commentId)
          if (comment) {
            comment.resolved = !comment.resolved
            this.$toast.success(comment.resolved ? 'Comment resolved' : 'Comment reopened')
          }
        } else {
          this.$toast.error('Failed to update comment status')
        }
      } catch (error) {
        console.error('Error updating comment:', error)
        this.$toast.error('Failed to update comment status')
      }
    },

    clearComment () {
      this.newComment = ''
      this.commentForSpecificNode = false
      this.selectedNodeId = ''
    },

    startEditComment (comment) {
      this.editingCommentId = comment.id
      this.editingContent = comment.content
    },

    cancelCommentEdit () {
      this.editingCommentId = null
      this.editingContent = ''
    },

    async saveCommentEdit (commentId) {
      if (!this.editingContent.trim()) {
        this.$toast.error('Comment content cannot be empty')
        return
      }

      try {
        const response = await this.$http.secured.put(`/comment/${commentId}/update`, {
          content: this.editingContent.trim()
        })

        if (response.data.success) {
          // Update the comment in our list
          const commentIndex = this.comments.findIndex(c => c.id === commentId)
          if (commentIndex !== -1) {
            this.comments[commentIndex] = response.data.comment
          }
          this.$toast.success('Comment updated successfully')
          this.cancelCommentEdit()
        } else {
          this.$toast.error(response.data.error || 'Failed to update comment')
        }
      } catch (error) {
        console.error('Error updating comment:', error)
        if (error.response && error.response.status === 403) {
          this.$toast.error('You can only edit your own comments')
        } else {
          this.$toast.error('Failed to update comment')
        }
      }
    },

    async deleteComment (commentId) {
      if (!confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
        return
      }

      try {
        const response = await this.$http.secured.delete(`/comment/${commentId}`)

        if (response.data.success) {
          // Remove the comment from our list
          this.comments = this.comments.filter(c => c.id !== commentId)
          this.$toast.success('Comment deleted successfully')
        } else {
          this.$toast.error(response.data.error || 'Failed to delete comment')
        }
      } catch (error) {
        console.error('Error deleting comment:', error)
        if (error.response && error.response.status === 403) {
          this.$toast.error('You can only delete your own comments')
        } else {
          this.$toast.error('Failed to delete comment')
        }
      }
    },

    formatDate (date) {
      if (!date) return 'Not set'
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },

    toggleNodeDropdown() {
      this.showNodeDropdown = !this.showNodeDropdown
      if (this.showNodeDropdown) {
        this.$nextTick(() => {
          document.addEventListener('click', this.handleNodeDropdownClickOutside)
        })
      }
    },
    handleNodeDropdownClickOutside(e) {
      if (!this.$refs.nodeDropdownWrapper || this.$refs.nodeDropdownWrapper.contains(e.target)) return
      this.showNodeDropdown = false
      document.removeEventListener('click', this.handleNodeDropdownClickOutside)
    },
    selectNodeId(id) {
      this.selectedNodeId = id
      this.showNodeDropdown = false
      document.removeEventListener('click', this.handleNodeDropdownClickOutside)
    },
    getNodeDisplayCounter(id) {
      const node = this.reviewNodes.find(n => n.id === id)
      return node ? (node.display_counter || node.id) + '. ' : ''
    },
    getNodeFirstLine(id) {
      const node = this.reviewNodes.find(n => n.id === id)
      if (!node) return ''
      
      // Strip HTML tags and get first line only
      const textContent = node.content.replace(/<[^>]*>/g, '').trim()
      const firstLine = textContent.split('\n')[0] || textContent
      return firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine
    },
    scrollToActionNode(nodeId) {
      this.$nextTick(() => {
        const editorContainer = this.$el.querySelector('.editor-container');
        let nodeEl = editorContainer.querySelector(`#action-node-${nodeId}`);
        if (!nodeEl) nodeEl = editorContainer.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeEl) {
          nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          // Highlight the .node-content inside the node
          const contentEl = nodeEl.querySelector('.node-content');
          if (contentEl) {
            contentEl.classList.add('node-content-highlight');
            setTimeout(() => contentEl.classList.remove('node-content-highlight'), 2000);
          }
        } else {
          const mainNodeEl = document.getElementById(`action-node-${nodeId}`);
          if (mainNodeEl) {
            mainNodeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            const contentEl = mainNodeEl.querySelector('.node-content');
            if (contentEl) {
              contentEl.classList.add('node-content-highlight');
              setTimeout(() => contentEl.classList.remove('node-content-highlight'), 2000);
            }
          }
        }
      });
    },
    scrollToAndHighlightNode(nodeId) {
      // Same as scrollToActionNode, but also for legacy support
      this.scrollToActionNode(nodeId);
    },
    highlightNode(nodeId) {
      // Remove highlight from previous node
      if (this.highlightedNodeId) {
        const prevEl = document.getElementById('action-node-' + this.highlightedNodeId)
        if (prevEl) prevEl.classList.remove('node-highlight-flash')
      }
      // Add highlight to new node
      const nodeEl = document.getElementById('action-node-' + nodeId)
      if (nodeEl) {
        nodeEl.classList.add('node-highlight-flash')
        this.highlightedNodeId = nodeId
        // Remove highlight after 2 seconds
        if (this.highlightTimeout) clearTimeout(this.highlightTimeout)
        this.highlightTimeout = setTimeout(() => {
          nodeEl.classList.remove('node-highlight-flash')
          this.highlightedNodeId = null
        }, 2000)
      }
    },
    parseAssignedNodeIds(assignedNodeIds) {
      // Handle the case where assignedNodeIds might be a string or array
      if (!assignedNodeIds) {
        return []
      }
      
      if (Array.isArray(assignedNodeIds)) {
        return assignedNodeIds
      }
      
      if (typeof assignedNodeIds === 'string') {
        try {
          const parsed = JSON.parse(assignedNodeIds)
          return Array.isArray(parsed) ? parsed : []
        } catch (error) {
          console.error('Error parsing assigned_node_ids:', error)
          return []
        }
      }
      
      return []
    }
  }
}
</script>

<style scoped>
/* --- NORTH EAST GOVT THEME: Modern, Official, Beautiful --- */
:root {
  --govt-blue: #1e3a8a;
  --govt-green: #059669;
  --govt-saffron: #ffb300;
  --govt-yellow: #ffe066;
  --govt-bg: #f4f8fb;
  --govt-card-bg: #fff;
  --govt-border: #e0e7ef;
  --govt-shadow: 0 4px 24px 0 rgba(30,64,175,0.08), 0 1.5px 6px 0 rgba(30,64,175,0.04);
  --govt-gradient: linear-gradient(90deg, #e0e7ff 0%, #f0fdf4 100%);
  --govt-gradient-header: linear-gradient(90deg, #1e3a8a 0%, #059669 100%);
  --govt-gradient-action: linear-gradient(90deg, #e0e7ff 0%, #ffe066 100%);
  --govt-gradient-comments: linear-gradient(90deg, #f0fdf4 0%, #e0e7ff 100%);
}

.review-container {
  font-family: 'Inter', 'Noto Sans', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--govt-bg);
  min-height: 100vh;
  color: #1a202c;
  width: 99vw;
  max-width: 1920px;
  margin: 0 auto;
  padding: 0.5rem 0.5vw;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.review-main {
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2.2rem;
}

/* --- CARD STYLES --- */
.review-header,
.review-content,
.comment-section {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border-radius: 18px;
  background: var(--govt-card-bg);
  box-shadow: var(--govt-shadow);
  border: 2.5px solid var(--govt-border);
  margin-bottom: 0;
  position: relative;
  overflow: visible;
}

.review-header {
  background: var(--govt-gradient-header);
  color: #fff;
  padding: 2.5rem 2.8rem 2rem 2.8rem;
  border-bottom: 4px solid var(--govt-saffron);
  box-shadow: 0 6px 32px 0 rgba(30,64,175,0.10);
}
.review-title h2 {
  font-size: 2.2rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 8px rgba(30,58,138,0.08);
}
.version-info {
  gap: 1.25rem;
}
.status-badge, .version-badge {
  font-size: 1.05rem;
  padding: 0.7rem 1.3rem;
  border-radius: 8px;
  font-weight: 700;
  background: var(--govt-yellow);
  color: #1e3a8a;
  border: 1.5px solid #ffd700;
  box-shadow: 0 1px 4px #ffe06644;
}
.status-badge.status-pending {
  background: #fff3cd;
  color: #856404;
  border: 1.5px solid #ffe066;
}
.status-badge.status-approved {
  background: #d1e7dd;
  color: #0f5132;
  border: 1.5px solid #a3cfbb;
}

/* Task Meta */
.task-meta {
  margin-bottom: 0.5rem;
  background: rgba(255,255,255,0.12);
  border-radius: 10px;
  padding: 1.2rem 1.5rem;
  box-shadow: 0 1px 6px #1e3a8a11;
}
.meta-row {
  gap: 2.5rem;
  margin-bottom: 0.5rem;
}
.meta-label {
  color: #ffe066;
  font-size: 1.05rem;
  font-weight: 700;
  text-shadow: 0 1px 2px #1e3a8a33;
}
.meta-value {
  color: #fff;
  font-size: 1.13rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}
.controls-section {
  gap: 1.25rem;
}

/* --- ACTION NODES CARD --- */
.review-content {
  background: var(--govt-gradient-action);
  border: 2.5px solid #ffe066;
  box-shadow: 0 6px 32px 0 rgba(255,183,0,0.08);
  padding: 2.2rem 2.8rem 2.5rem 2.8rem;
  display: flex;
  flex-direction: column;
  overflow: visible;
}
.content-header {
  padding: 0 0 1.5rem 0;
  background: none;
}
.content-header h3 {
  font-size: 1.55rem;
  color: #1e3a8a;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 4px #ffe06644;
}

/* Editor container - remove scaling, use full width */
.editor-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: visible;
  padding: 0;
  transform: none;
  width: 100%;
  height: 100%;
  margin: 0;
}
.editor-container /deep/ .enhanced-node-editor {
  max-width: 100%;
  margin: 0;
}

/* --- COMMENTS CARD --- */
.comment-section {
  background: var(--govt-gradient-comments);
  border: 2.5px solid #1e3a8a;
  box-shadow: 0 6px 32px 0 rgba(30,64,175,0.10);
  padding: 2.2rem 2.8rem 2.5rem 2.8rem;
}
.comment-header {
  padding: 0 0 1.5rem 0;
  background: none;
}
.comment-header h3 {
  font-size: 1.35rem;
  color: #059669;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 4px #1e3a8a22;
}

/* --- COMMENT NODE DROPDOWN --- */
.compact-node-dropdown-wrapper {
  position: relative;
  margin-top: 0.75rem;
  max-width: 520px;
}
.compact-node-dropdown-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.2rem;
  background: #f8fafc;
  border: 2.5px solid #1e3a8a;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 1rem;
  box-shadow: 0 1px 6px #1e3a8a11;
  max-width: 100%;
}
.compact-node-dropdown-selected .node-counter {
  font-weight: 700;
  color: #1e3a8a;
  margin-right: 0.75rem;
  font-size: 1.05rem;
  background: linear-gradient(135deg, #1e3a8a, #059669);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.compact-node-dropdown-selected .node-preview {
  flex: 1;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  max-width: 320px;
}
.compact-node-dropdown-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 2.5px solid #1e3a8a;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px #1e3a8a22, 0 10px 10px -5px #05966911;
  max-height: 320px;
  max-width: 520px;
  overflow-y: auto;
  z-index: 1000;
  backdrop-filter: blur(10px);
  animation: dropdownSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.compact-node-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.95rem 1.2rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-bottom: 1px solid #e0e7ef;
  position: relative;
  overflow: hidden;
  max-width: 100%;
}
.compact-node-dropdown-item .node-counter {
  font-weight: 700;
  color: #1e3a8a;
  margin-right: 0.75rem;
  font-size: 1.05rem;
  min-width: 24px;
  text-align: center;
  background: linear-gradient(135deg, #1e3a8a, #059669);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.compact-node-dropdown-item .node-preview {
  color: #374151;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  max-width: 320px;
}

/* --- APPROVE SECTION --- */
.approve-section {
  background: linear-gradient(90deg, #ffe066 0%, #f0fdf4 100%);
  border: 2.5px solid #059669;
  border-radius: 18px;
  box-shadow: 0 2px 12px #05966922;
  padding: 2rem 2.5rem;
  text-align: center;
  margin-top: 1.5rem;
  width: 100%;
}
.btn-large {
  padding: 1.1rem 2.5rem;
  font-size: 1.15rem;
  font-weight: 700;
  border-radius: 8px;
  background: var(--govt-green);
  color: #fff;
  border: none;
  box-shadow: 0 2px 8px #05966922;
  transition: background 0.2s, box-shadow 0.2s;
}
.btn-large:hover {
  background: #047857;
  box-shadow: 0 4px 16px #05966933;
}

/* --- RESPONSIVE --- */
@media (max-width: 1200px) {
  .review-container {
    width: 100vw;
    max-width: 100vw;
    padding: 0.5rem 0.5vw;
  }
  .review-header, .review-content, .comment-section, .approve-section {
    padding-left: 1.2rem;
    padding-right: 1.2rem;
  }
}
@media (max-width: 700px) {
  .review-container {
    width: 100vw;
    max-width: 100vw;
    padding: 0.25rem 0.25vw;
  }
  .review-header, .review-content, .comment-section, .approve-section {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    padding-top: 1rem;
    padding-bottom: 1rem;
    border-radius: 10px;
  }
  .review-title h2 {
    font-size: 1.2rem;
  }
  .content-header h3 {
    font-size: 1.05rem;
  }
  .compact-node-dropdown-wrapper, .compact-node-dropdown-list {
    max-width: 98vw;
  }
}

/* Loading State */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(248, 249, 250, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.loading-spinner i {
  font-size: 2rem;
  color: #1e40af;
  margin-bottom: 1rem;
}

/* Review Header - Government Style - Fixed Width */
.review-header {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1.5rem; /* Reduced padding */
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  width: 100%;
  box-sizing: border-box; /* Ensure padding is included in width */
  max-width: 100%; /* Prevent overflow */
}

.review-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9ecef;
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
  gap: 1rem;
}

.review-title h2 {
  color: #495057;
  font-size: 1.4rem; /* Slightly reduced */
  font-weight: 600;
  margin: 0;
  line-height: 1.3;
  flex: 1;
  min-width: 0; /* Allow text to shrink */
}

.version-info {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-shrink: 0;
}

.version-badge {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #1e40af;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffe066;
}

.status-approved {
  background: #d1e7dd;
  color: #0f5132;
  border: 1px solid #a3cfbb;
}

/* Task Meta Information */
.task-meta {
  margin-bottom: 1.5rem;
}

.meta-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem; /* Reduced gap */
  margin-bottom: 1rem;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0; /* Allow items to shrink */
}

.meta-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meta-value {
  font-size: 1rem;
  color: #495057;
  font-weight: 500;
  word-wrap: break-word; /* Prevent overflow */
}

/* Controls Section */
.controls-section {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.btn {
  padding: 0.75rem 1.25rem;
  border: 1px solid transparent;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  white-space: nowrap; /* Prevent button text wrapping */
}

.btn-primary {
  background-color: #1e40af;
  border-color: #1e40af;
  color: white;
}

.btn-primary:hover {
  background-color: #1e3a8a;
  border-color: #1e3a8a;
}

.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5c636a;
  border-color: #565e64;
}

.btn-success {
  background-color: #198754;
  border-color: #198754;
  color: white;
}

.btn-success:hover {
  background-color: #157347;
  border-color: #146c43;
}

.btn-ghost {
  background: transparent;
  border: 1px solid #dee2e6;
  color: #495057;
}

.btn-ghost:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}

/* Content Area - Fixed Container Overflow */
.review-content {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  width: 100%;
  max-width: 100%; /* Prevent overflow */
  box-sizing: border-box;
  max-height: 75vh; /* Reduced from 80vh */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent content from spilling out */
}

.content-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
  flex-shrink: 0;
}

.content-header h3 {
  color: #495057;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.diff-description {
  color: #6c757d;
  font-size: 0.875rem;
  margin: 0;
  font-style: italic;
}

/* Fixed Single Scrollable Container for Editor */
.editor-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden; /* Prevent horizontal scrolling */
  padding: 1rem; /* Reduced padding */
  /* Content magnification - 1.25x larger with proper containment */
  transform: scale(1.15); /* Reduced scale from 1.25 to 1.15 */
  transform-origin: top left;
  width: 87%; /* Adjusted to contain scaled content */
  height: 87%; /* Adjusted to contain scaled content */
  max-width: 87%; /* Ensure it doesn't exceed container */
  box-sizing: border-box;
}

/* Custom Scrollbar for Editor Container */
.editor-container::-webkit-scrollbar {
  width: 8px;
}

.editor-container::-webkit-scrollbar-track {
  background: #f1f3f4;
  border-radius: 4px;
}

.editor-container::-webkit-scrollbar-thumb {
  background: #c1c8cd;
  border-radius: 4px;
}

.editor-container::-webkit-scrollbar-thumb:hover {
  background: #a8b2ba;
}

/* Ensure EnhancedNodeEditor doesn't create additional scrolling */
.editor-container /deep/ .enhanced-node-editor {
  height: auto;
  max-height: none;
  overflow: visible;
  margin: 0; /* Remove any margins */
}

.editor-container /deep/ .node-list,
.editor-container /deep/ .nodes-container {
  height: auto;
  max-height: none;
  overflow: visible;
  margin: 0; /* Remove margins that could cause dual scrolling */
}

.editor-container /deep/ .editor-toolbar {
  margin: 0; /* Remove toolbar margins */
  margin-bottom: 1rem; /* Keep small bottom margin for separation */
}

/* Diff highlighting styles for nodes */
.editor-container /deep/ .action-node.diff-added {
  background: rgba(34, 197, 94, 0.1);
  border-left: 3px solid #22c55e;
  border-radius: 4px;
  margin: 0.5rem 0;
}

.editor-container /deep/ .action-node.diff-modified {
  background: rgba(245, 158, 11, 0.1);
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
  margin: 0.5rem 0;
}

.editor-container /deep/ .action-node.diff-deleted {
  background: rgba(239, 68, 68, 0.1);
  border-left: 3px solid #ef4444;
  border-radius: 4px;
  margin: 0.5rem 0;
  opacity: 0.7;
  text-decoration: line-through;
}

/* Comments Section - Hidden by Default - Fixed Width */
.comment-section {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  width: 100%;
  max-width: 100%; /* Prevent overflow */
  box-sizing: border-box;
}

.comment-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
  gap: 1rem;
}

.comment-header:hover {
  background: #e9ecef;
}

.comment-header h3 {
  color: #495057;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  flex: 1;
  min-width: 0;
}

.comment-status {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.unresolved-indicator {
  background: #dc3545;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  animation: pulse 2s infinite;
  white-space: nowrap;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.resolved-indicator {
  background: #28a745;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.comment-content {
  padding: 1.5rem;
  max-height: 400px;
  overflow-y: auto;
}

/* Comment Items - New Design */
.comments-list {
  margin-bottom: 1.5rem;
}

.comment-item {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.comment-item:last-child {
  margin-bottom: 0;
}

/* Comment Header with User Info and Actions */
.comment-header-new {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.comment-user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.comment-user-icon {
  color: #6c757d;
  font-size: 1rem;
}

.comment-user-name {
  color: #495057;
  font-size: 0.9rem;
  font-weight: 600;
}

.comment-date {
  color: #6c757d;
  font-size: 0.8rem;
  font-weight: normal;
}

.comment-actions {
  display: flex;
  gap: 0.5rem;
}

.resolve-btn, .edit-btn, .delete-btn {
  padding: 0.4rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  background: white;
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resolve-btn {
  border-color: #dee2e6;
  color: #6c757d;
}

.resolve-btn.resolved {
  background: #d1e7dd;
  border-color: #28a745;
  color: #155724;
}

.edit-btn {
  border-color: #ffc107;
  color: #856404;
}

.edit-btn:hover {
  background: #fff3cd;
}

.delete-btn {
  border-color: #dc3545;
  color: #721c24;
}

.delete-btn:hover {
  background: #f8d7da;
}

/* Comment Body Container */
.comment-body {
  padding: 1rem;
}

/* Referenced Content (replying to specific node) */
.referenced-content {
  background: #e7f3ff;
  border: 1px solid #b3d7ff;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.reference-content-display {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.reference-counter {
  color: #0056b3;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.reference-text {
  color: #495057;
  font-size: 0.875rem;
  line-height: 1.4;
  font-style: italic;
}

.reference-text.reference-deleted {
  color: #dc3545;
  text-decoration: line-through;
}

/* Comment Text */
.comment-text {
  color: #495057;
  font-size: 0.9rem;
  line-height: 1.5;
}

.comment-text.resolved-comment {
  opacity: 0.7;
}

/* Edit Comment Form */
.edit-comment-form {
  margin-top: 0.5rem;
}

.edit-comment-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 80px;
}

.edit-comment-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  justify-content: flex-end;
}

.btn-small {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}

/* Review Actions - Simplified - Fixed Width */
.review-actions {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  width: 100%;
  max-width: 100%; /* Prevent overflow */
  box-sizing: border-box;
}

.action-group {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  flex-wrap: wrap; /* Allow wrapping on smaller screens */
}

/* Error State */
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}

.error-message {
  text-align: center;
  padding: 2rem;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.error-message h3 {
  color: #dc3545;
  margin-bottom: 1rem;
}

.error-message p {
  color: #6c757d;
  margin-bottom: 1.5rem;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .review-container {
    width: 95vw; /* Slightly larger on mobile */
    padding: 0.5rem;
  }
  
  .review-header {
    padding: 1rem;
  }
  
  .review-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .meta-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .controls-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn {
    justify-content: center;
  }
  
  .review-content {
    max-height: 65vh; /* Reduced for mobile */
  }
  
  .editor-container {
    transform: scale(1.05); /* Even less magnification on mobile */
    width: 95%;
    height: 95%;
  }
  
  .comment-status {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-end;
  }
}

/* Form styles for add comment section */

.no-comments {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 2rem;
}

.add-comment-section {
  border-top: 1px solid #e9ecef;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0 0 6px 6px;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comment-input {
  width: 100%;
  min-height: 80px;
  padding: 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.875rem;
  resize: vertical;
  font-family: inherit;
}

.comment-input:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
}

.comment-form-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
}

.comment-options {
  flex: 1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.checkbox-label span {
  font-size: 0.875rem;
  color: #495057;
}

.node-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}

.node-select:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
}

.comment-buttons {
  display: flex;
  gap: 0.5rem;
}

/* Forward Review Modal Styles */
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
  border: 1px solid rgba(30, 58, 138, 0.1);
  overflow: hidden;
}

.modal-header {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  padding: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
}

.btn-close {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
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
  background: rgba(255, 255, 255, 0.25);
  transform: rotate(90deg);
}

.modal-body {
  padding: 1.5rem;
  background: linear-gradient(
    to bottom,
    rgba(30, 58, 138, 0.05),
    rgba(30, 64, 175, 0.02)
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
  color: #1e40af;
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
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  background: white;
  appearance: none;
}

.form-control:focus {
  outline: none;
  border-color: #1e40af;
  box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
}

.form-control.has-value {
  border-color: #1e40af;
  background: rgba(30, 64, 175, 0.02);
}

.help-text {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
}

.modal-footer {
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { 
    opacity: 0; 
    transform: translateY(-20px) scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0) scale(1); 
  }
}

/* Compact Node Dropdown Styles - Modern Design */
.compact-node-dropdown-wrapper {
  position: relative;
  margin-top: 0.75rem;
}

.compact-node-dropdown-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.875rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.compact-node-dropdown-selected:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.compact-node-dropdown-selected .placeholder {
  color: #9ca3af;
  font-style: italic;
}

.compact-node-dropdown-selected .node-counter {
  font-weight: 700;
  color: #1e3a8a;
  margin-right: 0.75rem;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #1e3a8a, #059669);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.compact-node-dropdown-selected .node-preview {
  flex: 1;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.compact-node-dropdown-selected .dropdown-arrow {
  color: #6b7280;
  font-size: 0.75rem;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.compact-node-dropdown-wrapper:has(.compact-node-dropdown-list:not([style*="display: none"])) .dropdown-arrow {
  transform: rotate(180deg);
}

.compact-node-dropdown-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-height: 320px;
  overflow-y: auto;
  z-index: 1000;
  backdrop-filter: blur(10px);
  animation: dropdownSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes dropdownSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.compact-node-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.2rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-bottom: 1px solid #e0e7ef;
  position: relative;
  overflow: hidden;
}

.compact-node-dropdown-item:last-child {
  border-bottom: none;
}

.compact-node-dropdown-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #3b82f6, #1e40af);
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: -1;
}

.compact-node-dropdown-item:hover {
  background-color: #f8fafc;
  transform: translateX(4px);
}

.compact-node-dropdown-item:hover::before {
  opacity: 0.05;
}

.compact-node-dropdown-item.selected {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border-left: 4px solid #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.compact-node-dropdown-item.selected::before {
  opacity: 0.1;
}

.node-item-content {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.compact-node-dropdown-item .node-counter {
  font-weight: 700;
  color: #1e3a8a;
  margin-right: 0.75rem;
  font-size: 0.9rem;
  min-width: 24px;
  text-align: center;
  background: linear-gradient(135deg, #1e3a8a, #059669);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.compact-node-dropdown-item .node-preview {
  color: #374151;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  max-width: 320px;
}

.node-item-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: 0.75rem;
  opacity: 0;
  transition: all 0.2s ease;
}

.compact-node-dropdown-item.selected .node-item-indicator {
  opacity: 1;
  transform: scale(1.1);
}

.node-item-indicator i {
  color: #10b981;
  font-size: 0.875rem;
  animation: checkmarkPop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes checkmarkPop {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

/* Scrollbar styling for dropdown */
.compact-node-dropdown-list::-webkit-scrollbar {
  width: 6px;
}

.compact-node-dropdown-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.compact-node-dropdown-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #cbd5e1, #94a3b8);
  border-radius: 3px;
  transition: background 0.2s ease;
}

.compact-node-dropdown-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #94a3b8, #64748b);
}

.card-locked {
  position: relative;
  pointer-events: none;
  opacity: 0.85;
  filter: grayscale(0.08) brightness(0.98);
}
.locked-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 10;
  background: rgba(255,255,255,0.82);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: #1e3a8a;
  font-weight: 700;
  border-radius: 18px;
  pointer-events: all;
  gap: 0.7rem;
}
.locked-overlay i {
  font-size: 2.2rem;
  color: #1e3a8a;
  margin-bottom: 0.2rem;
}

.meta-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.2rem 2.5rem;
  margin-bottom: 0.7rem;
}
.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-width: 0;
  padding: 0.5rem 0.8rem;
  border-radius: 8px;
  background: linear-gradient(90deg, #f8fafc 60%, #e0e7ff 100%);
  box-shadow: 0 1px 4px #1e3a8a0a;
  margin-bottom: 0.2rem;
}
.meta-label {
  font-size: 1.01rem;
  font-weight: 800;
  color: #1e3a8a;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: linear-gradient(90deg, #ffe066 0%, #fffbe6 100%);
  border-radius: 4px;
  padding: 0.1rem 0.5rem 0.1rem 0.2rem;
  margin-bottom: 0.1rem;
  box-shadow: 0 1px 2px #ffe06633;
  display: inline-block;
}
.meta-value {
  font-size: 1.13rem;
  color: #059669;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 2px #1e3a8a22;
  background: #fff;
  border-radius: 3px;
  padding: 0.08rem 0.4rem;
  display: inline-block;
}
@media (max-width: 700px) {
  .meta-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  .meta-item {
    padding: 0.4rem 0.5rem;
  }
  .meta-label {
    font-size: 0.95rem;
    padding: 0.08rem 0.3rem 0.08rem 0.1rem;
  }
  .meta-value {
    font-size: 1rem;
    padding: 0.06rem 0.2rem;
  }
}

.clickable-node-ref {
  color: #1e40af;
  text-decoration: underline dotted;
  cursor: pointer;
  font-weight: 600;
  background: linear-gradient(90deg, #e0e7ff 0%, #f0fdf4 100%);
  border-radius: 4px;
  padding: 0.05em 0.25em;
  transition: background 0.2s, color 0.2s;
}
.clickable-node-ref:hover {
  background: #ffe066;
  color: #b45309;
}

/* Highlight effect for action node in card 2 */
.action-node-highlight {
  animation: nodeHighlightFlash 2s cubic-bezier(0.4,0,0.2,1);
  background: #fffbe6 !important;
  box-shadow: 0 0 0 4px #ffe06699, 0 2px 12px #1e3a8a22;
  border-radius: 8px !important;
  transition: background 0.3s, box-shadow 0.3s;
  z-index: 2;
  position: relative;
}
@keyframes nodeHighlightFlash {
  0% { background: #fffbe6; box-shadow: 0 0 0 8px #ffe066cc, 0 2px 12px #1e3a8a22; }
  60% { background: #fffbe6; box-shadow: 0 0 0 4px #ffe06699, 0 2px 12px #1e3a8a22; }
  100% { background: inherit; box-shadow: none; }
}

.node-highlight-flash {
  animation: nodeFlash 2s cubic-bezier(0.4,0,0.2,1);
  background: #fffde7 !important;
  box-shadow: 0 0 0 4px #ffb30055, 0 2px 8px #ffb30033;
  border: 2px solid #ffb300 !important;
  z-index: 2;
}
@keyframes nodeFlash {
  0% { background: #fffde7; box-shadow: 0 0 0 8px #ffb30088; border-color: #ffb300; }
  60% { background: #fffde7; box-shadow: 0 0 0 4px #ffb30055; border-color: #ffb300; }
  100% { background: transparent; box-shadow: none; border-color: transparent; }
}

.comment-node-ref {
  display: inline-flex;
  align-items: center;
  margin-left: 0.5em;
  padding: 2px 8px;
  border-radius: 6px;
  background: #e3f2fd;
  color: #1e3a8a;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  text-decoration: none;
  font-size: 0.97em;
  gap: 0.4em;
}
.comment-node-ref:hover {
  background: #ffb300;
  color: #fff;
  text-decoration: underline wavy;
}
.comment-node-ref.reference-deleted {
  background: #f8d7da;
  color: #b71c1c;
  cursor: not-allowed;
  font-style: italic;
}
.comment-node-ref .ref-content {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.node-content-highlight {
  background: #fffbe6 !important;
  box-shadow: 0 0 0 4px #ffe06699, 0 2px 12px #1e3a8a22;
  border-radius: 8px !important;
  transition: background 0.3s, box-shadow 0.3s;
  z-index: 2;
  position: relative;
  animation: nodeContentHighlightFlash 2s cubic-bezier(0.4,0,0.2,1);
}
@keyframes nodeContentHighlightFlash {
  0% { background: #fffbe6; box-shadow: 0 0 0 8px #ffe066cc, 0 2px 12px #1e3a8a22; }
  60% { background: #fffbe6; box-shadow: 0 0 0 4px #ffe06699, 0 2px 12px #1e3a8a22; }
  100% { background: inherit; box-shadow: none; }
}
</style>

<style>
/* GLOBAL: Ensure node-content-highlight always wins, even with scoped/deep selectors */
.node-content.node-content-highlight,
.enhanced-node-item .node-content.node-content-highlight {
  background: #fffbe6 !important;
  box-shadow: 0 0 0 4px #ffe066cc, 0 2px 12px #1e3a8a22 !important;
  border-radius: 8px !important;
  z-index: 10 !important;
  position: relative !important;
  animation: nodeContentHighlightFlash 2s cubic-bezier(0.4,0,0.2,1) !important;
  transition: background 0.3s, box-shadow 0.3s !important;
}
@keyframes nodeContentHighlightFlash {
  0% { background: #fffbe6; box-shadow: 0 0 0 8px #ffe066cc, 0 2px 12px #1e3a8a22; }
  60% { background: #fffbe6; box-shadow: 0 0 0 4px #ffe06699, 0 2px 12px #1e3a8a22; }
  100% { background: inherit; box-shadow: none; }
}
</style> 