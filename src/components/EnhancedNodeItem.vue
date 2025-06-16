<template>
  <div class="enhanced-node-item" :class="{ 'completed': node.completed }">
    <!-- Node Content -->
    <div class="node-content" :style="{ paddingLeft: indentLevel + 'px' }">
      <!-- Counter/Marker -->
      <div class="node-marker">
        <span class="counter">{{ node.display_counter }}</span>
        <span class="counter-suffix" v-if="node.list_style !== 'bullet'">.</span>
      </div>

      <!-- Content Editor -->
      <div class="node-editor-container">
        <!-- Rich Text Editor for all nodes (now default) -->
        <div class="rich-text-container">
          <div v-if="!isEditing" @click="startEdit" class="rich-text-display" v-html="node.content"></div>
          <div v-else class="rich-text-editor">
            <!-- Rich Text Toolbar -->
            <div class="rich-toolbar">
              <div class="toolbar-group">
                <button @click="execCommand('bold')" class="toolbar-btn" title="Bold">
                  <strong>B</strong>
                </button>
                <button @click="execCommand('italic')" class="toolbar-btn" title="Italic">
                  <em>I</em>
                </button>
                <button @click="execCommand('underline')" class="toolbar-btn" title="Underline">
                  <u>U</u>
                </button>
              </div>
              
              <div class="toolbar-group">
                <select @change="execCommand('foreColor', $event.target.value)" class="color-picker">
                  <option value="">Text Color</option>
                  <option value="#000000">Black</option>
                  <option value="#ff0000">Red</option>
                  <option value="#00ff00">Green</option>
                  <option value="#0000ff">Blue</option>
                  <option value="#ffff00">Yellow</option>
                  <option value="#ff00ff">Magenta</option>
                  <option value="#00ffff">Cyan</option>
                </select>
                
                <select @change="execCommand('backColor', $event.target.value)" class="color-picker">
                  <option value="">Background</option>
                  <option value="#ffffff">White</option>
                  <option value="#ffff00">Yellow</option>
                  <option value="#00ff00">Green</option>
                  <option value="#ff0000">Red</option>
                  <option value="#0000ff">Blue</option>
                  <option value="#f0f0f0">Light Gray</option>
                </select>
              </div>

              <div class="toolbar-group" v-if="node.node_type === 'table'">
                <button @click="insertTableRow" class="toolbar-btn" title="Add Row">
                  + Row
                </button>
                <button @click="insertTableColumn" class="toolbar-btn" title="Add Column">
                  + Col
                </button>
              </div>

              <div class="toolbar-group">
                <button @click="saveContent" class="toolbar-btn save-btn" title="Save">
                  ✓
                </button>
                <button @click="cancelEdit" class="toolbar-btn cancel-btn" title="Cancel">
                  ✕
                </button>
              </div>
            </div>

            <!-- Editable Content -->
            <div
              ref="richEditor"
              contenteditable="true"
              @input="onContentChange"
              @paste="onContentChange"
              @keyup="onContentChange"
              class="rich-editor"
            ></div>
          </div>
        </div>
      </div>

      <!-- Combined Date & Actions Section -->
      <div class="node-meta-section">
        <!-- Review Date -->
        <div class="node-date">
          <input
            v-if="isEditingDate"
            v-model="editDate"
            @blur="saveDate"
            @keydown.enter="saveDate"
            @keydown.escape="cancelDateEdit"
            type="date"
            class="date-input"
            ref="dateInput"
          />
          <div 
            v-else
            @click="startDateEdit"
            class="date-display"
            :class="{ 'no-date': !node.review_date }"
          >
            {{ formatDate(node.review_date) || 'Set date' }}
          </div>
        </div>

        <!-- Node Actions -->
        <div class="node-actions">
          <div class="action-dropdown" ref="actionDropdown">
            <button @click="toggleActionDropdown" class="action-btn dropdown-toggle">
              ⋮
            </button>
            
            <div v-if="showActionDropdown" class="action-menu">
              <button @click="addPointSameLevel" class="action-item">
                + Add Point (Same Level)
              </button>
              <button @click="addSubpoint" class="action-item">
                → Add Subpoint
              </button>
              <button @click="addTableAtLevel" class="action-item">
                📊 Add Table Here
              </button>
              <div class="action-divider"></div>
              <button @click="toggleCompletion" class="action-item" :class="{ 'completed-item': node.completed }">
                {{ node.completed ? '✓ Mark Incomplete' : '☐ Mark Complete' }}
              </button>
              <div class="action-divider"></div>
              <button @click="moveUp" class="action-item">
                ↑ Move Up
              </button>
              <button @click="moveDown" class="action-item">
                ↓ Move Down
              </button>
              <div class="action-divider"></div>
              <button @click="duplicateNode" class="action-item">
                📋 Duplicate
              </button>
              <button @click="deleteNode" class="action-item delete-item">
                🗑 Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Child Nodes -->
    <div class="node-children" v-if="node.children && node.children.length > 0">
      <EnhancedNodeItem
        v-for="(child, childIndex) in node.children"
        :key="child.id"
        :node="child"
        :siblings="node.children"
        :index="childIndex"
        @update-node="$emit('update-node', $event, arguments[1])"
        @delete-node="$emit('delete-node', $event)"
        @add-subpoint="$emit('add-subpoint', $event)"
        @add-point-same-level="$emit('add-point-same-level', $event, arguments[1], arguments[2])"
        @move-node="$emit('move-node', $event, arguments[1])"
        @duplicate-node="$emit('duplicate-node', $event, arguments[1], arguments[2])"
      />
    </div>

    <!-- Table Creator Modal -->
    <div v-if="showTableModal" class="table-modal-overlay" @click="closeTableModal">
      <div class="table-modal" @click.stop>
        <h4>Add Table to Current Point</h4>
        <div class="table-form">
          <div class="form-group">
            <label>Rows:</label>
            <input v-model.number="tableRows" type="number" min="1" max="20" class="form-input">
          </div>
          <div class="form-group">
            <label>Columns:</label>
            <input v-model.number="tableCols" type="number" min="1" max="10" class="form-input">
          </div>
        </div>
        <div class="table-modal-actions">
          <button @click="closeTableModal" class="btn btn-secondary">Cancel</button>
          <button @click="createTableAtLevel" class="btn btn-primary">Create Table</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EnhancedNodeItem',
  
  props: {
    node: {
      type: Object,
      required: true
    },
    siblings: {
      type: Array,
      required: true
    },
    index: {
      type: Number,
      required: true
    }
  },

  data() {
    return {
      isEditing: false,
      isEditingDate: false,
      editContent: '',
      editDate: '',
      originalContent: '',
      originalDate: '',
      showActionDropdown: false,
      showTableModal: false,
      tableRows: 3,
      tableCols: 3,
      updateTimer: null
    }
  },

  computed: {
    indentLevel() {
      return (this.node.level - 1) * 32 // 32px per level for better visibility
    }
  },

  watch: {
    // Watch for prop changes but only update if user is not currently editing
    'node.content': {
      handler(newContent) {
        if (!this.isEditing && this.$refs.richEditor) {
          this.$refs.richEditor.innerHTML = newContent || '<p>Enter content...</p>'
        }
        if (!this.isEditing) {
          this.editContent = newContent || ''
        }
      },
      immediate: false
    }
  },

  created() {
    // Initialize editContent
    this.editContent = this.node.content || ''
    
    // Auto-focus new empty nodes
    if (!this.node.content && this.node.isTemp) {
      this.$nextTick(() => {
        this.startEdit()
      })
    }
    
    document.addEventListener('click', this.handleClickOutside)
  },

  mounted() {
    // Set initial content in the DOM
    if (this.$refs.richEditor) {
      this.$refs.richEditor.innerHTML = this.node.content || '<p>Enter content...</p>'
    }
  },

  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside)
    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
    }
  },

  methods: {
    startEdit() {
      this.isEditing = true
      this.editContent = this.node.content || '<p>Enter content...</p>'
      this.originalContent = this.node.content || ''
      
      this.$nextTick(() => {
        if (this.$refs.richEditor) {
          this.$refs.richEditor.innerHTML = this.editContent
          this.$refs.richEditor.focus()
          
          // Put cursor at the end
          const range = document.createRange()
          const sel = window.getSelection()
          range.selectNodeContents(this.$refs.richEditor)
          range.collapse(false)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      })
    },

    saveContent() {
      if (this.editContent.trim() !== this.originalContent) {
        const updateData = { 
          content: this.editContent.trim(),
          node_type: this.node.node_type === 'table' ? 'table' : 'rich_text'
        }
        
        this.$emit('update-node', this.node.id, updateData)
      }
      this.isEditing = false
    },

    cancelEdit() {
      this.editContent = this.originalContent
      this.isEditing = false
    },

    startDateEdit() {
      this.isEditingDate = true
      this.editDate = this.node.review_date || ''
      this.originalDate = this.node.review_date || ''
      
      this.$nextTick(() => {
        if (this.$refs.dateInput) {
          this.$refs.dateInput.focus()
        }
      })
    },

    saveDate() {
      if (this.editDate !== this.originalDate) {
        this.$emit('update-node', this.node.id, { review_date: this.editDate })
      }
      this.isEditingDate = false
    },

    cancelDateEdit() {
      this.editDate = this.originalDate
      this.isEditingDate = false
    },

    toggleCompletion() {
      this.$emit('update-node', this.node.id, { completed: !this.node.completed })
    },

    toggleActionDropdown() {
      this.showActionDropdown = !this.showActionDropdown
    },

    handleClickOutside(event) {
      if (this.$refs.actionDropdown && !this.$refs.actionDropdown.contains(event.target)) {
        this.showActionDropdown = false
      }
    },

    addPointSameLevel() {
      this.$emit('add-point-same-level', this.node, this.siblings, this.index)
      this.showActionDropdown = false
    },

    addSubpoint() {
      this.$emit('add-subpoint', this.node)
      this.showActionDropdown = false
    },

    moveUp() {
      this.$emit('move-node', this.node.id, 'up')
      this.showActionDropdown = false
    },

    moveDown() {
      this.$emit('move-node', this.node.id, 'down')
      this.showActionDropdown = false
    },

    duplicateNode() {
      this.$emit('duplicate-node', this.node, this.siblings, this.index)
      this.showActionDropdown = false
    },

    deleteNode() {
      this.$emit('delete-node', this.node.id)
      this.showActionDropdown = false
    },

    addTableAtLevel() {
      this.showTableModal = true
      this.showActionDropdown = false
    },

    closeTableModal() {
      this.showTableModal = false
    },

    createTableAtLevel() {
      const tableContent = this.generateTableHTML(this.tableRows, this.tableCols)
      
      console.log('🔥 Creating table with Vue 2 /deep/ CSS selectors')
      console.log('Table HTML:', tableContent)
      
      // Add table to the current node's content (Solution 1: Mixed Content)
      const currentContent = this.node.content || ''
      const newContent = currentContent + (currentContent ? '<br/><br/>' : '') + tableContent
      
      console.log('Current content:', currentContent)
      console.log('New content with table:', newContent)
      
      // Update the current node with table content and ensure it's rich_text type
      this.$emit('update-node', this.node.id, { 
        content: newContent,
        node_type: 'rich_text' // Allow mixed content in rich_text nodes
      })
      
      console.log('✅ Table creation completed with Vue 2 /deep/ selectors - change detection triggered')
      this.closeTableModal()
    },

    generateTableHTML(rows, cols) {
      let html = '<table style="width: 100%; border-collapse: collapse;">\n'
      
      // Create header row
      html += '  <thead>\n    <tr>\n'
      for (let c = 1; c <= cols; c++) {
        html += `      <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Header ${c}</th>\n`
      }
      html += '    </tr>\n  </thead>\n'
      
      // Create body rows (user wants 'rows' total, so 'rows - 1' body rows)
      html += '  <tbody>\n'
      for (let r = 1; r <= rows - 1; r++) {
        html += '    <tr>\n'
        for (let c = 1; c <= cols; c++) {
          html += `      <td style="border: 1px solid #ddd; padding: 8px;">Cell ${r}-${c}</td>\n`
        }
        html += '    </tr>\n'
      }
      html += '  </tbody>\n</table>'
      
      return html
    },

    // Rich text editor methods
    execCommand(command, value = null) {
      document.execCommand(command, false, value)
      this.$refs.richEditor.focus()
    },

    onContentChange() {
      if (this.$refs.richEditor) {
        const newContent = this.$refs.richEditor.innerHTML
        
        // Only update and emit if content actually changed
        if (newContent !== this.editContent) {
          // Update the reactive data without triggering re-render
          this.editContent = newContent
          
          // Emit change for auto-save/change detection (debounced)
          this.emitContentUpdate()
        }
      }
    },

    emitContentUpdate() {
      // Debounce the update emission to avoid too many rapid updates
      clearTimeout(this.updateTimer)
      this.updateTimer = setTimeout(() => {
        if (this.editContent.trim() !== this.originalContent) {
          const updateData = { 
            content: this.editContent.trim(),
            node_type: this.node.node_type === 'table' ? 'table' : 'rich_text'
          }
          
          this.$emit('update-node', this.node.id, updateData)
          this.originalContent = this.editContent.trim() // Update the reference point
        }
      }, 500) // 500ms debounce - longer to prevent interruption during typing
    },

    insertTableRow() {
      const table = this.$refs.richEditor.querySelector('table')
      if (table) {
        const newRow = table.insertRow()
        const cellCount = table.rows[0].cells.length
        
        for (let i = 0; i < cellCount; i++) {
          const cell = newRow.insertCell()
          cell.style.border = '1px solid #ddd'
          cell.style.padding = '8px'
          cell.textContent = `New Cell ${i + 1}`
        }
        
        // Ensure change detection is triggered
        this.onContentChange()
        console.log('🔄 Table row added - change detection triggered')
      }
    },

    insertTableColumn() {
      const table = this.$refs.richEditor.querySelector('table')
      if (table) {
        for (let i = 0; i < table.rows.length; i++) {
          const cell = table.rows[i].insertCell()
          cell.style.border = '1px solid #ddd'
          cell.style.padding = '8px'
          
          if (i === 0 && table.rows[i].cells[0].tagName === 'TH') {
            cell.outerHTML = '<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">New Header</th>'
          } else {
            cell.textContent = `New Cell`
          }
        }
        
        // Ensure change detection is triggered
        this.onContentChange()
        console.log('🔄 Table column added - change detection triggered')
      }
    },

    autoResize() {
      if (this.$refs.simpleEditor) {
        this.$refs.simpleEditor.style.height = 'auto'
        this.$refs.simpleEditor.style.height = this.$refs.simpleEditor.scrollHeight + 'px'
      }
    },

    formatDate(date) {
      if (!date) return null
      return new Date(date).toLocaleDateString()
    }
  }
}
</script>

<style scoped>
.enhanced-node-item {
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
}

.enhanced-node-item.completed {
  opacity: 0.7;
}

.enhanced-node-item.completed .node-content {
  text-decoration: line-through;
}

.node-content {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: all 0.2s ease;
  min-height: 3rem; /* Ensure adequate height */
}

.node-content:hover {
  background-color: #f9fafb;
  border-color: #e5e7eb;
}

.node-marker {
  display: flex;
  align-items: center;
  min-width: 32px;
  font-weight: 600;
  color: #6b7280;
  font-size: 0.875rem;
}

.counter {
  font-family: monospace;
}

.counter-suffix {
  margin-left: 1px;
}

.node-editor-container {
  flex: 1;
  min-width: 0;
  max-width: calc(100% - 200px); /* Reserve space for date/actions but expand content */
}

/* Rich Text Styles */
.rich-text-container {
  width: 100%;
}

.rich-text-display {
  min-height: 2.5rem;
  padding: 0.75rem;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s ease;
  line-height: 1.6;
  word-wrap: break-word;
}

.rich-text-display:hover {
  border-color: #d1d5db;
}

/* Table styles for display mode - using Vue 2 deep selectors for v-html content */
.rich-text-display /deep/ table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 0.5rem 0 !important;
  display: table !important;
  visibility: visible !important;
  /* Temporary debug styles to make tables super obvious */
  border: 3px solid red !important;
  background-color: yellow !important;
}

.rich-text-display /deep/ table th,
.rich-text-display /deep/ table td {
  border: 2px solid #000 !important;
  padding: 8px !important;
  text-align: left !important;
  display: table-cell !important;
  visibility: visible !important;
  background-color: white !important;
}

.rich-text-display /deep/ table th {
  background-color: #ff0000 !important;
  font-weight: 600 !important;
  color: white !important;
}

.rich-text-display /deep/ table thead {
  display: table-header-group !important;
}

.rich-text-display /deep/ table tbody {
  display: table-row-group !important;
}

.rich-text-display /deep/ table tr {
  display: table-row !important;
}

.rich-text-editor {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}

.rich-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding-right: 0.5rem;
  border-right: 1px solid #e5e7eb;
}

.toolbar-group:last-child {
  border-right: none;
}

.toolbar-btn {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background: #f3f4f6;
}

.toolbar-btn.save-btn {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.toolbar-btn.cancel-btn {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.color-picker {
  padding: 0.25rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
}

.rich-editor {
  min-height: 100px;
  padding: 0.75rem;
  outline: none;
  line-height: 1.5;
}

.rich-editor /deep/ table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 0.5rem 0 !important;
  display: table !important;
  visibility: visible !important;
}

.rich-editor /deep/ table th,
.rich-editor /deep/ table td {
  border: 1px solid #ddd !important;
  padding: 8px !important;
  text-align: left !important;
  display: table-cell !important;
  visibility: visible !important;
}

.rich-editor /deep/ table th {
  background-color: #f2f2f2 !important;
  font-weight: 600 !important;
}

.rich-editor /deep/ table thead {
  display: table-header-group !important;
}

.rich-editor /deep/ table tbody {
  display: table-row-group !important;
}

.rich-editor /deep/ table tr {
  display: table-row !important;
}

/* Simple Text Styles */
.simple-text-container {
  width: 100%;
}

.simple-editor {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease;
}

.simple-editor:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.simple-display {
  min-height: 1.5rem;
  padding: 0.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s ease;
  word-wrap: break-word;
}

.simple-display:hover {
  border-color: #d1d5db;
}

.simple-display.empty-content {
  color: #9ca3af;
  font-style: italic;
}

/* Combined Date & Actions Section */
.node-meta-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 180px;
  justify-content: flex-end;
}

/* Date Styles */
.node-date {
  min-width: 110px;
}

.date-input {
  padding: 0.375rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  outline: none;
}

.date-input:focus {
  border-color: #3b82f6;
}

.date-display {
  padding: 0.375rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.date-display:hover {
  border-color: #d1d5db;
}

.date-display.no-date {
  color: #9ca3af;
  font-style: italic;
}

/* Completion Item Styles */
.action-item.completed-item {
  color: #10b981;
  font-weight: 500;
}

.action-item.completed-item:hover {
  background-color: #f0fdf4;
}

/* Actions Styles */
.node-actions {
  position: relative;
}

.action-dropdown {
  position: relative;
}

.action-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.action-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.action-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  min-width: 200px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  margin-top: 0.25rem;
  padding: 0.5rem 0;
}

.action-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  gap: 0.5rem;
  transition: background-color 0.2s ease;
}

.action-item:hover {
  background-color: #f3f4f6;
}

.action-item.delete-item {
  color: #ef4444;
}

.action-item.delete-item:hover {
  background-color: #fef2f2;
}

.action-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 0.25rem 0;
}

/* Children Styles */
.node-children {
  margin-top: 0.5rem;
}

/* Table Modal Styles */
.table-modal-overlay {
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
  z-index: 1000;
}

.table-modal {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  min-width: 300px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.table-modal h4 {
  margin: 0 0 1rem 0;
  color: #374151;
}

.table-form {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.table-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}
</style> 