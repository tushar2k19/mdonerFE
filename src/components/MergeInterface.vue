<template>
  <div class="merge-overlay" @click.self="handleOverlayClick">
    <div class="merge-container">
      <!-- Header with merge conflict summary -->
      <div class="merge-header">
        <div class="merge-title">
          <h2>🔀 Merge Conflict Resolution</h2>
          <p class="merge-subtitle">Another editor's changes were approved while you were editing. Review and resolve conflicts below.</p>
        </div>
        <div class="merge-stats">
          <div class="stat-item auto-accepted">
            <span class="stat-count">{{ mergeStats.autoAcceptedCount }}</span>
            <span class="stat-label">Auto-accepted</span>
          </div>
          <div class="stat-item pending">
            <span class="stat-count">{{ mergeStats.userPendingCount }}</span>
            <span class="stat-label">Pending Approval</span>
          </div>
          <div class="stat-item conflict">
            <span class="stat-count">{{ mergeStats.conflictCount }}</span>
            <span class="stat-label">Conflicts</span>
          </div>
          <div class="stat-item decisions">
            <span class="stat-count">{{ mergeStats.decisionsNeeded }}</span>
            <span class="stat-label">Decisions Needed</span>
          </div>
        </div>
        <button class="btn-close-merge" @click="$emit('close')" title="Close merge interface">
          <i class="icon-close">×</i>
        </button>
      </div>

      <!-- Enhanced Legend -->
      <div class="merge-legend">
        <div class="legend-item original">
          <span class="legend-color"></span>
          <span>Original content (auto-accepted)</span>
        </div>
        <div class="legend-item approved">
          <span class="legend-color"></span>
          <span>Already approved changes (auto-accepted)</span>
        </div>
        <div class="legend-item user-pending">
          <span class="legend-color"></span>
          <span>Your new changes (pending approval)</span>
        </div>
        <div class="legend-item conflict">
          <span class="legend-color"></span>
          <span>Conflicts (manual resolution needed)</span>
        </div>
      </div>

      <!-- Single Document View -->
      <div class="merge-document">
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading merge analysis...</p>
        </div>
        <div v-else class="document-container">
          <!-- Debug info -->
          <div v-if="mergedGroups.length === 0" class="debug-info">
            <p>No merge groups found. Debug info:</p>
            <p>Conflicts: {{ conflicts.length }}</p>
            <p>Auto-mergeable: {{ autoMergeableChanges.length }}</p>
            <p>User version: {{ userVersion ? 'Present' : 'Missing' }}</p>
            <p>Approved version: {{ approvedVersion ? 'Present' : 'Missing' }}</p>
          </div>
          
          <!-- Iterate through all merged nodes in order -->
          <div v-for="(group, index) in mergedGroups" :key="`group-${index}`" class="merge-group">
            
            <!-- Regular node (no conflict) -->
            <div v-if="group.type === 'single'" 
                 :class="['merge-node', group.category, group.status]">
              <div class="node-header">
                <div class="node-counter">{{ group.node.display_counter }}{{ group.node.list_style === 'bullet' ? '' : '.' }}</div>
                <div class="node-source">{{ getEnhancedSourceLabel(group) }}</div>
                <div class="node-actions" v-if="group.status === 'pending_approval'">
                  <button @click="acceptNode(group)" class="btn-accept">✓ Accept</button>
                  <button @click="rejectNode(group)" class="btn-reject">✗ Reject</button>
                </div>
                <div class="node-status" v-else>
                  <span :class="`status-${group.status.replace('_', '-')}`">{{ getEnhancedStatusLabel(group.status) }}</span>
                </div>
              </div>
              <div class="node-content" v-html="group.node.content"></div>
              <div v-if="group.node.review_date" class="node-date">{{ formatDate(group.node.review_date) }}</div>
            </div>

            <!-- Conflict group (both versions shown) -->
            <div v-else-if="group.type === 'conflict'" class="conflict-group">
              <div class="conflict-header">
                <h4>⚠️ Conflict: Choose one version</h4>
              </div>
              
              <!-- Your version -->
              <div :class="['merge-node', 'conflict-node', 'user-version', { 'selected': group.userSelected }]" 
                   @click="selectUserVersion(group)">
                <div class="node-header">
                  <div class="node-counter">{{ group.userNode.display_counter }}{{ group.userNode.list_style === 'bullet' ? '' : '.' }}</div>
                  <div class="node-source user-source">Your Version</div>
                  <div class="node-actions">
                    <button @click.stop="chooseUserVersion(group)" 
                            :class="['btn-choose', { 'chosen': group.userSelected }]">
                      {{ group.userSelected ? '✓ Chosen' : 'Choose Mine' }}
                    </button>
                  </div>
                </div>
                <div class="node-content" v-html="group.userNode.content"></div>
                <div v-if="group.userNode.review_date" class="node-date">{{ formatDate(group.userNode.review_date) }}</div>
              </div>

              <!-- Their version -->
              <div :class="['merge-node', 'conflict-node', 'approved-version', { 'selected': group.approvedSelected }]" 
                   @click="selectApprovedVersion(group)">
                <div class="node-header">
                  <div class="node-counter">{{ group.approvedNode.display_counter }}{{ group.approvedNode.list_style === 'bullet' ? '' : '.' }}</div>
                  <div class="node-source approved-source">Their Version</div>
                  <div class="node-actions">
                    <button @click.stop="chooseApprovedVersion(group)" 
                            :class="['btn-choose', { 'chosen': group.approvedSelected }]">
                      {{ group.approvedSelected ? '✓ Chosen' : 'Choose Theirs' }}
                    </button>
                  </div>
                </div>
                <div class="node-content" v-html="group.approvedNode.content"></div>
                <div v-if="group.approvedNode.review_date" class="node-date">{{ formatDate(group.approvedNode.review_date) }}</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="merge-actions">
        <div class="action-group">
          <button @click="$emit('close')" class="btn-cancel">
            Cancel
          </button>
          <button @click="resetMerge" class="btn-reset">
            Reset All
          </button>
        </div>
        <div class="action-group">
          <button @click="acceptAllUserChanges" class="btn-bulk user-bulk">
            Accept All Mine
          </button>
          <button @click="acceptAllApprovedChanges" class="btn-bulk approved-bulk">
            Accept All Theirs
          </button>
          <button @click="applyMerge" 
                  :disabled="!canApplyMerge" 
                  class="btn-apply">
            🚀 Apply Merge ({{ resolvedCount }}/{{ totalDecisions }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MergeInterface',
  
  props: {
    conflictData: {
      type: Object,
      required: true
    },
    taskId: {
      type: [String, Number],
      required: true
    }
  },

  data() {
    return {
      baseVersion: null,
      userVersion: null,
      approvedVersion: null,
      mergedGroups: [], // Single ordered list of nodes/conflicts
      mergeSuggestions: [],
      mergeChoices: {},
      
      // Enhanced categorization
      nodeCategorization: {
        original: [],
        auto_approved: [],
        user_only: [],
        conflicts: []
      },
      
      // Legacy fields for backward compatibility
      conflicts: [],
      autoMergeableChanges: [],
      isLoading: false
    }
  },

  computed: {
    mergeStats() {
      return {
        autoAcceptedCount: this.nodeCategorization.original.length + this.nodeCategorization.auto_approved.length,
        userPendingCount: this.nodeCategorization.user_only.length,
        conflictCount: this.nodeCategorization.conflicts.length,
        decisionsNeeded: this.nodeCategorization.user_only.length + this.nodeCategorization.conflicts.length
      }
    },

    totalDecisions() {
      return this.mergedGroups.filter(g => 
        g.type === 'conflict' || g.status === 'pending_approval'
      ).length
    },

    resolvedCount() {
      return this.mergedGroups.filter(g => 
        (g.type === 'conflict' && (g.userSelected || g.approvedSelected)) ||
        (g.type === 'single' && ['accepted', 'rejected'].includes(g.status))
      ).length
    },

    canApplyMerge() {
      // All conflicts must be resolved and all pending nodes accepted/rejected
      return this.mergedGroups.every(group => {
        if (group.type === 'conflict') {
          return group.userSelected || group.approvedSelected
        } else if (group.status === 'pending_approval') {
          return false // Still needs decision
        }
        return true
      })
    }
  },

  async created() {
    await this.loadMergeAnalysis()
    this.buildMergedDocument()
  },

  methods: {
    async loadMergeAnalysis() {
      this.isLoading = true
      try {
        console.log('Loading enhanced merge analysis for task:', this.taskId)
        const response = await this.$http.secured.get(`/task/${this.taskId}/merge_analysis`)
        
        console.log('Enhanced merge analysis response:', response.data)
        
        if (response.data.success) {
          const data = response.data.data
          this.baseVersion = data.base_version
          this.userVersion = data.current_user_version
          this.approvedVersion = data.latest_approved_version
          
          // Use enhanced categorization
          this.nodeCategorization = data.node_categorization || {
            original: [],
            auto_approved: [],
            user_only: [],
            conflicts: []
          }
          
          // Legacy fields for backward compatibility
          this.conflicts = data.conflicts || []
          this.autoMergeableChanges = data.auto_mergeable_changes || []
          this.mergeSuggestions = data.merge_suggestions || []
          
          console.log('Loaded enhanced merge data:', {
            baseVersion: this.baseVersion,
            userVersion: this.userVersion,
            approvedVersion: this.approvedVersion,
            categorization: {
              original: this.nodeCategorization.original.length,
              auto_approved: this.nodeCategorization.auto_approved.length,
              user_only: this.nodeCategorization.user_only.length,
              conflicts: this.nodeCategorization.conflicts.length
            }
          })
        } else {
          console.error('Merge analysis failed:', response.data)
          this.$toast.error(response.data.message || 'Failed to load merge analysis')
        }
      } catch (error) {
        console.error('Error loading merge analysis:', error)
        this.$toast.error('Failed to load merge analysis: ' + error.message)
      } finally {
        this.isLoading = false
      }
    },

    buildMergedDocument() {
      console.log('Building enhanced merged document...')
      this.mergedGroups = []
      
      // Use the enhanced categorization from backend
              const { original, auto_approved: autoApproved, user_only: userOnly, conflicts } = this.nodeCategorization
      
      console.log('Enhanced categorization:', {
        original: original.length,
        autoApproved: autoApproved.length,
        userOnly: userOnly.length,
        conflicts: conflicts.length
      })

      // Combine all nodes for sorting by position
      const allItems = []
      
      // Add original nodes (auto-accepted, no color)
      original.forEach((item, index) => {
        allItems.push({
          type: 'single',
          node: item.node,
          source: 'original',
          status: 'auto_accepted',
          category: 'original',
          sortKey: this.getSortKey(item.node),
          id: `original-${index}`
        })
      })
      
      // Add auto-approved nodes (blue, auto-accepted)
      autoApproved.forEach((item, index) => {
        allItems.push({
          type: 'single',
          node: item.node,
          source: item.source || 'approved_editor',
          status: 'auto_accepted',
          category: 'auto_approved',
          sortKey: this.getSortKey(item.node),
          id: `auto_approved-${index}`
        })
      })
      
      // Add user-only nodes (green, pending approval)
      userOnly.forEach((item, index) => {
        allItems.push({
          type: 'single',
          node: item.node,
          source: item.source || 'current_user',
          status: 'pending_approval',
          category: 'user_only',
          sortKey: this.getSortKey(item.node),
          id: `user_only-${index}`
        })
      })
      
      // Add conflicts (red, manual resolution)
      conflicts.forEach((conflict, index) => {
        allItems.push({
          type: 'conflict',
          userNode: conflict.user_version,
          approvedNode: conflict.approved_version,
          baseNode: conflict.base_node,
          userSelected: false,
          approvedSelected: false,
          category: 'conflict',
          sortKey: this.getSortKey(conflict.user_version || conflict.approved_version),
          conflictId: `conflict-${index}`,
          id: `conflict-${index}`
        })
      })

      // Sort all items by their position in the document
      allItems.sort((a, b) => {
        const aKey = a.sortKey
        const bKey = b.sortKey
        
        // Sort by level first, then position
        if (aKey.level !== bKey.level) return aKey.level - bKey.level
        return aKey.position - bKey.position
      })

      this.mergedGroups = allItems

      console.log('Enhanced merged groups:', this.mergedGroups.length, {
        single: this.mergedGroups.filter(g => g.type === 'single').length,
        conflicts: this.mergedGroups.filter(g => g.type === 'conflict').length
      })

      // If no groups created, show debug info
      if (this.mergedGroups.length === 0) {
        console.warn('No enhanced merged groups created. Debug info:', {
          nodeCategorization: this.nodeCategorization,
          hasData: Object.values(this.nodeCategorization).some(arr => arr.length > 0)
        })
      }
    },

    getSortKey(node) {
      if (!node) return { level: 999, position: 999 }
      return {
        level: node.level || 1,
        position: node.position || 0
      }
    },

    getEnhancedSourceLabel(group) {
      switch (group.category) {
        case 'original':
          return 'Original'
        case 'auto_approved':
          return group.source === 'approved_editor' ? 'Already Approved' : 'Auto-approved'
        case 'user_only':
          return 'Your Changes'
        default:
          return 'Unknown'
      }
    },

    getEnhancedStatusLabel(status) {
      switch (status) {
        case 'auto_accepted':
          return 'Auto-accepted'
        case 'pending_approval':
          return 'Pending'
        case 'accepted':
          return 'Accepted'
        case 'rejected':
          return 'Rejected'
        default:
          return status
      }
    },

    extractNodesFromVersion(version) {
      if (!version) {
        console.warn('Version is null/undefined')
        return []
      }
      
      // Handle different data structures from backend
      let nodes = []
      
      if (version.nodes && Array.isArray(version.nodes)) {
        // Tree structure: [{ node: {...}, children: [...] }]
        const flattenNodes = (nodeTree) => {
          const result = []
          nodeTree.forEach(item => {
            if (item.node) {
              result.push(item.node)
              if (item.children && item.children.length > 0) {
                result.push(...flattenNodes(item.children))
              }
            } else if (item.id) {
              // Direct node object
              result.push(item)
            }
          })
          return result
        }
        nodes = flattenNodes(version.nodes)
      } else if (version.all_action_nodes && Array.isArray(version.all_action_nodes)) {
        // Flat structure: all_action_nodes array
        nodes = version.all_action_nodes
      } else {
        console.warn('Unknown version structure:', version)
      }
      
      console.log(`Extracted ${nodes.length} nodes from version`)
      return nodes
    },

    findNodeInConflicts(node) {
      const conflict = this.conflicts.find(c => 
        (c.user_version && c.user_version.id === node.id) || 
        (c.approved_version && c.approved_version.id === node.id)
      )
      return conflict ? this.getConflictKey(conflict) : null
    },

    getConflictKey(conflict) {
      return `conflict-${conflict.base_node ? conflict.base_node.id : 'new'}`
    },

    getNodeStatus(node, source) {
      // Check if it's auto-mergeable
      if (this.autoMergeableChanges.some(change => change.id === node.id)) {
        return 'auto'
      }
      
      // Check if it's a new addition that needs approval
      const baseNodes = this.extractNodesFromVersion(this.baseVersion)
      const existsInBase = baseNodes.some(baseNode => baseNode.id === node.id)
      
      if (!existsInBase) {
        return 'pending' // New node needs approval
      }
      
      return 'accepted' // Existing node, auto-accept
    },

    getDiffClass(node) {
      const baseNodes = this.extractNodesFromVersion(this.baseVersion)
      const existsInBase = baseNodes.some(baseNode => baseNode.id === node.id)
      
      if (!existsInBase) {
        return 'added'
      }
      
      // Check if modified
      const baseNode = baseNodes.find(baseNode => baseNode.id === node.id)
      if (baseNode && baseNode.content !== node.content) {
        return 'modified'
      }
      
      return 'unchanged'
    },

    getSourceLabel(source) {
      switch (source) {
        case 'user': return 'Your Change'
        case 'approved': return 'Their Change'
        case 'auto': return 'Auto-merged'
        default: return 'Unknown'
      }
    },

    getStatusLabel(status) {
      switch (status) {
        case 'accepted': return 'Accepted'
        case 'rejected': return 'Rejected'
        case 'pending': return 'Pending'
        case 'auto': return 'Auto-merged'
        default: return ''
      }
    },

    // Node actions
    acceptNode(group) {
      group.status = 'accepted'
      console.log('Accepted node:', group.node.content)
      this.$forceUpdate()
    },

    rejectNode(group) {
      group.status = 'rejected'
      console.log('Rejected node:', group.node.content)
      this.$forceUpdate()
    },

    // Conflict resolution
    selectUserVersion(group) {
      // Visual selection only
    },

    selectApprovedVersion(group) {
      // Visual selection only
    },

    chooseUserVersion(group) {
      group.userSelected = true
      group.approvedSelected = false
      this.mergeChoices[group.conflictId] = 'user'
    },

    chooseApprovedVersion(group) {
      group.userSelected = false
      group.approvedSelected = true
      this.mergeChoices[group.conflictId] = 'approved'
    },

    // Bulk actions
    acceptAllUserChanges() {
      this.mergedGroups.forEach(group => {
        if (group.type === 'conflict') {
          this.chooseUserVersion(group)
        } else if (group.source === 'user' && group.status === 'pending') {
          group.status = 'accepted'
        }
      })
      this.$forceUpdate()
      this.$toast.success('All your changes accepted!')
    },

    acceptAllApprovedChanges() {
      this.mergedGroups.forEach(group => {
        if (group.type === 'conflict') {
          this.chooseApprovedVersion(group)
        } else if (group.source === 'approved' && group.status === 'pending') {
          group.status = 'accepted'
        }
      })
      this.$forceUpdate()
      this.$toast.success('All their changes accepted!')
    },

    resetMerge() {
      this.mergeChoices = {}
      this.buildMergedDocument()
      this.$toast.info('Merge reset to initial state')
    },

    async applyMerge() {
      if (!this.canApplyMerge) {
        this.$toast.error('Please resolve all conflicts and pending items before applying merge')
        return
      }

      this.isLoading = true
      try {
        // Build final merged nodes
        const finalNodes = []
        
        this.mergedGroups.forEach(group => {
          if (group.type === 'conflict') {
            if (group.userSelected) {
              finalNodes.push(group.userNode)
            } else if (group.approvedSelected) {
              finalNodes.push(group.approvedNode)
            }
          } else if (group.status === 'accepted' || group.status === 'auto') {
            finalNodes.push(group.node)
          }
          // Skip rejected nodes
        })

        const mergeData = {
          merged_action_nodes: finalNodes.map(node => ({
            content: node.content,
            level: node.level,
            list_style: node.list_style,
            node_type: node.node_type,
            position: node.position,
            review_date: node.review_date,
            completed: node.completed
          })),
          merge_choices: this.mergeChoices
        }

        const response = await this.$http.secured.post(`/task/${this.taskId}/apply_merge`, mergeData)
        
        if (response.data.success) {
          this.$toast.success('Merge applied successfully!')
          this.$emit('merge-applied', response.data.data)
          this.$emit('close')
        } else {
          this.$toast.error('Failed to apply merge')
        }
      } catch (error) {
        console.error('Error applying merge:', error)
        this.$toast.error('Error applying merge')
      } finally {
        this.isLoading = false
      }
    },

    formatDate(dateString) {
      if (!dateString) return ''
      return new Date(dateString).toLocaleDateString()
    },

    handleOverlayClick() {
      // Prevent accidental closes
    }
  }
}
</script>

<style scoped>
.merge-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 20px;
}

.merge-container {
  background: white;
  border-radius: 16px;
  width: 95%;
  max-width: 1200px;
  height: 95vh;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.merge-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.merge-title h2 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
}

.merge-subtitle {
  margin: 5px 0 0 0;
  opacity: 0.9;
  font-size: 0.9rem;
}

.merge-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  text-align: center;
  background: rgba(255, 255, 255, 0.15);
  padding: 10px 14px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.stat-count {
  display: block;
  font-size: 1.3rem;
  font-weight: 700;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  opacity: 0.9;
}

.btn-close-merge {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close-merge:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.merge-legend {
  background: #f8f9fa;
  padding: 12px 30px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #333;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-item.original .legend-color {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
}

.legend-item.approved .legend-color {
  background: #dbeafe;
  border: 2px solid #3b82f6;
}

.legend-item.user-pending .legend-color {
  background: #dcfce7;
  border: 2px solid #10b981;
}

.legend-item.conflict .legend-color {
  background: #fef2f2;
  border: 2px solid #ef4444;
}

.merge-document {
  flex: 1;
  overflow: hidden;
  background: #fafafa;
  position: relative;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.debug-info {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  color: #856404;
}

.debug-info p {
  margin: 4px 0;
  font-size: 0.9rem;
}

.document-container {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px 30px;
  /* Ensure scrolling works */
  max-height: calc(100vh - 300px);
  position: relative;
}

.merge-group {
  margin-bottom: 20px;
}

.merge-node {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  margin-bottom: 8px;
}

.merge-node:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.node-counter {
  font-weight: 700;
  color: #333;
  font-size: 0.9rem;
}

.node-source {
  font-size: 0.8rem;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 12px;
  color: white;
}

.user-source {
  background: #2196f3;
}

.approved-source {
  background: #4caf50;
}

.node-actions {
  display: flex;
  gap: 8px;
}

.btn-accept, .btn-reject, .btn-choose {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-accept {
  background: #4caf50;
  color: white;
}

.btn-accept:hover {
  background: #388e3c;
}

.btn-reject {
  background: #f44336;
  color: white;
}

.btn-reject:hover {
  background: #d32f2f;
}

.btn-choose {
  background: #2196f3;
  color: white;
}

.btn-choose:hover {
  background: #1976d2;
}

.btn-choose.chosen {
  background: #4caf50;
}

.node-status {
  font-size: 0.8rem;
  font-weight: 600;
}

.status-accepted {
  color: #4caf50;
}

.status-rejected {
  color: #f44336;
}

.status-auto {
  color: #9c27b0;
}

.node-content {
  font-size: 0.95rem;
  line-height: 1.5;
  color: #333;
  margin-bottom: 8px;
}

.node-date {
  font-size: 0.8rem;
  color: #666;
  margin-top: 8px;
}

/* Enhanced category styling */
.merge-node.original {
  border-color: #e2e8f0;
  background: #f8fafc;
}

.merge-node.auto_approved {
  border-color: #3b82f6;
  background: #dbeafe;
}

.merge-node.user_only {
  border-color: #10b981;
  background: #dcfce7;
}

.merge-node.conflict {
  border-color: #ef4444;
  background: #fef2f2;
}

/* Status styling */
.merge-node.auto_accepted {
  opacity: 0.8;
}

.merge-node.pending_approval {
  border-width: 3px;
  box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.2);
}

/* Conflict styling */
.conflict-group {
  border: 2px solid #f44336;
  border-radius: 8px;
  padding: 16px;
  background: #ffebee;
  margin-bottom: 16px;
}

.conflict-header {
  margin-bottom: 16px;
}

.conflict-header h4 {
  margin: 0;
  color: #d32f2f;
  font-size: 1rem;
}

.conflict-node {
  cursor: pointer;
  margin-bottom: 12px;
}

.conflict-node.selected {
  border-color: #2196f3;
  background: #e3f2fd;
}

.conflict-node:last-child {
  margin-bottom: 0;
}

.merge-actions {
  background: white;
  border-top: 1px solid #e9ecef;
  padding: 16px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.action-group {
  display: flex;
  gap: 12px;
}

.btn-cancel, .btn-reset, .btn-bulk, .btn-apply {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #6c757d;
  color: white;
}

.btn-cancel:hover {
  background: #5a6268;
}

.btn-reset {
  background: #ffc107;
  color: #333;
}

.btn-reset:hover {
  background: #e0a800;
}

.btn-bulk.user-bulk {
  background: #2196f3;
  color: white;
}

.btn-bulk.user-bulk:hover {
  background: #1976d2;
}

.btn-bulk.approved-bulk {
  background: #4caf50;
  color: white;
}

.btn-bulk.approved-bulk:hover {
  background: #388e3c;
}

.btn-apply {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-apply:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-apply:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Scrollbar styling */
.document-container::-webkit-scrollbar {
  width: 8px;
}

.document-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.document-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.document-container::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Responsive design */
@media (max-width: 768px) {
  .merge-legend {
    flex-direction: column;
    gap: 12px;
  }
  
  .merge-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .action-group {
    justify-content: center;
  }
  
  .node-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style> 