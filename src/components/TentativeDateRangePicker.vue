<template>
  <div class="tentative-date-range-picker filter-review-date-body">
    <label class="filter-compact-label">Quick filter</label>
    <FilterPrettySelect
      :value="presetKey"
      :options="quickSelectPrettyOptions"
      aria-label="Review date quick filter"
      @input="$emit('preset-change', $event)"
    />

    <label class="filter-compact-label filter-calendar-label">Pick on calendar</label>
    <button
      type="button"
      class="filter-calendar-toggle"
      :aria-expanded="isCalendarOpen ? 'true' : 'false'"
      @click="isCalendarOpen = !isCalendarOpen"
    >
      <span>{{ isCalendarOpen ? 'Hide calendar' : 'Choose from calendar' }}</span>
      <span class="filter-calendar-toggle-icon" :class="{ open: isCalendarOpen }">v</span>
    </button>
    <div v-show="isCalendarOpen" class="tentative-filter-vcalendar-wrap">
      <v-date-picker
        :value="calendarRange"
        mode="date"
        :is-range="true"
        @input="$emit('calendar-input', $event)"
      />
    </div>

    <FilterDateBoundIconPickers
      :from-ymd="fromYmd"
      :to-ymd="toYmd"
      @from-change="$emit('from-change', $event)"
      @to-change="$emit('to-change', $event)"
    />
  </div>
</template>

<script>
import VDatePicker from 'v-calendar/src/components/DatePicker.vue'
import FilterPrettySelect from '@/components/FilterPrettySelect.vue'
import FilterDateBoundIconPickers from '@/components/FilterDateBoundIconPickers.vue'

export default {
  name: 'TentativeDateRangePicker',
  components: { VDatePicker, FilterPrettySelect, FilterDateBoundIconPickers },
  data () {
    const hasBoundDates = Boolean(this.fromYmd || this.toYmd)
    const hasCalendarRange = Boolean(
      this.calendarRange && (this.calendarRange.start || this.calendarRange.end)
    )
    return {
      isCalendarOpen: this.presetKey === 'custom' || hasBoundDates || hasCalendarRange
    }
  },
  props: {
    presetKey: { type: String, default: 'today' },
    fromYmd: { type: String, default: '' },
    toYmd: { type: String, default: '' },
    calendarRange: { type: Object, default: null },
    quickSelectOptions: { type: Array, default: () => [] }
  },
  watch: {
    presetKey (val) {
      if (val === 'custom') this.isCalendarOpen = true
    }
  },
  computed: {
    quickSelectPrettyOptions () {
      return (this.quickSelectOptions || []).map(opt => ({
        value: opt.value,
        label: opt.label,
        meta: opt.count !== undefined ? `${opt.count} tasks` : ''
      }))
    }
  }
}
</script>

<style scoped>
.filter-review-date-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.filter-compact-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
  margin-top: 0.25rem;
}
.filter-calendar-label {
  margin-top: 0.5rem;
}
.filter-calendar-toggle {
  width: 100%;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #1e293b;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.45rem 0.6rem;
  cursor: pointer;
}
.filter-calendar-toggle:hover {
  background: #f8fafc;
}
.filter-calendar-toggle:focus-visible {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
}
.filter-calendar-toggle-icon {
  font-size: 1rem;
  transition: transform 0.2s ease;
}
.filter-calendar-toggle-icon.open {
  transform: rotate(180deg);
}
.filter-preset-select {
  width: 100%;
  padding: 0.45rem 0.55rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  font-size: 0.85rem;
  color: #374151;
  background: #fff;
}
.filter-preset-select:focus {
  outline: none;
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.15);
}
.tentative-filter-vcalendar-wrap {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 4px;
  background: #fafafa;
  overflow: hidden;
}
.tentative-filter-vcalendar-wrap ::v-deep .vc-container {
  border: none;
  font-size: 0.8rem;
}
.tentative-filter-vcalendar-wrap ::v-deep .vc-header {
  padding: 0.35rem 0;
}
.tentative-filter-vcalendar-wrap ::v-deep .vc-weekday {
  padding: 0.2rem 0;
  font-size: 0.65rem;
}
.tentative-filter-vcalendar-wrap ::v-deep .vc-day {
  min-height: 1.85rem;
}
</style>
