<template>
  <div class="riv-toolbar-row">
    <div class="view-toggle-group view-toggle-group--glass" role="group" aria-label="Compare versions">
      <button
        type="button"
        @click="setView('current')"
        :class="['btn btn-segment', { active: currentViewMode === 'current' }]"
      >
        <i class="fas fa-file-alt" aria-hidden="true" />
        Current
      </button>
      <button
        type="button"
        @click="setView('old')"
        :class="['btn btn-segment', { active: currentViewMode === 'old' }]"
      >
        <i class="fas fa-history" aria-hidden="true" />
        Old
      </button>
      <button
        type="button"
        @click="setView('diff')"
        :class="['btn btn-segment', { active: currentViewMode === 'diff' }]"
      >
        <i class="fas fa-columns" aria-hidden="true" />
        Diff
      </button>
    </div>
    <div class="riv-actions-row riv-hub-actions controls-section">
      <button
        type="button"
        @click="$emit('toggle-edit')"
        class="hub-btn hub-btn-ghost"
        v-if="!isReviewApproved && currentViewMode === 'current'"
      >
        <i :class="editEnabled ? 'fas fa-lock' : 'fas fa-lock-open'" aria-hidden="true" />
        {{ editEnabled ? 'Disable edit' : 'Enable edit' }}
      </button>

      <button
        v-if="!isReviewApproved && currentViewMode !== 'diff'"
        type="button"
        class="hub-btn hub-btn-ghost"
        @click="$emit('toggle-diff-highlights')"
      >
        <i class="fas fa-palette" aria-hidden="true" />
        {{ diffHighlightsEnabled ? 'Disable highlights' : 'Enable highlights' }}
      </button>

      <button
        type="button"
        @click="$emit('toggle-show-text-diff')"
        class="hub-btn hub-btn-ghost"
        v-if="currentViewMode === 'diff'"
      >
        <i class="fas fa-eye" aria-hidden="true" />
        {{ showTextDiff ? 'Hide text diff' : 'Show text diff' }}
      </button>

      <button
        type="button"
        @click="$emit('forward')"
        class="hub-btn hub-btn-primary"
        v-if="canForward && !isReviewApproved"
      >
        <i class="fas fa-paper-plane" aria-hidden="true" />
        Forward review
      </button>
      <button
        type="button"
        @click="$emit('save')"
        class="hub-btn hub-btn-success"
        v-if="hasChanges && !isReviewApproved"
      >
        <i class="fas fa-save" aria-hidden="true" />
        Save changes
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReviewWorkspaceToolbar',

  props: {
    currentViewMode: {
      type: String,
      required: true
    },
    isReviewApproved: {
      type: Boolean,
      default: false
    },
    editEnabled: {
      type: Boolean,
      default: true
    },
    diffHighlightsEnabled: {
      type: Boolean,
      default: true
    },
    showTextDiff: {
      type: Boolean,
      default: true
    },
    canForward: {
      type: Boolean,
      default: false
    },
    hasChanges: {
      type: Boolean,
      default: false
    }
  },

  methods: {
    setView (mode) {
      this.$emit('change-view', mode)
    }
  }
}
</script>

<style scoped>
.riv-toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  width: 100%;
}

.riv-toolbar-row .view-toggle-group {
  flex-shrink: 0;
}

.view-toggle-group {
  display: inline-flex;
  padding: 5px;
  border-radius: 9999px;
}

.view-toggle-group--glass {
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: inset 0 2px 6px rgba(255, 255, 255, 0.65), 0 6px 18px rgba(249, 115, 22, 0.1);
  backdrop-filter: blur(12px);
}

.view-toggle-group .btn-segment {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.15rem;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: #475569;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: 'Poppins', system-ui, sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: none;
}

.view-toggle-group .btn-segment i {
  font-size: 0.75rem;
  opacity: 0.85;
}

.view-toggle-group .btn-segment:hover {
  color: #1f2937;
  background: rgba(255, 255, 255, 0.65);
}

.view-toggle-group .btn-segment.active {
  background: #fff;
  color: #c2410c;
  box-shadow: 0 4px 14px rgba(249, 115, 22, 0.2);
}

.riv-actions-row.riv-hub-actions.controls-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  flex: 1 1 auto;
  min-width: min(100%, 12rem);
}

.hub-btn {
  padding: 0.45rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: 'Poppins', system-ui, sans-serif;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.hub-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hub-btn-primary {
  background: linear-gradient(90deg, #f97316, #f59e0b);
  color: #fff;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
}

.hub-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4);
  background: linear-gradient(90deg, #ea580c, #d97706);
}

.hub-btn-ghost {
  background: rgba(241, 245, 249, 0.9);
  color: #475569;
  border-color: rgba(203, 213, 225, 0.8);
}

.hub-btn-ghost:hover:not(:disabled) {
  background: rgba(226, 232, 240, 0.95);
  color: #1f2937;
}

.hub-btn-success {
  background: linear-gradient(90deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.hub-btn-success:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
}

.btn {
  padding: 0.55rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: 'Poppins', system-ui, sans-serif;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid transparent;
  text-decoration: none;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .view-toggle-group .btn-segment {
    padding: 0.45rem 0.75rem;
    font-size: 0.75rem;
  }

  .view-toggle-group .btn-segment i {
    display: none;
  }
}

@media (max-width: 560px) {
  .riv-toolbar-row {
    flex-direction: column;
    align-items: stretch;
  }

  .riv-toolbar-row .view-toggle-group {
    justify-content: center;
    width: 100%;
  }

  .riv-actions-row.riv-hub-actions.controls-section {
    justify-content: flex-start;
    flex: none;
    min-width: 0;
    width: 100%;
  }

  .hub-btn {
    white-space: normal;
    text-align: center;
  }

  .btn {
    white-space: normal;
    text-align: center;
  }
}
</style>
