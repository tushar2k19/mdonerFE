<template>
  <div class="inline-editor-backdrop" @mousedown.self="onBackdropClick">
    <div class="inline-editor-panel" ref="panel" :style="panelStyle">
      <!-- Toolbar -->
      <div class="inline-editor-toolbar" @mousedown.stop>
        <div class="toolbar-section">
          <button @mousedown.prevent="execCmd('bold')" class="ine-btn" title="Bold"><strong>B</strong></button>
          <button @mousedown.prevent="execCmd('italic')" class="ine-btn" title="Italic"><em>I</em></button>
          <button @mousedown.prevent="execCmd('underline')" class="ine-btn" title="Underline"><u>U</u></button>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-section">
          <select @change="execCmd('fontSize', $event.target.value); $event.target.value = ''" class="ine-select" title="Font Size">
            <option value="">Size</option>
            <option value="1">8pt</option>
            <option value="2">10pt</option>
            <option value="3">12pt</option>
            <option value="4">14pt</option>
            <option value="5">16pt</option>
            <option value="6">18pt</option>
            <option value="7">24pt</option>
          </select>

          <select @change="execCmd('fontName', $event.target.value); $event.target.value = ''" class="ine-select ine-select-font" title="Font Family">
            <option value="">Font</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="Calibri">Calibri</option>
          </select>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-section">
          <label class="ine-color-wrap" title="Text Color">
            <span class="ine-color-icon" :style="{ color: fgColor }">A</span>
            <input type="color" :value="fgColor" @input="applyFgColor($event.target.value)" class="ine-color-input">
          </label>
          <label class="ine-color-wrap" title="Background Color">
            <span class="ine-color-icon ine-bg-icon" :style="{ backgroundColor: bgColor }">A</span>
            <input type="color" :value="bgColor" @input="applyBgColor($event.target.value)" class="ine-color-input">
          </label>
        </div>

        <div class="toolbar-spacer"></div>

        <!-- Save / Cancel -->
        <div class="toolbar-section toolbar-actions">
          <button @mousedown.prevent="save" class="ine-action-btn ine-save-btn" :disabled="saving" title="Save changes">
            <span v-if="saving" class="ine-spinner"></span>
            <span v-else>&#10003;</span>
          </button>
          <button @mousedown.prevent="cancel" class="ine-action-btn ine-cancel-btn" :disabled="saving" title="Discard changes">&#10005;</button>
        </div>
      </div>

      <!-- Editable area -->
      <div
        ref="editor"
        contenteditable="true"
        class="inline-editor-content"
        @input="onInput"
        @paste="handlePaste"
        @keydown.ctrl.enter.prevent="save"
        @keydown.meta.enter.prevent="save"
        @keydown.esc.prevent="cancel"
      ></div>
    </div>
  </div>
</template>

<script>
import { hasComplexTable, normalizeComplexTableHtml, sanitizePastedHtml } from '../utils/complexTableNormalizer'

export default {
  name: 'InlineNodeEditor',

  props: {
    nodeContent: { type: String, required: true },
    taskId: { type: [Number, String], required: true },
    nodeId: { type: [Number, String], required: true },
    stableNodeId: { type: String, default: '' },
    anchorRect: { type: Object, default: null }
  },

  data () {
    return {
      saving: false,
      dirty: false,
      fgColor: '#000000',
      bgColor: '#ffffff'
    }
  },

  computed: {
    panelStyle () {
      if (!this.anchorRect) return {}
      const rect = this.anchorRect
      const viewW = window.innerWidth
      const viewH = window.innerHeight
      const panelWidth = Math.min(Math.max(rect.width + 40, 500), viewW - 40)
      let left = rect.left - 20
      if (left + panelWidth > viewW - 20) left = viewW - panelWidth - 20
      if (left < 20) left = 20
      let top = rect.top - 52
      if (top < 10) top = rect.bottom + 8
      const maxHeight = viewH - top - 20
      return {
        position: 'fixed',
        top: top + 'px',
        left: left + 'px',
        width: panelWidth + 'px',
        maxHeight: maxHeight + 'px'
      }
    }
  },

  mounted () {
    this.$nextTick(() => {
      if (this.$refs.editor) {
        this.$refs.editor.innerHTML = this.nodeContent || ''
        this.$refs.editor.focus()
      }
    })
  },

  methods: {
    execCmd (command, value) {
      if (!value && value !== 0) {
        document.execCommand(command, false, null)
      } else {
        document.execCommand(command, false, value)
      }
      this.$refs.editor.focus()
    },

    applyFgColor (color) {
      this.fgColor = color
      this.execCmd('foreColor', color)
    },

    applyBgColor (color) {
      this.bgColor = color
      this.execCmd('backColor', color)
    },

    onInput () {
      this.dirty = true
    },

    handlePaste (event) {
      const clipboardData = event.clipboardData || window.clipboardData
      if (!clipboardData) return

      const pastedHtml = clipboardData.getData('text/html')
      if (pastedHtml && hasComplexTable(pastedHtml)) {
        event.preventDefault()
        const sanitized = sanitizePastedHtml(pastedHtml)
        const normalized = normalizeComplexTableHtml(sanitized)
        document.execCommand('insertHTML', false, normalized)
        this.dirty = true
        return
      }

      this.$nextTick(() => { this.dirty = true })
    },

    async save () {
      if (this.saving) return
      const html = this.$refs.editor ? this.$refs.editor.innerHTML : ''
      this.saving = true
      try {
        await this.$http.secured.put(
          `/meeting_dashboard/tasks/${this.taskId}/nodes/${this.nodeId}`,
          { action_node: { content: html } }
        )
        this.$emit('saved', { taskId: this.taskId })
      } catch (err) {
        console.error('[InlineNodeEditor] save failed:', err)
        const msg = (err.response && err.response.data && (err.response.data.error || err.response.data.errors)) || 'Failed to save node'
        this.$emit('save-error', msg)
        this.saving = false
      }
    },

    cancel () {
      if (this.saving) return
      if (this.dirty && !window.confirm('Discard unsaved changes?')) return
      this.$emit('cancelled')
    },

    onBackdropClick () {
      this.cancel()
    }
  }
}
</script>

<style scoped>
.inline-editor-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.25);
}

.inline-editor-panel {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  z-index: 9001;
}

/* ---- Toolbar ---- */
.inline-editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 3px;
}

.toolbar-divider {
  width: 1px;
  height: 22px;
  background: #cbd5e1;
  margin: 0 4px;
}

.toolbar-spacer {
  flex: 1;
}

/* Buttons */
.ine-btn {
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #334155;
  transition: all 0.15s;
}
.ine-btn:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

/* Selects */
.ine-select {
  height: 28px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  font-size: 11px;
  color: #334155;
  padding: 0 4px;
  cursor: pointer;
  max-width: 75px;
}
.ine-select-font {
  max-width: 110px;
}

/* Color pickers */
.ine-color-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.ine-color-wrap:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}
.ine-color-icon {
  font-weight: 700;
  font-size: 14px;
  pointer-events: none;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ine-bg-icon {
  text-decoration: none;
  padding: 1px 4px;
  border-radius: 2px;
  line-height: 1;
}
.ine-color-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

/* Save / Cancel */
.toolbar-actions {
  gap: 6px;
}
.ine-action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.15s;
}
.ine-save-btn {
  background: #059669;
  color: #fff;
}
.ine-save-btn:hover:not(:disabled) {
  background: #047857;
}
.ine-save-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.ine-cancel-btn {
  background: #dc2626;
  color: #fff;
}
.ine-cancel-btn:hover:not(:disabled) {
  background: #b91c1c;
}

/* Spinner */
.ine-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ine-spin 0.6s linear infinite;
}
@keyframes ine-spin {
  to { transform: rotate(360deg); }
}

/* ---- Editor area ---- */
.inline-editor-content {
  padding: 12px 14px;
  min-height: 80px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  outline: none;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #1e293b;
  word-break: break-word;
}

.inline-editor-content:focus {
  box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.3);
  border-radius: 0 0 7px 7px;
}

/* Inherit table styles inside the editor so pasted tables look right */
.inline-editor-content table {
  border-collapse: collapse;
  width: auto;
  table-layout: auto;
}
.inline-editor-content th,
.inline-editor-content td {
  border: 1px solid #222;
  padding: 4px 6px;
}
.inline-editor-content th {
  background: #f3f4f6;
  font-weight: 600;
}
</style>
