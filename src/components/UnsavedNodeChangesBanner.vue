<template>
  <div class="unsaved-trigger" v-if="summary">
    <button
      type="button"
      class="unsaved-trigger__link"
      aria-haspopup="dialog"
      :aria-expanded="modalOpen ? 'true' : 'false'"
      @click="openModal"
    >
      {{ headline }}
    </button>

    <div
      v-if="modalOpen"
      class="unsaved-modal-overlay"
      role="presentation"
      @click.self="closeModal"
    >
      <div
        class="unsaved-modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.stop
      >
        <header class="unsaved-modal__header">
          <h2 :id="titleId" class="unsaved-modal__title">Unsaved changes</h2>
          <button
            type="button"
            class="unsaved-modal__close"
            aria-label="Close"
            @click="closeModal"
          >
            &times;
          </button>
        </header>

        <p class="unsaved-modal__intro">
          Action items that differ from the last loaded version. Save the task to sync.
        </p>

        <div class="unsaved-modal__body">
          <section v-if="addedLine" class="unsaved-section unsaved-section--new">
            <h3 class="unsaved-section__label">New</h3>
            <p class="unsaved-section__value">{{ addedLine }}</p>
          </section>
          <section v-if="updatedLine" class="unsaved-section unsaved-section--updated">
            <h3 class="unsaved-section__label">Updated</h3>
            <p class="unsaved-section__value">{{ updatedLine }}</p>
          </section>
          <section v-if="deletedLine" class="unsaved-section unsaved-section--removed">
            <h3 class="unsaved-section__label">Removed</h3>
            <p class="unsaved-section__value">{{ deletedLine }}</p>
          </section>

          <p v-if="!hasAnyDetail" class="unsaved-modal__empty">
            No per-node breakdown (e.g. only metadata changed, or nothing to list).
          </p>
        </div>

        <footer class="unsaved-modal__footer">
          <button type="button" class="unsaved-modal__btn" @click="closeModal">
            Close
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script>
import { joinPointerList } from '@/utils/actionNodeChangeSummary'

export default {
  name: 'UnsavedNodeChangesBanner',

  props: {
    summary: {
      type: Object,
      default: null
    },
    headline: {
      type: String,
      default: 'You have unsaved changes'
    },
    maxPointersPerLine: {
      type: Number,
      default: 40
    }
  },

  data () {
    return {
      modalOpen: false,
      titleId: ''
    }
  },

  created () {
    this.titleId = 'unsaved-changes-title-' + this._uid
  },

  computed: {
    max () {
      return this.maxPointersPerLine
    },
    addedLine () {
      const s = this.summary
      if (!s || !s.added || !s.added.length) return ''
      return joinPointerList(s.added, this.max)
    },
    updatedLine () {
      const s = this.summary
      if (!s || !s.updated || !s.updated.length) return ''
      return joinPointerList(s.updated, this.max)
    },
    deletedLine () {
      const s = this.summary
      if (!s || !(s.deletedCount > 0)) return ''
      const n = s.deletedCount
      return `${n} saved node${n === 1 ? '' : 's'} removed (pointers not listed).`
    },
    hasAnyDetail () {
      return !!(this.addedLine || this.updatedLine || this.deletedLine)
    }
  },

  watch: {
    summary () {
      if (!this.summary) this.closeModal()
    }
  },

  mounted () {
    document.addEventListener('keydown', this.onDocKeydown)
  },

  beforeDestroy () {
    document.removeEventListener('keydown', this.onDocKeydown)
  },

  methods: {
    openModal () {
      this.modalOpen = true
    },
    closeModal () {
      this.modalOpen = false
    },
    onDocKeydown (e) {
      if (e.key === 'Escape' && this.modalOpen) {
        e.preventDefault()
        this.closeModal()
      }
    }
  }
}
</script>

<style scoped>
.unsaved-trigger {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.unsaved-trigger__link {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: #b45309;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
  cursor: pointer;
  text-align: left;
  transition: color 0.15s ease, text-decoration-color 0.15s ease;
}

.unsaved-trigger__link:hover {
  color: #92400e;
  text-decoration-color: rgba(146, 64, 14, 0.55);
}

.unsaved-trigger__link:focus {
  outline: 2px solid #f59e0b;
  outline-offset: 3px;
  border-radius: 2px;
}

.unsaved-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
}

.unsaved-modal {
  width: 100%;
  max-width: 32rem;
  max-height: min(85vh, 520px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.unsaved-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
}

.unsaved-modal__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.unsaved-modal__close {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.unsaved-modal__close:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.unsaved-modal__intro {
  margin: 0;
  padding: 0.85rem 1.25rem 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #64748b;
}

.unsaved-modal__body {
  padding: 1rem 1.25rem 1.25rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.unsaved-section {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.unsaved-section:last-of-type {
  margin-bottom: 0;
}

.unsaved-section--new {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.unsaved-section--updated {
  border-color: #fde68a;
  background: #fffbeb;
}

.unsaved-section--removed {
  border-color: #fecaca;
  background: #fef2f2;
}

.unsaved-section__label {
  margin: 0 0 0.35rem 0;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #475569;
}

.unsaved-section__value {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: #1e293b;
  word-break: break-word;
}

.unsaved-modal__empty {
  margin: 0;
  padding: 1rem;
  font-size: 0.8125rem;
  color: #64748b;
  text-align: center;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
}

.unsaved-modal__footer {
  padding: 0.75rem 1.25rem 1.1rem;
  border-top: 1px solid #e2e8f0;
  background: #fafafa;
  display: flex;
  justify-content: flex-end;
}

.unsaved-modal__btn {
  padding: 0.45rem 1.15rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fff;
  background: #0f172a;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.unsaved-modal__btn:hover {
  background: #1e293b;
}
</style>
