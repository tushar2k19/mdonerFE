<template>
  <div class="modal-overlay new-task-modal-overlay" @click.self="$emit('close')">
    <div
      class="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-task-modal-title"
    >
      <div class="modal-header">
        <h3 id="new-task-modal-title">{{ mode === 'add' ? 'Add Task' : 'Edit Task' }}</h3>
        <button class="btn-close" aria-label="Close dialog" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-stepper" role="tablist" aria-label="Task form sections">
        <button
          id="task-meta-tab"
          type="button"
          class="step-btn"
          :class="{ active: modalStep === 'meta' }"
          role="tab"
          :aria-selected="modalStep === 'meta' ? 'true' : 'false'"
          aria-controls="task-meta-panel"
          @click="modalStep = 'meta'"
        >
          <span class="step-pill">1</span>
          Task Details
        </button>
        <button
          id="task-action-tab"
          type="button"
          class="step-btn"
          :class="{ active: modalStep === 'action' }"
          role="tab"
          :aria-selected="modalStep === 'action' ? 'true' : 'false'"
          aria-controls="task-action-panel"
          @click="modalStep = 'action'"
        >
          <span class="step-pill">2</span>
          Action to be Taken
        </button>
      </div>

      <div class="modal-body">
        <section
          v-show="modalStep === 'meta'"
          id="task-meta-panel"
          class="modal-panel"
          role="tabpanel"
          aria-labelledby="task-meta-tab"
        >
          <div class="form-group">
            <label>Sector/Division</label>
            <input
              v-model="formData.sector_division"
              type="text"
              class="form-control"
            >
          </div>

          <div class="form-group">
            <label>Description</label>
            <input
              v-model="formData.description"
              type="text"
              class="form-control"
            >
          </div>

          <div class="form-group">
            <label>Responsibility</label>
            <input
              v-model="formData.responsibility"
              type="text"
              class="form-control"
            >
          </div>

          <!-- Phase 1: Simple tag add/remove (no dropdown yet) - placed below Responsibility -->
          <div class="form-group" ref="tagField">
            <label>Tags</label>

            <!-- Add-by-name input (placed first) -->
            <div class="tag-input-row">
              <input
                v-model="newTagName"
                type="text"
                class="form-control"
                placeholder="Type a tag and click Add"
                @focus="openTagDropdown"
                @click="openTagDropdown"
                @input="openTagDropdown"
              >
              <button class="btn btn-primary" type="button" @click="addTagByName">Add</button>
            </div>

            <!-- Tag suggestions dropdown (Task 1) -->
            <div v-if="showTagDropdown" class="tag-suggest-dropdown">
              <div v-if="isLoadingTags" class="tag-suggest-empty">Loading tags…</div>
              <!-- Show first 20 tags for now (sorting and filtering come in later tasks) -->
              <div v-else-if="filteredTagSuggestions && filteredTagSuggestions.length" class="tag-suggest-list">
                <button
                  v-for="t in filteredTagSuggestions"
                  :key="t.id"
                  class="tag-suggest-item"
                  :class="{ selected: isTagSelected(t.id) }"
                  :disabled="isTagSelected(t.id)"
                  @click.prevent="!isTagSelected(t.id) && selectExistingTag(t)"
                >
                  {{ t.name }}
                </button>
              </div>
              <div v-else class="tag-suggest-empty">
                No matching tags. Use Add to create "{{ newTagName }}".
              </div>
            </div>

            <!-- Selected tag chips (now below the input) -->
            <div class="tag-chip-wrap">
              <span
                v-for="tag in selectedTags"
                :key="tag.id"
                class="tag-chip"
              >
                {{ tag.name }}
                <button
                  class="tag-chip-remove"
                  @click.prevent="removeTag(tag.id)"
                  title="Remove"
                  type="button"
                >
                  ×
                </button>
              </span>
            </div>

            <small class="form-help-text">Add multiple tags by repeating Add. Use × to remove.</small>
          </div>

          <div class="form-group">
            <label>Review Date</label>
            <datepicker
              v-model="formData.review_date"
              class="custom-datepicker"
              :calendar-class="'calendar-wrapper'"
              :input-class="'datepicker-input'"
              :monday-first="true"
              format="dd MMM yyyy"
            ></datepicker>
          </div>
        </section>

        <section
          v-show="modalStep === 'action'"
          id="task-action-panel"
          class="modal-panel modal-panel-editor"
          role="tabpanel"
          aria-labelledby="task-action-tab"
        >
          <div class="action-editor-shell">
            <NewEnhancedNodeEditor
              :task-version-id="taskVersionId"
              :meeting-draft-task-id="meetingDraftTaskIdForEditor"
              :initial-nodes="actionNodes"
              :meeting-editor-overlay="meetingEditorOverlay"
              :meeting-pack-highlight-mode="packHighlightMode"
              @nodes-changed="onNodesChanged"
            />
          </div>
        </section>

      </div>

      <div class="modal-footer">
        <div class="modal-footer-left">
          <button
            v-if="modalStep === 'action'"
            type="button"
            class="btn btn-secondary"
            @click="modalStep = 'meta'"
          >
            Back
          </button>
          <button
            v-if="modalStep === 'meta'"
            type="button"
            class="btn btn-primary"
            @click="modalStep = 'action'"
          >
            Next
          </button>
        </div>
        <div class="modal-footer-right">
          <button @click="$emit('close')" class="btn btn-ghost">Cancel</button>
          <button @click="saveTask" class="btn btn-primary">Save</button>
        </div>
      </div>
    </div>

    <!-- Merge Interface Overlay -->
    <MergeInterface 
      v-if="showMergeInterface"
      :conflict-data="mergeConflictData && mergeConflictData.conflictData"
      :task-id="mergeConflictData && mergeConflictData.taskId"
      @close="closeMergeInterface"
      @merge-applied="onMergeApplied"
    />
  </div>
</template>
<script>
import NewEnhancedNodeEditor from './NewEnhancedNodeEditor.vue'
import MergeInterface from './MergeInterface.vue'
import Datepicker from 'vuejs-datepicker'
import { isMeetingDashboardUiEnabled } from '@/utils/meetingDashboardUi'
import { PACK_HIGHLIGHT_MODE } from '@/utils/meetingPackHighlightFilter'

export default {
  name: 'NewTaskModal',

  components: {
    NewEnhancedNodeEditor,
    MergeInterface,
    Datepicker
  },

  props: {
    task: {
      type: Object,
      default: null
    },
    mode: {
      type: String,
      default: 'add'
    },
    /** Published pack version id for meeting hub overlay (New Tentative parity). */
    meetingOverlayVersionId: {
      type: [Number, String],
      default: null
    },
    /** Pack highlight filter; synced with NewTentativeDashboard.packHighlightMode. */
    packHighlightMode: {
      type: String,
      default: PACK_HIGHLIGHT_MODE.ALL
    }
  },

  data () {
    return {
      formData: {
        sector_division: '',
        description: '',
        action_to_be_taken: '',
        original_date: new Date(), // Automatically set to today's date
        responsibility: '',
        review_date: null
      },
      actionNodes: [],
      flatActionNodes: [],
      taskVersionId: null,
      showMergeInterface: false,
      mergeConflictData: null,
      // Tags (Phase 1)
      selectedTags: [],
      newTagName: '',
      // Tag suggestions dropdown (Task 1)
      allTags: [],
      isTagsLoaded: false,
      showTagDropdown: false,
      isLoadingTags: false,
      modalStep: 'meta',
      tagSearch: '',
      meetingEditorOverlay: {},
      oldEditorConfig: {
        height: 425,
        menubar: true,
        plugins: [
          'advlist autolink lists link charmap preview',
          'searchreplace visualblocks code fullscreen',
          'table paste code help wordcount',
          'textcolor visualchars directionality',
          'textpattern advlist'
        ],
        valid_elements: '*[*]',
        valid_styles: {
          '*': 'color,background-color' // Allow background styles
        },
        toolbar: [
          'undo redo | formatselect | bold italic underline strikethrough | superscript subscript',
          'fontsizeselect fontsize | forecolor backcolor | alignleft aligncenter alignright alignjustify',
          'numlist bullist | outdent indent | table | charmap hr',
          'removeformat | styles | help | code fullscreen'
        ].join(' | '),

        advlist_number_styles: 'default,lower-alpha,lower-roman,upper-alpha,upper-roman',
        advlist_bullet_styles: 'default,circle,square',

        content_style: `
    body { margin: 1rem; }
    ol {
      list-style-type: decimal !important;
      padding-left: 2em !important;
      margin: 0.25em 0 !important;
    }
    ol[style*="lower-alpha"] { list-style-type: lower-alpha !important; }
    ol[style*="upper-alpha"] { list-style-type: upper-alpha !important; }
    ol[style*="lower-roman"] { list-style-type: lower-roman !important; }
    ol[style*="upper-roman"] { list-style-type: upper-roman !important; }
    ul {
      list-style-type: disc !important;
      padding-left: 2em !important;
      margin: 0.25em 0 !important;
    }
  `,

        style_formats: [
          {
            title: 'List Styles',
            items: [
              { title: 'Decimal', format: 'numlist' },
              { title: 'Lower Alpha', format: 'numlist lower-alpha' },
              { title: 'Upper Alpha', format: 'numlist upper-alpha' },
              { title: 'Lower Roman', format: 'numlist lower-roman' },
              { title: 'Upper Roman', format: 'numlist upper-roman' }
            ]
          }
        ],

        // Basic settings
        branding: false,
        promotion: false,

        // Font settings
        fontsize_formats: '4pt 6pt 8pt 10pt 12pt 14pt 16pt 18pt 20pt 24pt 30pt 36pt 48pt 54pt 60pt 72pt',
        fontsize_input: true,
        // Table settings
        table_default_attributes: {
          border: '1'
        },
        table_appearance_options: true,
        table_advtab: true,

        // Color settings
        color_map: [
          '000000', 'Black',
          '808080', 'Gray',
          'FFFFFF', 'White',
          'FF0000', 'Red',
          '0000FF', 'Blue',
          '008000', 'Green',
          'FFFF00', 'Yellow',
          'FF00FF', 'Magenta',
          '00FFFF', 'Cyan',
          '800000', 'Maroon',
          '008080', 'Teal',
          '800080', 'Purple'
        ],

        // Add these settings
        force_br_newlines: false,
        force_p_newlines: true,
        forced_root_block: 'p',
        remove_trailing_brs: true
      }
    }
  },
  computed: {
    /** When editing a living meeting draft, node item incremental API uses task id (no task_version). */
    meetingDraftTaskIdForEditor () {
      if (this.task && this.task.meeting_dashboard_draft && this.task.id != null) {
        return this.task.id
      }
      return null
    },
    filteredTagSuggestions () {
      const list = Array.isArray(this.allTags) ? this.allTags : []
      const q = (this.newTagName || '').trim().toLowerCase()
      if (!q) return list
      const prefix = []
      const contains = []
      list.forEach(t => {
        const name = (t.name || '').toLowerCase()
        if (name.startsWith(q)) {
          prefix.push(t)
        } else if (name.includes(q)) {
          contains.push(t)
        }
      })
      return prefix.concat(contains).slice(0, 20)
    }
  },
  async created () {
    // If editing existing task, populate form
    if (this.task) {
      this.formData = {
        sector_division: this.task.sector_division,
        description: this.task.description,
        action_to_be_taken: this.task.action_to_be_taken,
        original_date: new Date(this.task.original_date), // Keep existing original_date for edits
        responsibility: this.task.responsibility,
        review_date: this.task.review_date ? new Date(this.task.review_date) : null
      }

      if (this.task.meeting_dashboard_draft) {
        this.taskVersionId = null
        await this.loadActionNodes()
      } else if (this.task.current_version_id) {
        this.taskVersionId = this.task.current_version_id
        await this.loadActionNodes()
      }

      // Initialize tags when editing existing task
      if (Array.isArray(this.task.tags)) {
        this.selectedTags = this.task.tags.map(t => ({ id: t.id, name: t.name }))
      }
    } else {
      this.actionNodes = []
      this.taskVersionId = null
    }
    await this.fetchMeetingEditorOverlay()
  },
  watch: {
    meetingOverlayVersionId () {
      this.fetchMeetingEditorOverlay()
    }
  },
  mounted() {
    this._onDocClick = (e) => {
      const root = this.$refs.tagField
      if (root && !root.contains(e.target)) {
        this.closeTagDropdown()
      }
    }
    document.addEventListener('click', this._onDocClick)
  },
  beforeDestroy() {
    if (this._onDocClick) {
      document.removeEventListener('click', this._onDocClick)
    }
  },
  
  methods: {
    async fetchMeetingEditorOverlay () {
      if (!this.meetingOverlayVersionId || !this.task || !this.task.meeting_dashboard_draft) {
        this.meetingEditorOverlay = {}
        return
      }
      try {
        const { data } = await this.$http.secured.get('/meeting_dashboard/draft_editor_overlay', {
          params: { new_dashboard_version_id: this.meetingOverlayVersionId }
        })
        this.meetingEditorOverlay = data.nodes || {}
      } catch (e) {
        this.meetingEditorOverlay = {}
      }
    },
    async loadActionNodes () {
      try {
        let response
        if (this.task && this.task.meeting_dashboard_draft) {
          response = await this.$http.secured.get(`/meeting_dashboard/tasks/${this.task.id}/nodes`)
        } else if (this.taskVersionId) {
          response = await this.$http.secured.get(`/task_versions/${this.taskVersionId}/nodes`)
        } else {
          return // No version or draft to load nodes from
        }
        if (response.data.success) {
          // Backend returns tree structure: [{ node: {...}, children: [...] }]
          const treeData = response.data.data

          // Convert tree structure to flat array for NewEnhancedNodeEditor
          this.actionNodes = this.flattenTreeStructure(treeData)

          // Also populate the action_to_be_taken field with formatted content
          this.formData.action_to_be_taken = this.formatNodesForDisplay(treeData)
        }
      } catch (error) {
        console.error('Error loading action nodes:', error)
        this.$toast.error('Error loading action items')
        // Fallback to empty array
        this.actionNodes = []
      }
    },

    onNodesChanged (nodesData) {
      // NodeEditor emits flat array of nodes: [{ id, content, level, ... }]
      // Store this for saving to backend, preserving all node properties
      this.flatActionNodes = nodesData.map(node => ({
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
      }))

      // Also update the action_to_be_taken field for display
      if (nodesData && nodesData.length > 0) {
        this.formData.action_to_be_taken = this.formatFlatNodesForDisplay(nodesData)
      }
    },

    validateForm () {
      const requiredFields = [
        { field: 'sector_division', label: 'Sector/Division' },
        { field: 'description', label: 'Description' },
        { field: 'responsibility', label: 'Responsibility' },
        { field: 'review_date', label: 'Review Date' }
      ]

      for (const { field, label } of requiredFields) {
        if (!this.formData[field]) {
          this.$toast.error(`${label} is required`)
          return false
        }
      }

      // Check for content in any of the following sources:
      // 1) flatActionNodes (live edits)
      // 2) actionNodes loaded from backend (when editor hasn’t touched the editor yet)
      // 3) fallback: action_to_be_taken text (if present)
      const hasFlatContent = Array.isArray(this.flatActionNodes) &&
        this.flatActionNodes.some(node => node && node.content && node.content.trim())

      const hasLoadedNodes = Array.isArray(this.actionNodes) && this.actionNodes.length > 0

      const hasPlainText = this.formData.action_to_be_taken && this.formData.action_to_be_taken.toString().trim().length > 0

      if (!hasFlatContent && !hasLoadedNodes && !hasPlainText) {
        this.$toast.error('At least one action item is required')
        return false
      }

      return true
    },

    async saveTask () {
      if (!this.validateForm()) return

      try {
        const tagIds = this.selectedTags.map(t => t.id)

        // Decide whether to send content updates
        const filteredNodes = Array.isArray(this.flatActionNodes)
          ? this.flatActionNodes.filter(node => node && node.content && node.content.trim())
          : []

        // Clone form data and remove action_to_be_taken if we are not changing content
        const taskBody = {
          ...this.formData,
          original_date: this.formatDate(this.formData.original_date),
          review_date: this.formatDate(this.formData.review_date),
          tag_ids: tagIds
        }

        if (!filteredNodes.length) {
          // Avoid triggering backend content rewrite when editor made no changes
          delete taskBody.action_to_be_taken
        }

        const taskData = {
          task: taskBody
        }

        if (filteredNodes.length) {
          taskData.action_nodes = filteredNodes
        }

        let response
        if (this.mode === 'edit' && this.task) {
          if (this.task.meeting_dashboard_draft) {
            response = await this.$http.secured.put(`/meeting_dashboard/tasks/${this.task.id}`, taskData)
          } else {
            response = await this.$http.secured.put(`/task/${this.task.id}`, taskData)
          }
        } else if (isMeetingDashboardUiEnabled()) {
          response = await this.$http.secured.post('/meeting_dashboard/tasks', taskData)
        } else {
          response = await this.$http.secured.post('/task', taskData)
        }

        // Check for merge conflict
        if (response.data.merge_conflict) {
          this.handleMergeConflict(response.data)
          return
        }

        this.$emit('save')
        this.$emit('close')
        this.$toast.success(`Task ${this.mode === 'edit' ? 'updated' : 'created'} successfully`)
      } catch (error) {
        console.error('Error saving task:', error)
        if (error && error.response && error.response.data) {
          const msg = error.response.data.error || error.response.data.message || 'Error saving task'
          this.$toast.error(msg)
        } else {
          this.$toast.error('Error saving task')
        }
      }
    },

    async addTagByName () {
      const name = (this.newTagName || '').trim()
      if (!name) {
        this.$toast.error('Enter a tag name')
        return
      }

      // Prevent duplicate by name
      const existsByName = this.selectedTags.some(t => t.name.toLowerCase() === name.toLowerCase())
      if (existsByName) {
        this.$toast.info('Tag already added')
        this.newTagName = ''
        return
      }

      try {
        const res = await this.$http.secured.post('/tags', { name })
        const tag = res.data // { id, name }
        if (!this.selectedTags.some(t => t.id === tag.id)) {
          this.selectedTags.push(tag)
        }
        this.newTagName = ''
      } catch (e) {
        console.error('Failed to add tag:', e)
        this.$toast.error('Failed to add tag')
      }
    },

    removeTag (id) {
      this.selectedTags = this.selectedTags.filter(t => t.id !== id)
    },

    // Task 1: open/close dropdown and load tag suggestions once
    async openTagDropdown () {
      await this.loadTagsIfNeeded()
      this.showTagDropdown = true
    },
    closeTagDropdown () {
      this.showTagDropdown = false
    },
    async loadTagsIfNeeded () {
      if (this.isTagsLoaded || this.isLoadingTags) return
      try {
        this.isLoadingTags = true
        const res = await this.$http.secured.get('/tags', { params: { include_usage: true } })
        const list = Array.isArray(res.data) ? res.data : []
        // Task 2: sort by usage_count desc, then name asc; keep top 20
        const sorted = list
          .map(t => ({ id: t.id, name: t.name, usage_count: t.usage_count || 0 }))
          .sort((a, b) => {
            if ((b.usage_count || 0) !== (a.usage_count || 0)) {
              return (b.usage_count || 0) - (a.usage_count || 0)
            }
            return a.name.localeCompare(b.name)
          })
        this.allTags = sorted.slice(0, 20)
        this.isTagsLoaded = true
      } catch (e) {
        console.error('Failed to load tags:', e)
        this.$toast.error('Failed to load tag suggestions')
      } finally {
        this.isLoadingTags = false
      }
    },
    selectExistingTag (tag) {
      if (!tag || typeof tag.id !== 'number') return
      const exists = this.selectedTags.some(t => t.id === tag.id)
      if (!exists) {
        this.selectedTags.push({ id: tag.id, name: tag.name })
      }
      // Keep dropdown open to allow multiple selections
    },
    isTagSelected (id) {
      return this.selectedTags.some(t => t.id === id)
    },

    handleMergeConflict (conflictData) {
      // Show merge interface directly in NewTaskModal
      this.showMergeInterface = true
      this.mergeConflictData = {
        taskId: this.task.id,
        conflictData: conflictData
      }
      
      this.$toast.warning(conflictData.message)
    },

    formatDate (date) {
      if (!date) return null
      return date.toISOString().split('T')[0]
    },

    /** Meeting draft API uses { id, content, …, children }; legacy uses { node, children }. */
    normalizeTreeItemNode (item) {
      if (!item) return null
      if (item.node !== undefined) return item.node
      const { children: _c, ...rest } = item
      return rest
    },

    formatNodesForDisplay (nodes) {
      if (!nodes || nodes.length === 0) return ''

      let formatted = ''

      const formatNodeTree = (nodeItems, indent = '') => {
        nodeItems.forEach(item => {
          const node = this.normalizeTreeItemNode(item)
          if (!node) return
          const counter = node.display_counter || '1'
          const suffix = node.list_style === 'bullet' ? '' : '.'

          // Format the content based on node type
          let content = node.content || ''
          if (node.node_type === 'rich_text' || node.node_type === 'table') {
            // For rich text, keep HTML formatting
            formatted += `${indent}${counter}${suffix} ${content}\n`
          } else {
            // For plain text, just add the content
            formatted += `${indent}${counter}${suffix} ${content}\n`
          }

          // Process children with increased indentation
          if (item.children && item.children.length > 0) {
            formatNodeTree(item.children, indent + '  ')
          }
        })
      }

      formatNodeTree(nodes)
      return formatted.trim()
    },

    formatFlatNodesForDisplay (flatNodes) {
      if (!flatNodes || flatNodes.length === 0) return ''

      let formatted = ''

      // Sort nodes by level and position
      const sortedNodes = [...flatNodes].sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level
        return (a.position || 0) - (b.position || 0)
      })

      sortedNodes.forEach(node => {
        const indent = '  '.repeat((node.level || 1) - 1)
        const counter = node.display_counter || '1'
        const suffix = node.list_style === 'bullet' ? '' : '.'
        const content = node.content || ''

        formatted += `${indent}${counter}${suffix} ${content}\n`
      })

      return formatted.trim()
    },

    flattenTreeStructure (treeData) {
      const flatNodes = []

      const flattenRecursive = (nodeItems) => {
        if (!nodeItems || !nodeItems.length) return
        nodeItems.forEach(item => {
          const node = this.normalizeTreeItemNode(item)
          if (node != null) flatNodes.push(node)
          if (item.children && item.children.length > 0) {
            flattenRecursive(item.children)
          }
        })
      }

      flattenRecursive(treeData)
      return flatNodes
    },

    closeModal () {
      this.$emit('close')
    },

    closeMergeInterface () {
      this.showMergeInterface = false
      this.mergeConflictData = null
    },

    onMergeApplied (mergeResult) {
      // Merge was successfully applied
      this.showMergeInterface = false
      this.mergeConflictData = null
      
      // Refresh the task data and close modal
      this.$emit('save')
      this.$emit('close')
      this.$toast.success('Task updated with merged changes!')
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

.custom-datepicker {
  position: relative;

  color: #111827;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1002;
}

.modal-content {
  background: #ffffff;
  border-radius: 12px;
  width: 94%;
  max-width: 1600px;
  height: 90vh;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
  animation: slideIn 0.25s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.modal-header {
  background: #ffffff;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.modal-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1e40af;
  letter-spacing: -0.01em;
}

.modal-stepper {
  padding: 0.7rem 1.25rem;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  gap: 0.75rem;
}

.step-btn {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.4rem 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.step-btn:hover {
  background: #f3f4f6;
  border-color: #1e40af;
  color: #1e40af;
}

.step-btn.active {
  background: #1e40af;
  border-color: #1e40af;
  color: #ffffff;
}

.step-pill {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  color: #1e40af;
  font-size: 0.78rem;
  font-weight: 700;
}

.step-btn.active .step-pill {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.modal-body {
  padding: 1rem 1.25rem 0.75rem;
  background: #f9fafb;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.modal-footer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  flex-shrink: 0;
}

.modal-footer-left,
.modal-footer-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.modal-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.modal-panel-editor {
  display: flex;
  flex-direction: column;
  min-height: calc(90vh - 295px);
}

.action-editor-shell {
  flex: 1;
  min-height: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.4rem;
  background: #ffffff;
}

.form-group {
  margin-bottom: 1.1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.45rem;
  color: #1f2937;
  font-weight: 600;
  font-size: 0.9rem;
}

.form-control {
  width: 100%;
  padding: 0.68rem 0.9rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #111827;
  transition: all 0.2s ease-in-out;
  background: white;
  position: relative;
  z-index: 1;
}

.form-control:focus {
  outline: none;
  border-color: #06b6d4;
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
}

.btn {
  padding: 0.62rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  cursor: pointer;
}

.btn-primary {
  background: #06b6d4;
  color: white;
  border-color: #06b6d4;
  box-shadow: 0 1px 3px rgba(6, 182, 212, 0.15);
}

.btn-primary:hover:not(:disabled) {
  background: #0891b2;
  border-color: #0891b2;
}

.btn-secondary {
  background: #ffffff;
  color: #2d6a4f;
  border-color: #c6a059;
}

.btn-secondary:hover:not(:disabled) {
  background: #fef9ee;
}

.btn-ghost {
  background: #ffffff;
  color: #334155;
  border-color: #dbe4f0;
}

.btn-ghost:hover:not(:disabled) {
  background: #f8fafc;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-close {
  background: transparent;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #111827;
  border-color: #d1d5db;
}

.tag-input-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.5rem;
}

.tag-input-row .form-control {
  max-width: 360px;
}

.tag-chip-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag-chip {
  background: #eef2ff;
  color: #1e40af;
  border: 1px solid #c7d2fe;
  border-radius: 999px;
  padding: 0.18rem 0.55rem;
  font-size: 0.76rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.tag-chip-remove {
  background: transparent;
  border: none;
  color: #1e40af;
  cursor: pointer;
  font-weight: 700;
}

.form-help-text {
  color: #6b7280;
  font-size: 0.75rem;
}

/* Date picker customization */
.vdp-datepicker input {
  width: 100%;
  padding: 0.375rem 0.75rem;
  border: 1px solid rgba(0, 70, 128, 0.2);
  border-radius: 8px;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 999px;
}
.modal-body::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}


.tag-suggest-dropdown {
  position: relative;
  margin-bottom: 8px;
}
.tag-suggest-list {
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  padding: 4px 0;
  z-index: 5;
}
.tag-suggest-item {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px 12px;
  margin: 0;
  font-size: 13px;
  color: #1f2937;
  cursor: pointer;
}
.tag-suggest-item:hover { background: #f3f4f6; }
.tag-suggest-empty {
  padding: 8px;
  color: #6b7280;
  font-size: 12px;
}
.tag-suggest-item.selected {
  color: #9ca3af;
  background: #fafafa;
  cursor: not-allowed;
}
.tag-suggest-item:disabled {
  color: #9ca3af;
  background: #fafafa;
  cursor: not-allowed;
}

/* Deep overrides: align embedded editor with modern blue/cyan tokens */
:deep(.enhanced-node-editor) {
  border-color: #e5e7eb;
}

:deep(.enhanced-node-editor .editor-toolbar) {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e5e7eb;
}

:deep(.enhanced-node-editor .nodes-container) {
  background: #ffffff;
}

:deep(.enhanced-node-editor .btn.btn-primary) {
  background: #06b6d4;
  border-color: #06b6d4;
  color: #fff;
}

:deep(.enhanced-node-editor .btn.btn-secondary) {
  background: #ffffff;
  color: #6b7280;
  border-color: #e5e7eb;
}

:deep(.enhanced-node-item .action-btn) {
  border: 1px solid #e5e7eb;
  background: transparent;
  color: #64748b;
  border-radius: 6px;
  transition: all 0.2s ease-in-out;
}

:deep(.enhanced-node-item .action-btn:hover) {
  background: #f9fafb;
  color: #111827;
}

:deep(.enhanced-node-item .action-menu),
:deep(.enhanced-node-editor .dropdown-menu) {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

@media (max-width: 900px) {
  .modal-content {
    width: 97%;
    height: 94vh;
  }

  .modal-stepper {
    flex-wrap: wrap;
  }

  .modal-footer {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>

<!--
  Meeting pack hub tints for NewEnhancedNodeItem (parity with NewTentativeDashboard action column).
  Unscoped + .new-task-modal-overlay prefix so we do not affect other uses of the editor.
-->
<style>
.new-task-modal-overlay .enhanced-node-item.meeting-overlay-node {
  position: relative;
  border-radius: 6px;
  padding: 2px 4px;
}
.new-task-modal-overlay .enhanced-node-item.meeting-hub-red {
  background: rgba(254, 202, 202, 0.9) !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}
.new-task-modal-overlay .enhanced-node-item.meeting-hub-green {
  background: rgba(187, 247, 208, 0.9) !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}
.new-task-modal-overlay .enhanced-node-item.meeting-hub-blue {
  background: rgba(191, 219, 254, 0.9) !important;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}
/* Hub row tint wins over .completed background; keep green text from .completed .node-content */
.new-task-modal-overlay .enhanced-node-item.meeting-hub-red.completed {
  background: rgba(254, 202, 202, 0.9) !important;
}
.new-task-modal-overlay .enhanced-node-item.meeting-hub-green.completed {
  background: rgba(187, 247, 208, 0.9) !important;
}
.new-task-modal-overlay .enhanced-node-item.meeting-hub-blue.completed {
  background: rgba(191, 219, 254, 0.9) !important;
}
/* Let outer hub strip show; avoid double-fill from structural reviewer highlight */
.new-task-modal-overlay .enhanced-node-item.has-reviewer.meeting-hub-red > .node-content,
.new-task-modal-overlay .enhanced-node-item.has-reviewer.meeting-hub-green > .node-content,
.new-task-modal-overlay .enhanced-node-item.has-reviewer.meeting-hub-blue > .node-content {
  background-color: transparent !important;
  border-color: transparent !important;
}

/* Keep modal/editor clipping sane so fullscreen and inner scroll remain functional. */
.new-task-modal-overlay .modal-content {
  overflow: hidden !important;
}
.new-task-modal-overlay .modal-panel-editor,
.new-task-modal-overlay .action-editor-shell {
  overflow: hidden !important;
}
/* Non-fullscreen editor scroll area stays internal. */
.new-task-modal-overlay .enhanced-node-editor:not(.editor-fullscreen) .nodes-container {
  max-height: 600px !important;
  overflow-y: auto !important;
  overflow-x: visible !important;
}
.new-task-modal-overlay .enhanced-node-editor:not(.editor-fullscreen) .nodes-container.context-menu-open {
  max-height: 800px !important;
}
</style>
