<template>
  <div class="fdbi-root" @keydown.esc.stop="closePicker">
    <div class="fdbi-row" ref="boundRow">
      <div class="fdbi-field">
        <span class="fdbi-label">From</span>
        <button
          type="button"
          class="fdbi-trigger"
          :class="{ active: boundPickerTarget === 'from' }"
          :aria-expanded="boundPickerTarget === 'from' ? 'true' : 'false'"
          :aria-label="'From date: ' + (fromYmd || 'not set')"
          @click.stop="togglePicker('from')"
        >
          <span class="fdbi-trigger-text">{{ shortLabel(fromYmd) }}</span>
          <span class="fdbi-trigger-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
            </svg>
          </span>
        </button>
      </div>
      <div class="fdbi-field">
        <span class="fdbi-label">To</span>
        <button
          type="button"
          class="fdbi-trigger"
          :class="{ active: boundPickerTarget === 'to' }"
          :aria-expanded="boundPickerTarget === 'to' ? 'true' : 'false'"
          :aria-label="'To date: ' + (toYmd || 'not set')"
          @click.stop="togglePicker('to')"
        >
          <span class="fdbi-trigger-text">{{ shortLabel(toYmd) }}</span>
          <span class="fdbi-trigger-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
            </svg>
          </span>
        </button>
      </div>
    </div>
    <div v-if="boundPickerTarget" class="fdbi-inline-cal" @click.stop>
      <v-date-picker
        :value="boundPickerDateValue"
        mode="date"
        @input="onBoundPickerInput"
      />
    </div>
  </div>
</template>

<script>
import VDatePicker from 'v-calendar/src/components/DatePicker.vue'
import 'v-calendar/src/styles/base.css'
import { ymdFromDate, parseYmdToLocalStart } from '@/utils/tentativeReviewDateFilter'

export default {
  name: 'FilterDateBoundIconPickers',
  components: { VDatePicker },
  props: {
    fromYmd: { type: String, default: '' },
    toYmd: { type: String, default: '' }
  },
  data () {
    return {
      boundPickerTarget: null
    }
  },
  computed: {
    boundPickerDateValue () {
      const ymd = this.boundPickerTarget === 'from' ? this.fromYmd : this.toYmd
      if (!ymd) return new Date()
      return parseYmdToLocalStart(ymd) || new Date()
    }
  },
  mounted () {
    document.addEventListener('click', this.onDocumentClick, true)
  },
  beforeDestroy () {
    document.removeEventListener('click', this.onDocumentClick, true)
  },
  methods: {
    shortLabel (ymd) {
      if (!ymd) return '—'
      const d = parseYmdToLocalStart(ymd)
      if (!d) return ymd
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    },
    togglePicker (which) {
      this.boundPickerTarget = this.boundPickerTarget === which ? null : which
    },
    closePicker () {
      this.boundPickerTarget = null
    },
    onDocumentClick (e) {
      if (!this.boundPickerTarget) return
      const root = this.$el
      if (root && root.contains(e.target)) return
      this.boundPickerTarget = null
    },
    onBoundPickerInput (val) {
      const d = val instanceof Date ? val : (val && new Date(val))
      if (!d || Number.isNaN(d.getTime())) return
      const ymd = ymdFromDate(d)
      if (!ymd) return
      if (this.boundPickerTarget === 'from') {
        this.$emit('from-change', ymd)
      } else if (this.boundPickerTarget === 'to') {
        this.$emit('to-change', ymd)
      }
      this.boundPickerTarget = null
    }
  }
}
</script>

<style scoped>
.fdbi-root {
  margin-top: 0.35rem;
  max-width: 100%;
}
.fdbi-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
  max-width: 100%;
}
.fdbi-field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.fdbi-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #6b7280;
}
.fdbi-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  width: 100%;
  max-width: 100%;
  min-height: 2.25rem;
  padding: 0.3rem 0.45rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #1e293b;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  box-sizing: border-box;
}
.fdbi-trigger:hover {
  background: #f8fafc;
}
.fdbi-trigger:focus-visible {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
}
.fdbi-trigger.active {
  border-color: #2563eb;
  background: #eff6ff;
}
.fdbi-trigger-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}
.fdbi-trigger-icon {
  flex-shrink: 0;
  display: flex;
  color: #64748b;
}
.fdbi-trigger.active .fdbi-trigger-icon {
  color: #2563eb;
}
.fdbi-inline-cal {
  margin-top: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 4px;
  background: #fafafa;
  overflow: hidden;
  max-width: 100%;
}
.fdbi-inline-cal ::v-deep .vc-container {
  border: none;
  font-size: 0.8rem;
}
.fdbi-inline-cal ::v-deep .vc-header {
  padding: 0.35rem 0;
}
.fdbi-inline-cal ::v-deep .vc-weekday {
  padding: 0.2rem 0;
  font-size: 0.65rem;
}
.fdbi-inline-cal ::v-deep .vc-day {
  min-height: 1.85rem;
}
</style>
