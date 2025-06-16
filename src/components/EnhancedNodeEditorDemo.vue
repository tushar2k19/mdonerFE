<template>
  <div class="demo-container">
    <div class="demo-header">
      <h1>Enhanced Node Editor Demo</h1>
      <p>This demo showcases all the new features including rich text, proper list styling, correct counter increments, proper indentation levels, and table support.</p>
    </div>

    <div class="demo-features">
      <h2>New Features:</h2>
      <ul>
        <li>✅ <strong>Rich Text Support</strong> - Bold, italic, underline, colors, background colors</li>
        <li>✅ <strong>Proper List Styling</strong> - Dropdown to choose between decimal (1,2,3), alphabetic (a,b,c), roman (i,ii,iii), and bullet (•) lists</li>
        <li>✅ <strong>Correct Counter Increments</strong> - Counters properly increment (1→2→3, a→b→c, i→ii→iii)</li>
        <li>✅ <strong>Proper Indentation Levels</strong> - Level 1, 2, 3+ with correct visual indentation</li>
        <li>✅ <strong>Table Support</strong> - Create and edit tables with add row/column functionality</li>
        <li>✅ <strong>Enhanced Actions</strong> - Dropdown menu with all actions (add point, subpoint, move, duplicate, delete)</li>
      </ul>
    </div>

    <div class="demo-instructions">
      <h3>How to Test:</h3>
      <ol>
        <li><strong>Add Items:</strong> Click "Add Item" dropdown and choose different list styles</li>
        <li><strong>Rich Text:</strong> Choose "Rich Text" from dropdown, then use toolbar for formatting</li>
        <li><strong>Tables:</strong> Choose "Table" from dropdown, then use toolbar to add rows/columns</li>
        <li><strong>Subpoints:</strong> Click the "⋮" menu on any item and select "Add Subpoint"</li>
        <li><strong>Same Level:</strong> Click "⋮" menu and select "Add Point (Same Level)"</li>
        <li><strong>Move Items:</strong> Use "Move Up" and "Move Down" from the "⋮" menu</li>
        <li><strong>Duplicate:</strong> Use "Duplicate" from the "⋮" menu to copy items</li>
      </ol>
    </div>

    <div class="demo-editor">
      <EnhancedNodeEditor
        :initial-nodes="demoNodes"
        @nodes-changed="onNodesChanged"
      />
    </div>

    <div class="demo-output" v-if="showOutput">
      <h3>Current Node Structure:</h3>
      <pre>{{ JSON.stringify(currentNodes, null, 2) }}</pre>
    </div>

    <div class="demo-controls">
      <button @click="showOutput = !showOutput" class="btn btn-secondary">
        {{ showOutput ? 'Hide' : 'Show' }} JSON Output
      </button>
      <button @click="resetDemo" class="btn btn-warning">
        Reset Demo
      </button>
      <button @click="addSampleData" class="btn btn-success">
        Add Sample Data
      </button>
    </div>
  </div>
</template>

<script>
import EnhancedNodeEditor from './EnhancedNodeEditor.vue'

export default {
  name: 'EnhancedNodeEditorDemo',
  
  components: {
    EnhancedNodeEditor
  },

  data() {
    return {
      showOutput: false,
      currentNodes: [],
      demoNodes: []
    }
  },

  methods: {
    onNodesChanged(newNodes) {
      this.currentNodes = newNodes
      console.log('Demo nodes changed:', newNodes)
    },

    resetDemo() {
      this.demoNodes = []
      this.currentNodes = []
    },

    addSampleData() {
      this.demoNodes = [
        {
          id: 1,
          content: "Sample numbered list item",
          level: 1,
          list_style: 'decimal',
          node_type: 'point',
          parent_id: null,
          position: 1,
          review_date: '2025-02-01',
          completed: false,
          display_counter: '1',
          children: [
            {
              id: 2,
              content: "Sample alphabetic subpoint",
              level: 2,
              list_style: 'lower-alpha',
              node_type: 'subpoint',
              parent_id: 1,
              position: 1,
              review_date: null,
              completed: false,
              display_counter: 'a',
              children: [
                {
                  id: 3,
                  content: "Sample roman sub-subpoint",
                  level: 3,
                  list_style: 'lower-roman',
                  node_type: 'subpoint',
                  parent_id: 2,
                  position: 1,
                  review_date: null,
                  completed: false,
                  display_counter: 'i',
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: 4,
          content: "<p>This is a <strong>rich text</strong> item with <em>italic</em> and <span style='color: red;'>colored text</span> and <span style='background-color: yellow;'>highlighted background</span>.</p>",
          level: 1,
          list_style: 'decimal',
          node_type: 'rich_text',
          parent_id: null,
          position: 2,
          review_date: null,
          completed: false,
          display_counter: '2',
          has_rich_formatting: true,
          children: []
        },
        {
          id: 5,
          content: `<table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Task</th>
                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Status</th>
                <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Due Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Sample Task 1</td>
                <td style="border: 1px solid #ddd; padding: 8px;">In Progress</td>
                <td style="border: 1px solid #ddd; padding: 8px;">2025-02-15</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Sample Task 2</td>
                <td style="border: 1px solid #ddd; padding: 8px;">Completed</td>
                <td style="border: 1px solid #ddd; padding: 8px;">2025-01-30</td>
              </tr>
            </tbody>
          </table>`,
          level: 1,
          list_style: 'decimal',
          node_type: 'table',
          parent_id: null,
          position: 3,
          review_date: null,
          completed: false,
          display_counter: '3',
          has_rich_formatting: true,
          children: []
        }
      ]
    }
  }
}
</script>

<style scoped>
.demo-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.demo-header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.demo-header h1 {
  margin: 0 0 1rem 0;
  font-size: 2.5rem;
  font-weight: 700;
}

.demo-header p {
  margin: 0;
  font-size: 1.125rem;
  opacity: 0.9;
}

.demo-features {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.demo-features h2 {
  margin: 0 0 1rem 0;
  color: #374151;
}

.demo-features ul {
  margin: 0;
  padding-left: 1.5rem;
}

.demo-features li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.demo-instructions {
  background: #fffbeb;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  border-left: 4px solid #f59e0b;
}

.demo-instructions h3 {
  margin: 0 0 1rem 0;
  color: #92400e;
}

.demo-instructions ol {
  margin: 0;
  padding-left: 1.5rem;
}

.demo-instructions li {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

.demo-editor {
  margin-bottom: 2rem;
}

.demo-output {
  background: #1f2937;
  color: #f9fafb;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.demo-output h3 {
  margin: 0 0 1rem 0;
  color: #f3f4f6;
}

.demo-output pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  overflow-x: auto;
}

.demo-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover {
  background: #d97706;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
}
</style> 