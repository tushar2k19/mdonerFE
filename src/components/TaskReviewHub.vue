<template>
  <div class="hub-root">
    <div class="hub-bg-glow hub-glow-left" aria-hidden="true" />
    <div class="hub-bg-glow hub-glow-right" aria-hidden="true" />

    <main class="hub-main">
      <header class="hub-hero">
        <div class="hub-hero-inner">
          <button type="button" class="hub-back" @click="$router.push({ name: 'Home' })">
            <svg xmlns="http://www.w3.org/2000/svg" class="hub-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div class="hub-hero-copy">
            <p class="hub-eyebrow">
              <span class="hub-dot" />
              Review ecosystem
            </p>
            <h1 class="hub-title">Live review status</h1>
            <p class="hub-sub">
              Current version cycle only — every reviewer, sent time, and nudges in one place.
            </p>
          </div>
          <button
            v-if="taskId"
            type="button"
            class="hub-refresh"
            :disabled="loading"
            @click="load"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="hub-icon hub-spin" :class="{ spinning: loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      <div v-if="error" class="hub-card hub-card-error">
        <p class="hub-error-title">{{ error }}</p>
        <p class="hub-error-hint">If you are not the task editor, this page is not available.</p>
      </div>

      <template v-else-if="payload">
        <section class="hub-task-strip">
          <div class="hub-task-glass">
            <h2 class="hub-task-title">{{ payload.task.description }}</h2>
            <div class="hub-task-meta">
              <span class="hub-pill hub-pill-muted">{{ payload.task.sector_division }}</span>
              <span class="hub-pill hub-pill-muted">{{ payload.task.responsibility }}</span>
              <span class="hub-pill hub-pill-version">v{{ payload.task_version.version_number }} · {{ payload.task_version.status }}</span>
            </div>
          </div>
        </section>

        <section class="hub-kpi-grid">
          <div class="hub-kpi">
            <span class="hub-kpi-label">Total reviews</span>
            <span class="hub-kpi-value">{{ payload.summary.total }}</span>
          </div>
          <div class="hub-kpi hub-kpi-pending">
            <span class="hub-kpi-label">Pending</span>
            <span class="hub-kpi-value">{{ payload.summary.pending }}</span>
          </div>
          <div class="hub-kpi hub-kpi-approved">
            <span class="hub-kpi-label">Approved (this cycle)</span>
            <span class="hub-kpi-value">{{ payload.summary.approved }}</span>
          </div>
          <div class="hub-kpi hub-kpi-changes">
            <span class="hub-kpi-label">Changes requested</span>
            <span class="hub-kpi-value">{{ payload.summary.changes_requested }}</span>
          </div>
        </section>

        <section class="hub-table-card">
          <div class="hub-table-head">
            <h3 class="hub-table-title">Reviewers</h3>
            <p class="hub-table-sub">
              Open a review to see the full interface. Remind sends a new in-app notification (10 min cooldown).
              <strong>Changes requested</strong> is the number of comments on each review’s trail; the summary tile is the total across all reviews in this cycle.
            </p>
          </div>

          <div class="hub-table-wrap">
            <table class="hub-table">
              <thead>
                <tr>
                  <th>Reviewer</th>
                  <th>Status</th>
                  <th class="hub-th-num" title="Number of comments on this review">Changes requested</th>
                  <th>Sent</th>
                  <th>Last reminder</th>
                  <th class="hub-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in payload.reviews" :key="row.id">
                  <td data-label="Reviewer">
                    <div class="hub-reviewer">
                      <span class="hub-avatar">{{ initials(row.reviewer.name) }}</span>
                      <div>
                        <div class="hub-reviewer-name">{{ row.reviewer.name }}</div>
                        <div class="hub-reviewer-email">{{ row.reviewer.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Status">
                    <span :class="['hub-status', statusClass(row.status)]">{{ formatStatus(row.status) }}</span>
                  </td>
                  <td class="hub-td-num hub-mono" data-label="Changes requested">{{ changesRequestedCount(row) }}</td>
                  <td class="hub-mono" data-label="Sent">{{ formatDt(row.created_at) }}</td>
                  <td class="hub-mono" data-label="Last reminder">{{ row.last_reminder_sent_at ? formatDt(row.last_reminder_sent_at) : '—' }}</td>
                  <td data-label="Actions">
                    <div class="hub-actions">
                      <button type="button" class="hub-btn hub-btn-primary" @click="openReview(row.id)">
                        Open
                      </button>
                      <button
                        type="button"
                        class="hub-btn hub-btn-ghost"
                        :disabled="!canRemind(row) || remindingId === row.id"
                        @click="remind(row)"
                      >
                        {{ remindingId === row.id ? 'Sending…' : 'Remind' }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="payload.reviews.length === 0" class="hub-empty">
            No active reviews for this version.
          </div>
        </section>
      </template>

      <div v-else-if="loading" class="hub-loading">
        <div class="hub-spinner" />
        <p>Loading review status…</p>
      </div>
    </main>
  </div>
</template>

<script>
const REMIND_COOLDOWN_MS = 10 * 60 * 1000

export default {
  name: 'TaskReviewHub',
  props: {
    taskId: {
      type: [String, Number],
      required: true
    }
  },
  data () {
    return {
      loading: true,
      error: null,
      payload: null,
      remindingId: null
    }
  },
  watch: {
    taskId: {
      immediate: true,
      handler () {
        this.load()
      }
    }
  },
  methods: {
    async load () {
      this.loading = true
      this.error = null
      try {
        const { data } = await this.$http.secured.get(`/task/${this.taskId}/review_cycle`)
        if (data.success) {
          this.payload = data.data
        } else {
          this.error = data.error || 'Could not load review status'
          this.payload = null
        }
      } catch (e) {
        const status = e.response && e.response.status
        const msg = (e.response && e.response.data && e.response.data.error) || e.message
        this.error = status === 403 ? 'You do not have access to this task.' : (msg || 'Could not load review status')
        this.payload = null
      } finally {
        this.loading = false
      }
    },
    initials (name) {
      if (!name) return '?'
      const parts = name.trim().split(/\s+/)
      const a = parts[0] && parts[0][0]
      const b = parts[1] && parts[1][0]
      return ((a || '') + (b || '')).toUpperCase() || '?'
    },
    changesRequestedCount (row) {
      const n = row && row.comments_count
      return typeof n === 'number' && !isNaN(n) ? n : 0
    },
    formatScope (row) {
      if (row.reviewer_type === 'node_level') return 'Node-level'
      return 'Task-level'
    },
    formatStatus (s) {
      if (s === 'changes_requested') return 'Changes requested'
      return s.charAt(0).toUpperCase() + s.slice(1)
    },
    statusClass (s) {
      return {
        pending: 'hub-status-pending',
        approved: 'hub-status-approved',
        changes_requested: 'hub-status-changes'
      }[s] || ''
    },
    formatDt (iso) {
      try {
        return new Date(iso).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      } catch (_) {
        return iso
      }
    },
    canRemind (row) {
      if (row.status !== 'pending') return false
      if (!row.last_reminder_sent_at) return true
      return Date.now() - new Date(row.last_reminder_sent_at).getTime() >= REMIND_COOLDOWN_MS
    },
    openReview (id) {
      this.$router.push({ name: 'ReviewInterface', params: { id: String(id) } })
    },
    async remind (row) {
      if (!this.canRemind(row)) return
      this.remindingId = row.id
      try {
        const { data } = await this.$http.secured.post(`/review/${row.id}/remind`)
        if (data.success) {
          row.last_reminder_sent_at = data.data.last_reminder_sent_at
          this.$toast && this.$toast.success('Reminder sent to reviewer')
        } else {
          this.$toast && this.$toast.error(data.error || 'Could not send reminder')
        }
      } catch (e) {
        const body = e.response && e.response.data
        this.$toast && this.$toast.error((body && body.error) || 'Could not send reminder')
      } finally {
        this.remindingId = null
      }
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

.hub-root {
  font-family: 'Poppins', system-ui, sans-serif;
  min-height: calc(100vh - 64px);
  position: relative;
  overflow-x: hidden !important;
  overflow-y: visible !important;
  width: 100%;
  flex: 1;
  background: linear-gradient(-45deg, #FFB366, #FFC78A, #FFD9A8, #FFE8C5);
  background-size: 400% 400%;
  animation: gradientShift 8s ease infinite;
}

.hub-root::before {
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

.hub-root::after {
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

.hub-main {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.25rem 3.5rem;
}

.hub-hero {
  margin-bottom: 1.75rem;
  padding-bottom: 1.25rem;
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(90deg, rgba(255, 153, 51, 0.85), rgba(19, 136, 8, 0.75), rgba(0, 0, 128, 0.85)) 1;
}

.hub-hero-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.hub-back,
.hub-refresh {
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
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.hub-back:hover,
.hub-refresh:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 6px 15px rgba(255, 140, 66, 0.15);
  color: #ea580c;
}

.hub-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hub-icon {
  width: 1.1rem;
  height: 1.1rem;
}

.hub-spin.spinning {
  animation: hubSpin 0.9s linear infinite;
}

@keyframes hubSpin {
  to { transform: rotate(360deg); }
}

.hub-hero-copy {
  flex: 1 1 280px;
  text-align: center;
}

@media (min-width: 768px) {
  .hub-hero-copy {
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

.hub-title {
  margin: 0;
  font-size: clamp(1.75rem, 4vw, 2.35rem);
  font-weight: 800;
  color: #1f2937;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
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

.hub-error-title {
  margin: 0;
  color: #b91c1c;
  font-weight: 600;
}

.hub-error-hint {
  margin: 0.5rem 0 0;
  color: #7f1d1d;
  font-size: 0.875rem;
}

.hub-task-strip {
  margin-bottom: 1.5rem;
}

.hub-task-glass {
  border-radius: 1.25rem;
  padding: 1.35rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 100%);
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 30px rgba(249, 115, 22, 0.08);
}

.hub-task-title {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.4;
}

.hub-task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
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

.hub-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.85rem;
  margin-bottom: 1.5rem;
}

.hub-kpi {
  border-radius: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
}

.hub-kpi-pending { border-left: 4px solid #f59e0b; }
.hub-kpi-approved { border-left: 4px solid #10b981; }
.hub-kpi-changes { border-left: 4px solid #ef4444; }

.hub-kpi-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  margin-bottom: 0.35rem;
}

.hub-kpi-value {
  font-size: 1.65rem;
  font-weight: 800;
  color: #1f2937;
}

.hub-table-card {
  border-radius: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: 0 15px 40px rgba(249, 115, 22, 0.08);
  overflow: hidden;
}

.hub-table-head {
  padding: 1.25rem 1.5rem 0.5rem;
  border-bottom: 1px solid rgba(241, 245, 249, 0.8);
}

.hub-table-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #1f2937;
}

.hub-table-sub {
  margin: 0.35rem 0 1rem;
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.45;
}

.hub-table-wrap {
  overflow-x: auto;
}

.hub-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.hub-table th {
  text-align: left;
  padding: 0.75rem 1.25rem;
  color: #475569;
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid rgba(226, 232, 240, 0.8);
  background: rgba(248, 250, 252, 0.8);
}

.hub-table td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(241, 245, 249, 0.8);
  color: #334155;
  vertical-align: middle;
}

.hub-th-actions {
  text-align: right;
}

.hub-th-num,
.hub-td-num {
  text-align: center;
  width: 7.5rem;
}

.hub-reviewer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.hub-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #f97316, #f59e0b);
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(249, 115, 22, 0.3);
}

.hub-reviewer-name {
  font-weight: 700;
  color: #1f2937;
}

.hub-reviewer-email {
  font-size: 0.75rem;
  color: #64748b;
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

.hub-mono {
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
}

.hub-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.hub-btn {
  padding: 0.45rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
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
  background: rgba(241, 245, 249, 0.8);
  color: #475569;
  border-color: rgba(203, 213, 225, 0.8);
}

.hub-btn-ghost:hover:not(:disabled) {
  background: rgba(226, 232, 240, 0.9);
  color: #1f2937;
}

.hub-empty {
  padding: 3rem 1.5rem;
  text-align: center;
  color: #64748b;
  font-size: 0.95rem;
  font-weight: 500;
}

.hub-loading {
  text-align: center;
  padding: 4rem 1rem;
  color: #64748b;
  font-weight: 500;
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

@media (max-width: 900px) {
  .hub-table thead {
    display: none;
  }

  .hub-table tr {
    display: block;
    margin: 1rem;
    padding: 1.25rem;
    border-radius: 1rem;
    border: 1px solid rgba(226, 232, 240, 0.8);
    background: rgba(248, 250, 252, 0.6);
  }

  .hub-table td {
    display: block;
    padding: 0.5rem 0;
    border: none;
  }

  .hub-table td::before {
    content: attr(data-label);
    display: block;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #64748b;
    margin-bottom: 0.25rem;
    font-weight: 700;
  }

  .hub-actions {
    justify-content: flex-start;
    margin-top: 0.75rem;
  }
}
</style>
