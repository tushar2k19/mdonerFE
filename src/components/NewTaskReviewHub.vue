<template>
  <div class="nth-root">
    <header class="nth-head">
      <button type="button" class="nth-back" @click="goBack">
        <svg class="nth-back-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back
      </button>
      <div class="nth-head-main">
        <h1 class="nth-title">Review Hub</h1>
        <p class="nth-sub">
          Assignment and comment status for the selected published dashboard pack.
          Editors assign input reviewers from <strong>New Final</strong> (published pack), not from the Tentative draft.
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
      <section v-if="loading" class="nth-card nth-loading">
        <div class="nth-spinner" aria-hidden="true"><div class="nth-spinner-ring"></div></div>
        <p class="nth-muted">Loading published pack and overlay…</p>
      </section>

      <template v-else>
        <section class="nth-hero">
          <div class="nth-hero-inner">
            <div class="nth-hero-badge">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
              <span>Published Pack</span>
            </div>
            <h2 class="nth-hero-version">Version <span class="nth-hero-version-num">#{{ dashboardVersionId }}</span></h2>
            <div class="nth-hero-grid">
              <div v-if="publishedAtLabel" class="nth-hero-item">
                <span class="nth-hero-label">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Published
                </span>
                <span class="nth-hero-value">{{ publishedAtLabel }}</span>
              </div>
              <div v-if="scheduleMeetingLabel" class="nth-hero-item">
                <span class="nth-hero-label">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Scheduled Meeting
                </span>
                <span class="nth-hero-value">{{ scheduleMeetingLabel }}</span>
              </div>
              <div class="nth-hero-item nth-hero-item--next">
                <span class="nth-hero-label">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Next Review Target
                </span>
                <span class="nth-hero-value">{{ nextReviewLabel }}</span>
                <span class="nth-hero-hint">(from draft setting — may change)</span>
              </div>
            </div>
          </div>
        </section>

        <section class="nth-toolbar">
          <div class="nth-toolbar-main">
            <div class="nth-legend" aria-label="Status legend">
              <span class="nth-legend-title">Legend</span>
              <span class="nth-badge nth-badge--green" title="Assigned &amp; commented" role="img" aria-label="Assigned &amp; commented">Assigned &amp; Commented</span>
              <span class="nth-badge nth-badge--blue" title="Commented, not assigned" role="img" aria-label="Commented, not assigned">Commented</span>
              <span class="nth-badge nth-badge--red" title="Assigned, comment pending" role="img" aria-label="Assigned, comment pending">Pending</span>
            </div>
            <div
              ref="filterPopoverWrap"
              class="nth-filter-popover-wrap"
            >
              <button
                type="button"
                class="nth-filter-trigger"
                :class="{ active: hubFiltersActive, open: filterPanelOpen }"
                aria-haspopup="true"
                :aria-expanded="filterPanelOpen ? 'true' : 'false'"
                aria-controls="nth-filter-panel"
                title="Filters"
                @click.stop="toggleFilterPanel"
              >
                <svg class="nth-filter-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M22 3H2l7 9v7l6 3v-10l7-9z"/></svg>
                <span class="nth-sr-only">Open filters</span>
                <span v-if="hubFiltersActive" class="nth-filter-active-dot" aria-hidden="true"/>
              </button>
              <transition name="nth-panel-fade">
                <div
                  v-show="filterPanelOpen"
                  id="nth-filter-panel"
                  class="nth-filter-panel"
                  role="region"
                  aria-label="Review hub filters"
                  @click.stop
                >
                  <p class="nth-filter-panel-title">Filters</p>
                  <div class="nth-filter-panel-toggles">
                    <button type="button" class="nth-filter-btn" :class="{ active: filterOwn }" @click="toggleFilter('own')">
                      <span class="nth-filter-btn-check" aria-hidden="true">
                        <svg v-if="filterOwn" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      </span>
                      My assignments
                    </button>
                    <button type="button" class="nth-filter-btn" :class="{ active: filterAssigned }" @click="toggleFilter('assigned')">
                      <span class="nth-filter-btn-check" aria-hidden="true">
                        <svg v-if="filterAssigned" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      </span>
                      Assigned nodes
                    </button>
                    <button type="button" class="nth-filter-btn" :class="{ active: filterCommented }" @click="toggleFilter('commented')">
                      <span class="nth-filter-btn-check" aria-hidden="true">
                        <svg v-if="filterCommented" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                      </span>
                      Commented nodes
                    </button>
                  </div>
                  <label class="nth-filter-field">
                    <span class="nth-filter-field-label">Sector / Division</span>
                    <select v-model="sectorFilter" class="nth-filter-select">
                      <option value="ALL">All sectors</option>
                      <option v-for="opt in sectorSelectOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </label>
                  <button type="button" class="nth-filter-btn nth-filter-clear nth-filter-panel-clear" @click="clearFilters">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;flex-shrink:0"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    Clear all
                  </button>
                </div>
              </transition>
            </div>
          </div>
          <div class="nth-exports">
            <button type="button" class="nth-btn nth-btn-secondary" :disabled="exportBusy || !filteredRows.length" @click="exportCsv">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="nth-btn-icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {{ exportMode === 'csv' ? 'Preparing CSV…' : 'Excel / CSV' }}
            </button>
            <button type="button" class="nth-btn nth-btn-primary" :disabled="exportBusy || !filteredRows.length" @click="exportPdf">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="nth-btn-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              {{ exportMode === 'pdf' ? 'Preparing PDF…' : 'Download PDF' }}
            </button>
          </div>
        </section>

        <div class="nth-table-wrap">
          <table class="nth-table" aria-label="Review hub matrix">
            <thead>
              <tr>
                <th>Sector / Division</th>
                <th>Node</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Comments</th>
                <th class="nth-th-action">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in filteredRows"
                :key="row.stableNodeId"
                :data-stable-node-id="row.stableNodeId || undefined"
                :class="{
                  'nth-row-resolved-pack': row.isResolved,
                  'nth-row-focus-flash': row.stableNodeId && row.stableNodeId === focusHighlightStableNodeId
                }"
              >
                <td class="nth-td-sector">{{ row.sector || '—' }}</td>
                <td class="nth-td-mono">{{ row.nodeLabel }}</td>
                <td class="nth-td-assignee">
                  <span v-if="row.assigneeNames" class="nth-assignee-pill">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="nth-assignee-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {{ row.assigneeNames }}
                  </span>
                  <span v-else class="nth-td-empty">—</span>
                </td>
                <td class="nth-td-status">
                  <span class="nth-badge" :class="hubStatusBadgeClass(row.statusKey)" :title="statusLabel(row.statusKey)">
                    <span class="nth-badge-dot" aria-hidden="true"></span>
                    {{ statusLabel(row.statusKey) }}
                  </span>
                </td>
                <td class="nth-td-num"><span class="nth-comment-count">{{ row.commentCount }}</span></td>
                <td class="nth-td-action">
                  <div class="nth-action-cell">
                    <button
                      type="button"
                      class="nth-icon-btn nth-remind-btn"
                      :disabled="!row.assigneeNames || remindCooldownRemaining(row) > 0"
                      :title="remindTitle(row)"
                      @click="sendReminder(row)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    </button>
                    <button
                      v-if="dashboardVersionId && row.stableNodeId"
                      type="button"
                      class="nth-icon-btn nth-open-final-btn"
                      :title="`Open ${row.nodeLabel || 'node'} in Final`"
                      :aria-label="`Open ${row.nodeLabel || 'node'} in Final — ${row.sector || 'no sector'}`"
                      @click="openInFinal(row)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </button>
                    <template v-if="isHubEditor">
                      <button
                        v-if="!row.isResolved"
                        type="button"
                        class="nth-icon-btn nth-resolve-btn"
                        :disabled="resolveBusy[row.stableNodeId]"
                        title="Mark resolved"
                        aria-label="Mark node resolved"
                        @click="setPackNodeResolved(row, true)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 6L9 17l-5-5"/></svg>
                      </button>
                      <button
                        v-else
                        type="button"
                        class="nth-icon-btn nth-resolve-btn nth-resolve-btn--resolved"
                        :title="resolvedEditorTitle(row)"
                        aria-label="Resolved — click to mark unresolved"
                        :disabled="resolveBusy[row.stableNodeId]"
                        @click="setPackNodeResolved(row, false)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 6L9 17l-5-5"/></svg>
                      </button>
                    </template>
                    <span
                      v-else-if="row.isResolved"
                      class="nth-resolved-readonly"
                      :title="resolvedReadonlyTitle(row)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:13px;height:13px"><path d="M20 6L9 17l-5-5"/></svg>
                      Resolved
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredRows.length">
                <td colspan="6" class="nth-empty">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="nth-empty-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <span>No rows match the current filters.</span>
                </td>
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
import { isMeetingDashboardUiEnabled } from '@/utils/meetingDashboardUi'
import {
  fetchCommentExcerptsForRows,
  buildExportRowViews
} from '@/utils/reviewHubExport'

const REMINDER_COOLDOWN_MS = 10 * 60 * 1000

/** Sentinel for sector <select>: show only rows with empty sector_division. */
const HUB_SECTOR_FILTER_ALL = 'ALL'
const HUB_SECTOR_FILTER_EMPTY = '__EMPTY__'

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
      filterPanelOpen: false,
      /** ALL | __EMPTY__ | raw sector string from matrix rows */
      sectorFilter: HUB_SECTOR_FILTER_ALL,
      lastReminderAt: {},
      exportMode: null,
      resolveBusy: {},
      /** Transient match for deep-link focus (see `focusStableNodeId` from query). */
      focusHighlightStableNodeId: null,
      _focusFlashTimer: null
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
    userRole () {
      try {
        const raw = this.getCookie('user_info')
        if (!raw) return ''
        return String(JSON.parse(decodeURIComponent(raw)).role || '').toLowerCase()
      } catch (e) {
        return ''
      }
    },
    isHubEditor () {
      return this.userRole === 'editor'
    },
    baseRows () {
      const map = this.overlayNodes && typeof this.overlayNodes === 'object' ? this.overlayNodes : {}
      return flattenHubRows(this.tasks, this.overlayNodes).map((row) => {
        const o = row.stableNodeId && map[row.stableNodeId] ? map[row.stableNodeId] : {}
        const resolvedBy = o.resolved_by && typeof o.resolved_by === 'object' ? o.resolved_by : null
        return {
          ...row,
          isResolved: o.is_resolved === true,
          resolvedAt: o.resolved_at || null,
          resolvedBy
        }
      })
    },
    /** Distinct sectors from full matrix (not filtered) so the list stays stable while filtering. */
    sectorSelectOptions () {
      const seen = new Set()
      const opts = []
      for (const r of this.baseRows) {
        const raw = r.sector != null ? String(r.sector) : ''
        const key = raw.trim() === '' ? HUB_SECTOR_FILTER_EMPTY : raw
        if (seen.has(key)) continue
        seen.add(key)
        opts.push({
          value: key,
          label: key === HUB_SECTOR_FILTER_EMPTY ? '— (no sector)' : raw
        })
      }
      opts.sort((a, b) => {
        if (a.value === HUB_SECTOR_FILTER_EMPTY) return 1
        if (b.value === HUB_SECTOR_FILTER_EMPTY) return -1
        return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
      })
      return opts
    },
    hubFiltersActive () {
      return (
        this.filterOwn ||
        this.filterAssigned ||
        this.filterCommented ||
        this.sectorFilter !== HUB_SECTOR_FILTER_ALL
      )
    },
    filteredRows () {
      const step1 = applyHubFilters(this.baseRows, {
        ownOnly: this.filterOwn,
        assignedOnly: this.filterAssigned,
        commentedOnly: this.filterCommented,
        currentUserId: this.currentUserId
      })
      if (this.sectorFilter === HUB_SECTOR_FILTER_ALL) return step1
      if (this.sectorFilter === HUB_SECTOR_FILTER_EMPTY) {
        return step1.filter((r) => !String(r.sector || '').trim())
      }
      return step1.filter((r) => String(r.sector || '') === this.sectorFilter)
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
    },
    focusStableNodeId () {
      const raw = this.$route && this.$route.query
        ? this.$route.query.focus_stable_node_id
        : null
      if (raw == null || raw === '') return null
      const s = String(raw).trim()
      // Allowlist stable node IDs from URL before using in DOM queries.
      if (!/^[A-Za-z0-9:_-]+$/.test(s)) return null
      return s
    }
  },
  mounted () {
    this._hubFilterDocMouseDown = (e) => {
      if (!this.filterPanelOpen) return
      const wrap = this.$refs.filterPopoverWrap
      if (wrap && wrap.contains(e.target)) return
      this.closeFilterPanel()
    }
    this._hubFilterDocKeydown = (e) => {
      if (!this.filterPanelOpen) return
      if (e.key !== 'Escape' && e.key !== 'Esc') return
      e.preventDefault()
      this.closeFilterPanel()
    }
    document.addEventListener('mousedown', this._hubFilterDocMouseDown, true)
    document.addEventListener('keydown', this._hubFilterDocKeydown)
  },
  beforeDestroy () {
    if (this._hubFilterDocMouseDown) {
      document.removeEventListener('mousedown', this._hubFilterDocMouseDown, true)
    }
    if (this._hubFilterDocKeydown) {
      document.removeEventListener('keydown', this._hubFilterDocKeydown)
    }
    if (this._focusFlashTimer) {
      clearTimeout(this._focusFlashTimer)
      this._focusFlashTimer = null
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
          this.filterOwn = false
          this.filterAssigned = false
          this.filterCommented = false
          this.sectorFilter = HUB_SECTOR_FILTER_ALL
          this.filterPanelOpen = false
          return
        }
        this.loadData()
      }
    },
    focusStableNodeId: {
      immediate: true,
      handler () {
        this.$nextTick(() => this.maybeApplyDeepLinkFocus(0))
      }
    },
    filteredRows () {
      this.$nextTick(() => this.maybeApplyDeepLinkFocus(0))
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
    hubStatusDotClass (statusKey) {
      if (statusKey === HUB_STATUS.ASSIGNED_COMMENTED) return 'nth-status-dot-green'
      if (statusKey === HUB_STATUS.UNASSIGNED_COMMENTED) return 'nth-status-dot-blue'
      if (statusKey === HUB_STATUS.ASSIGNED_PENDING) return 'nth-status-dot-red'
      return 'nth-status-dot-muted'
    },
    hubStatusBadgeClass (statusKey) {
      if (statusKey === HUB_STATUS.ASSIGNED_COMMENTED) return 'nth-badge--green'
      if (statusKey === HUB_STATUS.UNASSIGNED_COMMENTED) return 'nth-badge--blue'
      if (statusKey === HUB_STATUS.ASSIGNED_PENDING) return 'nth-badge--red'
      return ''
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
      this.sectorFilter = HUB_SECTOR_FILTER_ALL
      this.closeFilterPanel()
    },
    toggleFilterPanel () {
      this.filterPanelOpen = !this.filterPanelOpen
    },
    closeFilterPanel () {
      this.filterPanelOpen = false
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
    async sendReminder (row) {
      if (!row.assigneeNames) return
      if (this.remindCooldownRemaining(row) > 0) return
      if (!this.dashboardVersionId || !row.stableNodeId) return
      const names = row.assigneeNames
      try {
        await this.$http.secured.post('/meeting_dashboard/hub_reminder', {
          new_dashboard_version_id: this.dashboardVersionId,
          stable_node_id: row.stableNodeId
        })
        this.$set(this.lastReminderAt, this.remindKey(row), Date.now())
        this.$toast && this.$toast.success(`Reminder sent to ${names}`)
      } catch (err) {
        const body = (err.response && err.response.data) || {}
        const retry = Number(body.retry_after_seconds || 0)
        if (retry > 0) {
          const waitMs = Math.max(1000, retry * 1000)
          this.$set(this.lastReminderAt, this.remindKey(row), Date.now() - (REMINDER_COOLDOWN_MS - waitMs))
        }
        const msg =
          (typeof body.error === 'string' && body.error) ||
          err.message ||
          'Could not send reminder.'
        this.$toast && this.$toast.error(msg)
      }
    },
    maybeApplyDeepLinkFocus (attempt = 0) {
      const stableNodeId = this.focusStableNodeId
      if (!stableNodeId || this.loading || !Array.isArray(this.filteredRows) || !this.filteredRows.length) {
        return
      }
      const exists = this.filteredRows.some((r) => String(r.stableNodeId || '') === stableNodeId)
      if (!exists) return

      const safeId = stableNodeId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const selector = `tr[data-stable-node-id="${safeId}"]`
      const rowEl = this.$el && this.$el.querySelector ? this.$el.querySelector(selector) : null
      if (!rowEl) {
        if (attempt < 2) {
          this.$nextTick(() => this.maybeApplyDeepLinkFocus(attempt + 1))
        }
        return
      }
      if (rowEl.scrollIntoView) {
        rowEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
      this.focusHighlightStableNodeId = stableNodeId
      if (this._focusFlashTimer) clearTimeout(this._focusFlashTimer)
      this._focusFlashTimer = setTimeout(() => {
        this.focusHighlightStableNodeId = null
      }, 2500)
    },
    resolvedEditorTitle (row) {
      const parts = []
      if (row.resolvedBy && row.resolvedBy.name) parts.push(`By ${row.resolvedBy.name}`)
      if (row.resolvedAt) {
        try {
          parts.push(new Date(row.resolvedAt).toLocaleString())
        } catch (e) {
          parts.push(String(row.resolvedAt))
        }
      }
      parts.push('Click to mark unresolved')
      return parts.join(' · ')
    },
    resolvedReadonlyTitle (row) {
      const parts = []
      if (row.resolvedBy && row.resolvedBy.name) parts.push(`By ${row.resolvedBy.name}`)
      if (row.resolvedAt) {
        try {
          parts.push(new Date(row.resolvedAt).toLocaleString())
        } catch (e) {
          parts.push(String(row.resolvedAt))
        }
      }
      return parts.length ? parts.join(' · ') : 'Editor marked this node resolved'
    },
    async refreshEditorOverlay () {
      const vid = this.dashboardVersionId
      if (!vid) return
      const { data } = await this.$http.secured.get('/meeting_dashboard/draft_editor_overlay', {
        params: { new_dashboard_version_id: vid }
      })
      const nodes = (data && data.nodes) || {}
      this.overlayNodes = typeof nodes === 'object' && nodes !== null ? nodes : {}
    },
    async setPackNodeResolved (row, nextResolved) {
      if (!this.isHubEditor) return
      const vid = this.dashboardVersionId
      if (!vid || !row || !row.stableNodeId) return
      if (this.resolveBusy[row.stableNodeId]) return
      this.$set(this.resolveBusy, row.stableNodeId, true)
      try {
        await this.$http.secured.patch(
          `/meeting_dashboard/dashboard_pack_nodes/${encodeURIComponent(vid)}/resolve`,
          {
            stable_node_id: row.stableNodeId,
            resolved: nextResolved
          }
        )
        await this.refreshEditorOverlay()
        this.$toast && this.$toast.success(nextResolved ? 'Marked resolved.' : 'Marked unresolved.')
      } catch (err) {
        const body = (err.response && err.response.data) || {}
        const msg =
          (typeof body.error === 'string' && body.error) ||
          err.message ||
          'Could not update resolution.'
        this.$toast && this.$toast.error(msg)
      } finally {
        this.$set(this.resolveBusy, row.stableNodeId, false)
      }
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
        this.$nextTick(() => this.maybeApplyDeepLinkFocus(0))
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
    openInFinal (row) {
      if (!this.dashboardVersionId || !row.stableNodeId) return
      if (!isMeetingDashboardUiEnabled()) {
        this.$toast && this.$toast.error('Final dashboard is not available in this mode.')
        return
      }
      this.$router.push({
        name: 'NewFinalDashboard',
        query: {
          focus_node: row.stableNodeId,
          focus_task_id: row.taskId != null ? String(row.taskId) : undefined,
          dashboard_version_id: this.dashboardVersionId
        }
      })
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
/* ═══════════════════════════════════════════════
   DESIGN TOKENS — Northeast Government Theme
═══════════════════════════════════════════════ */
.nth-root {
  --c-bg:       #f0f4f8;
  --c-surface:  #ffffff;
  --c-border:   #e2e8f0;
  --c-border-2: #cbd5e1;
  --c-text:     #1a2332;
  --c-text-2:   #4a5568;
  --c-text-3:   #718096;
  --c-accent:   #0d7a5f;     /* forest teal accent */
  --c-accent-2: #0a6650;

  /* Status badge tokens */
  --badge-green-bg:  #dcfce7;
  --badge-green-fg:  #166534;
  --badge-green-dot: #16a34a;
  --badge-blue-bg:   #dbeafe;
  --badge-blue-fg:   #1e40af;
  --badge-blue-dot:  #3b82f6;
  --badge-red-bg:    #fee2e2;
  --badge-red-fg:    #991b1b;
  --badge-red-dot:   #ef4444;
  --badge-gray-bg:   #f1f5f9;
  --badge-gray-fg:   #475569;
  --badge-gray-dot:  #94a3b8;

  /* Font */
  font-family: 'Plus Jakarta Sans', 'Inter', 'Roboto', system-ui, -apple-system, sans-serif;
  background: var(--c-bg);
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 20px 64px;
  color: var(--c-text);
}

/* ── Font import (injected via @import at top of style scope) ─────── */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

/* ════════════════════════════════════════════
   HEADER
════════════════════════════════════════════ */
.nth-head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}
.nth-head-main { flex: 1; }

.nth-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--c-border-2);
  background: var(--c-surface);
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--c-text-2);
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.nth-back:hover {
  border-color: var(--c-accent);
  color: var(--c-accent);
  background: #f0fdf9;
  box-shadow: 0 2px 8px rgba(13,122,95,0.12);
}
.nth-back-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.nth-title {
  margin: 0 0 6px;
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--c-text);
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.nth-sub {
  margin: 0;
  color: var(--c-text-3);
  font-size: 0.9rem;
  line-height: 1.55;
}

/* ════════════════════════════════════════════
   CARDS & STATUS
════════════════════════════════════════════ */
.nth-card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 18px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.nth-card-warn {
  border-color: #fbbf24;
  background: #fffbeb;
}
.nth-muted {
  margin: 0 0 12px;
  color: var(--c-text-2);
  font-size: 0.9rem;
  line-height: 1.55;
}
.nth-muted:last-child { margin-bottom: 0; }

code {
  font-size: 0.85em;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  padding: 2px 6px;
  border-radius: 5px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* Loading */
.nth-loading {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 22px;
}
.nth-spinner {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  position: relative;
}
.nth-spinner-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid var(--c-border);
  border-top-color: var(--c-accent);
  animation: nth-spin 0.8s linear infinite;
}
@keyframes nth-spin { to { transform: rotate(360deg); } }

.nth-row-focus-flash {
  animation: nth-row-focus-pulse 2.5s ease-out;
}

@keyframes nth-row-focus-pulse {
  0% {
    box-shadow: inset 0 0 0 9999px rgba(14, 116, 144, 0.2);
  }
  100% {
    box-shadow: inset 0 0 0 9999px rgba(14, 116, 144, 0);
  }
}

/* ════════════════════════════════════════════
   HERO CARD — Northeast Forest-Teal Gradient
════════════════════════════════════════════ */
.nth-hero {
  margin-bottom: 22px;
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(135deg, #0d3b2b 0%, #0f5540 30%, #0d7a5f 65%, #0a6650 100%);
  box-shadow: 0 16px 48px rgba(13, 59, 43, 0.32), 0 4px 16px rgba(0,0,0,0.14);
  position: relative;
}
.nth-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
  pointer-events: none;
}
.nth-hero-inner {
  padding: 28px 28px 30px;
  position: relative;
  z-index: 1;
}
.nth-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 100px;
  padding: 5px 12px 5px 8px;
  margin-bottom: 14px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.85);
  backdrop-filter: blur(4px);
}
.nth-hero-badge svg {
  width: 15px;
  height: 15px;
  opacity: 0.8;
}
.nth-hero-version {
  margin: 0 0 20px;
  font-size: 1.75rem;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  letter-spacing: -0.01em;
}
.nth-hero-version-num {
  color: #ffffff;
  font-weight: 800;
}
.nth-hero-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0;
  border-top: 1px solid rgba(232, 197, 71, 0.3);
  padding-top: 16px;
}
.nth-hero-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 0;
  border-right: 1px solid rgba(255,255,255,0.08);
  padding-right: 20px;
  padding-left: 4px;
}
.nth-hero-item:first-child { padding-left: 0; }
.nth-hero-item:last-child { border-right: none; }
.nth-hero-item--next {
  border-top: none;
}
.nth-hero-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #e8c547;
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.09em;
}
.nth-hero-label svg { width: 13px; height: 13px; opacity: 0.9; }
.nth-hero-value {
  font-size: 0.95rem;
  color: rgba(255,255,255,0.9);
  font-weight: 500;
  line-height: 1.4;
}
.nth-hero-hint {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.45);
  font-style: italic;
  margin-top: 2px;
}

/* ════════════════════════════════════════════
   STATUS BADGES / PILLS
════════════════════════════════════════════ */
.nth-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px 3px 6px;
  border-radius: 100px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  background: var(--badge-gray-bg);
  color: var(--badge-gray-fg);
}
.nth-badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--badge-gray-dot);
}
.nth-badge--green { background: var(--badge-green-bg); color: var(--badge-green-fg); }
.nth-badge--green .nth-badge-dot { background: var(--badge-green-dot); }
.nth-badge--blue  { background: var(--badge-blue-bg);  color: var(--badge-blue-fg); }
.nth-badge--blue  .nth-badge-dot { background: var(--badge-blue-dot); }
.nth-badge--red   { background: var(--badge-red-bg);   color: var(--badge-red-fg); }
.nth-badge--red   .nth-badge-dot { background: var(--badge-red-dot); }

/* ════════════════════════════════════════════
   TOOLBAR
════════════════════════════════════════════ */
.nth-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 20px;
  margin-bottom: 16px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 12px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.nth-toolbar-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  flex: 1;
  min-width: 0;
}
.nth-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.nth-legend-title {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-text-3);
  margin-right: 2px;
}

/* screen-reader only */
.nth-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}

/* ════════════════════════════════════════════
   FILTER POPOVER
════════════════════════════════════════════ */
.nth-filter-popover-wrap {
  position: relative;
  flex-shrink: 0;
}
.nth-filter-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--c-border-2);
  border-radius: 10px;
  background: var(--c-surface);
  color: var(--c-text-2);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.nth-filter-trigger:hover {
  border-color: var(--c-accent);
  color: var(--c-accent);
  background: #f0fdf9;
}
.nth-filter-trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(13,122,95,0.3);
}
.nth-filter-trigger.active {
  border-color: var(--c-accent);
  color: var(--c-accent);
  background: #f0fdf9;
}
.nth-filter-icon-svg { width: 18px; height: 18px; display: block; }
.nth-filter-active-dot {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-accent);
  border: 1.5px solid #fff;
}

/* Panel fade transition */
.nth-panel-fade-enter-active, .nth-panel-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.nth-panel-fade-enter-from, .nth-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}

.nth-filter-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 40;
  min-width: 260px;
  max-width: min(320px, calc(100vw - 32px));
  padding: 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(15,23,42,0.14), 0 4px 12px rgba(0,0,0,0.06);
}
.nth-filter-panel-title {
  margin: 0 0 10px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-text-3);
}
.nth-filter-panel-toggles {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.nth-filter-panel-toggles .nth-filter-btn { width: 100%; text-align: left; }
.nth-filter-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}
.nth-filter-field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--c-text-2);
}
.nth-filter-select {
  width: 100%;
  border: 1px solid var(--c-border-2);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 0.875rem;
  color: var(--c-text);
  background: var(--c-surface);
  cursor: pointer;
  font-family: inherit;
}
.nth-filter-select:focus {
  outline: none;
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px rgba(13,122,95,0.2);
}
.nth-filter-panel-clear { width: 100%; margin-top: 2px; }
.nth-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--c-border-2);
  background: var(--c-surface);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
  color: var(--c-text-2);
  font-family: inherit;
  transition: border-color 0.12s, background 0.12s, color 0.12s;
}
.nth-filter-btn:hover {
  border-color: var(--c-accent);
  background: #f0fdf9;
  color: var(--c-accent);
}
.nth-filter-btn.active {
  border-color: var(--c-accent);
  background: #ecfdf5;
  color: var(--c-accent);
  font-weight: 600;
}
.nth-filter-btn-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--c-border-2);
  flex-shrink: 0;
  transition: border-color 0.12s, background 0.12s;
}
.nth-filter-btn.active .nth-filter-btn-check {
  border-color: var(--c-accent);
  background: var(--c-accent);
}
.nth-filter-btn-check svg { width: 11px; height: 11px; color: #fff; }
.nth-filter-clear { border-style: dashed; }

/* ════════════════════════════════════════════
   EXPORT BUTTONS
════════════════════════════════════════════ */
.nth-exports {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.nth-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.1s;
  letter-spacing: 0.01em;
}
.nth-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }
.nth-btn-icon { width: 16px; height: 16px; flex-shrink: 0; }

.nth-btn-primary {
  background: linear-gradient(135deg, #0d5c45, #0d7a5f);
  color: #fff;
  border-color: #0a6650;
  box-shadow: 0 2px 8px rgba(13,122,95,0.3);
}
.nth-btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0a6650, #0d8a6c);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(13,122,95,0.38);
}
.nth-btn-secondary {
  background: var(--c-surface);
  border-color: var(--c-border-2);
  color: var(--c-text-2);
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.nth-btn-secondary:hover:not(:disabled) {
  border-color: var(--c-accent);
  color: var(--c-accent);
  background: #f0fdf9;
  box-shadow: 0 2px 8px rgba(13,122,95,0.12);
}

/* ════════════════════════════════════════════
   TABLE
════════════════════════════════════════════ */
.nth-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--c-border);
  border-radius: 14px;
  background: var(--c-surface);
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
}
.nth-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.nth-table th {
  padding: 13px 16px;
  text-align: left;
  background: #f8fafc;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  border-bottom: 1px solid var(--c-border);
  position: sticky;
  top: 0;
}
.nth-table th:first-child { border-radius: 14px 0 0 0; }
.nth-table th:last-child  { border-radius: 0 14px 0 0; }

.nth-table td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid var(--c-border);
  vertical-align: middle;
  color: var(--c-text-2);
  line-height: 1.45;
}
.nth-table tbody tr:last-child td { border-bottom: none; }
.nth-table tbody tr {
  transition: background 0.1s;
}
.nth-table tbody tr:hover td {
  background: #f8fffe;
}

.nth-th-action { min-width: 9rem; text-align: center; }
.nth-td-sector { color: var(--c-text); font-weight: 500; }
.nth-td-mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.82rem;
  color: var(--c-text);
  white-space: nowrap;
}
.nth-td-status { vertical-align: middle; }
.nth-td-num {
  text-align: center;
  vertical-align: middle;
}
.nth-td-action {
  text-align: center;
  vertical-align: middle;
}
.nth-td-empty { color: var(--c-text-3); }

/* Assignee pill */
.nth-assignee-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #f1f5f9;
  border: 1px solid var(--c-border);
  border-radius: 100px;
  padding: 3px 10px 3px 6px;
  font-size: 0.81rem;
  font-weight: 500;
  color: var(--c-text-2);
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nth-assignee-icon { width: 13px; height: 13px; flex-shrink: 0; opacity: 0.6; }

/* Comment count badge */
.nth-comment-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  border-radius: 100px;
  background: #f1f5f9;
  border: 1px solid var(--c-border);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-text-2);
  padding: 0 6px;
}

/* Resolved row left bar */
.nth-row-resolved-pack td {
  background: #f8fffe;
  opacity: 0.72;
}
.nth-row-resolved-pack td:first-child {
  box-shadow: inset 3px 0 0 0 #0d7a5f;
}

/* ════════════════════════════════════════════
   ACTION CELL — ICON BUTTONS
════════════════════════════════════════════ */
.nth-action-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* Base icon button */
.nth-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 9px;
  cursor: pointer;
  border: none;
  transition: background 0.13s, transform 0.1s, box-shadow 0.13s;
}
.nth-icon-btn svg { width: 18px; height: 18px; display: block; }
.nth-icon-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(13,122,95,0.35);
}
.nth-icon-btn:disabled { opacity: 0.38; cursor: not-allowed; transform: none !important; }

/* Remind (bell) button */
.nth-remind-btn {
  background: #f1f5f9;
  color: #64748b;
}
.nth-remind-btn:hover:not(:disabled) {
  background: #e8f4ff;
  color: #2563eb;
  transform: translateY(-1px);
}

/* Resolve button — unresolved state (mark as done) */
.nth-resolve-btn {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  color: #fff;
  box-shadow: 0 2px 8px rgba(37,99,235,0.3);
}
.nth-resolve-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(37,99,235,0.4);
}

/* Resolve button — resolved state (click to undo) */
.nth-resolve-btn--resolved {
  background: linear-gradient(135deg, #15803d, #22c55e);
  box-shadow: 0 2px 8px rgba(34,197,94,0.3);
}
.nth-resolve-btn--resolved:hover:not(:disabled) {
  box-shadow: 0 4px 14px rgba(34,197,94,0.4);
}

/* Open in Final (redirect deep-link) */
.nth-open-final-btn {
  color: var(--c-accent);
  background: transparent;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.nth-open-final-btn:hover:not(:disabled) {
  background: rgba(13, 122, 95, 0.08);
  border-color: var(--c-accent);
  color: var(--c-accent-2);
}
.nth-open-final-btn:focus-visible {
  outline: 2px solid var(--c-accent);
  outline-offset: 2px;
}

/* Resolved readonly badge */
.nth-resolved-readonly {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #0d7a5f;
  background: #ecfdf5;
  border: 1px solid #bbf7d0;
  border-radius: 100px;
  padding: 3px 9px;
  white-space: nowrap;
}

/* ════════════════════════════════════════════
   EMPTY STATE
════════════════════════════════════════════ */
.nth-empty {
  text-align: center !important;
  padding: 48px 16px !important;
  color: var(--c-text-3);
  vertical-align: middle;
}
.nth-empty .nth-empty-icon {
  display: block;
  margin: 0 auto 10px;
  width: 36px;
  height: 36px;
  opacity: 0.4;
}
.nth-empty span { display: block; font-size: 0.9rem; }

/* ════════════════════════════════════════════
   FOOTNOTE
════════════════════════════════════════════ */
.nth-footnote {
  margin-top: 18px;
  font-size: 0.84rem;
  color: var(--c-text-3);
  line-height: 1.55;
}
</style>
