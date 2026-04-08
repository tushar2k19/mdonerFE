<template>
  <div class="mpn-root" v-click-outside="closePanel">
    <button
      type="button"
      class="mpn-trigger"
      aria-haspopup="true"
      :aria-expanded="panelOpen ? 'true' : 'false'"
      aria-controls="mpn-panel"
      :aria-label="`Meeting notifications${unreadCount ? `, ${unreadCount} unread` : ''}`"
      @click="togglePanel"
    >
      <svg class="mpn-bell" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span v-if="unreadCount > 0" class="mpn-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <div v-if="panelOpen" class="mpn-backdrop" aria-hidden="true" @click="closePanel" />

    <div
      v-show="panelOpen"
      id="mpn-panel"
      class="mpn-panel"
      role="dialog"
      aria-label="Meeting notifications"
      tabindex="-1"
      ref="panelRef"
      @keydown.esc.prevent="closePanel"
    >
      <div class="mpn-head">
        <h2 class="mpn-title">Updates</h2>
        <button
          v-if="unreadCount > 0"
          type="button"
          class="mpn-mark-all"
          @click="handleMarkAllRead"
        >
          Mark all read
        </button>
      </div>

      <div class="mpn-list" role="list" aria-live="polite" aria-relevant="additions text">
        <template v-if="notifications.length">
          <button
            v-for="n in notifications"
            :key="'mn-' + n.id"
            type="button"
            class="mpn-item"
            :class="{ 'mpn-item--unread': isUnread(n) }"
            role="listitem"
            @click="onRowClick(n)"
          >
            <span v-if="isUnread(n)" class="mpn-dot" aria-hidden="true" />
            <span class="mpn-item-main">
              <span v-if="nodeChip(n)" class="mpn-chip">{{ nodeChip(n) }}</span>
              <span class="mpn-body">{{ n.body }}</span>
              <span class="mpn-time">{{ formatRelative(n.created_at) }}</span>
            </span>
            <svg class="mpn-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </template>
        <div v-else class="mpn-empty">
          <p>No meeting updates yet.</p>
          <p class="mpn-empty-hint">Assignments, comments, and reminders appear here.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MeetingNotificationService from '@/services/MeetingNotificationService'

const POLL_MS = 45 * 1000

function parseMeetingSsePayload (data) {
  if (!data || typeof data !== 'object') return null
  if (data.meeting_notification) return data
  if (data.id != null && data.kind && data.body != null) return data
  return null
}

export default {
  name: 'NewMeetingNotificationPanel',
  props: {
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      panelOpen: false,
      notifications: [],
      service: null,
      eventSource: null,
      pollTimer: null,
      docKeydown: null
    }
  },
  computed: {
    unreadCount () {
      return this.notifications.filter(n => this.isUnread(n)).length
    }
  },
  created () {
    this.service = new MeetingNotificationService(this.$http.secured)
    this.fetchNotifications()
  },
  mounted () {
    this.setupStream()
    this.pollTimer = setInterval(() => this.fetchNotifications(), POLL_MS)
    this.docKeydown = (e) => {
      if (!this.panelOpen) return
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault()
        this.closePanel()
      }
    }
    document.addEventListener('keydown', this.docKeydown)
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.docKeydown)
    if (this.pollTimer) clearInterval(this.pollTimer)
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  },
  methods: {
    isUnread (n) {
      return n.read_at == null || n.read_at === ''
    },
    nodeChip (n) {
      const p = n.payload || {}
      const rawLabel = p.node_label != null ? String(p.node_label).trim() : ''
      if (!rawLabel || rawLabel === '—') return ''
      const sector = p.sector_division != null ? String(p.sector_division).trim() : ''
      const nodeRef = this.compactNodeBadgeRef(rawLabel)
      if (sector) return `${sector} : ${nodeRef}`
      return nodeRef || rawLabel
    },
    /** Match hub task sector + compact node ref, e.g. "3(b)" -> "3B", "VIII" -> "VIII". */
    compactNodeBadgeRef (label) {
      return String(label)
        .replace(/\(([^)]+)\)/g, '$1')
        .replace(/\s+/g, '')
        .toUpperCase()
    },
    formatRelative (iso) {
      if (!iso) return ''
      const t = new Date(iso).getTime()
      if (Number.isNaN(t)) return ''
      const sec = Math.floor((Date.now() - t) / 1000)
      if (sec < 45) return 'just now'
      if (sec < 3600) return `${Math.max(1, Math.floor(sec / 60))}m ago`
      if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
      if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
      try {
        return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      } catch (e) {
        return ''
      }
    },
    togglePanel () {
      this.panelOpen = !this.panelOpen
      if (this.panelOpen) {
        this.$nextTick(() => {
          const el = this.$refs.panelRef
          if (el && el.focus) el.focus()
        })
      }
    },
    closePanel () {
      this.panelOpen = false
    },
    async fetchNotifications () {
      if (this.isLoading) return
      try {
        this.notifications = await this.service.fetchNotifications()
      } catch (e) {
        console.error(e)
      }
    },
    setupStream () {
      this.eventSource = this.service.subscribeToStream(
        (data) => {
          const row = parseMeetingSsePayload(data)
          if (!row) return
          const normalized = {
            id: row.id,
            kind: row.kind,
            body: row.body,
            read_at: row.read_at,
            created_at: row.created_at,
            payload: row.payload || {}
          }
          const idx = this.notifications.findIndex(n => n.id === normalized.id)
          if (idx !== -1) {
            this.notifications.splice(idx, 1, normalized)
          } else {
            this.notifications.unshift(normalized)
          }
        },
        () => {}
      )
    },
    hubQueryFromPayload (payload) {
      const p = payload || {}
      const vid = p.new_dashboard_version_id
      if (vid == null || vid === '') return null
      const q = {
        dashboard_version_id: String(vid)
      }
      const sid = p.stable_node_id
      if (sid != null && String(sid).trim() !== '') {
        q.focus_stable_node_id = String(sid).trim()
      }
      return q
    },
    async onRowClick (n) {
      if (this.isUnread(n)) {
        await this.service.markRead(n.id)
        n.read_at = new Date().toISOString()
      }
      const q = this.hubQueryFromPayload(n.payload)
      if (q) {
        this.closePanel()
        this.$router.push({ name: 'NewTaskReviewHub', query: q })
      } else {
        this.closePanel()
        this.$router.push({ name: 'NewTaskReviewHub' })
      }
    },
    async handleMarkAllRead () {
      await this.service.markAllRead()
      this.notifications.forEach((n) => {
        n.read_at = new Date().toISOString()
      })
    }
  },

  directives: {
    'click-outside': {
      bind (el, binding) {
        el.clickOutsideEvent = function (event) {
          if (!(el === event.target || el.contains(event.target))) {
            binding.value(event)
          }
        }
        document.addEventListener('click', el.clickOutsideEvent)
      },
      unbind (el) {
        document.removeEventListener('click', el.clickOutsideEvent)
      }
    }
  }
}
</script>

<style scoped>
.mpn-root {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.mpn-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #e0e7ff;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.mpn-trigger:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.5);
}

.mpn-trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(224, 231, 255, 0.9), 0 0 0 5px rgba(30, 58, 138, 0.45);
}

.mpn-bell {
  width: 1.25rem;
  height: 1.25rem;
}

.mpn-badge {
  position: absolute;
  top: -0.15rem;
  right: -0.15rem;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: #f97316;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.1rem;
  text-align: center;
}

.mpn-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .mpn-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 1001;
    background: rgba(15, 23, 42, 0.35);
  }
}

.mpn-panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  /* Above sticky header (1000) and typical page overlays */
  z-index: 10050;
  width: min(22rem, calc(100vw - 2rem));
  max-height: min(66vh, 27rem);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: #fff;
  color: #0f172a;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06);
  outline: none;
  overflow: hidden;
}

.mpn-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
}

.mpn-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.mpn-mark-all {
  border: 1px solid transparent;
  background: #ffffff;
  color: #4f46e5;
  font-size: 0.77rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  padding: 0.35rem 0.55rem;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.mpn-mark-all:hover {
  background: rgba(79, 70, 229, 0.08);
  border-color: rgba(79, 70, 229, 0.2);
}

.mpn-mark-all:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
}

.mpn-list {
  overflow-y: auto;
  flex: 1;
  padding: 0.35rem 0;
}

.mpn-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  width: 100%;
  text-align: left;
  padding: 0.65rem 0.85rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  color: inherit;
  font: inherit;
}

.mpn-item:hover {
  background: #f8fafc;
}

.mpn-item:focus-visible {
  outline: none;
  background: #eff6ff;
  box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.42);
}

.mpn-item--unread {
  background: #eef2ff;
}

.mpn-item--unread:hover {
  background: #e0e7ff;
}

.mpn-dot {
  width: 0.5rem;
  height: 0.5rem;
  margin-top: 0.35rem;
  flex-shrink: 0;
  border-radius: 999px;
  background: #4f46e5;
}

.mpn-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.mpn-chip {
  align-self: flex-start;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  background: #e0e7ff;
  color: #3730a3;
}

.mpn-body {
  font-size: 0.8rem;
  line-height: 1.35;
  color: #1e293b;
}

.mpn-time {
  font-size: 0.7rem;
  color: #64748b;
}

.mpn-chevron {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: #94a3b8;
  margin-top: 0.2rem;
}

.mpn-empty {
  padding: 2rem 1.25rem;
  text-align: center;
  color: #64748b;
  font-size: 0.85rem;
}

.mpn-empty-hint {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: #94a3b8;
}

@media (max-width: 768px) {
  .mpn-panel {
    max-height: min(58vh, 24rem);
  }
}
</style>
