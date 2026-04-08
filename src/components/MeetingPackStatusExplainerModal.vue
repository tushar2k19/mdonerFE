<template>
  <div v-if="visible" class="mp-explainer-overlay" @click.self="closeModal" @keydown.esc="closeModal" tabindex="-1" ref="overlay">
    <div
      class="mp-explainer-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mp-explainer-title"
    >
      <div class="mp-explainer-header">
        <div>
          <h2 id="mp-explainer-title" class="mp-explainer-title">Why this status?</h2>
          <div v-if="taskDescription" class="mp-explainer-subtitle">
            <span class="mp-explainer-sector">{{ taskSector }}</span>
            <span class="mp-separator" aria-hidden="true">•</span>
            <span class="mp-explainer-desc">{{ truncateDesc(taskDescription) }}</span>
          </div>
        </div>
        <button class="mp-explainer-close" @click="closeModal" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="mp-explainer-body">
        <template v-if="loading">
          <div class="mp-skeleton-section">
            <h3 class="mp-section-title">
              <span class="mp-indicator mp-indicator--red"></span> Needs attention
            </h3>
            <div class="mp-skeleton-list">
              <div v-for="i in skeletonRedCount" :key="'sr'+i" class="mp-skeleton-item"></div>
            </div>
          </div>
          <div class="mp-skeleton-section">
            <h3 class="mp-section-title">
              <span class="mp-indicator mp-indicator--green"></span> Cleared
            </h3>
            <div class="mp-skeleton-list">
              <div v-for="i in skeletonGreenCount" :key="'sg'+i" class="mp-skeleton-item"></div>
            </div>
          </div>
        </template>

        <template v-else-if="error">
          <div class="mp-explainer-error">
            <p>Could not load the breakdown.</p>
            <button class="mp-retry-btn" @click="fetchExplainerData">Retry</button>
          </div>
        </template>

        <template v-else>
          <!-- Red Bucket -->
          <div v-if="data && data.red_items && data.red_items.length" class="mp-section">
            <h3 class="mp-section-title">
              <div class="mp-badge mp-badge--red">
                <span class="mp-indicator mp-indicator--red"></span>
                Needs attention ({{ data.red_items.length }})
              </div>
            </h3>
            <div class="mp-item-list">
              <div v-for="item in data.red_items" :key="item.stable_node_id" class="mp-item mp-item--red">
                <span class="mp-item-label">{{ item.node_label }}</span>
                <span class="mp-item-message" v-html="formatMessage(item.message)"></span>
              </div>
            </div>
          </div>

          <!-- Green Bucket -->
          <div v-if="data && data.green_items && data.green_items.length" class="mp-section mp-section--green">
             <h3 class="mp-section-title">
              <div class="mp-badge mp-badge--green">
                <span class="mp-indicator mp-indicator--green"></span>
                Cleared ({{ data.green_items.length }})
              </div>
            </h3>
            <div class="mp-item-list">
              <div v-for="item in data.green_items" :key="item.stable_node_id" class="mp-item mp-item--green">
                <span class="mp-item-label">{{ item.node_label }}</span>
                <span class="mp-item-message" v-html="formatMessage(item.message)"></span>
              </div>
            </div>
          </div>

          <!-- Empty State (No actionable nodes) -->
          <div v-if="data && data.red_items.length === 0 && data.green_items.length === 0" class="mp-empty-state">
            <svg class="mp-empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <p>No actionable nodes for this pack.</p>
          </div>

          <!-- Ready / Fully Cleared Summary -->
          <div v-else-if="data && data.summary && data.summary.ready_eligible" class="mp-success-summary">
            <svg class="mp-success-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span>Ready to be published</span>
          </div>

        </template>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MeetingPackStatusExplainerModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    taskId: {
      type: [String, Number],
      required: true
    },
    versionId: {
      type: [String, Number],
      required: true
    },
    initialStats: {
      type: Object,
      default: () => ({ unresolved_count: 0, resolved_count: 0, assigned_without_comment_count: 0 })
    },
    taskSector: {
      type: String,
      default: ''
    },
    taskDescription: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      loading: true,
      error: false,
      data: null
    }
  },
  computed: {
    skeletonRedCount() {
      if (!this.initialStats) return 1
      return Math.max(1, this.initialStats.unresolved_count + this.initialStats.assigned_without_comment_count)
    },
    skeletonGreenCount() {
      if (!this.initialStats) return 1
      return Math.max(1, this.initialStats.resolved_count)
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.fetchExplainerData()
        this.$nextTick(() => {
          if (this.$refs.overlay) {
            this.$refs.overlay.focus()
          }
        })
      } else {
        this.data = null
      }
    }
  },
  methods: {
    closeModal() {
      this.$emit('close')
    },
    truncateDesc(desc) {
      if (!desc) return ''
      return desc.length > 70 ? desc.substring(0, 70) + '...' : desc
    },
    formatMessage(msg) {
      if (!msg) return ''
      // Replace markdown bold with strong tags
      return msg.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    },
    async fetchExplainerData() {
      this.loading = true
      this.error = false
      
      try {
        const response = await this.$http.secured.get('/meeting_dashboard/pack_node_status_explain', {
          params: {
            new_dashboard_version_id: this.versionId,
            new_task_id: this.taskId
          }
        })
        
        this.data = response.data
      } catch (err) {
        console.error('Failed to load explainer data', err)
        this.error = true
        this.$toast && this.$toast.error('Could not load status breakdown.')
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.mp-explainer-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  outline: none;
  animation: mp-overlay-fade 0.2s ease-out;
}

.mp-explainer-modal {
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 580px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px -10px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
  animation: mp-modal-slide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

@keyframes mp-overlay-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes mp-modal-slide {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.mp-explainer-header {
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: #f8fafc;
}

.mp-explainer-title {
  margin: 0 0 6px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.mp-explainer-subtitle {
  font-size: 0.85rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mp-separator {
  color: #cbd5e1;
  font-size: 0.75rem;
}

.mp-explainer-sector {
  font-weight: 600;
  color: #475569;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.mp-explainer-desc {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
}

.mp-explainer-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.mp-explainer-close:hover {
  background: #e2e8f0;
  color: #334155;
}

.mp-explainer-body {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
  /* Scrollbar styles */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.mp-explainer-body::-webkit-scrollbar {
  width: 6px;
}
.mp-explainer-body::-webkit-scrollbar-track {
  background: transparent;
}
.mp-explainer-body::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
}

/* Sections */
.mp-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mp-section-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mp-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  border-radius: 100px;
  font-size: 0.8rem;
  font-weight: 600;
}

.mp-badge--red {
  background: #fee2e2;
  color: #991b1b;
}

.mp-badge--green {
  background: #dcfce7;
  color: #166534;
}

.mp-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.mp-indicator--red { background: #ef4444; }
.mp-indicator--green { background: #10b981; }

.mp-item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mp-item {
  display: flex;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  align-items: flex-start;
  font-size: 0.9rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.mp-item:hover {
  transform: translateY(-1px);
}

.mp-item--red {
  border-left: 3px solid #ef4444;
}
.mp-item--red:hover {
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.08);
  border-color: #fca5a5;
}

.mp-item--green {
  border-left: 3px solid #10b981;
}
.mp-item--green:hover {
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);
  border-color: #6ee7b7;
}

.mp-item-label {
  font-weight: 700;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #334155;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
  white-space: nowrap;
}

.mp-item-message {
  color: #475569;
  line-height: 1.4;
}
.mp-item-message :deep(strong) {
  color: #0f172a;
  font-weight: 600;
}

/* Success Summary */
.mp-success-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  background: #f0fdf4;
  border: 1px dashed #86efac;
  border-radius: 12px;
  color: #15803d;
  font-weight: 600;
  font-size: 0.95rem;
}

.mp-success-icon {
  width: 20px;
  height: 20px;
  color: #22c55e;
}

/* Empty State */
.mp-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 0;
  color: #64748b;
}

.mp-empty-icon {
  width: 32px;
  height: 32px;
  color: #cbd5e1;
}

/* Skeletons */
.mp-skeleton-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mp-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mp-skeleton-item {
  height: 44px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 400% 100%;
  animation: mp-skeleton-loading 1.5s infinite;
}

@keyframes mp-skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Error */
.mp-explainer-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #ef4444;
  padding: 24px;
}

.mp-retry-btn {
  background: #f87171;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}
.mp-retry-btn:hover {
  background: #ef4444;
}
</style>
