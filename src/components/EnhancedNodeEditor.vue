<template>
  <div class="enhanced-node-editor">
    <!-- Toolbar -->
    <div class="editor-toolbar">
      <div class="toolbar-section">
        <h4>Action Items</h4>
      </div>
      
      <div class="toolbar-section" v-if="!readonly">
        <!-- Add Node Dropdown -->
        <div class="dropdown" ref="addDropdown">
          <button @click="toggleAddDropdown" class="btn btn-primary dropdown-toggle">
            <i class="fas fa-plus"></i> Add Item
            <i class="fas fa-chevron-down"></i>
          </button>
          <div v-if="showAddDropdown" class="dropdown-menu">
            <div class="dropdown-section">
              <h6>List Style</h6>
              <button @click="addNode('decimal')" class="dropdown-item">
                <span class="preview">1. 2. 3.</span> Numbered List
              </button>
              <button @click="addNode('lower-alpha')" class="dropdown-item">
                <span class="preview">a. b. c.</span> Alphabetic List
              </button>
              <button @click="addNode('lower-roman')" class="dropdown-item">
                <span class="preview">i. ii. iii.</span> Roman List
              </button>
              <button @click="addNode('bullet')" class="dropdown-item">
                <span class="preview">• • •</span> Bullet List
              </button>
            </div>
          </div>
        </div>

        <!-- Other Controls -->
        <button @click="sortByDate" class="btn btn-secondary">
          <i class="fas fa-sort"></i> Sort by Date
        </button>
      </div>
    </div>

    <!-- Nodes Container -->
    <div class="nodes-container" 
         :class="{ 'context-menu-open': contextMenuOpen }"
         v-if="nodes.length > 0"
         ref="nodesContainer">
          <EnhancedNodeItem
            v-for="(node, index) in nodes"
            :key="node.id"
            :node="node"
            :siblings="nodes"
            :index="index"
            :show-diff="showDiff"
            :diff-data="diffData"
            :readonly="!canEditNode(node)"
            :task-version-id="taskVersionId"
            :permission-mode="permissionMode"
            :current-reviewer-id="currentReviewerId"
            :reviewer-type="reviewerType"
            :assigned-node-ids="assignedNodeIds"
            @update-node="updateNode"
            @delete-node="deleteNode"
            @add-subpoint="addSubpoint"
            @add-parent-level-point="addParentLevelPoint"
            @add-point-same-level="addPointSameLevel"
            @move-node="moveNode"
            @duplicate-node="duplicateNode"
            @reorder-nodes="handleReorderNodes"
            @reviewer-assigned="onReviewerAssigned"
            @context-menu-opened="handleContextMenuToggle"
          />
    </div>

    <div class="empty-state" v-else>
      <div class="empty-icon">
        <i class="fas fa-list"></i>
      </div>
      <h5>No action items yet</h5>
      <p v-if="!readonly">Click "Add Item" to create your first action point</p>
      <p v-else>No action items to display</p>
    </div>

    <!-- Changes Indicator -->
    <div class="editor-footer" v-if="hasChanges && !readonly">
      <div class="changes-indicator">
        <i class="fas fa-exclamation-triangle"></i>
        You have unsaved changes
      </div>
    </div>


  </div>
</template>

<script>
import EnhancedNodeItem from './EnhancedNodeItem.vue'

export default {
  name: 'EnhancedNodeEditor',
  
  components: {
    EnhancedNodeItem
  },

  props: {
    taskVersionId: {
      type: [Number, String],
      required: false
    },
    initialNodes: {
      type: Array,
      default: () => []
    },
    readonly: {
      type: Boolean,
      default: false
    },
    currentReviewerId: {
      type: [Number, String],
      default: null
    },
    reviewerType: {
      type: String,
      default: 'task_level' // 'task_level' or 'node_level'
    },
    assignedNodeIds: {
      type: Array,
      default: () => []
    },
    permissionMode: {
      type: Boolean,
      default: false
    },
    showDiff: {
      type: Boolean,
      default: false
    },
    diffData: {
      type: Object,
      default: null
    }
  },

  data() {
    return {
      nodes: [],
      hasChanges: false,
      nextTempId: -1,
      showAddDropdown: false,
      contextMenuOpen: false
    }
  },

  created() {
    this.initializeNodes()
    document.addEventListener('click', this.handleClickOutside)
  },

  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside)
  },

  watch: {
    initialNodes: {
      handler() {
        this.initializeNodes()
      },
      deep: true
    }
  },

  methods: {
    initializeNodes() {
      if (this.initialNodes && Array.isArray(this.initialNodes) && this.initialNodes.length > 0) {
        this.nodes = this.buildHierarchy(this.initialNodes)
        this.updateAllCounters()
      } else {
        this.nodes = []
      }
      this.hasChanges = false
    },

    buildHierarchy(flatNodes) {
      const nodeMap = new Map()
      const rootNodes = []
      
      flatNodes.forEach(node => {
        const enhancedNode = {
          ...node,
          children: []
        }
        nodeMap.set(node.id, enhancedNode)
      })
      
      flatNodes.forEach(node => {
        const enhancedNode = nodeMap.get(node.id)
        
        if (node.parent_id && nodeMap.has(node.parent_id)) {
          const parent = nodeMap.get(node.parent_id)
          parent.children.push(enhancedNode)
        } else {
          rootNodes.push(enhancedNode)
        }
      })
      
      return rootNodes
    },

    toggleAddDropdown() {
      this.showAddDropdown = !this.showAddDropdown
    },

    handleClickOutside(event) {
      if (this.$refs.addDropdown && !this.$refs.addDropdown.contains(event.target)) {
        this.showAddDropdown = false
      }
    },

    addNode(listStyle = 'decimal') {
      const newNode = this.createNode({
        content: '',
        level: 1,
        list_style: listStyle,
        node_type: 'rich_text', // All nodes support mixed content now
        parent_id: null,
        has_rich_formatting: true
      })

      this.nodes.push(newNode)
      this.updateCountersForLevel(this.nodes, 1, listStyle)
      this.showAddDropdown = false
      this.hasChanges = true
      this.emitChange()
    },

    addSubpoint(parentNode) {
      const newLevel = parentNode.level + 1
      const newListStyle = this.getListStyleForLevel(newLevel)
      
      const newNode = this.createNode({
        content: '',
        level: newLevel,
        list_style: newListStyle,
        node_type: 'rich_text', // Support mixed content
        parent_id: parentNode.id,
        has_rich_formatting: true
      })

      if (!parentNode.children) {
        parentNode.children = []
      }
      
      parentNode.children.push(newNode)
      this.updateCountersForLevel(parentNode.children, newLevel, newListStyle)
      this.hasChanges = true
      this.emitChange()
    },

    addPointSameLevel(targetNode, siblings, index) {
      const newNode = this.createNode({
        content: '',
        level: targetNode.level,
        list_style: targetNode.list_style,
        node_type: 'rich_text', // Support mixed content
        parent_id: targetNode.parent_id,
        has_rich_formatting: true
      })

      siblings.splice(index + 1, 0, newNode)
      this.updateCountersForLevel(siblings, targetNode.level, targetNode.list_style)
      this.hasChanges = true
      this.emitChange()
    },

    addParentLevelPoint(childNode) {
      console.log('🎯 addParentLevelPoint called with:', childNode)
      
      // Only works for child nodes (level > 1)
      if (childNode.level <= 1) {
        console.warn('Cannot add parent level point for root nodes')
        return
      }

      console.log('🔍 Finding current node context to insert right after it...')
      
      // Find the current node's context (where it sits in the tree)
      const nodeContext = this.findNodeWithContext(childNode.id)
      
      if (!nodeContext || !nodeContext.siblings) {
        console.error('❌ Could not find current node context')
        return
      }

      const { node, siblings, index } = nodeContext
      
      console.log('✅ Found current node context:', {
        currentNode: node.content,
        currentLevel: node.level,
        currentIndex: index,
        siblingsCount: siblings.length
      })

      // Calculate parent level (one level up from current node)
      const parentLevel = node.level - 1
      const parentListStyle = this.getListStyleForLevel(parentLevel)

      console.log('📊 Parent level details:', {
        parentLevel,
        parentListStyle,
        currentLevel: node.level
      })

      // Create new node at parent level (one level up from current node)
      const newNode = this.createNode({
        content: '',
        level: parentLevel,
        list_style: parentListStyle,
        node_type: 'rich_text',
        parent_id: node.parent_id, // Same parent_id as current node initially
        has_rich_formatting: true
      })

      console.log('🆕 Created new node:', {
        id: newNode.id,
        level: newNode.level,
        list_style: newNode.list_style,
        parent_id: newNode.parent_id
      })

      // CORE LOGIC: Insert the new node RIGHT AFTER the current node
      const insertIndex = index + 1
      console.log(`📍 Inserting at index ${insertIndex} (right after current node)`)
      
      siblings.splice(insertIndex, 0, newNode)
      
      console.log(`✅ Inserted! New siblings length: ${siblings.length}`)
      
      // Update counters for all affected levels
      this.updateAllCounters()
      this.hasChanges = true
      this.emitChange()
      
      console.log('🎯 Successfully added parent level point:', {
        childLevel: childNode.level,
        newNodeLevel: newNode.level,
        insertedAfterCurrentNode: true,
        newNodeId: newNode.id
      })
    },

    duplicateNode(node, siblings, index) {
      const duplicatedNode = this.createNode({
        content: node.content,
        level: node.level,
        list_style: node.list_style,
        node_type: node.node_type,
        parent_id: node.parent_id,
        has_rich_formatting: node.has_rich_formatting,
        review_date: node.review_date
      })

      if (node.children && node.children.length > 0) {
        duplicatedNode.children = this.duplicateChildren(node.children, duplicatedNode.id)
      }

      siblings.splice(index + 1, 0, duplicatedNode)
      this.updateCountersForLevel(siblings, node.level, node.list_style)
      this.hasChanges = true
      this.emitChange()
    },

    duplicateChildren(children, newParentId) {
      return children.map(child => {
        const duplicatedChild = this.createNode({
          content: child.content,
          level: child.level,
          list_style: child.list_style,
          node_type: child.node_type,
          parent_id: newParentId,
          has_rich_formatting: child.has_rich_formatting,
          review_date: child.review_date
        })

        if (child.children && child.children.length > 0) {
          duplicatedChild.children = this.duplicateChildren(child.children, duplicatedChild.id)
        }

        return duplicatedChild
      })
    },

    updateNode(nodeId, updates) {
      console.log('🔧 updateNode called', { nodeId, updates })
      
      const node = this.findNode(nodeId)
      if (node) {
        console.log('🔧 Found node:', node)
        console.log('🔧 Node content before update:', node.content)
        
        // Use Vue.set for reactive updates
        Object.keys(updates).forEach(key => {
          console.log(`🔧 Setting ${key} to:`, updates[key])
          this.$set(node, key, updates[key])
        })
        
        console.log('🔧 Node content after update:', node.content)
        
        // Force reactivity check
        this.$nextTick(() => {
          console.log('🔧 In nextTick - node content:', node.content)
          // Force a re-render by updating a dummy property
          this.$set(node, '_lastUpdate', Date.now())
        })
        
        this.hasChanges = true
        this.emitChange()
      } else {
        console.error('❌ Node not found for ID:', nodeId)
      }
    },

    deleteNode(nodeId) {
      if (confirm('Are you sure you want to delete this item and all its sub-items?')) {
        const result = this.removeNode(nodeId, this.nodes)
        if (result) {
          this.updateAllCounters()
          this.hasChanges = true
          this.emitChange()
        }
      }
    },

    moveNode(nodeId, direction) {
      const { node, siblings, index } = this.findNodeWithContext(nodeId)
      if (!node || !siblings) return

      let newIndex = index
      if (direction === 'up' && index > 0) {
        newIndex = index - 1
      } else if (direction === 'down' && index < siblings.length - 1) {
        newIndex = index + 1
      } else {
        return
      }

      siblings.splice(index, 1)
      siblings.splice(newIndex, 0, node)
      
      this.updateCountersForLevel(siblings, node.level, node.list_style)
      this.hasChanges = true
      this.emitChange()
    },

    sortByDate() {
      this.sortNodesByDate(this.nodes)
      this.updateAllCounters()
      this.hasChanges = true
      this.emitChange()
    },

    sortNodesByDate(nodes) {
      nodes.sort((a, b) => {
        const dateA = a.review_date ? new Date(a.review_date) : new Date('9999-12-31')
        const dateB = b.review_date ? new Date(b.review_date) : new Date('9999-12-31')
        return dateA - dateB
      })

      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          this.sortNodesByDate(node.children)
        }
      })
    },

    createNode(nodeData) {
      return {
        id: this.nextTempId--,
        content: nodeData.content || '',
        level: nodeData.level || 1,
        list_style: nodeData.list_style || 'decimal',
        node_type: nodeData.node_type || 'rich_text', // Default to rich_text for mixed content support
        parent_id: nodeData.parent_id || null,
        review_date: nodeData.review_date || null,
        completed: nodeData.completed || false,
        position: 1,
        display_counter: '1',
        has_rich_formatting: nodeData.has_rich_formatting || true, // Enable rich formatting by default
        children: [],
        isTemp: true
      }
    },

    getListStyleForLevel(level) {
      switch (level) {
        case 1: return 'decimal'
        case 2: return 'lower-alpha'
        case 3: return 'lower-roman'
        default: return 'bullet'
      }
    },

    updateAllCounters() {
      this.updateCountersRecursive(this.nodes)
    },

    updateCountersRecursive(nodes) {
      const styleGroups = {}
      
      nodes.forEach((node, index) => {
        if (!styleGroups[node.list_style]) {
          styleGroups[node.list_style] = []
        }
        styleGroups[node.list_style].push({ node, index })
      })

      Object.keys(styleGroups).forEach(listStyle => {
        const group = styleGroups[listStyle]
        group.forEach((item, groupIndex) => {
          const position = groupIndex + 1
          item.node.position = position
          item.node.display_counter = this.generateDisplayCounter(listStyle, position)
        })
      })

      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          this.updateCountersRecursive(node.children)
        }
      })
    },

    updateCountersForLevel(nodes, level, listStyle) {
      const nodesAtLevel = nodes.filter(node => node.level === level && node.list_style === listStyle)
      
      nodesAtLevel.forEach((node, index) => {
        const position = index + 1
        node.position = position
        node.display_counter = this.generateDisplayCounter(listStyle, position)
      })
    },

    generateDisplayCounter(listStyle, position) {
      switch (listStyle) {
        case 'decimal':
          return position.toString()
        case 'lower-alpha':
          return String.fromCharCode(96 + position)
        case 'lower-roman':
          return this.toRoman(position).toLowerCase()
        case 'bullet':
          return '•'
        default:
          return position.toString()
      }
    },

    toRoman(num) {
      const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
      const literals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
      
      let roman = ''
      for (let i = 0; i < values.length; i++) {
        while (num >= values[i]) {
          roman += literals[i]
          num -= values[i]
        }
      }
      return roman
    },

    findNode(nodeId, nodes = this.nodes) {
      for (const node of nodes) {
        if (node.id === nodeId) {
          return node
        }
        if (node.children && node.children.length > 0) {
          const found = this.findNode(nodeId, node.children)
          if (found) return found
        }
      }
      return null
    },

    findNodeWithContext(nodeId, nodes = this.nodes) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.id === nodeId) {
          return { node, siblings: nodes, index: i }
        }
        if (node.children && node.children.length > 0) {
          const found = this.findNodeWithContext(nodeId, node.children)
          if (found.node) return found
        }
      }
      return { node: null, siblings: null, index: -1 }
    },

    findParentContext(childNode, nodes = this.nodes, parentSiblings = null, parentIndex = -1) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        
        // Check if this node has the child we're looking for
        if (node.children && node.children.some(child => child.id === childNode.id)) {
          return { 
            parentNode: node, 
            parentSiblings: parentSiblings || this.nodes, 
            parentIndex: parentIndex >= 0 ? parentIndex : i 
          }
        }
        
        // Recursively search in children
        if (node.children && node.children.length > 0) {
          const found = this.findParentContext(childNode, node.children, nodes, i)
          if (found.parentNode) return found
        }
      }
      return { parentNode: null, parentSiblings: null, parentIndex: -1 }
    },

    findParentContextAlternative(childNode) {
      console.log('🔍 Alternative search for parent of:', childNode)
      
      // Alternative approach: Search by parent_id if it exists
      if (childNode.parent_id) {
        console.log('🔍 Searching by parent_id:', childNode.parent_id)
        const parentContext = this.findNodeWithContext(childNode.parent_id)
        
        if (parentContext.node) {
          console.log('✅ Found parent by ID:', parentContext.node)
          return {
            parentNode: parentContext.node,
            parentSiblings: parentContext.siblings,
            parentIndex: parentContext.index
          }
        }
      }
      
      // Fallback: Manual traversal with detailed logging
      console.log('🔍 Manual traversal fallback')
      return this.findParentContextManual(childNode, this.nodes, null, -1)
    },

    findParentContextManual(childNode, nodes, parentSiblings = null, parentIndex = -1) {
             console.log('🔍 Manual search in nodes:', nodes.length, 'parent siblings:', (parentSiblings && parentSiblings.length) || 0)
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
                 console.log(`🔍 Checking node ${i}:`, node.id, (node.content && node.content.substring(0, 30)) + '...')
        
        // Check if this node has the child we're looking for
        if (node.children && node.children.length > 0) {
          console.log(`🔍 Node ${i} has ${node.children.length} children`)
          const hasChild = node.children.some(child => {
            console.log(`  🔍 Checking child:`, child.id, 'vs target:', childNode.id)
            return child.id === childNode.id
          })
          
          if (hasChild) {
            console.log('✅ Found parent node:', node)
            return { 
              parentNode: node, 
              parentSiblings: parentSiblings || this.nodes, 
              parentIndex: parentIndex >= 0 ? parentIndex : i 
            }
          }
        }
        
        // Recursively search in children
        if (node.children && node.children.length > 0) {
          const found = this.findParentContextManual(childNode, node.children, nodes, i)
          if (found.parentNode) {
            console.log('✅ Found in recursive search')
            return found
          }
        }
      }
      
      console.log('❌ Manual search failed')
      return { parentNode: null, parentSiblings: null, parentIndex: -1 }
    },

    removeNode(nodeId, nodes) {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === nodeId) {
          nodes.splice(i, 1)
          return true
        }
        if (nodes[i].children && nodes[i].children.length > 0) {
          if (this.removeNode(nodeId, nodes[i].children)) {
            return true
          }
        }
      }
      return false
    },

    getNodesData() {
      return this.flattenNodes(this.nodes)
    },

    flattenNodes(nodes) {
      const result = []
      
      nodes.forEach(node => {
        const flatNode = { ...node }
        delete flatNode.children
        result.push(flatNode)
        
        if (node.children && node.children.length > 0) {
          result.push(...this.flattenNodes(node.children))
        }
      })
      
      return result
    },

    handleReorderNodes(reorderData) {
      const { draggedNodeId, targetNodeId } = reorderData
      
      console.log('🔄 handleReorderNodes called with:', reorderData)
      
      // Find the container (nodes array) that contains both nodes
      const draggedContext = this.findNodeWithContext(draggedNodeId)
      const targetContext = this.findNodeWithContext(targetNodeId)
      
      console.log('🔍 Node contexts found:', {
        draggedContext: {
          found: !!draggedContext.node,
          nodeId: draggedContext.node && draggedContext.node.id,
          actualIndex: draggedContext.index,
          siblingsLength: draggedContext.siblings && draggedContext.siblings.length
        },
        targetContext: {
          found: !!targetContext.node,
          nodeId: targetContext.node && targetContext.node.id,
          actualIndex: targetContext.index,
          siblingsLength: targetContext.siblings && targetContext.siblings.length
        },
        sameContainer: draggedContext.siblings === targetContext.siblings
      })
      
      if (!draggedContext.node || !targetContext.node) {
        console.error('❌ Could not find nodes for reordering')
        return
      }
      
      // Ensure both nodes are in the same container (same level siblings)
      if (draggedContext.siblings !== targetContext.siblings) {
        console.error('❌ Cannot reorder nodes from different levels')
        return
      }
      
      const siblings = draggedContext.siblings
      const draggedNode = draggedContext.node
      const targetNode = targetContext.node
      
      // Use the actual indices from findNodeWithContext
      const actualDraggedIndex = draggedContext.index
      const actualTargetIndex = targetContext.index
      
      // Skip if trying to drop on itself
      if (draggedNodeId === targetNodeId) {
        console.log('⚠️ Dropped on itself, skipping')
        return
      }
      
      console.log('📊 Reordering details:', {
        actualIndices: { actualDraggedIndex, actualTargetIndex },
        siblingsLength: siblings.length,
        draggedNode: draggedNode.content.substring(0, 30) + '...',
        targetNode: targetNode.content.substring(0, 30) + '...'
      })
      
      // Create a new array with the reordered items
      const newSiblings = [...siblings]
      
      // Remove the dragged node from its current position
      newSiblings.splice(actualDraggedIndex, 1)
      
      // Calculate the new target index (accounting for removal)
      // When dragging down (to higher index), insert after the target
      // When dragging up (to lower index), insert before the target
      let newTargetIndex
      if (actualDraggedIndex < actualTargetIndex) {
        // Dragging down: insert after the target (target position stays same after removal)
        newTargetIndex = actualTargetIndex
      } else {
        // Dragging up: insert before the target
        newTargetIndex = actualTargetIndex
      }
      
      console.log('📍 Final positioning:', {
        removedFromIndex: actualDraggedIndex,
        insertingAtIndex: newTargetIndex,
        newArrayLength: newSiblings.length,
        direction: actualDraggedIndex < actualTargetIndex ? 'down' : 'up'
      })
      
      // Insert the dragged node at the new position
      newSiblings.splice(newTargetIndex, 0, draggedNode)
      
      // Replace the siblings array with the new reordered array
      if (siblings === this.nodes) {
        // Root level nodes - use Vue.set for better reactivity
        this.$set(this, 'nodes', newSiblings)
        console.log('🔄 Updated root nodes array with Vue.set')
      } else {
        // Child nodes - find parent and update with Vue.set
        const parentNode = this.findParentOfSiblings(siblings)
        if (parentNode) {
          this.$set(parentNode, 'children', newSiblings)
          console.log('🔄 Updated parent children array with Vue.set')
        }
      }
      
      // Update counters for the affected level and list style
      this.updateCountersForLevel(newSiblings, draggedNode.level, draggedNode.list_style)
      
      // Force Vue reactivity with nextTick
      this.$nextTick(() => {
        this.$forceUpdate()
        console.log('🔄 Force update completed')
      })
      
      this.hasChanges = true
      this.emitChange()
      
      console.log('✅ Nodes reordered successfully:', {
        draggedNodeId,
        targetNodeId,
        oldIndex: actualDraggedIndex,
        newIndex: newTargetIndex,
        finalLength: newSiblings.length
      })
    },

    findParentOfSiblings(siblings) {
      // Helper method to find which node has this siblings array as its children
      return this.findParentRecursive(siblings, this.nodes)
    },

    findParentRecursive(targetSiblings, nodes) {
      for (const node of nodes) {
        if (node.children === targetSiblings) {
          return node
        }
        if (node.children && node.children.length > 0) {
          const found = this.findParentRecursive(targetSiblings, node.children)
          if (found) return found
        }
      }
      return null
    },

    emitChange() {
      if (!this.readonly) {
        this.$emit('nodes-changed', this.getNodesData())
      }
    },

    // Permission checking methods
    canEditNode(node) {
      if (!this.permissionMode) return !this.readonly
      
      // If not in permission mode, use regular readonly logic
      if (this.readonly) return false
      
      // Get current user info to check if they're an editor
      const currentUser = this.getCurrentUserInfo()
      const isEditor = currentUser && currentUser.role === 'editor'
      
      // DEBUG: Log permission check details
      console.log('🔍 PERMISSION DEBUG for node:', node.id, {
        nodeContent: node.content ? node.content.substring(0, 50) + '...' : 'No content',
        nodeReviewerId: node.reviewer_id,
        currentUserId: currentUser ? currentUser.id : null,
        currentUserRole: currentUser ? currentUser.role : null,
        isEditor: isEditor,
        reviewerType: this.reviewerType,
        assignedNodeIds: this.assignedNodeIds,
        permissionMode: this.permissionMode,
        readonly: this.readonly
      })
      
      // Editors can edit all nodes regardless of reviewer assignment
      if (isEditor) {
        console.log('✅ EDITOR: Can edit all nodes')
        return true
      }
      
      // Convert assigned_node_ids to array if it's a string
      let assignedIds = this.assignedNodeIds
      if (typeof assignedIds === 'string') {
        try {
          assignedIds = JSON.parse(assignedIds)
        } catch (e) {
          console.error('Error parsing assigned_node_ids:', e)
          assignedIds = []
        }
      }
      if (!Array.isArray(assignedIds)) {
        assignedIds = []
      }
      
      console.log('📋 Processed assignedIds:', assignedIds)
      
      // Task-level reviewers can edit ONLY unassigned nodes
      if (this.reviewerType === 'task_level') {
        const canEdit = !node.reviewer_id
        console.log(`🎯 TASK-LEVEL REVIEWER: Node ${node.id} has reviewer_id=${node.reviewer_id}, canEdit=${canEdit}`)
        return canEdit
      }
      
      // Node-level reviewers can only edit their assigned nodes
      if (this.reviewerType === 'node_level') {
        // Check if this node is assigned to the current reviewer
        const currentReviewerId = this.currentReviewerId
        const canEdit = node.reviewer_id && (node.reviewer_id === currentReviewerId)
        console.log(`🎯 NODE-LEVEL REVIEWER: Node ${node.id} has reviewer_id=${node.reviewer_id}, currentReviewerId=${currentReviewerId}, canEdit=${canEdit}`)
        return canEdit
      }
      
      console.log('❌ UNKNOWN REVIEWER TYPE:', this.reviewerType)
      return false
    },

    isNodeAssignedToCurrentReviewer(node) {
      if (!this.permissionMode) return true
      if (this.reviewerType === 'task_level') return !node.reviewer_id // Task-level handles unassigned nodes
      
      // Convert assigned_node_ids to array if it's a string
      let assignedIds = this.assignedNodeIds
      if (typeof assignedIds === 'string') {
        try {
          assignedIds = JSON.parse(assignedIds)
        } catch (e) {
          console.error('Error parsing assigned_node_ids:', e)
          assignedIds = []
        }
      }
      if (!Array.isArray(assignedIds)) {
        assignedIds = []
      }
      
      return assignedIds.includes(node.id)
    },

    // Helper method to get current user info
    getCurrentUserInfo() {
      const userInfoCookie = this.getCookie('user_info')
      if (userInfoCookie) {
        try {
          const decodedCookie = decodeURIComponent(userInfoCookie)
          let parsed = JSON.parse(decodedCookie)
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed)
          }
          return parsed
        } catch (e) {
          console.error('Error parsing user info:', e)
          return null
        }
      }
      return null
    },

    // Helper method to get cookie value
    getCookie(name) {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
      return null
    },

    handleContextMenuToggle(isOpen) {
      this.contextMenuOpen = isOpen
      console.log('🎯 Context menu state changed:', isOpen ? 'opened' : 'closed')
      
      // Adjust container scrolling behavior when context menu is open
      if (this.$refs.nodesContainer) {
        const container = this.$refs.nodesContainer
        if (isOpen) {
          // Temporarily increase container height to accommodate context menu
          container.style.transition = 'max-height 0.3s ease'
          container.style.maxHeight = '800px'
          container.style.overflowY = 'auto'
          
          // Ensure the container can scroll smoothly
          container.style.scrollBehavior = 'smooth'
        } else {
          // Restore original container height
          container.style.maxHeight = '600px'
          container.style.scrollBehavior = 'auto'
        }
      }
    },

    // Handle reviewer assignment from child nodes
    onReviewerAssigned(data) {
      const { nodeId, reviewerId } = data
      
      // Find and update the node in our local data
      const node = this.findNodeById(nodeId)
      if (node) {
        node.reviewer_id = reviewerId
        this.hasChanges = true
        
        // Emit the change to parent component
        this.$emit('nodes-changed', this.getNodesData())
        
        console.log(`✅ Reviewer ${reviewerId} assigned to node ${nodeId}`)
      }
    },

    // Helper method to find a node by ID in the hierarchy
    findNodeById(nodeId) {
      const findInNodes = (nodes) => {
        for (const node of nodes) {
          if (node.id === nodeId) {
            return node
          }
          if (node.children && node.children.length > 0) {
            const found = findInNodes(node.children)
            if (found) return found
          }
        }
        return null
      }
      return findInNodes(this.nodes)
    }
  }
}
</script>

<style scoped>
.enhanced-node-editor {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toolbar-section h4 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.dropdown {
  position: relative;
}

.dropdown-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  min-width: 280px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  margin-top: 0.5rem;
  padding: 0.5rem 0;
  color: #374151;
}

.dropdown-section {
  padding: 0.5rem 0;
}

.dropdown-section h6 {
  margin: 0 0 0.5rem 0;
  padding: 0 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
  letter-spacing: 0.05em;
}

.dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
  gap: 0.75rem;
}

.dropdown-item:hover {
  background-color: #f3f4f6;
}

.dropdown-item .preview {
  font-family: monospace;
  font-size: 0.875rem;
  color: #6b7280;
  min-width: 60px;
}

.dropdown-divider {
  height: 1px;
  background-color: #e5e7eb;
  margin: 0.5rem 0;
}

.btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-primary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}

.nodes-container {
  padding: 1.5rem;
  max-height: 600px;
  overflow-y: auto;
  transition: max-height 0.3s ease;
  position: relative;
  scroll-behavior: smooth;
}

/* Dynamic height adjustment when context menu is open */
.nodes-container.context-menu-open {
  max-height: 800px;
  overflow-y: auto;
  z-index: 1;
}

/* Ensure proper scrolling with context menu */
.nodes-container::-webkit-scrollbar {
  width: 8px;
}

.nodes-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.nodes-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.nodes-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.empty-state {
  padding: 4rem 2rem;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h5 {
  margin: 0 0 0.5rem 0;
  color: #374151;
  font-size: 1.25rem;
  font-weight: 600;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

.editor-footer {
  padding: 1rem 1.5rem;
  background: #fef3cd;
  border-top: 1px solid #fde68a;
}

.changes-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #92400e;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Table Creator Modal */
.table-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.table-modal {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  min-width: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
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
  font-weight: 500;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.table-modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* Global Rich Toolbar */
.global-rich-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-right: 1rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.global-rich-toolbar .toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.global-rich-toolbar .toolbar-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s ease;
}

.global-rich-toolbar .toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.global-rich-toolbar .color-picker {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 4px;
  padding: 0.375rem;
  font-size: 0.75rem;
  cursor: pointer;
}
</style> 