<template>
  <div v-if="visible" class="dnc-overlay" @click.self="$emit('close')">
    <div class="dnc-dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <div class="dnc-head">
        <h3 :id="titleId" class="dnc-title">Node discussion</h3>
        <button type="button" class="dnc-close" aria-label="Close" @click="$emit('close')">×</button>
      </div>
      <div class="dnc-body">
        <p v-if="loading" class="dnc-muted">Loading…</p>
        <p v-else-if="error" class="dnc-error">{{ error }}</p>
        <div v-else class="dnc-thread">
          <div
            v-for="c in comments"
            :key="c.id"
            class="dnc-bubble-wrap"
            :class="{ mine: isMine(c) }"
          >
            <div class="dnc-bubble">
              <div class="dnc-meta">{{ c.user_name || 'User' }} · {{ formatTime(c.created_at) }}</div>
              <div class="dnc-text">{{ c.body }}</div>
            </div>
          </div>
          <p v-if="!comments.length" class="dnc-muted">No messages yet.</p>
        </div>
        <div v-if="canComment" class="dnc-compose">
          <textarea
            v-model="body"
            class="dnc-input"
            rows="3"
            placeholder="Add a note…"
            @keydown.ctrl.enter.prevent="submit"
          />
          <button type="button" class="dnc-send" :disabled="saving || !body.trim()" @click="submit">
            {{ saving ? 'Sending…' : 'Send' }}
          </button>
        </div>
        <p v-else class="dnc-muted">Only editors and reviewers can add comments here.</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DashboardNodeCommentsModal',
  props: {
    visible: { type: Boolean, default: false },
    versionId: { type: [Number, String], default: null },
    stableNodeId: { type: String, default: '' },
    currentUserId: { type: [Number, String], default: null },
    userRole: { type: String, default: '' }
  },
  data () {
    return {
      titleId: 'dnc-title-' + Math.random().toString(36).slice(2),
      comments: [],
      loading: false,
      error: '',
      body: '',
      saving: false
    }
  },
  computed: {
    canComment () {
      const r = (this.userRole || '').toLowerCase()
      return ['editor', 'reviewer', 'final_reviewer'].includes(r)
    }
  },
  watch: {
    visible (v) {
      if (v) {
        this.body = ''
        this.load()
      }
    }
  },
  methods: {
    isMine (c) {
      return this.currentUserId != null && String(c.user_id) === String(this.currentUserId)
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
      } catch (e) {
        this.error = (e.response && e.response.data && e.response.data.error) || 'Could not load comments'
        this.comments = []
      } finally {
        this.loading = false
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
      } catch (e) {
        const msg = (e.response && e.response.data && e.response.data.error) || 'Send failed'
        this.$toast && this.$toast.error(msg)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.dnc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 100050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.dnc-dialog {
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
}
.dnc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}
.dnc-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}
.dnc-close {
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
}
.dnc-body {
  padding: 12px 14px 16px;
  overflow-y: auto;
  flex: 1;
}
.dnc-thread {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  max-height: 280px;
  overflow-y: auto;
}
.dnc-bubble-wrap {
  display: flex;
  justify-content: flex-start;
}
.dnc-bubble-wrap.mine {
  justify-content: flex-end;
}
.dnc-bubble {
  max-width: 85%;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #0f172a;
}
.dnc-bubble-wrap.mine .dnc-bubble {
  background: #dbeafe;
}
.dnc-meta {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
}
.dnc-text {
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
}
.dnc-muted {
  color: #64748b;
  font-size: 13px;
}
.dnc-error {
  color: #b91c1c;
  font-size: 13px;
}
.dnc-compose {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dnc-input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px;
  font-size: 13px;
  resize: vertical;
  box-sizing: border-box;
}
.dnc-send {
  align-self: flex-end;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #1d4ed8;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
}
.dnc-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
