<template>
  <div id="app">
    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    </div>
    
    <component :is="layout" :is-loading="isLoading">
      <router-view :is-loading="isLoading" />
    </component>
  </div>
</template>

<script>
import Header1 from './components/Header1.vue'

const AuthenticatedLayout = {
  components: { Header1 },
  props: ['isLoading'],
  template: `
    <div>
      <Header1 class="header" :is-loading="isLoading"/>
      <div class="content-wrapper">
        <slot></slot>
      </div>
    </div>
  `
}

const UnauthenticatedLayout = {
  props: ['isLoading'],
  template: `
    <div><slot></slot></div>
  `
}

export default {
  name: 'App',
  data () {
    return {
      isAuthenticated: true,
      isLoading: false,
      loadingRequestCount: 0
    }
  },
  computed: {
    layout () {
      return this.isAuthenticated ? AuthenticatedLayout : UnauthenticatedLayout
    }
  },
  watch: {
    $route: {
      immediate: true,
      handler () {
        this.checkAuthStatus()
      }
    }
  },
  created() {
    // Make loading methods globally available
    this.setupGlobalLoading()
  },
  methods: {
    checkAuthStatus () {
      const newAuthStatus = !!localStorage.getItem('signedIn')
      if (this.isAuthenticated !== newAuthStatus) {
        this.isAuthenticated = newAuthStatus
        this.$nextTick(() => {
          window.scrollTo(0, 0)
          console.log('Forced re-render and attempted scroll')
        })
      }
    },
    
    setupGlobalLoading() {
      // Make loading methods globally available
      window.showGlobalLoading = () => {
        this.loadingRequestCount++
        this.isLoading = true
      }
      
      window.hideGlobalLoading = () => {
        this.loadingRequestCount = Math.max(0, this.loadingRequestCount - 1)
        if (this.loadingRequestCount === 0) {
          this.isLoading = false
        }
      }
    }
  }
}
</script>

<style>

* {
  margin: 0;
  padding: 0;
}

/* Loading Overlay Styles */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner p {
  font-size: 16px;
  font-weight: 500;
}

/* Disable pointer events when loading */
.loading-overlay ~ * {
  pointer-events: none;
}

/* Global table styles to ensure tables are always displayed */
table {
  border-spacing: 0;
  border-collapse: collapse;
  display: table !important;
}

thead {
  display: table-header-group !important;
}

tbody {
  display: table-row-group !important;
}

tr {
  display: table-row !important;
}

th, td {
  display: table-cell !important;
}

/* Additional global table debug styles - should override any issues */
.rich-text-display table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 0.5rem 0 !important;
  display: table !important;
  visibility: visible !important;
  /* Debug styles to make tables super obvious */
  /* border: 5px solid blue !important; */
  /* background-color: lime !important; */
}

.rich-text-display table th,
.rich-text-display table td {
  border: 2px solid purple !important;
  padding: 8px !important;
  text-align: left !important;
  display: table-cell !important;
  visibility: visible !important;
  background-color: white !important;
}

.rich-text-display table th {
  background-color: orange !important;
  font-weight: 600 !important;
  color: black !important;
}

/* Global review date styling to ensure it works everywhere */
.review-date {
  font-size: 0.85em !important;
  color: #333 !important;
  font-weight: 700 !important;
  margin-left: 8px !important;
  background-color: #ffeb3b !important; /* Yellow highlight background */
  padding: 2px 6px !important;
  border-radius: 4px !important;
  border: none !important;
  display: inline-block !important;
  font-family: inherit !important;
  line-height: 1.2 !important;
}

/* Global today's date styling */
.review-date.today {
  color: #d32f2f !important; /* Red text for today's date */
  font-weight: 600 !important;
  background-color: #ffeb3b !important; /* Ensure yellow background is maintained */
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
  width: 100%;
  min-height: calc(100vh - 60px);
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
