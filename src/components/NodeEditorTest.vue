<template>
  <div class="node-editor-test">
    <div class="test-header">
      <h2>Node Editor Test - NECBDC Task Sample</h2>
      <p>Testing the node-based editor with sample data from the dashboard image</p>
    </div>

    <div class="task-info">
      <h3>Task: North-East Cane and Bamboo Development Council (NECBDC)</h3>
      <p><strong>Sector:</strong> Revising Business Strategy to increase Revenue and Social Impact</p>
      <p><strong>Original Date:</strong> 03.07.24</p>
      <p><strong>Responsibility:</strong> JS (AD)</p>
      <p><strong>Review Date:</strong> 29.01.25</p>
    </div>

    <EnhancedNodeEditor
      :task-version-id="1"
      :initial-nodes="sampleNodes"
      @nodes-changed="onNodesChanged"
    />

    <div class="debug-section" v-if="showDebug">
      <h4>Debug: Current Node Data</h4>
      <pre>{{ JSON.stringify(currentNodes, null, 2) }}</pre>
    </div>

    <div class="test-controls">
      <button @click="showDebug = !showDebug" class="btn btn-secondary">
        {{ showDebug ? 'Hide' : 'Show' }} Debug Data
      </button>
      <button @click="resetToSample" class="btn btn-warning">
        Reset to Sample Data
      </button>
      <button @click="exportNodes" class="btn btn-success">
        Export Nodes JSON
      </button>
      <button @click="debugNodeStructure" class="btn btn-info">
        Debug Structure
      </button>
    </div>
  </div>
</template>

<script>
import EnhancedNodeEditor from './EnhancedNodeEditor.vue'

export default {
  name: 'NodeEditorTest',

  components: {
    EnhancedNodeEditor
  },

  data() {
    return {
      showDebug: false,
      currentNodes: [],
      sampleNodes: [
        {
          node: {
            id: 1,
            content: "Revised presentations held on 23/09, 16/10, 18/12. Following Action Points:",
            level: 1,
            list_style: 'decimal',
            node_type: 'point',
            parent_id: null,
            position: 1,
            review_date: null,
            completed: false,
            display_counter: '1',
            isTemp: false
          },
          children: [
            {
              node: {
                id: 2,
                content: "Stakeholders to visit interested States/Sites and work on the complete value addition plan with NECBDC - (Done)",
                level: 2,
                list_style: 'lower-alpha',
                node_type: 'subpoint',
                parent_id: 1,
                position: 1,
                review_date: null,
                completed: true,
                display_counter: 'a',
                isTemp: false
              },
              children: []
            },
            {
              node: {
                id: 3,
                content: "Buyers to physically visit and interact - All Time Plastic Co. and Amazon - visited the cluster developed by NECBDC and interacted with the artisans.",
                level: 2,
                list_style: 'lower-alpha',
                node_type: 'subpoint',
                parent_id: 1,
                position: 2,
                review_date: null,
                completed: false,
                display_counter: 'b',
                isTemp: false
              },
              children: []
            },
            {
              node: {
                id: 4,
                content: "Comprehensive value chain analysis with role of each stakeholder (GoI, NECBDC, Market Players etc.) clearly and completely defined",
                level: 2,
                list_style: 'lower-alpha',
                node_type: 'subpoint',
                parent_id: 1,
                position: 3,
                review_date: null,
                completed: false,
                display_counter: 'c',
                isTemp: false
              },
              children: []
            }
          ]
        },
        {
          node: {
            id: 5,
            content: "Action items w.r.t. NECBDC presentation held on 15.01.2025",
            level: 1,
            list_style: 'decimal',
            node_type: 'point',
            parent_id: null,
            position: 2,
            review_date: '2025-01-29',
            completed: false,
            display_counter: '2',
            isTemp: false
          },
          children: [
            {
              node: {
                id: 6,
                content: "Bottom to top approach to be followed; Focus on Cluster/SHGs based approach",
                level: 2,
                list_style: 'lower-alpha',
                node_type: 'subpoint',
                parent_id: 5,
                position: 1,
                review_date: '2025-01-29',
                completed: false,
                display_counter: 'a',
                isTemp: false
              },
              children: []
            },
            {
              node: {
                id: 7,
                content: "(i) Common plan (Gantt chart) from ideation to execution between ATP & DoNER, (ii) Expectations/Demand of ATP from DoNER and Expectations/Demand of DoNER from ATP",
                level: 2,
                list_style: 'lower-alpha',
                node_type: 'subpoint',
                parent_id: 5,
                position: 2,
                review_date: '2025-01-29',
                completed: false,
                display_counter: 'b',
                isTemp: false
              },
              children: []
            },
            {
              node: {
                id: 8,
                content: "(i)Common plan (Gantt chart) from ideation to execution between Amazon & DoNER, (ii) Expectations/Demand of Amazon from DoNER and Expectations/Demand of DoNER from Amazon",
                level: 2,
                list_style: 'lower-alpha',
                node_type: 'subpoint',
                parent_id: 5,
                position: 3,
                review_date: '2025-01-29',
                completed: false,
                display_counter: 'c',
                isTemp: false
              },
              children: []
            }
          ]
        }
      ]
    }
  },

  created() {
    this.currentNodes = JSON.parse(JSON.stringify(this.sampleNodes))
  },

  methods: {
    onNodesChanged(newNodes) {
      this.currentNodes = newNodes
      console.log('Nodes changed:', newNodes)
    },

    resetToSample() {
      this.currentNodes = JSON.parse(JSON.stringify(this.sampleNodes))
      // Force re-initialization of NodeEditor
      this.$nextTick(() => {
        this.$forceUpdate()
      })
    },

    exportNodes() {
      const dataStr = JSON.stringify(this.currentNodes, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'node-structure.json'
      link.click()
      URL.revokeObjectURL(url)
    },

    debugNodeStructure() {
      console.log('Sample Nodes Structure:', this.sampleNodes)
      console.log('Current Nodes Structure:', this.currentNodes)
      
      // Check each node structure
      this.sampleNodes.forEach((item, index) => {
        console.log(`Node ${index}:`, {
          hasNode: !!item.node,
          hasChildren: !!item.children,
          nodeId: item.node ? item.node.id : 'undefined',
          nodeContent: item.node ? item.node.content : 'undefined'
        })
      })
    }
  },

  mounted() {
    // Debug on mount
    this.debugNodeStructure()
  }
}
</script>

<style scoped>
.node-editor-test {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.test-header {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 4px solid #007bff;
}

.test-header h2 {
  color: #333;
  margin-bottom: 8px;
}

.test-header p {
  color: #666;
  margin: 0;
}

.task-info {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.task-info h3 {
  color: #2c3e50;
  margin-bottom: 12px;
  font-size: 1.2em;
}

.task-info p {
  margin: 8px 0;
  color: #555;
}

.debug-section {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 15px;
  margin: 20px 0;
}

.debug-section h4 {
  margin-top: 0;
  color: #495057;
}

.debug-section pre {
  background: white;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  overflow-x: auto;
  font-size: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.test-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  padding: 20px 0;
}

.btn {
  padding: 8px 16px;
  border: 1px solid;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
  border-color: #ffc107;
}

.btn-warning:hover {
  background: #e0a800;
}

.btn-success {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.btn-success:hover {
  background: #218838;
}

.btn-info {
  background: #17a2b8;
  color: white;
  border-color: #17a2b8;
}

.btn-info:hover {
  background: #138496;
}
</style> 