<template>
  <div class="import-root">
    <div class="import-hero">
      <div class="import-hero-copy">
        <h2>Import Dashboard HTML</h2>
        <p>
          Upload LibreOffice-exported <code>dashboard.html</code>. Preview extraction per task, then approve to create new draft tasks.
          <span v-if="meetingImportMode" class="import-mode-hint">
            Meeting dashboard is <strong>on</strong>: imports go to <strong>New tasks</strong> and appear on <strong>Editor Dashboard</strong> (<code>/new-tentative</code>).
          </span>
          <span v-else class="import-mode-hint import-mode-hint--legacy">
            Meeting dashboard is <strong>off</strong> on the server: imports use the <strong>legacy</strong> task tables (legacy Editor Dashboard only).
          </span>
        </p>
      </div>
      <div class="import-actions">
        <input ref="fileInput" type="file" accept=".html,text/html" @change="onFileSelected" />
        <button class="btn btn-primary" :disabled="loadingPreview || !selectedFile" @click="preview">
          {{ loadingPreview ? 'Parsing…' : 'Preview' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="import-error">{{ error }}</div>

    <div v-if="tasks.length" class="import-body">
      <div class="import-list">
        <div v-if="meetingImportMode" class="import-list-controls">
          <label class="import-checkbox">
            <input type="checkbox" v-model="showExistingSectors" />
            Show tasks whose sector already exists in New Tasks (needs discussion)
          </label>
          <div class="import-list-controls-sub">
            Showing <strong>{{ visibleTasks.length }}</strong> of <strong>{{ tasks.length }}</strong>
          </div>
        </div>
        <div
          v-for="t in visibleTasks"
          :key="t.sn"
          class="import-task"
          :class="{ selected: selectedSn === t.sn, approved: !!t._approved, blocked: t._existsInNewTask && meetingImportMode }"
          @click="selectTask(t.sn)"
        >
          <div class="import-task-top">
            <div class="import-task-sn">SN {{ t.sn }}</div>
            <div class="import-task-title">{{ t.sector_division }} — {{ t.description }}</div>
          </div>
          <div class="import-task-sub">Responsibility: {{ t.responsibility }}</div>
          <div class="import-task-status">
            <span v-if="t._approved" class="pill pill-ok">{{ importSuccessLabel(t) }}</span>
            <span v-else-if="meetingImportMode && t._existsInNewTask" class="pill pill-warn">Needs plan</span>
            <span v-else class="pill pill-pending">Pending</span>
          </div>
        </div>
      </div>

      <div class="import-preview" v-if="activeTask">
        <div class="import-preview-header">
          <div class="import-preview-meta">
            <div><strong>SN:</strong> {{ activeTask.sn }}</div>
            <div><strong>Sector:</strong> {{ activeTask.sector_division }}</div>
            <div><strong>Description:</strong> {{ activeTask.description }}</div>
            <div><strong>Responsibility:</strong> {{ activeTask.responsibility }}</div>
            <div v-if="meetingImportMode && activeTask._existsInNewTask" class="import-blocked-hint">
              This sector already exists in <strong>New Tasks</strong>. Choose what to do:

              <div class="import-merge-box">
                <div class="import-merge-row">
                  <label class="import-merge-label">Existing task:</label>
                  <select
                    v-model="activeTask._existingTaskId"
                    class="import-merge-select"
                    @focus="loadExistingCandidatesForActiveTask"
                    @click="loadExistingCandidatesForActiveTask"
                    @change="onExistingCandidateSelected"
                  >
                    <option value="">Select…</option>
                    <option
                      v-for="c in activeTask._existingCandidates"
                      :key="c.id"
                      :value="String(c.id)"
                    >
                      {{ (c.source === 'snapshot') ? 'Published' : 'Draft' }} #{{ c.id }} — {{ c.description }}
                    </option>
                  </select>
                </div>

                <div class="import-merge-actions">
                  <button
                    class="btn btn-secondary"
                    :disabled="loadingMerge || !activeTask._existingTaskId"
                    @click="useExistingTaskFromDb"
                  >
                    Use existing (load from DB)
                  </button>
                  <span class="import-merge-disabled-note">
                    Override (delete + re-import) is disabled until this merge flow is finalized.
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="import-preview-buttons">
            <button class="btn btn-secondary" :disabled="loadingApprove" @click="resetEdits">Reset edits</button>
            <button
              class="btn btn-primary"
              :disabled="loadingApprove || activeTask._approved || !canApproveActiveTask"
              @click="approve"
            >
              {{ loadingApprove ? 'Importing…' : 'Approve & Import' }}
            </button>
          </div>
        </div>

        <EnhancedNodeEditor
          :initial-nodes="activeTask._editedNodes"
          :readonly="false"
          @nodes-changed="onNodesChanged"
        />
      </div>
    </div>
  </div>
</template>

<script>
import EnhancedNodeEditor from './EnhancedNodeEditor.vue'
import { isMeetingDashboardUiEnabled } from '@/utils/meetingDashboardUi'

export default {
  name: 'ImportDashboardHtml',
  components: { EnhancedNodeEditor },
  data () {
    return {
      selectedFile: null,
      loadingPreview: false,
      loadingApprove: false,
      error: null,
      tasks: [],
      selectedSn: null,
      // meeting-mode only: hide sectors that already exist in NewTask until merge plan is defined
      showExistingSectors: false,
      loadingMerge: false
    }
  },
  computed: {
    meetingImportMode () {
      return isMeetingDashboardUiEnabled()
    },
    visibleTasks () {
      if (!this.meetingImportMode) return this.tasks
      if (this.showExistingSectors) return this.tasks
      return this.tasks.filter(t => !t._existsInNewTask)
    },
    activeTask () {
      if (!this.selectedSn) return null
      return this.tasks.find(t => t.sn === this.selectedSn) || null
    },
    activeTaskHasDelta () {
      return this.taskHasDelta(this.activeTask)
    },
    canApproveActiveTask () {
      if (!this.activeTask) return false
      if (!this.meetingImportMode) return true
      if (!this.activeTask._existsInNewTask) return true
      // Existing task loaded into editor: allow approve only when there is a real delta
      // and a replace target exists.
      if (this.activeTask._loadedFromExisting) {
        return !!this.activeTask._replaceExistingTaskId && this.activeTaskHasDelta
      }
      return false
    }
  },
  methods: {
    onFileSelected (e) {
      this.error = null
      this.tasks = []
      this.selectedSn = null
      const f = e && e.target && e.target.files && e.target.files[0]
      this.selectedFile = f || null
    },
    async preview () {
      if (!this.selectedFile) return
      this.loadingPreview = true
      this.error = null
      // Clear prior preview result to avoid showing stale tasks after a failed parse.
      this.tasks = []
      this.selectedSn = null
      try {
        const form = new FormData()
        form.append('file', this.selectedFile)
        form.append('meeting_dashboard', this.meetingImportMode ? 'true' : 'false')
        // preview can be huge; start with all, can add limit later
        const { data } = await this.$http.secured.post('/imports/dashboard_html/preview', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        const tasks = (data && data.tasks) ? data.tasks : []
        this.tasks = tasks.map(t => ({
          ...t,
          _originalNodes: this.deepClone(Array.isArray(t.nodes) ? t.nodes : []),
          _editedNodes: this.deepClone(Array.isArray(t.nodes) ? t.nodes : []),
          _approved: false,
          _task_id: null,
          _meeting_dashboard: null,
          _existsInNewTask: !!(t && t.exists_in_new_task),
          _existingCandidates: [],
          _existingTaskId: '',
          _existingTaskSource: '',
          _replaceExistingTaskId: null,
          _loadedFromExisting: false,
          _baselineTask: {
            sector_division: t.sector_division || '',
            description: t.description || '',
            responsibility: t.responsibility || '',
            review_date: t.review_date || null
          },
          _source: 'html'
        }))
        this.selectedSn = this.visibleTasks.length ? this.visibleTasks[0].sn : null
      } catch (err) {
        this.error = this.extractHttpErrorMessage(err, 'Failed to preview HTML')
      } finally {
        this.loadingPreview = false
      }
    },
    selectTask (sn) {
      this.selectedSn = sn
    },
    onNodesChanged (flatNodes) {
      if (!this.activeTask) return
      this.activeTask._editedNodes = this.deepClone(Array.isArray(flatNodes) ? flatNodes : [])
    },
    resetEdits () {
      if (!this.activeTask) return
      this.activeTask._editedNodes = this.deepClone(this.activeTask._originalNodes || [])
    },
    deepClone (v) {
      try {
        return JSON.parse(JSON.stringify(v))
      } catch (e) {
        return Array.isArray(v) ? [...v] : v
      }
    },
    onExistingCandidateSelected () {
      if (!this.activeTask || !this.activeTask._existingTaskId) return
      const picked = (this.activeTask._existingCandidates || []).find(c => String(c.id) === String(this.activeTask._existingTaskId))
      if (picked) {
        this.$set(this.activeTask, '_existingTaskSource', String(picked.source || 'task'))
      }
    },
    normalizeTaskForDiff (taskLike) {
      const t = taskLike || {}
      return {
        sector_division: String(t.sector_division || '').trim(),
        description: String(t.description || '').trim(),
        responsibility: String(t.responsibility || '').trim(),
        review_date: t.review_date ? String(t.review_date) : ''
      }
    },
    normalizeNodesForDiff (nodes) {
      const list = Array.isArray(nodes) ? nodes : []
      const normalized = list.map((n) => ({
        id: (n && n.id != null) ? String(n.id) : '',
        parent_id: (n && n.parent_id != null) ? String(n.parent_id) : '',
        content: String((n && n.content) || ''),
        level: Number((n && n.level) || 0),
        list_style: String((n && n.list_style) || ''),
        node_type: String((n && n.node_type) || ''),
        position: Number((n && n.position) || 0),
        review_date: (n && n.review_date) ? String(n.review_date) : ''
      }))
      normalized.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level
        if (a.position !== b.position) return a.position - b.position
        return a.id.localeCompare(b.id, undefined, { numeric: true })
      })
      return normalized
    },
    extractHttpErrorMessage (err, fallback) {
      const msg = err && err.response && err.response.data && err.response.data.error
      if (msg) return msg
      if (err && err.response && err.response.status === 422) {
        return 'Unable to parse this document format. Please choose another dashboard export and try again.'
      }
      return fallback
    },
    taskHasDelta (task) {
      if (!task) return false
      const baselineTask = this.normalizeTaskForDiff(task._baselineTask || task)
      const currentTask = this.normalizeTaskForDiff(task)
      const taskChanged = JSON.stringify(baselineTask) !== JSON.stringify(currentTask)
      if (taskChanged) return true

      const baseNodes = this.normalizeNodesForDiff(task._originalNodes)
      const editedNodes = this.normalizeNodesForDiff(task._editedNodes)
      return JSON.stringify(baseNodes) !== JSON.stringify(editedNodes)
    },
    importSuccessLabel (t) {
      if (!t || !t._task_id) return 'Imported'
      if (t._source === 'db') return `Using existing (New task #${t._task_id})`
      if (t._meeting_dashboard) return `Imported (New task #${t._task_id})`
      return `Imported (Legacy task #${t._task_id})`
    },
    async loadExistingCandidatesForActiveTask () {
      if (!this.meetingImportMode || !this.activeTask || !this.activeTask._existsInNewTask) return
      if (Array.isArray(this.activeTask._existingCandidates) && this.activeTask._existingCandidates.length) return
      this.loadingMerge = true
      try {
        const sector = String(this.activeTask.sector_division || '').trim()
        const { data } = await this.$http.secured.get('/imports/dashboard_html/existing_candidates', {
          params: { sector_division: sector }
        })
        const candidates = (data && data.candidates) ? data.candidates : []
        this.$set(this.activeTask, '_existingCandidates', candidates)
        if (!this.activeTask._existingTaskId && candidates.length === 1) {
          this.$set(this.activeTask, '_existingTaskId', String(candidates[0].id))
          this.$set(this.activeTask, '_existingTaskSource', String(candidates[0].source || 'task'))
        }
      } catch (e) {
        this.$set(this.activeTask, '_existingCandidates', [])
        this.$toast && this.$toast.error('Failed to load existing tasks for this sector.')
      } finally {
        this.loadingMerge = false
      }
    },

    async useExistingTaskFromDb () {
      if (!this.activeTask || !this.activeTask._existingTaskId) return
      this.loadingMerge = true
      try {
        const id = String(this.activeTask._existingTaskId)
        const source = String(this.activeTask._existingTaskSource || 'task')
        const { data } = await this.$http.secured.get(`/imports/dashboard_html/existing_task/${id}`, {
          params: { source }
        })
        const dbTask = data && data.task
        const dbNodes = (data && data.nodes) ? data.nodes : []
        if (!dbTask || !dbTask.id) throw new Error('bad payload')

        // Remove the HTML preview row and replace it with a non-importable DB-backed row.
        const htmlSn = this.activeTask.sn
        const idx = this.tasks.findIndex(t => t.sn === htmlSn)
        if (idx >= 0) this.tasks.splice(idx, 1)

        const replacement = {
          sn: `${(source === 'snapshot') ? 'PUB' : 'DB'}-${dbTask.id}`,
          sector_division: dbTask.sector_division,
          description: dbTask.description,
          responsibility: dbTask.responsibility,
          nodes: dbNodes,
          _originalNodes: this.deepClone(Array.isArray(dbNodes) ? dbNodes : []),
          _editedNodes: this.deepClone(Array.isArray(dbNodes) ? dbNodes : []),
          _approved: false,
          _task_id: dbTask.id,
          _meeting_dashboard: true,
          _existsInNewTask: true,
          _existingCandidates: [],
          _existingTaskId: '',
          _existingTaskSource: source,
          _replaceExistingTaskId: dbTask.replace_existing_new_task_id || null,
          _loadedFromExisting: true,
          _baselineTask: {
            sector_division: dbTask.sector_division || '',
            description: dbTask.description || '',
            responsibility: dbTask.responsibility || '',
            review_date: dbTask.review_date || null
          },
          _source: 'db'
        }
        this.tasks.unshift(replacement)
        this.selectedSn = replacement.sn
        this.$toast && this.$toast.success(`Loaded existing ${(source === 'snapshot') ? 'published' : 'draft'} task #${dbTask.id}. Edit and approve to replace.`)
      } catch (e) {
        this.$toast && this.$toast.error('Failed to load existing task.')
      } finally {
        this.loadingMerge = false
      }
    },

    async approve () {
      if (!this.activeTask) return
      if (!this.canApproveActiveTask) {
        if (this.meetingImportMode && this.activeTask._existsInNewTask && this.activeTask._loadedFromExisting) {
          this.$toast && this.$toast.error('No changes detected yet. Make at least one edit before approving replacement.')
        } else if (this.meetingImportMode && this.activeTask._existsInNewTask) {
          this.$toast && this.$toast.error('This sector already exists in New Tasks. Load existing first, edit, then approve replacement.')
        }
        return
      }
      this.loadingApprove = true
      this.error = null
      try {
        const payload = {
          task: {
            sn: this.activeTask.sn,
            sector_division: this.activeTask.sector_division,
            description: this.activeTask.description,
            responsibility: this.activeTask.responsibility
          },
          nodes: this.activeTask._editedNodes,
          meeting_dashboard: this.meetingImportMode
        }
        if (this.meetingImportMode && this.activeTask._loadedFromExisting && this.activeTask._replaceExistingTaskId) {
          payload.replace_existing_new_task_id = this.activeTask._replaceExistingTaskId
        }
        const { data } = await this.$http.secured.post('/imports/dashboard_html/approve', payload)
        this.activeTask._approved = true
        this.activeTask._task_id = data && data.task_id
        this.activeTask._existsInNewTask = false
        this.activeTask._meeting_dashboard = !!(data && data.meeting_dashboard)
        if (data && data.meeting_dashboard) {
          const replacedId = data && data.deleted_replaced_task_id
          if (replacedId) {
            this.$toast.success(`Replaced task #${replacedId} with new task #${data.task_id}.`)
          } else {
            this.$toast.success(`Imported new task #${data.task_id}.`)
          }
        } else {
          this.$toast.success(`Imported legacy task #${data.task_id}.`)
        }
      } catch (err) {
        this.error = this.extractHttpErrorMessage(err, 'Failed to import task')
      } finally {
        this.loadingApprove = false
      }
    }
  }
}
</script>

<style scoped>
.import-root { padding: 1.25rem; }
.import-hero { display:flex; justify-content:space-between; gap: 1rem; align-items:flex-end; padding: 1rem; border-radius: 12px; border: 1px solid #e2e8f0; background: linear-gradient(180deg, #fff, #f8fafc); }
.import-hero h2 { margin: 0 0 0.25rem 0; font-size: 1.25rem; }
.import-hero p { margin: 0; color: #475569; font-size: 0.9rem; }
.import-mode-hint { display: block; margin-top: 0.5rem; font-size: 0.82rem; color: #334155; }
.import-mode-hint--legacy { color: #9a3412; }
.import-actions { display:flex; gap: 0.75rem; align-items:center; }
.btn { padding: 0.6rem 0.9rem; border-radius: 10px; border: 1px solid transparent; cursor:pointer; font-weight: 600; }
.btn-primary { background: #4f46e5; color: #fff; }
.btn-secondary { background: #fff; border-color: #e2e8f0; color:#0f172a; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.import-error { margin-top: 0.9rem; padding: 0.75rem 1rem; border-radius: 10px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.import-body { margin-top: 1rem; display:flex; gap: 1rem; }
.import-list { width: 360px; max-height: 70vh; overflow:auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
.import-list-controls { position: sticky; top: 0; z-index: 2; padding: 0.75rem 0.85rem; border-bottom: 1px solid #f1f5f9; background: #fff; }
.import-checkbox { display:flex; gap: 0.55rem; align-items:center; font-size: 0.82rem; color: #0f172a; }
.import-list-controls-sub { margin-top: 0.35rem; font-size: 0.78rem; color: #475569; }
.import-task { padding: 0.85rem; border-bottom: 1px solid #f1f5f9; cursor:pointer; }
.import-task.selected { background: #eef2ff; }
.import-task.approved { opacity: 0.75; }
.import-task.blocked { opacity: 0.85; }
.import-task-top { display:flex; gap: 0.5rem; align-items:baseline; }
.import-task-sn { font-weight: 800; color:#0f172a; min-width: 56px; }
.import-task-title { font-weight: 700; color:#0f172a; font-size: 0.92rem; }
.import-task-sub { color:#475569; font-size:0.82rem; margin-top: 0.25rem; }
.import-task-status { margin-top: 0.5rem; }
.pill { display:inline-block; padding: 0.18rem 0.55rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
.pill-ok { background:#dcfce7; color:#166534; border: 1px solid #bbf7d0; }
.pill-pending { background:#fff7ed; color:#9a3412; border: 1px solid #fed7aa; }
.pill-warn { background:#fef9c3; color:#854d0e; border: 1px solid #fde68a; }
.import-preview { flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; background:#fff; padding: 0.75rem; }
.import-preview-header { display:flex; justify-content:space-between; gap: 1rem; align-items:flex-start; margin-bottom: 0.75rem; }
.import-preview-meta { display:grid; gap: 0.25rem; color:#0f172a; font-size: 0.88rem; }
.import-preview-buttons { display:flex; gap: 0.5rem; }
.import-blocked-hint { margin-top: 0.35rem; color:#854d0e; background:#fffbeb; border: 1px solid #fde68a; padding: 0.45rem 0.6rem; border-radius: 10px; font-size: 0.82rem; }
.import-merge-box { margin-top: 0.55rem; display:grid; gap: 0.55rem; }
.import-merge-row { display:flex; gap: 0.55rem; align-items:center; flex-wrap: wrap; }
.import-merge-label { font-weight: 700; }
.import-merge-select { min-width: 260px; max-width: 520px; padding: 0.45rem 0.55rem; border-radius: 10px; border: 1px solid #f59e0b; background: #fff; }
.import-merge-actions { display:flex; gap: 0.5rem; flex-wrap: wrap; }
.import-merge-disabled-note { font-size: 0.82rem; color: #92400e; }

/*
 * LibreOffice/Word tables use rowspan/colspan + colgroup; v-html lives inside EnhancedNodeEditor
 * without scoped data-v attrs, so we target via ::v-deep.
 */
.import-preview ::v-deep table {
  border-collapse: collapse;
  table-layout: auto;
  max-width: 100%;
}
.import-preview ::v-deep table.dashboard-import-table,
.import-preview ::v-deep .rich-text-display table,
.import-preview ::v-deep .rich-editor table {
  border-collapse: collapse;
  table-layout: auto;
}
.import-preview ::v-deep table td,
.import-preview ::v-deep table th {
  border: 1px solid #94a3b8;
  padding: 4px 6px;
  vertical-align: middle;
}
.import-preview ::v-deep table th {
  font-weight: 700;
}
</style>

