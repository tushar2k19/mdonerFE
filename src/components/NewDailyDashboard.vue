<template>
  <div class="ndd-root" @click.self="closeFilter">

    <!-- ── Header ─────────────────────────────────────────────────── -->
    <header class="ndd-header">
      <div class="ndd-header-left">
        <router-link to="/" class="ndd-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Home
        </router-link>
        <div class="ndd-title-group">
          <h1 class="ndd-title">Daily Dashboard</h1>
          <p class="ndd-subtitle">
            <span v-if="slides.length">{{ slides.length }} action item{{ slides.length !== 1 ? 's' : '' }}</span>
            <span v-else-if="!loading">No items for this range</span>
          </p>
        </div>
      </div>

      <!-- Date filter chip -->
      <div class="ndd-date-filter-wrap" ref="filterWrap">
        <button class="ndd-date-chip" :class="{ active: filterOpen }" @click.stop="toggleFilter">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {{ chipLabel }}
          <svg class="ndd-chevron" :class="{ rotated: filterOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
        </button>

        <!-- Dropdown filter panel -->
        <transition name="ndd-fade-drop">
          <div v-if="filterOpen" class="ndd-filter-panel" @click.stop>
            <div class="ndd-filter-section">
              <p class="ndd-filter-label">Quick select</p>
              <div class="ndd-preset-grid">
                <button
                  v-for="opt in quickSelectOptions"
                  :key="opt.value"
                  class="ndd-preset-btn"
                  :class="{ active: reviewDatePreset === opt.value }"
                  @click="onPresetChange(opt.value)"
                >{{ opt.label }}</button>
              </div>
            </div>

            <div class="ndd-filter-section">
              <p class="ndd-filter-label">Pick on calendar</p>
              <div class="ndd-vcal-wrap">
                <v-date-picker
                  :value="calendarRange"
                  mode="date"
                  :is-range="true"
                  @input="onCalendarInput"
                />
              </div>
            </div>

            <div class="ndd-filter-section">
              <p class="ndd-filter-label">From / to</p>
              <FilterDateBoundIconPickers
                :from-ymd="reviewDateFrom"
                :to-ymd="reviewDateTo"
                @from-change="onFromChange"
                @to-change="onToChange"
              />
            </div>
          </div>
        </transition>
      </div>
    </header>

    <!-- ── Main content ────────────────────────────────────────────── -->
    <main class="ndd-main" @click="closeFilter">
      <!-- Loading -->
      <div v-if="loading" class="ndd-center">
        <div class="ndd-spinner"></div>
        <p>Fetching daily items…</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="ndd-center">
        <p class="ndd-error-msg">{{ error }}</p>
        <button class="ndd-retry-btn" @click="fetchData">Retry</button>
      </div>

      <!-- Empty -->
      <div v-else-if="slides.length === 0" class="ndd-center ndd-empty">
        <div class="ndd-empty-icon">📅</div>
        <h2>No action items for this range</h2>
        <p>Try changing the date filter above.</p>
      </div>

      <!-- Book stage -->
      <div v-else class="ndd-book-stage">
        <button class="ndd-nav-btn ndd-nav-prev" @click="swiperPrev" :disabled="currentIndex === 0" aria-label="Previous">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <div class="ndd-book-wrapper">
          <swiper ref="mySwiper" :options="swiperOptions" @slideChange="onSlideChange">
            <swiper-slide v-for="(slide, i) in slides" :key="`${slide.task.id}-${slide.focusNode.id}`">
              <div class="ndd-page" :class="{ 'mode-b': !!zoomedOutStates[i] }">

                <!-- Page ribbon -->
                <div class="ndd-ribbon">
                  <div class="ndd-ribbon-left">
                    <span class="ndd-task-badge">{{ slide.task.sector_division || 'Task' }}</span>
                    <span class="ndd-task-id">#{{ slide.task.id }}</span>
                  </div>
                  <button class="ndd-zoom-btn" @click.stop="toggleZoom(i)">
                    <template v-if="!zoomedOutStates[i]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                      Zoom out
                    </template>
                    <template v-else>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                      Zoom in
                    </template>
                  </button>
                </div>

                <!-- Page body -->
                <div class="ndd-page-body" :ref="`scrollArea-${i}`">

                  <!-- Mode A: focus node only -->
                  <div v-if="!zoomedOutStates[i]" class="ndd-mode-a">
                    <div class="ndd-focus-meta">
                      <span class="ndd-review-date-lozenge">{{ formatDate(slide.focusNode.review_date) }}</span>
                      <span class="ndd-counter-pill" v-if="slide.focusNode.display_counter">{{ slide.focusNode.display_counter }}</span>
                    </div>
                    <div class="ndd-task-title">{{ slide.task.description }}</div>
                    <div class="ndd-focus-node-row">
                      <div class="ndd-focus-node-content ndd-rich-text" v-html="slide.focusNode.content"></div>
                      <div class="ndd-node-date-tag" v-if="slide.focusNode.review_date">
                        <span :class="getHighlightClass(slide.focusNode.review_date)">{{ formatDate(slide.focusNode.review_date) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Mode B: full tree -->
                  <div v-else class="ndd-mode-b-body">
                    <div class="ndd-task-header-block">
                      <span class="ndd-review-date-lozenge">{{ formatDate(slide.focusNode.review_date) }}</span>
                      <div class="ndd-task-title">{{ slide.task.description }}</div>
                    </div>
                    <div class="ndd-tree">
                      <div
                        v-for="node in slide.allNodes"
                        :key="node.id"
                        class="ndd-tree-node"
                        :class="{ 'is-target': compareIds(node.id, slide.focusNode.id) }"
                        :data-node-id="node.id"
                        :style="{ paddingLeft: Math.max(0, ((node.level || 1) - 1)) * 20 + 'px' }"
                      >
                        <span class="ndd-node-counter" v-if="node.display_counter">{{ node.display_counter }}</span>
                        <div class="ndd-rich-text ndd-node-body" v-html="node.content"></div>
                        <div class="ndd-node-date-tag" v-if="node.review_date">
                          <span :class="getHighlightClass(node.review_date)">{{ formatDate(node.review_date) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                <!-- Page footer -->
                <div class="ndd-page-footer">
                  <div class="ndd-footer-progress">
                    <div
                      class="ndd-progress-dot"
                      v-for="(_, di) in slides"
                      :key="di"
                      :class="{ active: di === currentIndex }"
                    ></div>
                  </div>
                  <span class="ndd-footer-label">{{ i + 1 }} / {{ slides.length }}</span>
                </div>
              </div>
            </swiper-slide>
          </swiper>
        </div>

        <button class="ndd-nav-btn ndd-nav-next" @click="swiperNext" :disabled="currentIndex === slides.length - 1" aria-label="Next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </main>
  </div>
</template>

<script>
import { Swiper, SwiperSlide } from 'vue-awesome-swiper'
import 'swiper/css/swiper.css'
import VDatePicker from 'v-calendar/src/components/DatePicker.vue'
import FilterDateBoundIconPickers from '@/components/FilterDateBoundIconPickers.vue'
import 'v-calendar/src/styles/base.css'

export default {
  name: 'NewDailyDashboard',
  components: { Swiper, SwiperSlide, VDatePicker, FilterDateBoundIconPickers },

  data () {
    const today = this.todayYmd()
    return {
      loading: false,
      error: null,
      slides: [],
      zoomedOutStates: {},
      currentIndex: 0,
      filterOpen: false,

      reviewDatePreset: 'today',
      reviewDateFrom: today,
      reviewDateTo: today,
      calendarRange: { start: new Date(), end: new Date() },

      quickSelectOptions: [
        { value: 'today',     label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'tomorrow',  label: 'Tomorrow' },
        { value: 'last7',     label: 'Last 7 days' },
        { value: 'all',       label: 'All' }
      ],

      swiperOptions: {
        slidesPerView: 1,
        spaceBetween: 24,
        grabCursor: true,
        keyboard: { enabled: true }
      }
    }
  },

  computed: {
    swiperInstance () {
      return this.$refs.mySwiper ? this.$refs.mySwiper.$swiper : null
    },
    chipLabel () {
      if (this.reviewDateFrom && this.reviewDateTo && this.reviewDateFrom !== this.reviewDateTo) {
        return `${this.fmtShort(this.reviewDateFrom)} – ${this.fmtShort(this.reviewDateTo)}`
      }
      if (this.reviewDateFrom) return this.fmtShort(this.reviewDateFrom)
      return 'All dates'
    }
  },

  watch: {
    '$route.query': {
      immediate: true,
      handler (q) {
        if (q.start || q.end) {
          this.reviewDateFrom = q.start || this.todayYmd()
          this.reviewDateTo   = q.end   || this.todayYmd()
          this.reviewDatePreset = 'custom'
          this.calendarRange = {
            start: new Date(this.reviewDateFrom + 'T12:00:00'),
            end:   new Date(this.reviewDateTo   + 'T12:00:00')
          }
        }
        this.fetchData()
      }
    }
  },

  mounted () {
    document.addEventListener('keydown', this.onKeydown)
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.onKeydown)
  },

  methods: {
    todayYmd () {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    },
    ymd (d) {
      if (!d) return ''
      if (typeof d === 'string') return d.slice(0, 10)
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0')
      return `${y}-${m}-${day}`
    },
    fmtShort (ymd) {
      if (!ymd) return ''
      const d = new Date(ymd + 'T12:00:00')
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    },
    formatDate (ds) {
      if (!ds) return ''
      const d = new Date(String(ds).slice(0, 10) + 'T12:00:00')
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    },
    compareIds (a, b) {
      return String(a) === String(b)
    },
    getHighlightClass (reviewDate) {
      if (!reviewDate) return []
      const rdStr = String(reviewDate).slice(0, 10)
      const start = this.reviewDateFrom || '0000-00-00'
      const end = this.reviewDateTo || '9999-99-99'
      const inRange = rdStr >= start && rdStr <= end
      return ['yellow-bg-bold', inRange ? 'red-text' : 'black-text']
    },

    toggleFilter () { this.filterOpen = !this.filterOpen },
    closeFilter () { this.filterOpen = false },

    onKeydown (e) {
      if (e.key === 'Escape') this.closeFilter()
    },

    syncQuery () {
      const q = {}
      if (this.reviewDateFrom) q.start = this.reviewDateFrom
      if (this.reviewDateTo)   q.end   = this.reviewDateTo
      this.$router.replace({ query: q }).catch(() => {})
    },

    onPresetChange (val) {
      this.reviewDatePreset = val
      const now = new Date()
      let s = new Date(), e = new Date()
      if (val === 'yesterday') { s.setDate(now.getDate()-1); e = new Date(s) }
      else if (val === 'tomorrow') { s.setDate(now.getDate()+1); e = new Date(s) }
      else if (val === 'last7')  { s.setDate(now.getDate()-7) }
      else if (val === 'all')    { s = null; e = null }
      // today: defaults

      this.reviewDateFrom = s ? this.ymd(s) : ''
      this.reviewDateTo   = e ? this.ymd(e) : ''
      this.calendarRange  = s && e ? { start: s, end: e } : null
      this.syncQuery()
    },

    onCalendarInput (val) {
      this.calendarRange = val
      if (val && val.start && val.end) {
        this.reviewDatePreset = 'custom'
        this.reviewDateFrom = this.ymd(val.start)
        this.reviewDateTo   = this.ymd(val.end)
        this.syncQuery()
      }
    },
    onFromChange (val) {
      this.reviewDateFrom = val
      this.reviewDatePreset = 'custom'
      this.syncQuery()
    },
    onToChange (val) {
      this.reviewDateTo = val
      this.reviewDatePreset = 'custom'
      this.syncQuery()
    },

    async fetchData () {
      this.loading = true
      this.error = null
      try {
        const p = {}
        if (this.reviewDateFrom) p.start = this.reviewDateFrom
        if (this.reviewDateTo)   p.end   = this.reviewDateTo
        const res = await this.$http.secured.get('/tasks/daily_dashboard', { params: p })
        const tasks = res.data.tasks || []
        this.buildSlides(tasks)
      } catch (err) {
        this.error = 'Failed to load daily dashboard data.'
        console.error('[NewDailyDashboard] fetchData error:', err)
      } finally {
        this.loading = false
      }
    },

    /**
     * Flatten the nested action_nodes tree (each node has `children: []`).
     * Attaches inline `_depth` for indentation.
     */
    flattenNodes (nodes, depth = 1, acc = []) {
      if (!Array.isArray(nodes)) return acc
      for (const n of nodes) {
        n._depth = depth
        acc.push(n)
        if (n.children && n.children.length) {
          this.flattenNodes(n.children, depth + 1, acc)
        }
      }
      return acc
    },

    isNodeInRange (node) {
      const rd = node.review_date
      if (!rd) return false
      const dateStr = String(rd).slice(0, 10)
      if (!this.reviewDateFrom && !this.reviewDateTo) return true // "all"
      const nd = dateStr
      const s  = this.reviewDateFrom || '0000-00-00'
      const e  = this.reviewDateTo   || '9999-99-99'
      return nd >= s && nd <= e
    },

    buildSlides (tasks) {
      const slides = []
      for (const task of tasks) {
        const cv = task.current_version
        if (!cv || !Array.isArray(cv.action_nodes)) continue

        const all = this.flattenNodes(cv.action_nodes)
        for (const node of all) {
          if (this.isNodeInRange(node)) {
            slides.push({ task, focusNode: node, allNodes: all })
          }
        }
      }
      this.slides = slides
      this.zoomedOutStates = {}
      this.currentIndex = 0
      this.$nextTick(() => {
        if (this.swiperInstance) this.swiperInstance.slideTo(0, 0)
      })
    },

    swiperPrev () { if (this.swiperInstance) this.swiperInstance.slidePrev() },
    swiperNext () { if (this.swiperInstance) this.swiperInstance.slideNext() },

    onSlideChange () {
      if (!this.swiperInstance) return
      const idx = this.swiperInstance.activeIndex
      this.currentIndex = idx
      // Auto-reset to Mode A on slide change
      if (this.zoomedOutStates[idx]) {
        this.$set(this.zoomedOutStates, idx, false)
      }
    },

    toggleZoom (idx) {
      const wasOut = !!this.zoomedOutStates[idx]
      this.$set(this.zoomedOutStates, idx, !wasOut)
      if (!wasOut) {
        // Entering Mode B: scroll target node into view
        const slide = this.slides[idx]
        this.$nextTick(() => {
          setTimeout(() => {
            const container = this.$refs[`scrollArea-${idx}`]
            const el = (Array.isArray(container) ? container[0] : container)
            if (!el) return
            const target = el.querySelector(`[data-node-id="${slide.focusNode.id}"]`)
            if (target) {
              const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
              target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
            }
          }, 80)
        })
      }
    }
  }
}
</script>

<style scoped>
/* ───────── Root ───────── */
.ndd-root {
  min-height: 100vh;
  width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  background: #f0f4f8;
  font-family: 'Inter', system-ui, sans-serif;
  overflow-x: hidden;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ───────── Header ───────── */
.ndd-header {
  background: #1e293b;
  color: #f8fafc;
  padding: 0.85rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

@media (max-width: 640px) {
  .ndd-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    align-items: flex-start;
  }
}

.ndd-header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.ndd-back {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  color: #cbd5e1;
  font-size: 0.8rem;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s;
}
.ndd-back:hover { background: rgba(255,255,255,0.15); color: white; }

.ndd-title { font-size: 1.2rem; font-weight: 700; color: white; margin: 0; }
.ndd-subtitle { font-size: 0.75rem; color: #94a3b8; margin: 0; margin-top: 1px; }

/* Date chip button */
.ndd-date-filter-wrap { position: relative; }

.ndd-date-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  color: #e2e8f0;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.ndd-date-chip:hover, .ndd-date-chip.active {
  background: rgba(99,102,241,0.25);
  border-color: rgba(99,102,241,0.5);
  color: white;
}
.ndd-chevron { transition: transform 0.2s; }
.ndd-chevron.rotated { transform: rotate(180deg); }

/* Filter dropdown */
.ndd-filter-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 310px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.18);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  z-index: 200;
}
.ndd-filter-section {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}
.ndd-filter-section:last-child { border-bottom: none; }
.ndd-filter-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
  margin: 0 0 0.5rem;
}
.ndd-preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.ndd-preset-btn {
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.8rem;
  cursor: pointer;
  color: #334155;
  transition: all 0.15s;
}
.ndd-preset-btn:hover { background: #e0e7ff; border-color: #818cf8; color: #4338ca; }
.ndd-preset-btn.active { background: #4f46e5; border-color: #4f46e5; color: white; }

.ndd-vcal-wrap { overflow: hidden; border-radius: 8px; border: 1px solid #e2e8f0; }
.ndd-vcal-wrap ::v-deep .vc-container { border: none; font-size: 0.8rem; }
.ndd-vcal-wrap ::v-deep .vc-header { padding: 0.4rem 0; }
.ndd-vcal-wrap ::v-deep .vc-weekday { font-size: 0.65rem; padding: 0.2rem 0; }
.ndd-vcal-wrap ::v-deep .vc-day { min-height: 1.9rem; }

/* Transition */
.ndd-fade-drop-enter-active, .ndd-fade-drop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.ndd-fade-drop-enter, .ndd-fade-drop-leave-to { opacity: 0; transform: translateY(-6px); }

/* ───────── Main ───────── */
.ndd-main {
  flex: 1 1 auto;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0;
  width: 100% !important;
  max-width: 100vw;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}
.ndd-center {
  margin: auto;
  text-align: center;
  padding: 2rem;
}
.ndd-empty-icon { font-size: 3rem; margin-bottom: 0.75rem; }
.ndd-empty h2 { font-size: 1.25rem; color: #334155; margin-bottom: 0.5rem; }
.ndd-empty p { color: #94a3b8; }
.ndd-error-msg { color: #ef4444; margin-bottom: 1rem; }
.ndd-retry-btn {
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  background: #4f46e5;
  color: white;
  border: none;
  cursor: pointer;
}

/* Spinner */
.ndd-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: ndd-spin 0.7s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes ndd-spin { to { transform: rotate(360deg); } }

/* ───────── Book stage ───────── */
.ndd-book-stage {
  flex: 1;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 1.5rem !important;
  width: 100%;
  max-width: 100vw;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .ndd-book-stage {
    padding: 0.5rem 0 !important;
    gap: 0;
  }
}

.ndd-book-wrapper {
  flex: 1;
  max-width: 1400px;
  width: auto;
  height: calc(100vh - 160px);
  position: relative;
  z-index: 5;
  box-sizing: border-box;
  min-width: 0;
}

@media (max-width: 600px) {
  .ndd-book-wrapper {
    height: auto;
    min-height: 400px;
  }
}

/* Swiper / page */
.ndd-page {
  height: 100%;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.07);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Page ribbon */
.ndd-ribbon {
  background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
  color: white;
  padding: 0.85rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.ndd-ribbon-left { display: flex; align-items: center; gap: 0.5rem; }
.ndd-task-badge {
  background: rgba(255,255,255,0.15);
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.03em;
}
.ndd-task-id { font-size: 0.8rem; opacity: 0.7; }

.ndd-zoom-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.25);
  background: rgba(255,255,255,0.1);
  color: white;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.ndd-zoom-btn:hover { background: rgba(255,255,255,0.2); }
.ndd-zoom-btn svg { width: 14px; height: 14px; }

/* Page body (scrollable) */
.ndd-page-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 1.5rem 1.75rem;
}

@media (max-width: 600px) {
  .ndd-page-body {
    padding: 1rem;
  }
}
.ndd-page-body::-webkit-scrollbar { width: 5px; }
.ndd-page-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

/* Mode A */
.ndd-focus-meta { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
.ndd-review-date-lozenge {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 600;
}
.ndd-counter-pill {
  background: #f3f4f6;
  color: #374151;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 700;
}
.ndd-task-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 0.75rem;
  opacity: 0.7;
}
.ndd-focus-node-content {
  font-size: 1.15rem;
  line-height: 1.75;
  color: #1e293b;
}

/* Mode B */
.ndd-task-header-block { margin-bottom: 1rem; }
.ndd-tree { display: flex; flex-direction: column; gap: 2px; }
.ndd-tree-node {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.55rem 0.65rem;
  border-radius: 6px;
  transition: background 0.15s;
}

.ndd-node-body {
  flex: 1;
}

.ndd-node-date-tag {
  flex-shrink: 0;
  margin-left: 1rem;
}

.ndd-focus-node-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.ndd-yellow-bg-bold, .yellow-bg-bold {
  background: #ffeb3b !important;
  font-weight: bold !important;
  border-radius: 4px;
  padding: 2px 6px;
  display: inline-block;
  vertical-align: top;
}

.red-text {
  color: #d32f2f !important;
  font-weight: bold !important;
}

.black-text {
  color: #222 !important;
}

.ndd-tree-node.is-target {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
  padding-left: 0.45rem;
}
.ndd-node-counter { color: #94a3b8; font-weight: 700; min-width: 1.4rem; font-size: 0.85rem; flex-shrink: 0; line-height: 1.6; }
.ndd-node-body { font-size: 0.9rem; line-height: 1.6; color: #334155; }

.ndd-rich-text ::v-deep p { margin: 0 0 0.25rem; }
.ndd-rich-text ::v-deep ul, .ndd-rich-text ::v-deep ol { padding-left: 1rem; margin: 0; }

/* Page footer */
.ndd-page-footer {
  flex-shrink: 0;
  border-top: 1px solid #f1f5f9;
  padding: 0.6rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ndd-footer-progress { display: flex; gap: 5px; }
.ndd-progress-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #e2e8f0; transition: background 0.2s;
}
.ndd-progress-dot.active { background: #4f46e5; }
.ndd-footer-label { font-size: 0.78rem; color: #94a3b8; }

/* Nav buttons */
.ndd-nav-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: white;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #334155;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: all 0.2s;
  flex-shrink: 0;
  z-index: 10;
}

@media (max-width: 768px) {
  .ndd-nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(4px);
    width: 40px;
    height: 40px;
    border: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }
  
  .ndd-nav-prev {
    left: 8px;
  }
  
  .ndd-nav-next {
    right: 8px;
  }
}
.ndd-nav-btn:hover:not(:disabled) { background: #f1f5f9; transform: scale(1.06); }
.ndd-nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.ndd-nav-btn svg { width: 20px; height: 20px; }
</style>
