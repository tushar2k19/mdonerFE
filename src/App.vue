<template>
  <div id="app">
    <component :is="layout">
      <router-view />
    </component>
  </div>
</template>

<script>
import Header1 from './components/Header1.vue'

const AuthenticatedLayout = {
  components: { Header1 },
  template: `
    <div>
      <Header1 class="header"/>
      <div class="content-wrapper">
        <slot></slot>
      </div>
    </div>
  `
}

const UnauthenticatedLayout = {
  template: `
    <div><slot></slot></div>
  `
}

export default {
  name: 'App',
  data () {
    return {
      isAuthenticated: true
    }
  },
  computed: {
    layout() {
      return this.isAuthenticated ? AuthenticatedLayout : UnauthenticatedLayout
    }
  },
  watch: {
    $route: {
      immediate: true,
      handler() {
        this.checkAuthStatus()
      }
    }
  },
  methods: {
    checkAuthStatus() {
      const newAuthStatus = !!localStorage.getItem('signedIn')
      if (this.isAuthenticated !== newAuthStatus) {
        this.isAuthenticated = newAuthStatus
        this.$nextTick(() => {
          window.scrollTo(0, 0)
          console.log('Forced re-render and attempted scroll')
        })
      }
    },
  }
}
</script>

<style>

* {
  margin: 0;
  padding: 0;
}
ul, ol {
  margin: 0.5em 0;
  padding-left: 20px;
}

li {
  margin: 0.3em 0;
}


#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #1a1a1a;
  background-color: #f8fafc;
  min-height: 100vh;
}

.content-wrapper {
  display: flex;
  max-width: 1920px;/*
  margin: 0 auto;
  padding: 1.5rem;*/
  gap: 2rem;
}

.router-view-container {
  flex: 1;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: box-shadow 0.2s ease;
}

/* Add to your global stylesheet */
/* Add/Modify these styles in App.vue */
.pdf-capture-mode ul,
.pdf-capture-mode ol {
  list-style: none !important;
  padding-left: 0 !important;
  margin: 0.5em 0 !important;
}

.pdf-capture-mode li {
  position: relative;
  padding-left: 20px !important;  /* Reduced from 25px */
  margin-bottom: 4px !important;
  page-break-inside: avoid;
  display: flex !important;  /* Add flex layout */
  align-items: baseline;  /* Align marker with text */
}

.pdf-capture-mode li > .list-marker {
  position: static !important;  /* Remove absolute positioning */
  flex-shrink: 0;
  width: 20px !important;
  display: inline-block !important;
  margin-right: 4px !important;
}
</style>

