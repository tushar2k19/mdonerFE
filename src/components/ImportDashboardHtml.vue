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
        <div
          v-for="t in tasks"
          :key="t.sn"
          class="import-task"
          :class="{ selected: selectedSn === t.sn, approved: !!t._approved }"
          @click="selectTask(t.sn)"
        >
          <div class="import-task-top">
            <div class="import-task-sn">SN {{ t.sn }}</div>
            <div class="import-task-title">{{ t.sector_division }} — {{ t.description }}</div>
          </div>
          <div class="import-task-sub">Responsibility: {{ t.responsibility }}</div>
          <div class="import-task-status">
            <span v-if="t._approved" class="pill pill-ok">{{ importSuccessLabel(t) }}</span>
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
          </div>
          <div class="import-preview-buttons">
            <button class="btn btn-secondary" :disabled="loadingApprove" @click="resetEdits">Reset edits</button>
            <button class="btn btn-primary" :disabled="loadingApprove || activeTask._approved" @click="approve">
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
      selectedSn: null
    }
  },
  computed: {
    meetingImportMode () {
      return process.env.FEATURE_MEETING_DASHBOARD === 'true'
    },
    activeTask () {
      if (!this.selectedSn) return null
      return this.tasks.find(t => t.sn === this.selectedSn) || null
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
      try {
        const form = new FormData()
        form.append('file', this.selectedFile)
        // preview can be huge; start with all, can add limit later
        const { data } = await this.$http.secured.post('/imports/dashboard_html/preview', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        const tasks = (data && data.tasks) ? data.tasks : []
        this.tasks = tasks.map(t => ({
          ...t,
          _originalNodes: Array.isArray(t.nodes) ? t.nodes : [],
          _editedNodes: Array.isArray(t.nodes) ? t.nodes : [],
          _approved: false,
          _task_id: null,
          _meeting_dashboard: null
        }))
        this.selectedSn = this.tasks.length ? this.tasks[0].sn : null
      } catch (err) {
        console.error(err)
        this.error = (err && err.response && err.response.data && err.response.data.error) || 'Failed to preview HTML'
      } finally {
        this.loadingPreview = false
      }
    },
    selectTask (sn) {
      this.selectedSn = sn
    },
    onNodesChanged (flatNodes) {
      if (!this.activeTask) return
      this.activeTask._editedNodes = Array.isArray(flatNodes) ? flatNodes : []
    },
    resetEdits () {
      if (!this.activeTask) return
      this.activeTask._editedNodes = this.activeTask._originalNodes
    },
    importSuccessLabel (t) {
      if (!t || !t._task_id) return 'Imported'
      if (t._meeting_dashboard) return `Imported (New task #${t._task_id})`
      return `Imported (Legacy task #${t._task_id})`
    },
    async approve () {
      if (!this.activeTask) return
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
          nodes: this.activeTask._editedNodes
        }
        const { data } = await this.$http.secured.post('/imports/dashboard_html/approve', payload)
        this.activeTask._approved = true
        this.activeTask._task_id = data && data.task_id
        this.activeTask._meeting_dashboard = !!(data && data.meeting_dashboard)
        if (data && data.meeting_dashboard) {
          this.$toast.success(`Imported new task #${data.task_id}. Open Editor Dashboard to see it.`)
        } else {
          this.$toast.success(`Imported legacy task #${data.task_id}.`)
        }
      } catch (err) {
        console.error(err)
        this.error = (err && err.response && err.response.data && err.response.data.error) || 'Failed to import task'
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
.import-task { padding: 0.85rem; border-bottom: 1px solid #f1f5f9; cursor:pointer; }
.import-task.selected { background: #eef2ff; }
.import-task.approved { opacity: 0.75; }
.import-task-top { display:flex; gap: 0.5rem; align-items:baseline; }
.import-task-sn { font-weight: 800; color:#0f172a; min-width: 56px; }
.import-task-title { font-weight: 700; color:#0f172a; font-size: 0.92rem; }
.import-task-sub { color:#475569; font-size:0.82rem; margin-top: 0.25rem; }
.import-task-status { margin-top: 0.5rem; }
.pill { display:inline-block; padding: 0.18rem 0.55rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
.pill-ok { background:#dcfce7; color:#166534; border: 1px solid #bbf7d0; }
.pill-pending { background:#fff7ed; color:#9a3412; border: 1px solid #fed7aa; }
.import-preview { flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; background:#fff; padding: 0.75rem; }
.import-preview-header { display:flex; justify-content:space-between; gap: 1rem; align-items:flex-start; margin-bottom: 0.75rem; }
.import-preview-meta { display:grid; gap: 0.25rem; color:#0f172a; font-size: 0.88rem; }
.import-preview-buttons { display:flex; gap: 0.5rem; }
</style>

