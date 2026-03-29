<template>
  <div class="review-container">
    <div class="hub-bg-glow hub-glow-left" aria-hidden="true" />
    <div class="hub-bg-glow hub-glow-right" aria-hidden="true" />

    <!-- Loading State -->
    <div v-if="loading" class="loading-overlay hub-loading-overlay">
      <div class="hub-loading-card">
        <div class="hub-spinner" />
        <p>Loading review…</p>
      </div>
    </div>

    <!-- Review Content - Only show when data is loaded -->
    <div
      v-else-if="isDataReady"
      class="review-main"
      :class="{ 'review-main--action-expanded': actionSectionExpanded }"
    >
      <header v-show="!actionSectionExpanded" class="hub-hero riv-hub-hero">
        <div class="hub-hero-inner riv-hub-hero-inner">
          <router-link
            v-if="isEditor && task && task.id"
            :to="{ name: 'TaskReviewHub', params: { taskId: String(task.id) } }"
            class="hub-back"
          >
            <i class="fas fa-arrow-left" aria-hidden="true" />
            Back
          </router-link>
          <div v-else class="riv-hub-hero-corner" aria-hidden="true" />

          <div class="hub-hero-copy riv-hub-hero-copy">
            <p class="hub-eyebrow">
              <span class="hub-dot" />
              Review workspace
            </p>
            <h1 class="hub-title riv-hub-title">Review: {{ task.description }}</h1>
            
          </div>

          <router-link
            v-if="isEditor && task && task.id"
            :to="{ name: 'TaskReviewHub', params: { taskId: String(task.id) } }"
            class="hub-refresh riv-hub-live-link"
          >
            <i class="fas fa-chart-line" aria-hidden="true" />
            Live review status
          </router-link>
          <div v-else class="riv-hub-hero-corner" aria-hidden="true" />
        </div>
      </header>

      <section v-show="!actionSectionExpanded" class="hub-task-strip">
        <div class="hub-task-glass riv-review-glass">
          <div class="hub-task-meta riv-review-meta" role="group" aria-label="Review details">
            <span class="hub-pill hub-pill-version">v{{ review.task_version.version_number }}</span>
            <span :class="['hub-status', hubStatusClass]">{{ formatReviewStatus(review.status) }}</span>
            <span class="hub-pill hub-pill-muted">
              <span class="riv-pill-label">Sector</span>
              {{ task.sector_division || 'N/A' }}
            </span>
            <span class="hub-pill hub-pill-muted">
              <span class="riv-pill-label">Responsibility</span>
              {{ task.responsibility || 'N/A' }}
            </span>
            <span class="hub-pill hub-pill-muted">
              <span class="riv-pill-label">Review date</span>
              <span :class="getReviewDateHighlightClasses(task.review_date)">{{ formatDate(task.review_date) }}</span>
            </span>
            <span class="hub-pill hub-pill-muted">
              <span class="riv-pill-label">Reviewer</span>
              <span :class="getReviewDateHighlightClasses(task.review_date)">{{ review.reviewer.name }}</span>
            </span>
          </div>

          <ReviewWorkspaceToolbar
            :current-view-mode="currentViewMode"
            :is-review-approved="isReviewApproved"
            :edit-enabled="editEnabled"
            :diff-highlights-enabled="diffHighlightsEnabled"
            :show-text-diff="showTextDiff"
            :can-forward="canForward"
            :has-changes="hasChanges"
            @change-view="currentViewMode = $event"
            @toggle-edit="toggleEdit"
            @toggle-diff-highlights="diffHighlightsEnabled = !diffHighlightsEnabled"
            @toggle-show-text-diff="showTextDiff = !showTextDiff"
            @forward="forwardReview"
            @save="saveChanges"
          />
        </div>
      </section>

      <!-- Content Area with Single Scrolling -->
      <div
        ref="actionContentCard"
        class="review-content riv-content-card hub-table-card"
        :class="{
          'card-locked': isReviewApproved || !editEnabled,
          'riv-action-expanded': actionSectionExpanded
        }"
      >
        <div
          class="content-header riv-content-head"
          :class="{ 'riv-content-head--expanded': actionSectionExpanded }"
        >
          <div class="riv-content-head-top">
            <div class="riv-content-title-block">
              <h3>Action items to be taken</h3>
              <p v-if="currentViewMode === 'diff' && review.base_version" class="diff-description">
                Showing changes between Version {{ review.base_version.version_number }} and Version {{ review.task_version.version_number }}
              </p>
              <p v-else-if="currentViewMode === 'diff' && !review.base_version" class="diff-description">
                Showing first review - all content is new
              </p>
              <p v-else-if="currentViewMode === 'old' && review.base_version" class="diff-description">
                Showing previous Version {{ review.base_version.version_number }}
              </p>
              <p v-else-if="currentViewMode === 'current'" class="diff-description">
                Showing current Version {{ review.task_version.version_number }}
              </p>
            </div>
            <button
              type="button"
              class="hub-btn hub-btn-ghost riv-expand-action-btn"
              :aria-expanded="actionSectionExpanded ? 'true' : 'false'"
              :aria-controls="actionSectionExpanded ? 'review-action-panel' : undefined"
              :title="actionSectionExpanded ? 'Exit full view (Escape)' : 'Expand action items to full screen'"
              id="toggle-action-section-expand"
              @click="toggleActionSectionExpanded"
            >
              <i
                :class="actionSectionExpanded ? 'fas fa-compress-arrows-alt' : 'fas fa-expand-arrows-alt'"
                aria-hidden="true"
              />
              <span class="riv-sr-only">
                {{ actionSectionExpanded ? 'Exit full view for action items' : 'Expand action items to full screen' }}
              </span>
            </button>
          </div>
          <div
            v-if="actionSectionExpanded"
            id="review-action-panel"
            class="riv-expanded-toolbar-wrap"
            aria-label="Review view and actions"
          >
            <ReviewWorkspaceToolbar
              :current-view-mode="currentViewMode"
              :is-review-approved="isReviewApproved"
              :edit-enabled="editEnabled"
              :diff-highlights-enabled="diffHighlightsEnabled"
              :show-text-diff="showTextDiff"
              :can-forward="canForward"
              :has-changes="hasChanges"
              @change-view="currentViewMode = $event"
              @toggle-edit="toggleEdit"
              @toggle-diff-highlights="diffHighlightsEnabled = !diffHighlightsEnabled"
              @toggle-show-text-diff="showTextDiff = !showTextDiff"
              @forward="forwardReview"
              @save="saveChanges"
            />
          </div>
        </div>

        <!-- Locked overlay if approved or edit is disabled -->
        <div v-if="isReviewApproved || !editEnabled" class="locked-overlay">
          <i class="fas fa-lock"></i>
          <span v-if="isReviewApproved">This review is approved and cannot be edited.</span>
          <span v-else>Editing is disabled for this review.</span>
        </div>

        <!-- Enhanced Node Editor - Single Scrollable Area -->
        <div class="editor-container">
          <transition name="fade" mode="out-in">
            <DiffView
              v-if="currentViewMode === 'diff'"
              key="diff-view"
              :baseline-nodes="baselineNodes"
              :current-nodes="reviewNodes"
              :show-text-diff="showTextDiff"
              :base-version-number="review.base_version ? review.base_version.version_number : 'N/A'"
              :current-version-number="review.task_version ? review.task_version.version_number : 'N/A'"
              :current-reviewer-id="review.reviewer.id"
              :reviewer-type="review.reviewer_type"
              :permission-mode="true"
              :current-user-role="currentUserRole"
              :suppress-diff-highlights="!diffHighlightsEnabled"
            />
            <EnhancedNodeEditor
              v-else
              key="node-editor"
              :initial-nodes="displayedNodes"
              :readonly="isEditorReadonly"
              :view-mode="currentViewMode"
              :show-diff="currentViewMode !== 'old'"
              :diff-data="diffData"
              :task-version-id="review.task_version.id"
              :hide-sort-by-date="true"
              :hide-sort-button="true"
              :current-reviewer-id="review.reviewer.id"
              :reviewer-type="review.reviewer_type"
              :assigned-node-ids="parseAssignedNodeIds(review.assigned_node_ids)"
              :permission-mode="true"
              :suppress-diff-highlights="!diffHighlightsEnabled"
              :enable-node-comment-shortcut="true"
              @nodes-changed="onNodesChanged"
              @open-comment-for-node="openCommentComposerForNode"
              ref="nodeEditor"
            />
          </transition>
        </div>
      </div>

      <!-- Comments Section - Hidden by Default with Indicators -->
      <div
        v-show="!actionSectionExpanded"
        class="comment-section riv-comment-card hub-table-card"
        ref="commentSection"
      >
        <div class="comment-header riv-comment-head" @click="toggleCommentSection">
          <h3>Comments &amp; discussion</h3>
          <div class="comment-status">
            <!-- Show unresolved comments indicator -->
            <span v-if="unresolvedCommentsCount > 0" class="unresolved-indicator">
              {{ unresolvedCommentsCount }} unresolved
            </span>
            <!-- Show total comments count -->
            <span v-if="comments.length > 0 && unresolvedCommentsCount === 0" class="resolved-indicator">
              {{ comments.length }} resolved
            </span>
            <button type="button" class="hub-btn hub-btn-ghost riv-toggle-comments" @click.stop="toggleCommentSection">
              <i :class="showComments ? 'fas fa-chevron-up' : 'fas fa-chevron-down'" aria-hidden="true" />
              {{ showComments ? 'Hide comments' : 'Show comments' }}
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
                ref="newCommentInput"
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
                      <span
                        v-if="selectedNodeId !== '' && selectedNodeId != null"
                        :key="'node-pick-' + selectedNodeId"
                        class="node-picker-chip"
                      >
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
                        :class="['compact-node-dropdown-item', { selected: String(selectedNodeId) === String(node.id) }]"
                        @click="selectNodeId(node.id)"
                      >
                        <div class="node-item-content">
                          <span class="node-counter">{{ node.display_counter || node.id }}.</span>
                          <span class="node-preview">{{ getNodeFirstLine(node.id) }}</span>
                        </div>
                        <div class="node-item-indicator">
                          <i v-if="String(selectedNodeId) === String(node.id)" class="fas fa-check"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="comment-buttons">
                  <button type="button" @click="clearComment" class="btn btn-secondary">Cancel</button>
                  <button type="button" @click="addNewComment" class="btn btn-primary" :disabled="!newComment.trim()">
                    <i class="fas fa-comment-dots" aria-hidden="true" />
                    Add comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Simplified Review Actions - Only show approve button for reviewers after comments -->
      <div v-if="canApprove && !isReviewApproved" class="approve-section riv-hub-approve">
        <button type="button" @click="approveReview" class="hub-btn hub-btn-success-lg">
          <i class="fas fa-check-circle" aria-hidden="true" />
          Approve review
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-else class="error-state riv-error-wrap">
      <div class="error-message riv-error-card hub-card hub-card-error">
        <h3>Unable to load review</h3>
        <p>The review data could not be loaded. Please try refreshing the page.</p>
        <button type="button" @click="loadReviewData" class="hub-btn hub-btn-primary">
          <i class="fas fa-redo" aria-hidden="true" />
          Retry
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
            type="button"
            @click="submitForwardReview"
            class="btn btn-primary"
            :disabled="!selectedForwardReviewer"
          >
            <i class="fas fa-paper-plane" aria-hidden="true" />
            Forward review
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import EnhancedNodeEditor from './EnhancedNodeEditor.vue'
import CommentTrail from './CommentTrail.vue'
import DiffView from './DiffView.vue'
import ReviewWorkspaceToolbar from './ReviewWorkspaceToolbar.vue'
import { getReviewDateHighlightClasses } from '../utils/reviewDateHighlight'

export default {
  name: 'ReviewInterface',
  
  components: {
    EnhancedNodeEditor,
    CommentTrail,
    DiffView,
    ReviewWorkspaceToolbar
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
      baselineNodes: [],
      diffData: null,
      commentTrails: [],
      comments: [],
      editEnabled: true,
      diffHighlightsEnabled: true,
      currentViewMode: 'current', // 'current' | 'old' | 'diff'
      showTextDiff: true, // For toggling text diff highlights in Diff view
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
      actionSectionExpanded: false
    }
  },

  computed: {
    canForward() {
      return this.review && this.review.status === 'pending'
    },

    hubStatusClass() {
      if (!this.review || !this.review.status) return ''
      const map = {
        pending: 'hub-status-pending',
        approved: 'hub-status-approved',
        changes_requested: 'hub-status-changes'
      }
      return map[this.review.status] || ''
    },
    
    displayedNodes() {
      if (this.currentViewMode === 'old') {
        return this.baselineNodes
      }
      return this.reviewNodes
    },

    isEditorReadonly() {
      return !this.editEnabled || this.isReviewApproved || this.currentViewMode !== 'current'
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

  mounted () {
    document.addEventListener('keydown', this.handleReviewGlobalKeydown, true)
  },

  beforeDestroy () {
    document.removeEventListener('keydown', this.handleReviewGlobalKeydown, true)
  },

  // Add watcher for route changes to handle navigation between different reviews
  watch: {
    '$route'(to, from) {
      // console.log('Route changed from', from.params.id, 'to', to.params.id)
      // Only reload if the review ID actually changed
      if (to.params.id !== from.params.id) {
        this.actionSectionExpanded = false
        // console.log('Review ID changed, reloading data...')
        this.loadReviewData()
      }
    }
  },

  methods: {
    getReviewDateHighlightClasses,
    handleReviewGlobalKeydown (e) {
      if (e.key !== 'Escape' || !this.actionSectionExpanded || !this.isDataReady) return
      if (this.showForwardModal) return
      e.preventDefault()
      this.actionSectionExpanded = false
    },
    toggleActionSectionExpanded () {
      this.actionSectionExpanded = !this.actionSectionExpanded
      if (this.actionSectionExpanded) {
        this.$nextTick(() => {
          const el = this.$refs.actionContentCard
          if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        })
      }
    },
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
          this.reviewNodes = this.flattenNodesWithDiff(data.nodes || [])
          this.baselineNodes = this.flattenNodesWithDiff(data.baseline_nodes || [])
          
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

    formatReviewStatus (s) {
      if (!s) return ''
      if (s === 'changes_requested') return 'Changes requested'
      return s.charAt(0).toUpperCase() + s.slice(1)
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
    /** From action row "comment" icon: expand comments, pre-select node, scroll + focus. */
    openCommentComposerForNode (rawNodeId) {
      if (this.isReviewApproved) return
      this.actionSectionExpanded = false
      const match = this.reviewNodes.find(n => String(n.id) === String(rawNodeId))
      const resolvedId = match != null ? match.id : rawNodeId

      this.showComments = true
      this.commentForSpecificNode = true
      this.showNodeDropdown = false
      document.removeEventListener('click', this.handleNodeDropdownClickOutside)

      // Reset then assign on next tick so switching rows always refreshes the chip + list
      // (avoids stale label when jumping from one action item to another via icons).
      const applySelection = () => {
        this.selectedNodeId = resolvedId
        this.$nextTick(() => {
          const section = this.$refs.commentSection
          if (section && typeof section.scrollIntoView === 'function') {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          this.$nextTick(() => {
            const ta = this.$refs.newCommentInput
            if (ta && typeof ta.focus === 'function') {
              ta.focus()
            }
          })
        })
      }

      if (String(this.selectedNodeId) === String(resolvedId)) {
        applySelection()
        return
      }

      this.selectedNodeId = ''
      this.$nextTick(() => {
        applySelection()
      })
    },
    getNodeDisplayCounter(id) {
      const node = this.reviewNodes.find(n => String(n.id) === String(id))
      return node ? (node.display_counter || node.id) + '. ' : ''
    },
    getNodeFirstLine(id) {
      const node = this.reviewNodes.find(n => String(n.id) === String(id))
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
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

/* Shell — TaskReviewHub parity (animated warm gradient + texture) */
.review-container {
  --riv-border: #e2e8f0;
  --riv-muted-bg: #f8fafc;
  --riv-card: #ffffff;
  --riv-slate-600: #475569;
  --riv-slate-400: #94a3b8;
  --riv-orange-soft: #fff7ed;
  --riv-indigo: #4f46e5;
  --riv-indigo-soft: #eef2ff;
  --riv-radius: 1.25rem;
  --riv-radius-sm: 0.75rem;
  --riv-shadow-sm: 0 4px 14px rgba(15, 23, 42, 0.06);
  --riv-shadow: 0 10px 40px rgba(15, 23, 42, 0.08);
  font-family: 'Poppins', system-ui, sans-serif;
  min-height: calc(100vh - 64px);
  position: relative;
  overflow-x: hidden !important;
  overflow-y: visible !important;
  width: 100%;
  flex: 1 1 auto;
  min-width: 0;
  background: linear-gradient(-45deg, #FFB366, #FFC78A, #FFD9A8, #FFE8C5);
  background-size: 400% 400%;
  animation: gradientShift 8s ease infinite;
}

.review-container * {
  box-sizing: border-box;
}

.review-container::before {
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

.review-container::after {
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
  0%, 100% { transform: translateX(0px) translateY(0px) scale(1); opacity: 0.3; }
  25% { transform: translateX(-20px) translateY(-10px) scale(1.1); opacity: 0.5; }
  50% { transform: translateX(10px) translateY(-5px) scale(0.9); opacity: 0.4; }
  75% { transform: translateX(-5px) translateY(5px) scale(1.05); opacity: 0.6; }
}

.hub-bg-glow {
  position: fixed;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(2px);
  animation: floatShape 20s ease-in-out infinite;
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.4);
  pointer-events: none;
  z-index: 2;
}

.hub-glow-left {
  width: 110px;
  height: 110px;
  top: 20%;
  left: 10%;
  animation-duration: 25s;
}

.hub-glow-right {
  width: 85px;
  height: 85px;
  top: 60%;
  right: 15%;
  animation-delay: -5s;
  animation-duration: 30s;
}

@keyframes floatShape {
  0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.7; }
  25% { transform: translateY(-30px) translateX(20px) rotate(90deg); opacity: 0.9; }
  50% { transform: translateY(-10px) translateX(-15px) rotate(180deg); opacity: 0.8; }
  75% { transform: translateY(-25px) translateX(10px) rotate(270deg); opacity: 1; }
}

.review-main {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 2rem clamp(1rem, 2.75vw, 2.5rem) 3.5rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.review-main--action-expanded {
  flex: 1 1 auto;
  min-height: calc(100vh - 64px);
  padding-top: 1.15rem;
  padding-bottom: 1.15rem;
  gap: 0;
}

.review-main--action-expanded .review-content.riv-action-expanded {
  flex: 1 1 auto;
  min-height: 0;
}

.hub-hero.riv-hub-hero {
  margin-bottom: 0.25rem;
  padding-bottom: 1.25rem;
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(90deg, rgba(255, 153, 51, 0.85), rgba(19, 136, 8, 0.75), rgba(0, 0, 128, 0.85)) 1;
}

.hub-hero-inner.riv-hub-hero-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.riv-hub-hero-corner {
  width: 6rem;
  flex-shrink: 0;
}

.hub-back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 140, 66, 0.3);
  background: rgba(255, 255, 255, 0.8);
  color: #c2410c;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  text-decoration: none;
}

.hub-back:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 6px 15px rgba(255, 140, 66, 0.15);
  color: #ea580c;
}

.hub-hero-copy.riv-hub-hero-copy {
  flex: 1 1 280px;
  text-align: center;
  min-width: 0;
}

@media (min-width: 768px) {
  .hub-hero-copy.riv-hub-hero-copy {
    text-align: left;
    padding-left: 0.5rem;
  }
}

.hub-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c2410c;
  margin: 0 0 0.5rem;
}

.hub-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f97316, #ea580c);
  box-shadow: 0 0 12px rgba(249, 115, 22, 0.6);
}

.hub-title.riv-hub-title {
  margin: 0;
  font-size: clamp(1.35rem, 3.5vw, 2rem);
  font-weight: 800;
  color: #1f2937;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  line-height: 1.25;
  word-break: break-word;
}

.hub-sub {
  margin: 0.5rem 0 0;
  max-width: 36rem;
  margin-left: auto;
  margin-right: auto;
  color: #4b5563;
  font-size: 0.95rem;
  line-height: 1.5;
  font-weight: 500;
}

@media (min-width: 768px) {
  .hub-sub {
    margin-left: 0;
    margin-right: 0;
  }
}

.hub-refresh.riv-hub-live-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 140, 66, 0.3);
  background: rgba(255, 255, 255, 0.8);
  color: #c2410c;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  text-decoration: none;
  white-space: nowrap;
}

.hub-refresh.riv-hub-live-link:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 6px 15px rgba(255, 140, 66, 0.15);
  color: #ea580c;
}

.hub-task-strip {
  margin-bottom: 0;
}

.hub-task-glass.riv-review-glass {
  border-radius: 1.25rem;
  padding: 1.25rem 1.35rem 1.35rem;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 100%);
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 30px rgba(249, 115, 22, 0.08);
}

.hub-task-meta.riv-review-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
}

.riv-pill-label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
  margin-right: 0.35rem;
}

.hub-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.hub-pill-muted {
  background: rgba(241, 245, 249, 0.9);
  color: #475569;
  border: 1px solid rgba(203, 213, 225, 0.8);
}

.hub-pill-version {
  background: rgba(254, 240, 138, 0.8);
  color: #b45309;
  border: 1px solid rgba(253, 224, 71, 0.9);
}

.hub-status {
  display: inline-flex;
  padding: 0.3rem 0.7rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.hub-status-pending {
  background: rgba(254, 243, 199, 0.8);
  color: #b45309;
  border: 1px solid rgba(253, 230, 138, 0.9);
}

.hub-status-approved {
  background: rgba(209, 250, 229, 0.8);
  color: #047857;
  border: 1px solid rgba(167, 243, 208, 0.9);
}

.hub-status-changes {
  background: rgba(254, 226, 226, 0.8);
  color: #b91c1c;
  border: 1px solid rgba(254, 202, 202, 0.9);
}

.hub-btn {
  padding: 0.45rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.hub-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hub-btn-primary {
  background: linear-gradient(90deg, #f97316, #f59e0b);
  color: #fff;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
}

.hub-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4);
  background: linear-gradient(90deg, #ea580c, #d97706);
}

.hub-btn-ghost {
  background: rgba(241, 245, 249, 0.9);
  color: #475569;
  border-color: rgba(203, 213, 225, 0.8);
}

.hub-btn-ghost:hover:not(:disabled) {
  background: rgba(226, 232, 240, 0.95);
  color: #1f2937;
}

.hub-btn-success {
  background: linear-gradient(90deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.hub-btn-success:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
}

.hub-btn-success-lg {
  padding: 0.75rem 1.75rem;
  font-size: 0.95rem;
  background: linear-gradient(90deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
  border: none;
  border-radius: 9999px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: inherit;
  transition: all 0.2s ease;
}

.hub-btn-success-lg:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
}

.btn {
  padding: 0.55rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid transparent;
  text-decoration: none;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.hub-table-card {
  border-radius: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 0 15px 40px rgba(249, 115, 22, 0.08);
  overflow: hidden;
}

.hub-card {
  border-radius: 1.25rem;
  padding: 1.25rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
}

.hub-card-error {
  border-color: rgba(248, 113, 113, 0.5);
  background: rgba(254, 226, 226, 0.9);
}

.hub-card-error h3 {
  color: #b91c1c;
}

.hub-card-error p {
  color: #7f1d1d;
}

/* Content card */
.review-content.riv-content-card.hub-table-card:not(.riv-action-expanded) {
  margin-bottom: 0;
  width: 100%;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

.review-content.riv-content-card.hub-table-card.riv-action-expanded {
  margin-bottom: 0;
  width: 100%;
  max-height: none;
  display: flex;
  flex-direction: column;
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: visible;
}

.content-header.riv-content-head {
  padding: 1.15rem 1.35rem 1rem;
  border-bottom: 1px solid rgba(241, 245, 249, 0.85);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(255, 255, 255, 0.98) 100%);
  flex-shrink: 0;
}

.content-header.riv-content-head--expanded {
  position: sticky;
  top: 0;
  z-index: 8;
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
}

.riv-content-head-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.riv-content-title-block {
  flex: 1 1 auto;
  min-width: 0;
}

.riv-expand-action-btn {
  flex-shrink: 0;
  align-self: flex-start;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border-radius: 0.9rem;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(249, 115, 22, 0.12);
  border: 1px solid rgba(255, 140, 66, 0.35);
  background: rgba(255, 255, 255, 0.92);
  color: #c2410c;
}

.riv-expand-action-btn:hover:not(:disabled) {
  background: rgba(255, 247, 237, 0.98);
  color: #ea580c;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(249, 115, 22, 0.18);
}

.riv-expand-action-btn i {
  font-size: 1rem;
}

.riv-expanded-toolbar-wrap {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(241, 245, 249, 0.95);
}

.riv-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.content-header h3 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #1e293b;
}

.diff-description {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--riv-slate-600);
  line-height: 1.45;
  font-style: normal;
}

.editor-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem 1.15rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.editor-container /deep/ .enhanced-node-editor {
  max-width: 100%;
  margin: 0;
}

.editor-container /deep/ .node-list,
.editor-container /deep/ .nodes-container {
  height: auto;
  max-height: none;
  overflow: visible;
  margin: 0;
}

.editor-container /deep/ .editor-toolbar {
  margin: 0 0 1rem;
}

.editor-container /deep/ .action-node.diff-added {
  background: rgba(34, 197, 94, 0.1);
  border-left: 3px solid #22c55e;
  border-radius: 8px;
  margin: 0.5rem 0;
}

.editor-container /deep/ .action-node.diff-modified {
  background: rgba(245, 158, 11, 0.1);
  border-left: 3px solid #f59e0b;
  border-radius: 8px;
  margin: 0.5rem 0;
}

.editor-container /deep/ .action-node.diff-deleted {
  background: rgba(239, 68, 68, 0.1);
  border-left: 3px solid #ef4444;
  border-radius: 8px;
  margin: 0.5rem 0;
  opacity: 0.7;
  text-decoration: line-through;
}

.card-locked {
  position: relative;
  pointer-events: none;
  opacity: 0.88;
  filter: grayscale(0.04);
}

.locked-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: #c2410c;
  font-weight: 600;
  border-radius: 1.25rem;
  pointer-events: all;
  gap: 0.6rem;
}

.locked-overlay i {
  font-size: 1.75rem;
}

/* Comments */
.comment-section.riv-comment-card.hub-table-card {
  width: 100%;
}

.comment-header.riv-comment-head {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--riv-border);
  background: var(--riv-muted-bg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.comment-header.riv-comment-head:hover {
  background: #f1f5f9;
}

.comment-header h3 {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  color: #1e293b;
  flex: 1;
  min-width: 0;
}

.comment-status {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.unresolved-indicator {
  background: #ef4444;
  color: #fff;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  animation: rivPulse 2s ease-in-out infinite;
}

@keyframes rivPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.82; }
}

.resolved-indicator {
  background: #10b981;
  color: #fff;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.hub-btn.riv-toggle-comments {
  border-radius: 9999px;
}

.comment-content {
  padding: 1.15rem 1.25rem;
  max-height: 420px;
  overflow-y: auto;
}

.comments-list {
  margin-bottom: 1.25rem;
}

.comment-item {
  background: #fff;
  border: 1px solid var(--riv-border);
  border-radius: var(--riv-radius-sm);
  margin-bottom: 0.75rem;
  overflow: hidden;
}

.comment-item:last-child {
  margin-bottom: 0;
}

.comment-header-new {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--riv-muted-bg);
  border-bottom: 1px solid var(--riv-border);
}

.comment-user-info {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.comment-user-icon {
  color: var(--riv-slate-400);
}

.comment-user-name {
  color: #334155;
  font-size: 0.875rem;
}

.comment-date {
  color: var(--riv-slate-400);
  font-size: 0.75rem;
}

.comment-actions {
  display: flex;
  gap: 0.35rem;
}

.resolve-btn,
.edit-btn,
.delete-btn {
  padding: 0.35rem;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  border: 1px solid var(--riv-border);
  background: #fff;
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.resolve-btn.resolved {
  background: #ecfdf5;
  border-color: #34d399;
  color: #047857;
}

.edit-btn:hover {
  background: #fffbeb;
}

.delete-btn:hover {
  background: #fef2f2;
}

.comment-body {
  padding: 0.85rem 1rem;
}

.referenced-content {
  background: var(--riv-indigo-soft);
  border: 1px solid #c7d2fe;
  border-radius: var(--riv-radius-sm);
  padding: 0.65rem 0.75rem;
  margin-bottom: 0.75rem;
}

.reference-content-display {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
}

.reference-counter {
  color: var(--riv-indigo);
  font-weight: 700;
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.reference-text {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #475569;
  font-style: italic;
}

.reference-text.reference-deleted {
  color: #dc2626;
  text-decoration: line-through;
}

.comment-text {
  font-size: 0.875rem;
  line-height: 1.5;
  color: #334155;
}

.comment-text.resolved-comment {
  opacity: 0.72;
}

.edit-comment-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--riv-border);
  border-radius: var(--riv-radius-sm);
  font-family: inherit;
  font-size: 0.875rem;
}

.edit-comment-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.65rem;
  justify-content: flex-end;
}

.btn-small {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
}

.edit-comment-form .btn-primary,
.comment-buttons .btn-primary {
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  border-color: #4338ca;
  color: #fff;
}

.edit-comment-form .btn-secondary,
.comment-buttons .btn-secondary {
  background: #fff;
  border-color: var(--riv-border);
  color: var(--riv-slate-600);
}

.no-comments {
  text-align: center;
  color: var(--riv-slate-400);
  padding: 2rem 1rem;
  font-size: 0.875rem;
}

.add-comment-section {
  border-top: 1px solid var(--riv-border);
  padding: 1rem;
  background: var(--riv-muted-bg);
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.comment-input {
  width: 100%;
  min-height: 88px;
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--riv-border);
  border-radius: var(--riv-radius-sm);
  font-size: 0.875rem;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.comment-input:focus {
  outline: none;
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.comment-form-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.comment-options {
  flex: 1;
  min-width: 200px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  font-size: 0.8125rem;
  color: var(--riv-slate-600);
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.comment-buttons {
  display: flex;
  gap: 0.5rem;
}

/* Approve — layout only (no card chrome; sits on page shell) */
.approve-section.riv-hub-approve {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0 0.25rem;
  margin-top: 0.25rem;
}

/* Loading — hub spinner */
.hub-loading-overlay {
  z-index: 3000;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(8px);
}

.hub-loading-card {
  text-align: center;
  padding: 2.5rem 2.75rem;
  border-radius: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 40px rgba(249, 115, 22, 0.12);
}

.hub-loading-card p {
  margin: 0;
  color: #64748b;
  font-weight: 600;
  font-size: 0.95rem;
}

.hub-spinner {
  width: 2.5rem;
  height: 2.5rem;
  margin: 0 auto 1rem;
  border-radius: 50%;
  border: 3px solid rgba(249, 115, 22, 0.2);
  border-top-color: #f97316;
  animation: hubSpin 0.8s linear infinite;
}

@keyframes hubSpin {
  to { transform: rotate(360deg); }
}

/* Error */
.riv-error-wrap {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
  padding: 2rem 1rem;
}

.error-message.riv-error-card {
  text-align: center;
  padding: 2rem 2.25rem;
  max-width: 420px;
}

.error-message h3 {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
}

.error-message p {
  margin: 0 0 1.25rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
  animation: rivFadeIn 0.2s ease;
}

.modal-content {
  background: #fff;
  border-radius: var(--riv-radius);
  width: 90%;
  max-width: 480px;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
  border: 1px solid var(--riv-border);
  overflow: hidden;
  animation: rivSlideIn 0.25s ease;
}

.modal-header {
  padding: 1.1rem 1.35rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  color: #fff;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
}

.btn-close {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.35);
  color: #fff;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.modal-body {
  padding: 1.35rem;
  background: #fafafa;
}

.form-group label {
  display: block;
  margin-bottom: 0.45rem;
  color: #334155;
  font-weight: 600;
  font-size: 0.875rem;
}

.select-wrapper {
  position: relative;
  background: #fff;
  border-radius: var(--riv-radius-sm);
}

.select-wrapper::after {
  content: '';
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  border-top-color: var(--riv-indigo);
  pointer-events: none;
}

.form-control {
  width: 100%;
  padding: 0.7rem 2.25rem 0.7rem 1rem;
  border: 1px solid var(--riv-border);
  border-radius: var(--riv-radius-sm);
  font-size: 0.875rem;
  background: #fff;
  appearance: none;
  font-family: inherit;
}

.form-control:focus {
  outline: none;
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-control.has-value {
  border-color: #818cf8;
}

.help-text {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--riv-slate-600);
  line-height: 1.4;
}

.modal-footer {
  padding: 1rem 1.35rem;
  background: #f8fafc;
  border-top: 1px solid var(--riv-border);
  display: flex;
  gap: 0.65rem;
  justify-content: flex-end;
}

.btn-cancel {
  background: #fff;
  color: var(--riv-slate-600);
  border: 1px solid var(--riv-border);
  padding: 0.6rem 1.15rem;
  border-radius: var(--riv-radius-sm);
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  font-family: inherit;
}

.btn-cancel:hover {
  background: var(--riv-muted-bg);
}

.modal-footer .btn-primary {
  background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
  color: #fff;
  border: none;
}

@keyframes rivFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes rivSlideIn {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Node picker dropdown */
.compact-node-dropdown-wrapper {
  position: relative;
  margin-top: 0.65rem;
  max-width: 520px;
}

.compact-node-dropdown-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.9rem;
  background: #fff;
  border: 1px solid var(--riv-border);
  border-radius: var(--riv-radius-sm);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  font-size: 0.875rem;
}

.compact-node-dropdown-selected:hover {
  border-color: #c7d2fe;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.08);
}

.compact-node-dropdown-selected .placeholder {
  color: var(--riv-slate-400);
}

.compact-node-dropdown-selected .node-counter {
  font-weight: 700;
  color: var(--riv-indigo);
  margin-right: 0.5rem;
}

.compact-node-dropdown-selected .dropdown-arrow {
  color: var(--riv-slate-400);
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}

.compact-node-dropdown-wrapper:has(.compact-node-dropdown-list) .dropdown-arrow {
  transform: rotate(180deg);
}

.compact-node-dropdown-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--riv-border);
  border-radius: var(--riv-radius-sm);
  box-shadow: var(--riv-shadow);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
}

.compact-node-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.12s ease;
}

.compact-node-dropdown-item:last-child {
  border-bottom: none;
}

.compact-node-dropdown-item:hover {
  background: var(--riv-muted-bg);
}

.compact-node-dropdown-item.selected {
  background: var(--riv-indigo-soft);
  border-left: 3px solid var(--riv-indigo);
}

.node-item-content {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 0.35rem;
}

.compact-node-dropdown-item .node-counter {
  font-weight: 700;
  color: var(--riv-indigo);
  flex-shrink: 0;
}

.compact-node-dropdown-item .node-preview {
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
}

.node-item-indicator {
  color: #10b981;
  margin-left: 0.5rem;
}

.node-picker-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}

/* Scrollbars */
.compact-node-dropdown-list::-webkit-scrollbar {
  width: 6px;
}

.compact-node-dropdown-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

/* Comment / node refs */
.clickable-node-ref {
  color: #4338ca;
  text-decoration: underline;
  text-decoration-style: dotted;
  cursor: pointer;
  font-weight: 600;
  background: var(--riv-indigo-soft);
  border-radius: 4px;
  padding: 0.05em 0.25em;
  transition: background 0.15s ease, color 0.15s ease;
}

.clickable-node-ref:hover {
  background: #fef3c7;
  color: #b45309;
}

.comment-node-ref {
  display: inline-flex;
  align-items: center;
  margin-left: 0.35em;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--riv-indigo-soft);
  color: #3730a3;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.92em;
  gap: 0.35em;
}

.comment-node-ref:hover {
  background: #fde68a;
  color: #92400e;
}

.comment-node-ref.reference-deleted {
  background: #fee2e2;
  color: #b91c1c;
  cursor: not-allowed;
}

.comment-node-ref .ref-content {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Flash animations — keep distinct from global node-content-highlight */
.action-node-highlight {
  animation: nodeHighlightFlash 2s cubic-bezier(0.4, 0, 0.2, 1);
  background: #fffbeb !important;
  box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.45), 0 2px 12px rgba(15, 23, 42, 0.08);
  border-radius: 8px !important;
  z-index: 2;
  position: relative;
}

@keyframes nodeHighlightFlash {
  0% {
    background: #fffbeb;
    box-shadow: 0 0 0 8px rgba(250, 204, 21, 0.55), 0 2px 12px rgba(15, 23, 42, 0.08);
  }
  60% {
    background: #fffbeb;
    box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.45), 0 2px 12px rgba(15, 23, 42, 0.08);
  }
  100% {
    background: inherit;
    box-shadow: none;
  }
}

.node-highlight-flash {
  animation: nodeFlash 2s cubic-bezier(0.4, 0, 0.2, 1);
  background: #fef9c3 !important;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.35);
  border: 2px solid #f59e0b !important;
  z-index: 2;
}

@keyframes nodeFlash {
  0% {
    background: #fef9c3;
    box-shadow: 0 0 0 8px rgba(245, 158, 11, 0.45);
  }
  100% {
    background: transparent;
    box-shadow: none;
    border-color: transparent;
  }
}

/* Scoped highlight fallback — global block still authoritative */
.node-content-highlight {
  animation: nodeContentHighlightFlash 2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes nodeContentHighlightFlash {
  0% {
    background: #fffbeb;
    box-shadow: 0 0 0 8px rgba(250, 204, 21, 0.55), 0 2px 12px rgba(15, 23, 42, 0.08);
  }
  60% {
    background: #fffbeb;
    box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.45), 0 2px 12px rgba(15, 23, 42, 0.08);
  }
  100% {
    background: inherit;
    box-shadow: none;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 560px) {
  .review-main {
    padding: 1.25rem 0.85rem 2.5rem;
  }

  .review-main.review-main--action-expanded {
    padding: 1rem 0.85rem;
  }

  .hub-hero-inner.riv-hub-hero-inner {
    flex-direction: column;
    align-items: stretch;
  }

  .riv-hub-hero-corner {
    display: none;
  }

  .hub-refresh.riv-hub-live-link,
  .hub-back {
    justify-content: center;
  }

  .hub-btn {
    white-space: normal;
    text-align: center;
  }

  .btn {
    white-space: normal;
    text-align: center;
  }

  .review-content.riv-content-card:not(.riv-action-expanded) {
    max-height: 70vh;
  }
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