<template>
  <div v-if="visible" class="dnc-overlay" @click.self="$emit('close')">
    <div class="dnc-dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <!-- ─── HEADER ─── -->
      <div class="dnc-head">
        <div class="dnc-head-left">
          <h3 :id="titleId" class="dnc-title">Comments</h3>
          <template v-if="hasNodeContextMeta">
            <p class="dnc-node-path">
              <span class="dnc-node-path-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </span>
              Node {{ displayNodeLabel }}
            </p>
            <p v-if="displayAssignedReviewer" class="dnc-assignee-tag">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Assigned to: <strong>{{ displayAssignedReviewer }}</strong>
            </p>
          </template>
        </div>
        <div class="dnc-head-right">
          <span v-if="displaySector" class="dnc-sector-badge">{{ displaySector }}</span>
          <template v-if="canResolvePackNode">
            <button
              v-if="!isNodeResolved"
              type="button"
              class="dnc-resolve-btn dnc-resolve-btn-mark"
              :disabled="resolveBusy"
              @click="setPackNodeResolved(true)"
            >
              <svg class="dnc-resolve-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {{ resolveBusy ? '…' : 'Mark resolved' }}
            </button>
            <template v-else>
              <span class="dnc-resolved-badge" aria-live="polite">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Resolved
              </span>
              <button
                type="button"
                class="dnc-resolve-btn dnc-resolve-btn-unresolve"
                :disabled="resolveBusy"
                @click="setPackNodeResolved(false)"
              >
                {{ resolveBusy ? '…' : 'Unresolve' }}
              </button>
            </template>
          </template>
          <button type="button" class="dnc-close" aria-label="Close" @click="$emit('close')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- ─── NODE CONTENT PREVIEW ─── -->
      <div v-if="hasNodeContextPreview" class="dnc-context">
        <div class="dnc-preview-card" :class="{ 'dnc-preview-expanded': previewExpanded }">
          <div class="dnc-preview-content" :style="previewExpanded ? {} : { maxHeight: '72px' }">
            {{ previewExpanded ? nodeContentFullText : previewSummaryText }}
          </div>
          <button
            v-if="showExpandToggle"
            type="button"
            class="dnc-preview-toggle"
            @click="previewExpanded = !previewExpanded"
          >
            {{ previewExpanded ? 'Show less' : 'Show more' }}
            <svg :class="{ 'dnc-toggle-flip': previewExpanded }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>

      <!-- ─── MESSAGE THREAD ─── -->
      <div class="dnc-body">
        <p v-if="loading" class="dnc-loading-state">
          <span class="dnc-spinner" aria-hidden="true"><span class="dnc-spinner-ring"></span></span>
          Loading comments…
        </p>
        <p v-else-if="error" class="dnc-error">{{ error }}</p>
        <div v-else class="dnc-thread">
          <div
            v-for="c in comments"
            :key="c.id"
            class="dnc-bubble-wrap"
            :class="{ mine: isMine(c) }"
          >
            <div class="dnc-avatar" :class="{ 'dnc-avatar-mine': isMine(c) }">
              {{ userInitials(c.user_name) }}
            </div>
            <div class="dnc-bubble">
              <div class="dnc-meta">
                <span class="dnc-meta-name">{{ c.user_name || 'User' }}</span>
                <span class="dnc-meta-dot">·</span>
                <span class="dnc-meta-time">{{ formatTime(c.created_at) }}</span>
                <span v-if="isMine(c) && editingCommentId !== c.id && deleteConfirmId !== c.id" class="dnc-bubble-actions">
                  <button type="button" class="dnc-action-btn" aria-label="Edit comment" title="Edit" @click="startEdit(c)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button type="button" class="dnc-action-btn dnc-action-btn-danger" aria-label="Delete comment" title="Delete" @click="deleteConfirmId = c.id">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </span>
              </div>
              <template v-if="editingCommentId === c.id">
                <textarea v-model="editBody" class="dnc-edit-input" rows="4" />
                <div class="dnc-edit-actions">
                  <button type="button" class="dnc-btn-secondary" :disabled="savingEdit" @click="cancelEdit">Cancel</button>
                  <button type="button" class="dnc-btn-primary" :disabled="savingEdit || !editBody.trim()" @click="saveEdit(c.id)">
                    {{ savingEdit ? 'Saving…' : 'Save' }}
                  </button>
                </div>
              </template>
              <template v-else>
                <div v-if="deleteConfirmId === c.id" class="dnc-delete-confirm">
                  <span>Delete this comment?</span>
                  <button type="button" class="dnc-btn-secondary" :disabled="deletingId === c.id" @click="deleteConfirmId = null">No</button>
                  <button type="button" class="dnc-btn-danger" :disabled="deletingId === c.id" @click="confirmDelete(c.id)">
                    {{ deletingId === c.id ? '…' : 'Yes' }}
                  </button>
                </div>
                <div v-else class="dnc-text">{{ c.body }}</div>
              </template>
            </div>
          </div>
          <div v-if="!comments.length" class="dnc-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <p>No messages yet.</p>
            <p class="dnc-empty-hint">Start the conversation below.</p>
          </div>
        </div>

        <!-- ─── COMPOSE ─── -->
        <div v-if="canComment" class="dnc-compose">
          <div class="dnc-compose-row">
            <textarea
              v-model="body"
              class="dnc-input"
              rows="2"
              placeholder="Write a comment…"
              @keydown.ctrl.enter.prevent="submit"
              @keydown.meta.enter.prevent="submit"
            />
            <button
              type="button"
              class="dnc-send"
              :disabled="saving || !body.trim()"
              @click="submit"
              :title="'Send (Ctrl+Enter)'"
            >
              <svg v-if="!saving" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              <span v-else class="dnc-send-spinner"></span>
            </button>
          </div>
          <p class="dnc-compose-hint">Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to send</p>
        </div>
        <p v-else class="dnc-no-access">Only editors and reviewers can add comments here.</p>
      </div>
    </div>
  </div>
</template>

<script>
const PREVIEW_SUMMARY_LEN = 80
const PREVIEW_EXPAND_THRESHOLD = 100

export default {
  name: 'DashboardNodeCommentsModal',
  props: {
    visible: { type: Boolean, default: false },
    versionId: { type: [Number, String], default: null },
    stableNodeId: { type: String, default: '' },
    currentUserId: { type: [Number, String], default: null },
    userRole: { type: String, default: '' },
    /**
     * Optional: { taskDescription, taskSector, nodeLabel, nodeHierarchyPath, nodeContentPreview, nodeContentFull } — all strings.
     */
    nodeContext: { type: Object, default: null },
    /**
     * Editor pack resolution for this stable node (from parent editorOverlay[stableNodeId].is_resolved).
     * Passed from parent to avoid an extra GET; parent refetches overlay after PATCH.
     */
    isNodeResolved: { type: Boolean, default: false }
  },
  data () {
    return {
      titleId: 'dnc-title-' + Math.random().toString(36).slice(2),
      comments: [],
      loading: false,
      error: '',
      body: '',
      saving: false,
      editingCommentId: null,
      editBody: '',
      deleteConfirmId: null,
      savingEdit: false,
      deletingId: null,
      resolveBusy: false,
      previewExpanded: false
    }
  },
  computed: {
    canComment () {
      const r = (this.userRole || '').toLowerCase()
      return ['editor', 'reviewer', 'final_reviewer'].includes(r)
    },
    /** Editor-only: same gate as meeting_dashboard resolve_dashboard_pack_node (require_editor!). */
    canResolvePackNode () {
      const r = (this.userRole || '').toLowerCase()
      if (r !== 'editor') return false
      return !!(this.versionId != null && this.versionId !== '' && this.stableNodeId)
    },
    hasNodeContextMeta () {
      const ctx = this.nodeContext
      if (!ctx || typeof ctx !== 'object') return false
      return !!(ctx.taskDescription || ctx.nodeLabel || ctx.nodeHierarchyPath)
    },
    hasNodeContextPreview () {
      const ctx = this.nodeContext
      if (!ctx || typeof ctx !== 'object') return false
      const full = String(ctx.nodeContentFull || ctx.nodeContentPreview || '')
      return full.length > 0
    },
    /** Use hierarchy path (parenthetical) when available, fallback to dot label */
    displayNodeLabel () {
      const ctx = this.nodeContext
      if (!ctx) return ''
      return ctx.nodeHierarchyPath || ctx.nodeLabel || ''
    },
    displaySector () {
      const ctx = this.nodeContext
      if (!ctx) return ''
      return ctx.taskSector || ''
    },
    displayAssignedReviewer () {
      const ctx = this.nodeContext
      if (!ctx) return ''
      return ctx.assignedReviewerNames || ''
    },
    nodeContentFullText () {
      const ctx = this.nodeContext
      if (!ctx) return ''
      return String(ctx.nodeContentFull || ctx.nodeContentPreview || '')
    },
    previewSummaryText () {
      const full = this.nodeContentFullText
      const oneLine = full.replace(/\s+/g, ' ').trim()
      if (oneLine.length <= PREVIEW_SUMMARY_LEN) return oneLine || 'Node content'
      return oneLine.slice(0, PREVIEW_SUMMARY_LEN) + '…'
    },
    showExpandToggle () {
      const full = this.nodeContentFullText
      return full.replace(/\s+/g, ' ').trim().length > PREVIEW_EXPAND_THRESHOLD
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler (v) {
        this.resetTransientState()
        if (v) {
          this.body = ''
          this.previewExpanded = false
          this.load()
        }
      }
    }
  },
  methods: {
    resetTransientState () {
      this.editingCommentId = null
      this.editBody = ''
      this.deleteConfirmId = null
      this.savingEdit = false
      this.deletingId = null
    },
    isMine (c) {
      return this.currentUserId != null && String(c.user_id) === String(this.currentUserId)
    },
    userInitials (name) {
      if (!name) return '?'
      const parts = String(name).trim().split(/\s+/)
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      return parts[0].slice(0, 2).toUpperCase()
    },
    formatTime (iso) {
      if (!iso) return ''
      try {
        const d = new Date(iso)
        return d.toLocaleString()
      } catch (e) {
        return iso
      }
    },
    scrollThreadToBottom () {
      this.$nextTick(() => {
        const thread = this.$el && this.$el.querySelector('.dnc-thread')
        if (thread) thread.scrollTop = thread.scrollHeight
      })
    },
    async load () {
      if (!this.versionId || !this.stableNodeId) return
      this.loading = true
      this.error = ''
      try {
        const { data } = await this.$http.secured.get('/meeting_dashboard/dashboard_node_comments', {
          params: {
            new_dashboard_version_id: this.versionId,
            stable_node_id: this.stableNodeId
          }
        })
        this.comments = data.comments || []
        this.scrollThreadToBottom()
      } catch (e) {
        this.error = (e.response && e.response.data && e.response.data.error) || 'Could not load comments'
        this.comments = []
      } finally {
        this.loading = false
      }
    },
    startEdit (c) {
      this.deleteConfirmId = null
      this.editingCommentId = c.id
      this.editBody = c.body || ''
    },
    cancelEdit () {
      this.editingCommentId = null
      this.editBody = ''
    },
    async saveEdit (commentId) {
      const text = (this.editBody || '').trim()
      if (!text) return
      this.savingEdit = true
      try {
        await this.$http.secured.put(
          `/meeting_dashboard/dashboard_node_comments/${commentId}`,
          { body: text }
        )
        const row = this.comments.find((x) => String(x.id) === String(commentId))
        if (row) row.body = text
        this.cancelEdit()
        this.$toast && this.$toast.success('Comment updated')
        this.scrollThreadToBottom()
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || 'Update failed'
        this.$toast && this.$toast.error(msg)
      } finally {
        this.savingEdit = false
      }
    },
    async confirmDelete (commentId) {
      this.deletingId = commentId
      try {
        await this.$http.secured.delete(
          `/meeting_dashboard/dashboard_node_comments/${commentId}`
        )
        this.comments = this.comments.filter((x) => String(x.id) !== String(commentId))
        this.deleteConfirmId = null
        this.$emit('submitted')
        this.$toast && this.$toast.success('Comment deleted')
        this.scrollThreadToBottom()
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || 'Delete failed'
        this.$toast && this.$toast.error(msg)
      } finally {
        this.deletingId = null
      }
    },
    async submit () {
      const text = (this.body || '').trim()
      if (!text || !this.canComment) return
      this.saving = true
      try {
        await this.$http.secured.post('/meeting_dashboard/dashboard_node_comments', {
          new_dashboard_version_id: this.versionId,
          stable_node_id: this.stableNodeId,
          body: text
        })
        this.body = ''
        await this.load()
        this.$emit('submitted')
        this.$nextTick(() => {
          const thread = this.$el && this.$el.querySelector('.dnc-thread')
          if (thread) thread.scrollTop = thread.scrollHeight
        })
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || 'Send failed'
        this.$toast && this.$toast.error(msg)
      } finally {
        this.saving = false
      }
    },
    async setPackNodeResolved (nextResolved) {
      if (!this.canResolvePackNode || this.resolveBusy) return
      const vid = this.versionId
      const sid = this.stableNodeId
      this.resolveBusy = true
      try {
        await this.$http.secured.patch(
          `/meeting_dashboard/dashboard_pack_nodes/${encodeURIComponent(String(vid))}/resolve`,
          { stable_node_id: sid, resolved: nextResolved }
        )
        this.$toast &&
          this.$toast.success(nextResolved ? 'Marked resolved for this pack node.' : 'Marked unresolved.')
        this.$emit('resolution-changed', {
          stableNodeId: sid,
          resolved: nextResolved
        })
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || 'Could not update resolution.'
        this.$toast && this.$toast.error(msg)
      } finally {
        this.resolveBusy = false
      }
    }
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   DESIGN TOKENS — Forest-Teal Theme (ReviewHub Aligned)
═══════════════════════════════════════════════ */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.dnc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  z-index: 100050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: dnc-fade-in 0.15s ease-out;
}
@keyframes dnc-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.dnc-dialog {
  --c-accent: #0d7a5f;
  --c-accent-2: #0a6650;
  --c-accent-light: #ecfdf5;
  --c-surface: #ffffff;
  --c-bg: #f0f4f8;
  --c-border: #e2e8f0;
  --c-border-2: #cbd5e1;
  --c-text: #1a2332;
  --c-text-2: #4a5568;
  --c-text-3: #718096;

  width: 100%;
  max-width: 680px;
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--c-surface);
  border-radius: 16px;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.18),
    0 8px 24px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  font-family: 'Plus Jakarta Sans', 'Inter', 'Roboto', system-ui, -apple-system, sans-serif;
  animation: dnc-slide-up 0.2s ease-out;
}
@keyframes dnc-slide-up {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ════════════════════════════════════════════
   HEADER
════════════════════════════════════════════ */
.dnc-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--c-border);
  background: linear-gradient(180deg, #f8fffe 0%, var(--c-surface) 100%);
}
.dnc-head-left {
  min-width: 0;
  flex: 1;
}
.dnc-head-right {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.dnc-title {
  margin: 0 0 2px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--c-text);
  letter-spacing: -0.01em;
}
.dnc-node-path {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--c-accent);
  background: var(--c-accent-light);
  border: 1px solid rgba(13, 122, 95, 0.15);
  border-radius: 6px;
  padding: 2px 8px 2px 4px;
  margin-top: 4px;
}
.dnc-node-path-icon {
  display: inline-flex;
  color: var(--c-accent);
  opacity: 0.6;
}

/* Assigned reviewer tag */
.dnc-assignee-tag {
  margin: 4px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--c-text-2);
  background: #f0f4f8;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  padding: 3px 10px 3px 6px;
}
.dnc-assignee-tag svg {
  flex-shrink: 0;
  color: var(--c-accent);
  opacity: 0.7;
}
.dnc-assignee-tag strong {
  font-weight: 700;
  color: var(--c-text);
}

/* Sector badge */
.dnc-sector-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  background: linear-gradient(135deg, #0d7a5f, #0a6650);
  color: #fff;
  box-shadow: 0 1px 4px rgba(13, 122, 95, 0.25);
}

/* Resolve buttons */
.dnc-resolve-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid var(--c-border-2);
  background: var(--c-surface);
  color: var(--c-text-2);
  font-family: inherit;
  transition: all 0.15s ease;
}
.dnc-resolve-icon {
  flex-shrink: 0;
}
.dnc-resolve-btn-mark {
  border-color: var(--c-accent);
  background: var(--c-accent-light);
  color: var(--c-accent);
}
.dnc-resolve-btn-mark:hover:not(:disabled) {
  background: #d1fae5;
  box-shadow: 0 2px 8px rgba(13, 122, 95, 0.2);
  transform: translateY(-1px);
}
.dnc-resolve-btn-unresolve {
  font-weight: 500;
  color: var(--c-text-3);
}
.dnc-resolve-btn-unresolve:hover:not(:disabled) {
  background: #f1f5f9;
  color: var(--c-text-2);
}
.dnc-resolve-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.dnc-resolved-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 100px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  background: #dcfce7;
  color: #166534;
}

/* Close button */
.dnc-close {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--c-text-3);
  transition: all 0.15s ease;
}
.dnc-close:hover {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}

/* ════════════════════════════════════════════
   NODE CONTENT PREVIEW
════════════════════════════════════════════ */
.dnc-context {
  padding: 12px 18px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-bg);
}
.dnc-preview-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  padding: 10px 14px;
  position: relative;
  transition: all 0.2s ease;
}
.dnc-preview-card:hover {
  border-color: var(--c-border-2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.dnc-preview-content {
  font-size: 0.84rem;
  color: var(--c-text-2);
  line-height: 1.55;
  overflow: hidden;
  word-break: break-word;
  transition: max-height 0.3s ease;
}
.dnc-preview-expanded .dnc-preview-content {
  max-height: 160px !important;
  overflow-y: auto;
}
.dnc-preview-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  border: none;
  background: none;
  color: var(--c-accent);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 0;
  font-family: inherit;
  transition: color 0.12s;
}
.dnc-preview-toggle:hover {
  color: var(--c-accent-2);
}
.dnc-toggle-flip {
  transform: rotate(180deg);
}

/* ════════════════════════════════════════════
   MESSAGE THREAD
════════════════════════════════════════════ */
.dnc-body {
  padding: 14px 18px 16px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.dnc-thread {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 16px;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 4px;
}
/* Custom scrollbar */
.dnc-thread::-webkit-scrollbar { width: 5px; }
.dnc-thread::-webkit-scrollbar-track { background: transparent; }
.dnc-thread::-webkit-scrollbar-thumb {
  background: var(--c-border-2);
  border-radius: 100px;
}
.dnc-thread::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

/* Bubble layout — chat style */
.dnc-bubble-wrap {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 90%;
}
.dnc-bubble-wrap.mine {
  flex-direction: row-reverse;
  margin-left: auto;
}

/* Avatar */
.dnc-avatar {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  background: #e2e8f0;
  color: var(--c-text-2);
  border: 1.5px solid var(--c-border);
}
.dnc-avatar-mine {
  background: linear-gradient(135deg, #0d7a5f, #0a6650);
  color: #fff;
  border-color: rgba(13, 122, 95, 0.3);
}

/* Bubble */
.dnc-bubble {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f1f5f9;
  color: var(--c-text);
  border: 1px solid var(--c-border);
  transition: box-shadow 0.15s;
}
.dnc-bubble:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}
.dnc-bubble-wrap.mine .dnc-bubble {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border-color: rgba(13, 122, 95, 0.18);
}

/* Meta line */
.dnc-meta {
  font-size: 0.72rem;
  color: var(--c-text-3);
  margin-bottom: 4px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.dnc-meta-name {
  font-weight: 600;
  color: var(--c-text-2);
}
.dnc-meta-dot { opacity: 0.4; }
.dnc-meta-time { font-size: 0.68rem; }
.dnc-bubble-actions {
  margin-left: auto;
  display: inline-flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.dnc-bubble:hover .dnc-bubble-actions {
  opacity: 1;
}

/* Action buttons in bubble */
.dnc-action-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 3px 4px;
  border-radius: 4px;
  color: var(--c-text-3);
  display: inline-flex;
  align-items: center;
  transition: all 0.12s;
}
.dnc-action-btn:hover {
  background: var(--c-accent-light);
  color: var(--c-accent);
}
.dnc-action-btn-danger:hover {
  background: #fee2e2;
  color: #b91c1c;
}

/* Message text */
.dnc-text {
  font-size: 0.84rem;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

/* Edit input */
.dnc-edit-input {
  width: 100%;
  border: 1px solid var(--c-border-2);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.84rem;
  resize: vertical;
  box-sizing: border-box;
  margin-top: 6px;
  font-family: inherit;
  color: var(--c-text);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.dnc-edit-input:focus {
  outline: none;
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px rgba(13, 122, 95, 0.15);
}

/* Edit actions */
.dnc-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

/* Buttons */
.dnc-btn-secondary {
  padding: 6px 14px;
  border: 1px solid var(--c-border-2);
  border-radius: 8px;
  background: var(--c-surface);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  color: var(--c-text-2);
  font-family: inherit;
  transition: all 0.12s;
}
.dnc-btn-secondary:hover:not(:disabled) {
  border-color: var(--c-border);
  background: #f8fafc;
}
.dnc-btn-primary {
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #0d5c45, #0d7a5f);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 2px 6px rgba(13, 122, 95, 0.25);
  transition: all 0.15s;
}
.dnc-btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0a6650, #0d8a6c);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(13, 122, 95, 0.35);
}
.dnc-btn-primary:disabled,
.dnc-btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.dnc-btn-danger {
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 2px 6px rgba(185, 28, 28, 0.25);
  transition: all 0.15s;
}
.dnc-btn-danger:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(185, 28, 28, 0.35);
}

/* Delete confirmation */
.dnc-delete-confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--c-text-2);
  margin-top: 4px;
}

/* Empty state */
.dnc-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 16px;
  color: var(--c-text-3);
  text-align: center;
}
.dnc-empty-state svg {
  opacity: 0.3;
  margin-bottom: 10px;
}
.dnc-empty-state p {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 500;
}
.dnc-empty-hint {
  font-size: 0.78rem !important;
  font-weight: 400 !important;
  color: var(--c-text-3) !important;
  margin-top: 4px !important;
}

/* Loading */
.dnc-loading-state {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--c-text-3);
  font-size: 0.84rem;
  margin: 0;
}
.dnc-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  position: relative;
  flex-shrink: 0;
}
.dnc-spinner-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2.5px solid var(--c-border);
  border-top-color: var(--c-accent);
  animation: dnc-spin 0.8s linear infinite;
}
@keyframes dnc-spin { to { transform: rotate(360deg); } }

.dnc-error {
  color: #b91c1c;
  font-size: 0.84rem;
  margin: 0;
  padding: 8px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

/* No access message */
.dnc-no-access {
  color: var(--c-text-3);
  font-size: 0.82rem;
  font-style: italic;
  margin: 8px 0 0;
  padding: 10px 14px;
  background: var(--c-bg);
  border-radius: 8px;
  text-align: center;
}

/* ════════════════════════════════════════════
   COMPOSE
════════════════════════════════════════════ */
.dnc-compose {
  margin-top: auto;
  border-top: 1px solid var(--c-border);
  padding-top: 12px;
}
.dnc-compose-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.dnc-input {
  flex: 1;
  border: 1px solid var(--c-border-2);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.84rem;
  resize: none;
  box-sizing: border-box;
  font-family: inherit;
  color: var(--c-text);
  background: var(--c-bg);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  line-height: 1.5;
}
.dnc-input:focus {
  outline: none;
  border-color: var(--c-accent);
  background: var(--c-surface);
  box-shadow: 0 0 0 3px rgba(13, 122, 95, 0.12);
}
.dnc-input::placeholder {
  color: var(--c-text-3);
}
.dnc-send {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #0d5c45, #0d7a5f);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(13, 122, 95, 0.3);
  transition: all 0.15s ease;
}
.dnc-send:hover:not(:disabled) {
  background: linear-gradient(135deg, #0a6650, #0d8a6c);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(13, 122, 95, 0.4);
}
.dnc-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}
.dnc-send-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: dnc-spin 0.7s linear infinite;
}
.dnc-compose-hint {
  margin: 6px 0 0;
  font-size: 0.68rem;
  color: var(--c-text-3);
  text-align: right;
}
.dnc-compose-hint kbd {
  display: inline-block;
  padding: 1px 5px;
  border: 1px solid var(--c-border-2);
  border-radius: 3px;
  background: #f8fafc;
  font-size: 0.65rem;
  font-family: inherit;
  color: var(--c-text-2);
  box-shadow: 0 1px 0 var(--c-border);
}
</style>
