<template>
  <div class="review-container">
    <!-- Review Header -->
    <div class="review-header">
      <h2>Review: {{ task.description }}</h2>
      <div class="review-controls">
        <button @click="toggleEdit" :class="editEnabled ? 'btn-enabled' : 'btn-disabled'">
          {{ editEnabled ? '🔓 Disable Edit' : '🔒 Enable Edit' }}
        </button>
        <button @click="toggleDiff" class="btn-secondary">
          👁️ {{ showDiff ? 'Hide Diff' : 'Show Diff' }}
        </button>
      </div>
    </div>

    <!-- Diff Legend -->
    <DiffLegend v-if="showDiff" />

    <!-- Enhanced Node Editor with Diff -->
    <EnhancedNodeEditor
      :initial-nodes="reviewNodes"
      :diff-data="diffData"
      :edit-mode="editEnabled"
      :show-diff="showDiff"
      @nodes-changed="onNodesChanged"
    />

    <!-- Review Actions -->
    <div class="review-actions">
      <button @click="approveReview" class="btn-approve">✅ Approve</button>
      <button @click="requestChanges" class="btn-reject">❌ Request Changes</button>
      <button @click="addComment" class="btn-secondary">💬 Add Comment</button>
    </div>
  </div>
</template>

<EnhancedNodeEditor 
  :initial-nodes="reviewNodes"
  :diff-data="diffData"
  :edit-mode="editEnabled"
  :show-diff="showDiff"
  @nodes-changed="onNodesChanged"
/> 