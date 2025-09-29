<template>
  <div class="modal-overlay"  @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ mode === 'add' ? 'Add Task' : 'Edit Task' }}</h3>
        <button class="btn-close" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
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
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
            <input
              v-model="newTagName"
              type="text"
              class="form-control"
              placeholder="Type a tag and click Add"
              style="max-width:320px;"
              @focus="openTagDropdown"
              @click="openTagDropdown"
              @input="openTagDropdown"
            >
            <button class="btn" @click="addTagByName" style="background:#1e3a8a;color:white;">Add</button>
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
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <span
              v-for="tag in selectedTags"
              :key="tag.id"
              style="background:#eef2ff;color:#1e40af;border:1px solid #c7d2fe;border-radius:12px;padding:2px 8px;font-size:12px;display:inline-flex;align-items:center;gap:6px;"
            >
              {{ tag.name }}
              <button
                @click.prevent="removeTag(tag.id)"
                title="Remove"
                style="background:transparent;border:none;color:#1e40af;cursor:pointer;font-weight:bold;"
              >
                ×
              </button>
            </span>
          </div>

          <small style="color:#6b7280;">Add multiple tags by repeating Add. Use × to remove.</small>
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

        <div class="form-group">
          <label>Action to be Taken</label>
          <!-- <editor
            :api-key="apiKey"
            :init="editorConfig"
            v-model="formData.action_to_be_taken" -->

          <EnhancedNodeEditor
            :task-version-id="taskVersionId"
            :initial-nodes="actionNodes"
            @nodes-changed="onNodesChanged"
          />
        </div>

      </div>

      <div class="modal-footer">
        <button @click="$emit('close')" class="btn">Cancel</button>
        <button @click="saveTask" class="btn btn-primary">Save</button>
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
import EnhancedNodeEditor from './EnhancedNodeEditor.vue'
import MergeInterface from './MergeInterface.vue'
import Datepicker from 'vuejs-datepicker'

export default {
  name: 'TaskModal',

  components: {
    EnhancedNodeEditor,
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
      tagSearch: '',
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

      // Load action nodes if task has a current version
      if (this.task.current_version_id) {
        this.taskVersionId = this.task.current_version_id
        await this.loadActionNodes()
      }

      // Initialize tags when editing existing task
      if (Array.isArray(this.task.tags)) {
        this.selectedTags = this.task.tags.map(t => ({ id: t.id, name: t.name }))
      }
    } else {
      // For new tasks, initialize with empty array
      this.actionNodes = []
      this.taskVersionId = 1 // Temporary ID for new tasks
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
    async loadActionNodes () {
      try {
        const response = await this.$http.secured.get(`/task_versions/${this.taskVersionId}/nodes`)
        if (response.data.success) {
          // Backend returns tree structure: [{ node: {...}, children: [...] }]
          const treeData = response.data.data

          // Convert tree structure to flat array for EnhancedNodeEditor
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
          response = await this.$http.secured.put(`/task/${this.task.id}`, taskData)
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
      // Show merge interface directly in TaskModal
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

    formatNodesForDisplay (nodes) {
      if (!nodes || nodes.length === 0) return ''

      let formatted = ''

      const formatNodeTree = (nodeItems, indent = '') => {
        nodeItems.forEach(item => {
          const node = item.node
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
        nodeItems.forEach(item => {
          // Add the node itself
          flatNodes.push(item.node)

          // Recursively add children
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
.custom-datepicker {
  position: relative;

  color: #1a1a1a;
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
  background: white;
  border-radius: 16px;
  width: 92%;
  max-width: 1650px;
  height: 90vh;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  background: rgba(0, 128, 128, 0.16);
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #040548;
  font-weight: 700;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.modal-body {
  padding: 1.5rem;
  background: linear-gradient(
    to bottom,
    rgba(0, 70, 128, 0.05),
    rgba(0, 54, 102, 0.02)
  );
  flex: 1;
  overflow-y: auto;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: white;
  flex-shrink: 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 500;
  font-size: 0.95rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(0, 70, 128, 0.2);
  border-radius: 8px;
  font-size: 0.95rem;
  color: #1f2937;
  transition: all 0.2s ease;
  background: white;
  position: relative;
  z-index: 1;
}

.form-control:focus {
  outline: none;
  border-color: #004680;
  box-shadow: 0 0 0 3px rgba(0, 70, 128, 0.1);
}

.btn {
  padding: 0.675rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.925rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: #004680;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 70, 128, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: #003666;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 70, 128, 0.3);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-close {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: black;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.btn-close:hover {
  background: black;
  color: white;
  transform: rotate(90deg);
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
  background: rgba(0, 70, 128, 0.05);
  border-radius: 3px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #004680;
  border-radius: 3px;
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

/* Styles for TinyMCE */
:deep(.tox-tinymce) {
  border-radius: 8px !important;
  border-color: rgba(0, 70, 128, 0.2) !important;
}

:deep(.tox-tinymce:focus-within) {
  border-color: #004680 !important;
  box-shadow: 0 0 0 3px rgba(0, 70, 128, 0.1) !important;
}

.tag-suggest-dropdown {
  position: relative;
  margin-bottom: 8px;
}
.tag-suggest-list {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  padding: 6px;
}
.tag-suggest-item {
  display: inline-block;
  margin: 4px;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 14px;
  border: 1px solid #c7d2fe;
  background: #eef2ff;
  color: #1e40af;
  cursor: pointer;
}
.tag-suggest-item:hover { filter: brightness(0.97); }
.tag-suggest-empty {
  padding: 8px;
  color: #6b7280;
  font-size: 12px;
}
.tag-suggest-item.selected {
  opacity: 0.6;
  cursor: not-allowed;
}
.tag-suggest-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
