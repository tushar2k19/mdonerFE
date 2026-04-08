<template>
  <div ref="root" class="fp-select" :class="{ open: isOpen, disabled }">
    <button
      type="button"
      class="fp-trigger"
      :aria-label="ariaLabel || placeholder"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :disabled="disabled"
      @click="toggleMenu"
    >
      <span v-if="selectedOption && selectedOption.accent" class="fp-trigger-accent" aria-hidden="true">
        <span v-if="selectedOption.accent === 'triple'" class="fp-triple fp-triple--sm">
          <span class="fp-swatch fp-swatch--green"></span>
          <span class="fp-swatch fp-swatch--blue"></span>
          <span class="fp-swatch fp-swatch--red"></span>
        </span>
        <span
          v-else
          class="fp-strip fp-strip--sm"
          :class="'fp-strip--' + selectedOption.accent"
        ></span>
      </span>
      <span class="fp-value" :class="{ 'is-placeholder': !selectedOption }">
        {{ selectedOption ? selectedOption.label : placeholder }}
      </span>
      <svg class="fp-chevron" :class="{ open: isOpen }" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <transition name="fp-menu">
      <div v-if="isOpen" class="fp-menu" role="listbox">
        <template v-if="normalizedOptions.length">
          <button
            v-for="opt in normalizedOptions"
            :key="String(opt.value)"
            type="button"
            class="fp-option"
            :class="{ selected: isSelected(opt), disabled: !!opt.disabled }"
            :disabled="!!opt.disabled"
            @click="onSelect(opt)"
          >
            <span v-if="opt.accent" class="fp-option-accent" aria-hidden="true">
              <span v-if="opt.accent === 'triple'" class="fp-triple">
                <span class="fp-swatch fp-swatch--green"></span>
                <span class="fp-swatch fp-swatch--blue"></span>
                <span class="fp-swatch fp-swatch--red"></span>
              </span>
              <span
                v-else
                class="fp-strip"
                :class="'fp-strip--' + opt.accent"
              ></span>
            </span>
            <span class="fp-option-main">
              <span class="fp-option-label">{{ opt.label }}</span>
              <span v-if="opt.meta" class="fp-option-meta">{{ opt.meta }}</span>
            </span>
            <svg
              v-if="isSelected(opt)"
              class="fp-check"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path d="M4.5 10.5L8.25 14.25L15.5 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </template>
        <div v-else class="fp-empty">No options</div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'FilterPrettySelect',
  props: {
    value: {
      type: [String, Number, Boolean],
      default: ''
    },
    options: {
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: 'Select option'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    ariaLabel: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      isOpen: false
    }
  },
  computed: {
    normalizedOptions () {
      return (this.options || []).map((opt) => {
        if (opt && typeof opt === 'object') {
          const accent = opt.accent != null && opt.accent !== ''
            ? String(opt.accent)
            : null
          return {
            value: opt.value,
            label: opt.label != null ? String(opt.label) : String(opt.value),
            meta: opt.meta != null ? String(opt.meta) : '',
            disabled: !!opt.disabled,
            accent: accent === 'triple' || accent === 'red' || accent === 'green' || accent === 'blue'
              ? accent
              : null
          }
        }
        return {
          value: opt,
          label: String(opt),
          meta: '',
          disabled: false,
          accent: null
        }
      })
    },
    selectedOption () {
      return this.normalizedOptions.find(opt => this.isSelected(opt)) || null
    }
  },
  mounted () {
    document.addEventListener('click', this.onDocumentClick, true)
    document.addEventListener('keydown', this.onDocumentKeydown, true)
  },
  beforeDestroy () {
    document.removeEventListener('click', this.onDocumentClick, true)
    document.removeEventListener('keydown', this.onDocumentKeydown, true)
  },
  methods: {
    toggleMenu () {
      if (this.disabled) return
      this.isOpen = !this.isOpen
    },
    closeMenu () {
      this.isOpen = false
    },
    isSelected (opt) {
      return String(opt.value) === String(this.value)
    },
    onSelect (opt) {
      if (opt.disabled) return
      this.$emit('input', opt.value)
      this.$emit('change', opt.value)
      this.closeMenu()
    },
    onDocumentClick (event) {
      if (!this.isOpen) return
      const root = this.$refs.root
      if (!root || root.contains(event.target)) return
      this.closeMenu()
    },
    onDocumentKeydown (event) {
      if (!this.isOpen) return
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault()
        this.closeMenu()
      }
    }
  }
}
</script>

<style scoped>
.fp-select {
  position: relative;
  width: 100%;
}

.fp-trigger {
  width: 100%;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.4rem 0.55rem;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.fp-trigger-accent {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.fp-trigger:hover {
  border-color: #93c5fd;
  background: #ffffff;
}

.fp-trigger:focus-visible {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.fp-select.open .fp-trigger {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

.fp-value {
  min-width: 0;
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fp-value.is-placeholder {
  color: #64748b;
  font-weight: 500;
}

.fp-chevron {
  width: 16px;
  height: 16px;
  color: #64748b;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.fp-chevron.open {
  transform: rotate(180deg);
}

.fp-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 40;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.18);
  padding: 3px;
}

.fp-option {
  width: 100%;
  border: none;
  background: transparent;
  color: #0f172a;
  border-radius: 6px;
  padding: 5px 6px 5px 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.fp-option-accent {
  flex-shrink: 0;
  width: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fp-triple {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.fp-triple--sm {
  gap: 2px;
}

.fp-swatch {
  display: block;
  width: 6px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid rgba(15, 23, 42, 0.12);
}

.fp-triple--sm .fp-swatch {
  width: 5px;
  height: 12px;
}

.fp-swatch--green { background: #86efac; }
.fp-swatch--blue { background: #93c5fd; }
.fp-swatch--red { background: #fca5a5; }

.fp-strip {
  display: block;
  width: 4px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid rgba(15, 23, 42, 0.1);
}

.fp-strip--sm {
  width: 3px;
  height: 14px;
}

.fp-strip--red { background: linear-gradient(180deg, #fecaca 0%, #f87171 100%); }
.fp-strip--green { background: linear-gradient(180deg, #bbf7d0 0%, #4ade80 100%); }
.fp-strip--blue { background: linear-gradient(180deg, #bfdbfe 0%, #60a5fa 100%); }

.fp-option:hover {
  background: #f8fafc;
}

.fp-option:focus-visible {
  outline: none;
  background: #eff6ff;
  box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.35);
}

.fp-option.selected {
  background: linear-gradient(180deg, #eff6ff 0%, #e0ecff 100%);
  color: #1d4ed8;
}

.fp-option.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.fp-option-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.fp-option-label {
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
}

.fp-option-meta {
  font-size: 0.7rem;
  color: #64748b;
  font-weight: 500;
}

.fp-check {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: #1d4ed8;
}

.fp-empty {
  padding: 10px;
  color: #64748b;
  font-size: 0.86rem;
}

.fp-menu::-webkit-scrollbar {
  width: 8px;
}

.fp-menu::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.fp-menu::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 999px;
}

.fp-menu-enter-active,
.fp-menu-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.fp-menu-enter,
.fp-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
