<template>
  <div class="drs-root" :class="{ 'drs-root--immersive': immersiveMode }">
    <div class="drs-bg drs-bg--subtle" aria-hidden="true" />

    <header v-show="!immersiveMode" class="drs-header">
      <div class="drs-header-inner">
        <div class="drs-header-left">
          <router-link to="/" class="drs-back" title="Back to Home">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Home</span>
          </router-link>
          <div class="drs-title-block">
            <h1 class="drs-title">Daily review slideshow</h1>
            <p class="drs-sub">Editor Dashboard tasks — action items whose review date matches the selected day</p>
          </div>
        </div>

        <!-- Mobile menu toggle -->
        <button class="drs-mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen" :aria-expanded="mobileMenuOpen" title="Toggle menu">
          <svg v-if="!mobileMenuOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="drs-header-controls" :class="{ 'is-open': mobileMenuOpen }">
          <label class="drs-date-field">
            <span class="drs-date-label">Review date</span>
            <input
              v-model="selectedDateStr"
              type="date"
              class="drs-date-input"
            >
          </label>
          <button type="button" class="drs-today-btn" @click="setToday">
            Today
          </button>
          <button
            type="button"
            class="drs-focus-toggle"
            :class="{ 'is-on': immersiveMode }"
            title="Full-screen content — subtle background, minimal chrome (Esc to exit)"
            @click="toggleImmersive"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>Focus</span>
          </button>
        </div>
      </div>

      <div v-if="currentSlide" class="drs-meta-bar" :class="{ 'is-open': mobileMenuOpen }">
        <div class="drs-meta-chip">
          <span class="drs-meta-key">Sector / division</span>
          <span class="drs-meta-val">{{ currentSlide.task.sector_division || '—' }}</span>
        </div>
        <div class="drs-meta-chip drs-meta-wide">
          <span class="drs-meta-key">Description</span>
          <span class="drs-meta-val">{{ currentSlide.task.description || '—' }}</span>
        </div>
        <div v-if="reviewerLine" class="drs-meta-chip">
          <span class="drs-meta-key">Reviewer</span>
          <span class="drs-meta-val">{{ reviewerLine }}</span>
        </div>
        <div class="drs-meta-chip">
          <span class="drs-meta-key">Review date</span>
          <span class="drs-meta-val">{{ formatDate(currentSlide.focusNode.review_date) }}</span>
        </div>
        <div class="drs-meta-chip drs-meta-counter">
          <span class="drs-meta-key">Slide</span>
          <span class="drs-meta-val">{{ slideIndex + 1 }} / {{ slides.length }}</span>
        </div>
        <div class="drs-meta-chip drs-meta-counter">
          <span class="drs-meta-key">View</span>
          <span class="drs-meta-val">{{ viewIndex + 1 }} / {{ viewModes.length }}</span>
        </div>
        <div v-if="currentSlide.task.status" class="drs-meta-chip">
          <span class="drs-meta-key">Task status</span>
          <span class="drs-meta-val">{{ formatTaskStatus(currentSlide.task.status) }}</span>
        </div>
      </div>
    </header>

    <!-- Minimal chrome when focus / full-screen mode is on -->
    <div v-if="immersiveMode" class="drs-immersive-bar">
      <button type="button" class="drs-immersive-exit" title="Exit focus (Esc)" @click="immersiveMode = false">
        Exit focus
      </button>
      <template v-if="!loading && !fetchError">
        <label class="drs-immersive-date">
          <span class="sr-only">Review date</span>
          <input v-model="selectedDateStr" type="date" class="drs-immersive-date-input">
        </label>
        <span v-if="slides.length" class="drs-immersive-meta">{{ slideIndex + 1 }} / {{ slides.length }} · v{{ viewIndex + 1 }}/{{ viewModes.length }}</span>
        <div class="drs-immersive-nav">
          <button type="button" class="drs-imm-icon" :disabled="slideIndex <= 0" title="Previous" @click="prevSlide">‹</button>
          <button type="button" class="drs-imm-icon" :disabled="slideIndex >= slides.length - 1" title="Next" @click="nextSlide">›</button>
          <button type="button" class="drs-imm-icon" :disabled="viewIndex <= 0" title="Less context" @click="shrinkView">−</button>
          <button type="button" class="drs-imm-icon" :disabled="viewIndex >= viewModes.length - 1" title="More context" @click="growView">+</button>
        </div>
      </template>
    </div>

    <main class="drs-main">
      <div v-if="loading" class="drs-state">
        <div class="drs-spinner" />
        <p>Loading Editor Dashboard tasks…</p>
      </div>

      <div v-else-if="fetchError" class="drs-state drs-state-err">
        <p>{{ fetchError }}</p>
        <button type="button" class="drs-retry" @click="fetchTentativeTasks">Retry</button>
      </div>

      <div v-else-if="slides.length === 0" class="drs-state">
        <div class="drs-empty-icon" aria-hidden="true">📅</div>
        <h2 class="drs-empty-title">No action items for this date</h2>
        <p class="drs-empty-text">Pick another review date or open the Editor Dashboard to add or edit tasks.</p>
      </div>

      <div v-else class="drs-stage">
        <button
          type="button"
          class="drs-nav drs-nav-prev"
          :disabled="slideIndex <= 0"
          title="Previous slide"
          @click="prevSlide"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <div class="drs-viewport">
          <div class="drs-expand-dock">
            <button
              type="button"
              class="drs-expand-btn"
              :disabled="viewIndex <= 0"
              title="Less context (−)"
              @click="shrinkView"
            >
              <span class="drs-expand-icon" aria-hidden="true">−</span>
            </button>
            <button
              type="button"
              class="drs-expand-btn"
              :disabled="viewIndex >= viewModes.length - 1"
              title="More context (+)"
              @click="growView"
            >
              <span class="drs-expand-icon" aria-hidden="true">+</span>
            </button>
          </div>

          <div class="drs-view-label">{{ viewModeLabel }}</div>

          <!-- Chain: growing tail of ancestors + focus -->
          <div v-if="activeMode.type === 'chain'" class="drs-scroll">
            <div class="drs-path-outline">
              <article
                v-for="(n, idx) in activeMode.nodes"
                :key="n.id"
                class="drs-path-row"
                :class="{ 
                  'drs-path-focus': idx === activeMode.nodes.length - 1,
                  'drs-path-focus--primary': idx === activeMode.nodes.length - 1 && activeMode.nodes.length > 1,
                  'drs-path-standalone': activeMode.nodes.length === 1
                }"
                :style="{ marginLeft: activeMode.nodes.length === 1 ? '0' : `${idx * 1.5}rem` }"
              >
                <header class="drs-glass-h">
                  <span class="drs-counter-pill">{{ counterLabel(n) }}</span>
                  <span v-if="idx === activeMode.nodes.length - 1" class="drs-focus-tag">Focus</span>
                  <span v-if="idx === activeMode.nodes.length - 1 && activeMode.nodes.length > 1" class="drs-focus-micro">Review date item</span>
                </header>
                <div class="drs-action-tree drs-rich rich-text-display" v-html="n.content" />
              </article>
            </div>
          </div>

          <!-- Full task -->
          <div v-else class="drs-scroll drs-full-wrap" ref="fullScroller">
            <article class="drs-glass drs-glass-full">
              <header class="drs-glass-h">
                <span class="drs-full-title">Full task — action to be taken</span>
              </header>
              <div
                class="drs-action-tree drs-rich rich-text-display drs-full-html"
                v-html="currentSlide.task.action_to_be_taken"
              />
            </article>
          </div>
        </div>

        <button
          type="button"
          class="drs-nav drs-nav-next"
          :disabled="slideIndex >= slides.length - 1"
          title="Next slide"
          @click="nextSlide"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </main>
  </div>
</template>

<script>
import {
  buildSlidesForTasks,
  buildViewModes,
  counterLabel,
  startOfLocalDay
} from '@/utils/dailySlideshowUtils.js'

export default {
  name: 'DailyReviewSlideshow',

  data () {
    return {
      loading: true,
      fetchError: null,
      /** Same source as TentativeDashboard: GET /tasks → active (non-completed) tasks. */
      tentativeActiveTasks: [],
      selectedDateStr: '',
      slideIndex: 0,
      viewIndex: 0,
      /** Full viewport, plain background, minimal chrome — content-first. */
      immersiveMode: false,
      mobileMenuOpen: false
    }
  },

  computed: {
    selectedDay () {
      if (!this.selectedDateStr) return startOfLocalDay(new Date())
      const [y, m, d] = this.selectedDateStr.split('-').map(Number)
      return startOfLocalDay(new Date(y, m - 1, d))
    },

    slides () {
      return buildSlidesForTasks(this.tentativeActiveTasks, this.selectedDay)
    },

    currentSlide () {
      return this.slides[this.slideIndex] || null
    },

    viewModes () {
      if (!this.currentSlide) return []
      const { chain, focusNode } = this.currentSlide
      return buildViewModes({ chain, focusNode })
    },

    activeMode () {
      return this.viewModes[this.viewIndex] || { type: 'chain', nodes: [] }
    },

    viewModeLabel () {
      const m = this.activeMode
      if (!this.currentSlide) return ''
      if (m.type === 'chain') {
        const n = m.nodes.length
        return n === 1
          ? 'Focus only'
          : `Path: ${n} levels (ancestors + focus)`
      }
      return 'Whole task'
    },

    reviewerLine () {
      const s = this.currentSlide
      if (!s) return ''
      const n = s.focusNode
      if (n.reviewer_id && (n.reviewer_name || '').trim()) return String(n.reviewer_name).trim()
      const t = s.task.reviewer_info
      if (t && String(t).trim()) return String(t).trim()
      return ''
    }
  },

  watch: {
    slides (list) {
      if (this.slideIndex >= list.length) this.slideIndex = Math.max(0, list.length - 1)
    },
    slideIndex () {
      this.viewIndex = 0
    },
    selectedDateStr () {
      this.slideIndex = 0
      this.viewIndex = 0
    },
    viewModes (modes) {
      if (this.viewIndex >= modes.length) {
        this.viewIndex = Math.max(0, modes.length - 1)
      }
    },
    activeMode: {
      handler (newMode) {
        if (newMode && newMode.type === 'full') {
          this.afterFullViewPaint()
        }
      },
      deep: true
    }
  },

  created () {
    this.selectedDateStr = this.isoDateLocal(new Date())
    this.fetchTentativeTasks()
  },

  mounted () {
    window.addEventListener('keydown', this.onKeydown)
  },

  beforeDestroy () {
    window.removeEventListener('keydown', this.onKeydown)
  },

  methods: {
    afterFullViewPaint () {
      if (!this.currentSlide || !this.currentSlide.focusNode) return
      const focusId = this.currentSlide.focusNode.id
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          const container = this.$refs.fullScroller
          if (!container) return
          
          // Cleanup existing highlights
          const existing = container.querySelectorAll('.drs-daily-focus')
          existing.forEach(el => el.classList.remove('drs-daily-focus'))
          
          // Find the focus node
          let el = container.querySelector('#action-node-' + focusId)
          if (!el) el = container.querySelector(`[data-node-id="${focusId}"]`)
          
          if (el) {
            el.classList.add('drs-daily-focus')
            el.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }
        })
      })
    },

    counterLabel,

    isoDateLocal (d) {
      const x = new Date(d)
      const y = x.getFullYear()
      const m = String(x.getMonth() + 1).padStart(2, '0')
      const day = String(x.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    },

    setToday () {
      this.selectedDateStr = this.isoDateLocal(new Date())
    },

    formatDate (date) {
      if (!date) return '—'
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },

    formatTaskStatus (status) {
      const map = {
        draft: 'Draft',
        under_review: 'Under review',
        approved: 'Approved',
        completed: 'Completed'
      }
      return map[status] || String(status || '').replace(/_/g, ' ') || '—'
    },

    /**
     * Mirrors TentativeDashboard.fetchTasksByDate — active list only (not completed archive).
     */
    async fetchTentativeTasks () {
      this.loading = true
      this.fetchError = null
      try {
        const response = await this.$http.secured.get('/tasks', {
          params: { date: this.isoDateLocal(new Date()) }
        })
        const active = response.data && response.data.active
        const list = Array.isArray(active) ? active : []
        this.tentativeActiveTasks = list.sort((a, b) => {
          const dateA = new Date(a.review_date)
          const dateB = new Date(b.review_date)
          return dateA - dateB
        })
      } catch (e) {
        console.error(e)
        this.fetchError = 'Could not load tasks (Editor Dashboard).'
        this.$toast && this.$toast.error('Failed to fetch tasks')
      } finally {
        this.loading = false
      }
    },

    prevSlide () {
      if (this.slideIndex > 0) {
        this.slideIndex--
        this.viewIndex = 0
      }
    },

    nextSlide () {
      if (this.slideIndex < this.slides.length - 1) {
        this.slideIndex++
        this.viewIndex = 0
      }
    },

    shrinkView () {
      if (this.viewIndex > 0) this.viewIndex--
    },

    growView () {
      if (this.viewIndex < this.viewModes.length - 1) this.viewIndex++
    },

    toggleImmersive () {
      this.immersiveMode = !this.immersiveMode
    },

    onKeydown (e) {
      if (e.key === 'Escape' && this.immersiveMode) {
        this.immersiveMode = false
        return
      }
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        this.prevSlide()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        this.nextSlide()
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        this.growView()
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        this.shrinkView()
      }
    }
  }
}
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.drs-root {
  position: relative;
  min-height: calc(100vh - 60px);
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  font-family: 'Poppins', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #1e293b;
}

/* Cover app header when focus mode — true full-screen content */
.drs-root--immersive {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9990;
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.drs-root--immersive .drs-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 0.35rem 0.5rem;
}

.drs-root--immersive .drs-stage {
  flex: 1;
  min-height: 0;
  max-height: none;
}

.drs-root--immersive .drs-scroll {
  max-height: none;
  flex: 1;
}

.drs-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* Plain, calm surface (Editor Dashboard–like) */
.drs-bg--subtle {
  background:
    linear-gradient(180deg, #f8fafc 0%, #f1f5f9 45%, #eef2f7 100%);
}

.drs-header {
  position: relative;
  z-index: 2;
  max-height: none;
}

.drs-header-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem 1.5rem;
  padding: 0.65rem 1rem 0.5rem;
}

@media (min-width: 768px) {
  .drs-header-inner {
    padding: 0.75rem 1.25rem 0.5rem;
  }
}

.drs-header-left {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  min-width: 0;
}

.drs-back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  flex-shrink: 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.drs-back:hover {
  transform: translateY(-1px);
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}

.drs-title-block {
  min-width: 0;
}
.drs-title {
  font-size: clamp(1.15rem, 2.5vw, 1.65rem);
  font-weight: 800;
  line-height: 1.2;
  margin: 0;
  color: #0f172a;
  letter-spacing: -0.02em;
}
.drs-sub {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: rgba(30, 41, 59, 0.72);
}

.drs-header-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.6rem;
}

.drs-date-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.drs-date-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(30, 41, 59, 0.55);
}
.drs-date-input {
  padding: 0.45rem 0.65rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 0.875rem;
  color: #0f172a;
}

.drs-today-btn {
  padding: 0.5rem 1rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8rem;
  background: #fff;
  color: #334155;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}
.drs-today-btn:hover {
  transform: translateY(-1px);
  background: #f8fafc;
  border-color: #cbd5e1;
}

.drs-focus-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.85rem;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.drs-focus-toggle:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}
.drs-focus-toggle.is-on {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.drs-mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  color: #334155;
  cursor: pointer;
  padding: 0.5rem;
  margin-left: auto;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;
}
.drs-mobile-menu-btn:hover {
  opacity: 0.7;
}

@media (max-width: 768px) {
  .drs-mobile-menu-btn {
    display: inline-flex;
  }

  .drs-header-inner {
    padding: 0.75rem 1rem 0.5rem;
  }

  .drs-header-controls {
    display: none;
    width: 100%;
    margin-top: 0.5rem;
    flex-direction: column;
    align-items: stretch;
  }
  .drs-header-controls.is-open {
    display: flex;
  }
  
  .drs-date-field {
    width: 100%;
  }
  .drs-date-input {
    width: 100%;
  }

  .drs-meta-bar {
    display: none;
    max-height: 50vh;
  }
  .drs-meta-bar.is-open {
    display: flex;
  }
  .drs-meta-wide {
    max-width: none;
  }
  .drs-meta-chip {
    max-width: none;
  }
}

/* Meta bar: cap ~9% viewport for slideshow “chrome” */
.drs-meta-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.6rem;
  align-items: stretch;
  padding: 0.35rem 1rem 0.55rem;
  max-height: 9vh;
  overflow-y: auto;
}

.drs-meta-chip {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  padding: 0.35rem 0.65rem;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  min-width: 0;
  max-width: 16rem;
}
.drs-meta-wide {
  max-width: min(36rem, 42vw);
  flex: 1 1 12rem;
}
.drs-meta-key {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(15, 23, 42, 0.5);
}
.drs-meta-val {
  font-size: 0.78rem;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.25;
  word-break: break-word;
}
.drs-meta-counter {
  max-width: 8rem;
}

/* Focus mode: single slim toolbar */
.drs-immersive-bar {
  position: relative;
  z-index: 3;
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  padding: 0.4rem 0.65rem;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
}

.drs-immersive-exit {
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}
.drs-immersive-exit:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.drs-immersive-date-input {
  padding: 0.3rem 0.45rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 0.8rem;
  color: #0f172a;
}

.drs-immersive-meta {
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
}

.drs-immersive-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.drs-imm-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 1.1rem;
  line-height: 1;
  color: #334155;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.drs-imm-icon:hover:not(:disabled) {
  background: #f8fafc;
}
.drs-imm-icon:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.drs-main {
  position: relative;
  z-index: 2;
  padding: 0 0.5rem 1rem;
  min-height: 0;
}

@media (min-width: 768px) {
  .drs-main {
    padding: 0 1rem 1.25rem;
  }
}

.drs-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 48vh;
  text-align: center;
  color: rgba(15, 23, 42, 0.75);
}
.drs-state-err {
  color: #b91c1c;
}
.drs-retry {
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: none;
  background: #4f46e5;
  color: #fff;
  cursor: pointer;
  font-weight: 600;
}
.drs-spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.5);
  border-top-color: #4f46e5;
  animation: drsSpin 0.85s linear infinite;
}
@keyframes drsSpin {
  to { transform: rotate(360deg); }
}
.drs-empty-title {
  margin: 0;
  font-size: 1.25rem;
  color: #0f172a;
}
.drs-empty-text {
  margin: 0;
  max-width: 22rem;
  font-size: 0.9rem;
}
.drs-empty-icon {
  font-size: 2.5rem;
  opacity: 0.85;
}

.drs-stage {
  display: flex;
  align-items: stretch;
  gap: 0.35rem;
  min-height: calc(100vh - 60px - 9vh - 4rem);
  max-height: calc(100vh - 60px - 9vh - 4rem);
}

@media (max-width: 640px) {
  .drs-stage {
    flex-direction: column;
    max-height: none;
    min-height: 60vh;
  }
}

.drs-nav {
  flex-shrink: 0;
  align-self: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}
.drs-nav:hover:not(:disabled) {
  transform: scale(1.04);
  background: #f8fafc;
  border-color: #cbd5e1;
}
.drs-nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.drs-viewport {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 320px;
  border-radius: 16px;
  padding: 0.5rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

.drs-root--immersive .drs-viewport {
  border-radius: 12px;
  box-shadow: none;
  border-color: #e2e8f0;
}

.drs-expand-dock {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  z-index: 5;
  display: flex;
  gap: 0.35rem;
}

.drs-expand-btn {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, background 0.15s ease;
}
.drs-expand-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #f8fafc;
}
.drs-expand-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.drs-expand-icon {
  font-size: 1.5rem;
  font-weight: 300;
  line-height: 1;
  color: #475569;
}

.drs-view-label {
  padding: 0.35rem 3.5rem 0.5rem 0.75rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(15, 23, 42, 0.45);
}

.drs-scroll {
  max-height: calc(100vh - 60px - 9vh - 7rem);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.25rem 0.5rem 0.75rem;
  scrollbar-width: thin;
  scrollbar-color: rgba(99, 102, 241, 0.45) transparent;
}
.drs-scroll::-webkit-scrollbar {
  width: 8px;
}
.drs-scroll::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.35);
  border-radius: 8px;
}

.drs-path-outline {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-width: 56rem;
  margin: 0 auto;
}

.drs-path-row {
  position: relative;
  border-left: 2px solid #e2e8f0;
  padding: 0.5rem 1rem 0.5rem 1.25rem;
  transition: all 0.2s ease;
  background: transparent;
}
.drs-path-row:hover {
  background: rgba(248, 250, 252, 0.5);
}

.drs-path-focus {
  border-left-color: #6366f1;
  background: #f8fafc;
  border-radius: 0 12px 12px 0;
  box-shadow: 1px 1px 8px rgba(15, 23, 42, 0.03);
}

.drs-path-focus--primary {
  border-left-width: 3px;
  background: linear-gradient(to right, #eef2ff, #f8fafc 80%);
  box-shadow: -1px 1px 8px rgba(99, 102, 241, 0.1);
}

.drs-path-standalone {
  border-left: none;
  background: #fff;
  border: 1px solid #a5b4fc;
  border-radius: 14px;
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.2), 0 4px 20px rgba(99, 102, 241, 0.08);
}

.drs-glass {
  position: relative;
  border-radius: 14px;
  padding: 1rem 1.15rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.drs-glass::before {
  display: none;
}

.drs-glass-h {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.drs-counter-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(99, 102, 241, 0.08));
  color: #3730a3;
  border: 1px solid rgba(99, 102, 241, 0.25);
}
.drs-counter-pill.sm {
  font-size: 0.72rem;
  padding: 0.15rem 0.45rem;
}
.drs-counter-pill.xs {
  font-size: 0.65rem;
  min-width: 1.5rem;
}

.drs-focus-tag {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #4f46e5;
  background: rgba(199, 210, 254, 0.5);
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}

.drs-focus-micro {
  font-size: 0.65rem;
  font-weight: 500;
  color: #64748b;
  margin-left: 0.35rem;
}

.drs-rich {
  position: relative;
  z-index: 1;
  font-size: 0.95rem;
  line-height: 1.55;
  color: #0f172a;
}
.drs-rich.sm {
  font-size: 0.82rem;
}

.drs-branch {
  max-width: 58rem;
  margin: 0 auto;
}
.drs-branch-crumb,
.drs-branch-under {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: #334155;
}
.muted {
  color: rgba(51, 65, 85, 0.65);
  margin-right: 0.35rem;
}

.drs-sibling-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.drs-nested-wrap {
  margin-top: 0.75rem;
  padding-top: 0.65rem;
  border-top: 1px dashed rgba(148, 163, 184, 0.5);
}
.drs-nested-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(15, 23, 42, 0.45);
  margin-bottom: 0.35rem;
}
.drs-nested-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.drs-nested-li {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  padding: 0.45rem 0.5rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.35);
}

.drs-full-wrap {
  max-height: calc(100vh - 60px - 9vh - 7rem);
}
.drs-glass-full {
  max-width: 62rem;
  margin: 0 auto;
}
.drs-full-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #334155;
}
.drs-full-html {
  max-width: none;
}

.drs-full-wrap /deep/ .action-node.drs-daily-focus {
  background: rgba(238, 242, 255, 0.7) !important;
  border-left: 3px solid #6366f1 !important;
  border-radius: 4px;
  scroll-margin-top: 120px;
  scroll-margin-bottom: 120px;
}

/* -------------------------------------------------------------------------- */
/* Action tree hierarchy — parity with TentativeDashboard .action-content-cell */
/* Server HTML uses .action-node.level-N, .node-marker, .node-content           */
/* -------------------------------------------------------------------------- */
.drs-action-tree {
  text-align: left !important;
  vertical-align: top !important;
  padding: 0.5rem 0 !important;
  overflow: visible !important;
  word-wrap: break-word;
  line-height: 1.45;
  max-width: 100% !important;
  position: relative;
  box-sizing: border-box;
}

.drs-action-tree /deep/ ul,
.drs-action-tree /deep/ ol {
  margin: 6px 0;
  padding-left: 0;
  list-style: none;
}

.drs-action-tree /deep/ li {
  margin: 3px 0;
  list-style: none;
  display: flex;
  align-items: flex-start;
  line-height: 1.35;
}

.drs-action-tree /deep/ .list-marker {
  font-weight: 600;
  margin-right: 6px;
  min-width: 18px;
  color: #1e40af;
  flex-shrink: 0;
}

.drs-action-tree /deep/ .action-node {
  display: flex !important;
  align-items: flex-start !important;
  margin: 4px 0 !important;
  padding: 2px 0 !important;
  line-height: 1.4 !important;
  font-size: inherit !important;
}

.drs-action-tree /deep/ .action-node .node-marker {
  flex-shrink: 0 !important;
  margin-right: 8px !important;
  font-weight: bold !important;
  min-width: 24px !important;
  text-align: left !important;
}

.drs-action-tree /deep/ .action-node .node-content {
  flex: 1 !important;
  word-break: break-word !important;
  color: #000 !important;
}

.drs-action-tree /deep/ .action-node.level-1 {
  margin-left: 0 !important;
}
.drs-action-tree /deep/ .action-node.level-2 {
  margin-left: 20px !important;
  padding-left: 4px !important;
}
.drs-action-tree /deep/ .action-node.level-3 {
  margin-left: 40px !important;
  padding-left: 6px !important;
}
.drs-action-tree /deep/ .action-node.level-4 {
  margin-left: 60px !important;
  padding-left: 6px !important;
}
.drs-action-tree /deep/ .action-node.level-5 {
  margin-left: 80px !important;
  padding-left: 6px !important;
}
.drs-action-tree /deep/ .action-node.level-6 {
  margin-left: 100px !important;
  padding-left: 6px !important;
}
.drs-action-tree /deep/ .action-node.level-7 {
  margin-left: 120px !important;
  padding-left: 6px !important;
}
.drs-action-tree /deep/ .action-node.level-8 {
  margin-left: 140px !important;
  padding-left: 6px !important;
}

.drs-action-tree /deep/ .action-node.style-decimal .node-marker,
.drs-action-tree /deep/ .action-node.style-lower-alpha .node-marker,
.drs-action-tree /deep/ .action-node.style-lower-roman .node-marker,
.drs-action-tree /deep/ .action-node.style-bullet .node-marker {
  font-weight: bold !important;
}

.drs-action-tree /deep/ .action-node .node-content .review-date {
  font-size: 0.85em !important;
  color: #333 !important;
  font-weight: 700 !important;
  margin-left: 8px !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  display: inline-block !important;
  line-height: 1.2 !important;
}

.drs-action-tree /deep/ .action-node .node-content .review-date.today {
  color: #d32f2f !important;
  font-weight: 600 !important;
}

.drs-action-tree /deep/ .action-node.completed {
  color: green !important;
  border-radius: 4px !important;
  padding: 4px 8px !important;
}
.drs-action-tree /deep/ .action-node.completed .node-content {
  color: rgb(0, 180, 0) !important;
  font-weight: 500 !important;
}
.drs-action-tree /deep/ .action-node.completed .node-marker {
  font-weight: 600 !important;
}

.drs-action-tree /deep/ p {
  margin: 0.25em 0 !important;
}
.drs-action-tree /deep/ br {
  line-height: 1.2 !important;
}

/* Tables inside action HTML — match dashboard (override global purple test rules) */
.drs-action-tree /deep/ table {
  width: 100% !important;
  max-width: 100% !important;
  border-collapse: collapse !important;
  margin: 0.4rem 0 !important;
  font-size: 0.75rem !important;
  table-layout: auto !important;
}

.drs-action-tree /deep/ table th,
.drs-action-tree /deep/ table td {
  border: 1px solid #222 !important;
  padding: 3px !important;
  text-align: center !important;
  vertical-align: middle !important;
  font-size: 0.7rem !important;
  background-color: #fff !important;
}

.drs-action-tree /deep/ table th {
  background-color: #f3f4f6 !important;
  font-weight: 600 !important;
}
</style>
