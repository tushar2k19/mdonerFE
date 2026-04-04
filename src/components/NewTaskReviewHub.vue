<template>
  <div class="nth-root">
    <header class="nth-head">
      <button type="button" class="nth-back" @click="goBack">← Back</button>
      <div class="nth-head-main">
        <h1 class="nth-title">Review hub</h1>
        <p class="nth-sub">
          Assignment and comment status for the selected published dashboard pack.
        </p>
      </div>
    </header>

    <div v-if="!dashboardVersionId" class="nth-card nth-card-warn">
      <p class="nth-muted">
        Missing <code>dashboard_version_id</code> in the URL. Open this page from
        <strong>New Final</strong> or <strong>New Tentative</strong> via <em>Open review hub</em>.
      </p>
    </div>

    <div v-else-if="loadError" class="nth-card nth-card-warn">
      <p class="nth-muted">{{ loadError }}</p>
      <button type="button" class="nth-btn nth-btn-secondary" @click="loadData">Retry</button>
    </div>

    <template v-else>
      <section v-if="loading" class="nth-card">
        <p class="nth-muted">Loading published pack and overlay…</p>
      </section>

      <template v-else>
        <section class="nth-hero">
          <div class="nth-hero-inner">
            <p class="nth-hero-kicker">Published pack</p>
            <h2 class="nth-hero-version">Version #{{ dashboardVersionId }}</h2>
            <p v-if="publishedAtLabel" class="nth-hero-line">
              <span class="nth-hero-label">Published</span>
              {{ publishedAtLabel }}
            </p>
            <p v-if="scheduleMeetingLabel" class="nth-hero-line">
              <span class="nth-hero-label">Scheduled meeting (pointer)</span>
              {{ scheduleMeetingLabel }}
            </p>
            <p class="nth-hero-line nth-hero-next">
              <span class="nth-hero-label">Next review target</span>
              {{ nextReviewLabel }}
              <span class="nth-hero-hint">(from draft setting — may change)</span>
            </p>
          </div>
        </section>

        <section class="nth-legend">
          <span class="nth-legend-title">Status</span>
          <span class="nth-pill nth-pill-green">Assigned &amp; commented</span>
          <span class="nth-pill nth-pill-blue">Commented, not assigned</span>
          <span class="nth-pill nth-pill-red">Assigned, comment pending</span>
        </section>

        <section class="nth-toolbar">
          <div class="nth-filters">
            <span class="nth-filters-label">Filters</span>
            <button
              type="button"
              class="nth-filter-btn"
              :class="{ active: filterOwn }"
              @click="toggleFilter('own')"
            >
              My assignments
            </button>
            <button
              type="button"
              class="nth-filter-btn"
              :class="{ active: filterAssigned }"
              @click="toggleFilter('assigned')"
            >
              Assigned nodes
            </button>
            <button
              type="button"
              class="nth-filter-btn"
              :class="{ active: filterCommented }"
              @click="toggleFilter('commented')"
            >
              Commented nodes
            </button>
            <button
              v-if="filterOwn || filterAssigned || filterCommented"
              type="button"
              class="nth-filter-btn nth-filter-clear"
              @click="clearFilters"
            >
              Clear filters
            </button>
          </div>
          <div class="nth-exports">
            <button
              type="button"
              class="nth-btn nth-btn-secondary"
              :disabled="exportBusy || !filteredRows.length"
              @click="exportCsv"
            >
              {{ exportMode === 'csv' ? 'Preparing CSV…' : 'Download Excel (CSV)' }}
            </button>
            <button
              type="button"
              class="nth-btn nth-btn-primary"
              :disabled="exportBusy || !filteredRows.length"
              @click="exportPdf"
            >
              {{ exportMode === 'pdf' ? 'Preparing PDF…' : 'Download PDF' }}
            </button>
          </div>
        </section>

        <div class="nth-table-wrap">
          <table class="nth-table" aria-label="Review hub matrix">
            <thead>
              <tr>
                <th>Sector / Division</th>
                <th>Description</th>
                <th>Node</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Comments</th>
                <th class="nth-th-action">Remind</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filteredRows" :key="row.stableNodeId" :class="rowStatusClass(row)">
                <td>{{ row.sector || '—' }}</td>
                <td class="nth-td-desc">{{ row.description || '—' }}</td>
                <td class="nth-td-mono">{{ row.nodeLabel }}</td>
                <td>{{ row.assigneeNames || '—' }}</td>
                <td>
                  <span class="nth-status-text">{{ statusLabel(row.statusKey) }}</span>
                </td>
                <td class="nth-td-num">{{ row.commentCount }}</td>
                <td class="nth-td-action">
                  <button
                    type="button"
                    class="nth-remind-btn"
                    :disabled="!row.assigneeNames || remindCooldownRemaining(row) > 0"
                    :title="remindTitle(row)"
                    @click="sendReminder(row)"
                  >
                    <span class="nth-bell" aria-hidden="true">🔔</span>
                  </button>
                </td>
              </tr>
              <tr v-if="!filteredRows.length">
                <td colspan="7" class="nth-empty">No rows match the current filters.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="baseRows.length === 0 && !loading" class="nth-footnote">
          No nodes with assignments or comments on this pack yet. Assign reviewers on
          <strong>New Final</strong> or add comments on published nodes.
        </p>
      </template>
    </template>
  </div>
</template>

<script>
import {
  flattenHubRows,
  applyHubFilters,
  statusLabel,
  HUB_STATUS
} from '@/utils/reviewHubMatrix'
import { exportReviewHubPdf } from '@/utils/reviewHubPdfExport'
import {
  fetchCommentExcerptsForRows,
  buildExportRowViews
} from '@/utils/reviewHubExport'

const REMINDER_COOLDOWN_MS = 10 * 60 * 1000

function escapeCsvCell (val) {
  const s = val == null ? '' : String(val)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export default {
  name: 'NewTaskReviewHub',
  data () {
    return {
      loading: false,
      loadError: null,
      tasks: [],
      publishedMeta: {},
      overlayNodes: {},
      nextReviewYmd: null,
      filterOwn: false,
      filterAssigned: false,
      filterCommented: false,
      lastReminderAt: {},
      exportMode: null
    }
  },
  computed: {
    exportBusy () {
      return this.exportMode != null
    },
    dashboardVersionId () {
      const q = this.$route.query
      const a = q.dashboard_version_id
      const b = q.new_dashboard_version_id
      if (a != null && a !== '') return String(a)
      if (b != null && b !== '') return String(b)
      return null
    },
    currentUserId () {
      try {
        const raw = this.getCookie('user_info')
        if (!raw) return null
        const u = JSON.parse(decodeURIComponent(raw))
        return u.id != null ? u.id : null
      } catch (e) {
        return null
      }
    },
    baseRows () {
      return flattenHubRows(this.tasks, this.overlayNodes)
    },
    filteredRows () {
      return applyHubFilters(this.baseRows, {
        ownOnly: this.filterOwn,
        assignedOnly: this.filterAssigned,
        commentedOnly: this.filterCommented,
        currentUserId: this.currentUserId
      })
    },
    publishedAtLabel () {
      const p = this.publishedMeta.published_at
      if (!p) return ''
      try {
        return new Date(p).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        })
      } catch (e) {
        return String(p)
      }
    },
    scheduleMeetingLabel () {
      const d = this.publishedMeta.schedule_meeting_date || this.publishedMeta.meeting_date
      if (!d) return ''
      return this.formatYmdLong(d)
    },
    nextReviewLabel () {
      if (!this.nextReviewYmd) return '—'
      return this.formatYmdLong(this.nextReviewYmd)
    }
  },
  watch: {
    dashboardVersionId: {
      immediate: true,
      handler (id) {
        if (!id) {
          this.tasks = []
          this.overlayNodes = {}
          this.publishedMeta = {}
          this.nextReviewYmd = null
          this.loadError = null
          this.loading = false
          return
        }
        this.loadData()
      }
    }
  },
  methods: {
    statusLabel,
    getCookie (name) {
      const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
      return match ? match[1] : null
    },
    formatYmdLong (ymd) {
      try {
        const [y, m, d] = String(ymd).split('-').map(Number)
        const dt = new Date(y, m - 1, d)
        return dt.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Kolkata'
        })
      } catch (e) {
        return String(ymd)
      }
    },
    rowStatusClass (row) {
      return {
        'nth-row-green': row.statusKey === HUB_STATUS.ASSIGNED_COMMENTED,
        'nth-row-blue': row.statusKey === HUB_STATUS.UNASSIGNED_COMMENTED,
        'nth-row-red': row.statusKey === HUB_STATUS.ASSIGNED_PENDING
      }
    },
    toggleFilter (key) {
      if (key === 'own') this.filterOwn = !this.filterOwn
      if (key === 'assigned') this.filterAssigned = !this.filterAssigned
      if (key === 'commented') this.filterCommented = !this.filterCommented
    },
    clearFilters () {
      this.filterOwn = false
      this.filterAssigned = false
      this.filterCommented = false
    },
    remindKey (row) {
      return `${this.dashboardVersionId}:${row.stableNodeId}`
    },
    remindCooldownRemaining (row) {
      const t = this.lastReminderAt[this.remindKey(row)]
      if (!t) return 0
      const elapsed = Date.now() - t
      return Math.max(0, REMINDER_COOLDOWN_MS - elapsed)
    },
    remindTitle (row) {
      const ms = this.remindCooldownRemaining(row)
      if (ms <= 0) {
        return 'Send in-app reminder to assignees (email channel planned)'
      }
      const mins = Math.ceil(ms / 60000)
      return `Wait ${mins} min before next reminder`
    },
    sendReminder (row) {
      if (!row.assigneeNames) return
      if (this.remindCooldownRemaining(row) > 0) return
      const names = row.assigneeNames
      const msg = `Reminder: please review node ${row.nodeLabel} (${row.sector || '—'}) — ${names}`
      this.$store.commit('ADD_NOTIFICATION', {
        id: `hub-remind-${Date.now()}-${row.stableNodeId}`,
        message: msg,
        created_at: new Date().toISOString(),
        read: false
      })
      this.$toast && this.$toast.success(`Reminder recorded for ${names}`)
      this.$set(this.lastReminderAt, this.remindKey(row), Date.now())
    },
    async exportCsv () {
      if (!this.filteredRows.length) return
      this.exportMode = 'csv'
      try {
        const http = this.$http.secured
        const excerpts = await fetchCommentExcerptsForRows(
          http,
          this.dashboardVersionId,
          this.filteredRows
        )
        const views = buildExportRowViews(
          this.filteredRows,
          excerpts,
          (k) => this.statusLabel(k)
        )
        const headers = [
          'Stable node ID',
          'Sector / Division',
          'Description',
          'Node',
          'Assignee',
          'Status',
          'Comment count',
          'Comment excerpt'
        ]
        const lines = [headers.map(escapeCsvCell).join(',')]
        for (const v of views) {
          lines.push(
            [
              v.stableNodeId,
              v.sector,
              v.description,
              v.nodeLabel,
              v.assigneeNames,
              v.statusLabel,
              v.commentCount,
              v.commentExcerpt
            ].map(escapeCsvCell).join(',')
          )
        }
        const blob = new Blob(['\ufeff' + lines.join('\n')], {
          type: 'text/csv;charset=utf-8'
        })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `review-hub-v${this.dashboardVersionId}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
        this.$toast && this.$toast.success('CSV downloaded.')
      } catch (e) {
        this.$toast &&
          this.$toast.error(
            (e.response && e.response.data && e.response.data.error) ||
              'Could not build CSV export.'
          )
      } finally {
        this.exportMode = null
      }
    },
    async exportPdf () {
      if (!this.filteredRows.length) return
      this.exportMode = 'pdf'
      try {
        await this.$nextTick()
        const http = this.$http.secured
        const excerpts = await fetchCommentExcerptsForRows(
          http,
          this.dashboardVersionId,
          this.filteredRows
        )
        const views = buildExportRowViews(
          this.filteredRows,
          excerpts,
          (k) => this.statusLabel(k)
        )
        const rows = views.map((v) => ({
          sector: v.sector,
          description: v.description,
          nodeLabel: v.nodeLabel,
          assigneeNames: v.assigneeNames,
          statusLabel: v.statusLabel,
          statusKey: v.statusKey,
          commentCount: v.commentCount,
          commentExcerpt: v.commentExcerpt
        }))
        exportReviewHubPdf({
          fileName: `review-hub-v${this.dashboardVersionId}.pdf`,
          meta: {
            versionId: this.dashboardVersionId,
            publishedLabel: this.publishedAtLabel,
            scheduleLabel: this.scheduleMeetingLabel || null,
            nextReviewLabel: this.nextReviewLabel !== '—' ? this.nextReviewLabel : null,
            subtitle: 'DPR Checklist Analysis Report'
          },
          includeCommentExcerptColumn: true,
          rows
        })
        this.$toast && this.$toast.success('PDF downloaded.')
      } catch (e) {
        this.$toast &&
          this.$toast.error(
            (e.response && e.response.data && e.response.data.error) ||
              'Could not build PDF export.'
          )
      } finally {
        this.exportMode = null
      }
    },
    async loadData () {
      const vid = this.dashboardVersionId
      if (!vid) return
      this.loading = true
      this.loadError = null
      try {
        const http = this.$http.secured
        const [pubRes, overlayRes, settingsRes] = await Promise.all([
          http.get('/meeting_dashboard/published', {
            params: { new_dashboard_version_id: vid }
          }),
          http.get('/meeting_dashboard/draft_editor_overlay', {
            params: { new_dashboard_version_id: vid }
          }),
          http.get('/meeting_dashboard/draft_settings')
        ])
        const pub = pubRes.data || {}
        const gotVid = pub.meeting_dashboard_version_id
        if (String(gotVid || '') !== String(vid)) {
          this.tasks = []
          this.overlayNodes = {}
          this.publishedMeta = {}
          this.loadError =
            'This dashboard version was not found or is no longer on the meeting schedule.'
          return
        }
        this.tasks = Array.isArray(pub.tasks) ? pub.tasks : []
        this.publishedMeta = {
          published_at: pub.published_at,
          meeting_date: pub.meeting_date,
          schedule_meeting_date: pub.schedule_meeting_date,
          target_meeting_date: pub.target_meeting_date,
          meeting_dashboard_version_id: pub.meeting_dashboard_version_id
        }
        const nodes = (overlayRes.data && overlayRes.data.nodes) || {}
        this.overlayNodes = typeof nodes === 'object' && nodes !== null ? nodes : {}
        const ds = settingsRes.data || {}
        this.nextReviewYmd = ds.target_meeting_date || null
      } catch (err) {
        const st = err.response && err.response.status
        const body = (err.response && err.response.data) || {}
        if (st === 404) {
          this.loadError =
            'Meeting dashboard is unavailable (disabled) or this pack was not found.'
        } else {
          this.loadError =
            (typeof body.error === 'string' && body.error) ||
            err.message ||
            'Failed to load review hub data.'
        }
        this.tasks = []
        this.overlayNodes = {}
      } finally {
        this.loading = false
      }
    },
    goBack () {
      if (window.history.length > 1) {
        this.$router.back()
      } else {
        this.$router.push({ name: 'Home' })
      }
    }
  }
}
</script>

<style scoped>
.nth-root {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px 56px;
}
.nth-head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}
.nth-head-main {
  flex: 1;
}
.nth-back {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  flex-shrink: 0;
}
.nth-title {
  margin: 0 0 6px;
  font-size: 1.45rem;
  color: #0f172a;
}
.nth-sub {
  margin: 0;
  color: #475569;
  font-size: 0.92rem;
}
.nth-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 16px;
}
.nth-card-warn {
  border-color: #fcd34d;
  background: #fffbeb;
}
.nth-muted {
  margin: 0 0 12px;
  color: #334155;
  font-size: 0.92rem;
  line-height: 1.5;
}
.nth-muted:last-child {
  margin-bottom: 0;
}
code {
  font-size: 0.85em;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.nth-hero {
  margin-bottom: 20px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #1e293b;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f172a 100%);
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.25);
}
.nth-hero-inner {
  padding: 22px 24px 24px;
  color: #f8fafc;
}
.nth-hero-kicker {
  margin: 0 0 6px;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #94a3b8;
}
.nth-hero-version {
  margin: 0 0 14px;
  font-size: 1.55rem;
  font-weight: 700;
  color: #fff;
}
.nth-hero-line {
  margin: 0 0 8px;
  font-size: 0.95rem;
  color: #e2e8f0;
  line-height: 1.45;
}
.nth-hero-next {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(212, 175, 55, 0.45);
}
.nth-hero-label {
  display: inline-block;
  min-width: 11rem;
  color: #d4af37;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.nth-hero-hint {
  display: block;
  margin-top: 4px;
  font-size: 0.78rem;
  color: #94a3b8;
  font-style: italic;
}

.nth-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.nth-legend-title {
  font-weight: 600;
  color: #334155;
  margin-right: 6px;
}
.nth-pill {
  font-size: 0.78rem;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 600;
}
.nth-pill-green {
  background: #dcfce7;
  color: #166534;
}
.nth-pill-blue {
  background: #dbeafe;
  color: #1e40af;
}
.nth-pill-red {
  background: #fee2e2;
  color: #991b1b;
}

.nth-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.nth-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.nth-filters-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  margin-right: 4px;
}
.nth-filter-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.85rem;
  cursor: pointer;
  color: #334155;
}
.nth-filter-btn:hover {
  border-color: #94a3b8;
  background: #f8fafc;
}
.nth-filter-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}
.nth-filter-clear {
  border-style: dashed;
}
.nth-exports {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.nth-btn {
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.88rem;
  cursor: pointer;
  border: 1px solid transparent;
}
.nth-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.nth-btn-primary {
  background: #0f172a;
  color: #fff;
  border-color: #0f172a;
}
.nth-btn-primary:hover:not(:disabled) {
  background: #1e293b;
}
.nth-btn-secondary {
  background: #fff;
  border-color: #cbd5e1;
  color: #334155;
}
.nth-btn-secondary:hover:not(:disabled) {
  background: #f8fafc;
}

.nth-table-wrap {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}
.nth-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.nth-table th,
.nth-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
}
.nth-table th {
  background: #f1f5f9;
  font-weight: 700;
  color: #334155;
  white-space: nowrap;
}
.nth-th-action {
  width: 4rem;
  text-align: center;
}
.nth-td-desc {
  max-width: 280px;
  word-break: break-word;
}
.nth-td-mono {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.nth-td-num {
  text-align: center;
  font-weight: 600;
}
.nth-td-action {
  text-align: center;
}
.nth-row-green td {
  background: #f0fdf4;
}
.nth-row-blue td {
  background: #eff6ff;
}
.nth-row-red td {
  background: #fef2f2;
}
.nth-status-text {
  font-weight: 600;
  font-size: 0.82rem;
}
.nth-row-green .nth-status-text {
  color: #166534;
}
.nth-row-blue .nth-status-text {
  color: #1e40af;
}
.nth-row-red .nth-status-text {
  color: #991b1b;
}
.nth-remind-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 4px;
  border-radius: 6px;
  line-height: 1;
}
.nth-remind-btn:hover:not(:disabled) {
  background: #f1f5f9;
}
.nth-remind-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.nth-empty {
  text-align: center;
  color: #64748b;
  padding: 28px 12px !important;
}
.nth-footnote {
  margin-top: 16px;
  font-size: 0.85rem;
  color: #64748b;
  line-height: 1.5;
}
</style>
