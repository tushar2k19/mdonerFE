<template>
  <div class="diff-legend">
    <div class="legend-header">
      <h4>Change Indicators</h4>
      <p>Colors show what changed between versions</p>
    </div>
    
    <div class="legend-items">
      <div class="legend-item">
        <div class="legend-indicator legend-added"></div>
        <span class="legend-text">Added Content</span>
      </div>
      
      <div class="legend-item">
        <div class="legend-indicator legend-modified"></div>
        <span class="legend-text">Modified Content</span>
      </div>
      
      <div class="legend-item">
        <div class="legend-indicator legend-deleted"></div>
        <span class="legend-text">Deleted Content</span>
      </div>
      
      <div class="legend-item">
        <div class="legend-indicator legend-unchanged"></div>
        <span class="legend-text">Unchanged Content</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DiffLegend'
}
</script>

<style scoped>
.diff-legend {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.legend-header {
  margin-bottom: 12px;
}

.legend-header h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.legend-header p {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.legend-items {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #374151;
}

.legend-indicator {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.legend-added {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.4);
}

.legend-modified {
  background: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.4);
}

.legend-deleted {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
}

.legend-unchanged {
  background: transparent;
  border-color: #e2e8f0;
}

.legend-text {
  font-weight: 500;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .legend-items {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}
</style> 