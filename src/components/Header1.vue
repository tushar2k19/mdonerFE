<template>
  <header class="header header-texture shadow-lg text-white">
    <div class="header-container container mx-auto px-6 py-3 flex items-center">
      
      <!-- Logo and Title -->
      <router-link to="/" class="logo-section flex items-center gap-3 flex-shrink-0">
        <div class="ne-box bg-white text-indigo-700 font-bold text-xl rounded-md w-10 h-10 flex items-center justify-center shadow-md">
          NE
        </div>
        <h1 class="volve-text text-xl font-bold">volve</h1>
      </router-link>

      <!-- Navigation Links - Centered -->
      <nav v-if="isAuthenticated" class="nav-center flex-1 flex justify-center items-center space-x-2 bg-black/20 p-1 rounded-full mx-8">
        <!-- Debug info -->
        <span v-if="filteredNavigationRoutes.length === 0" style="color: red; font-size: 12px;">
          No routes found! Auth: {{ isAuthenticated }}, Role: {{ userRole }}
        </span>
        <router-link
          v-for="route in filteredNavigationRoutes"
          :key="route.path"
          :to="route.path"
          class="nav-link px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 relative overflow-hidden group"
          :class="{ 
            'active bg-white text-indigo-600 shadow-sm': $route.path === route.path,
            'text-blue-200': $route.path !== route.path
          }"
        >
          <span class="relative z-10 transition-colors duration-300" :class="{ 'group-hover:text-white': $route.path !== route.path }">
          {{ route.label }}
          </span>
          <span 
            v-if="$route.path !== route.path"
            class="absolute inset-0 bg-white/10 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left z-0"
          ></span>
        </router-link>
      </nav>

      <!-- Action Buttons -->
      <div class="nav-right flex items-center space-x-4 flex-shrink-0">
        <NotificationComponent
          v-if="isAuthenticated"
          class="notification-wrapper"
          :is-loading="isLoading"
        />
        <button
          v-if="isAuthenticated"
          class="btn-auth flex items-center space-x-2 border border-blue-400 px-4 py-2 rounded-full text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-colors duration-300"
          @click="handleSignOut"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Log out</span>
        </button>
        <router-link
          v-else
          to="/login"
          class="btn-auth flex items-center space-x-2 border border-blue-400 px-4 py-2 rounded-full text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-colors duration-300"
        >
          <span>Login</span>
        </router-link>
      </div>
    </div>
  </header>
</template>

<script>
import NotificationComponent from './NotificationComponent.vue'

export default {
  name: 'Header',
  components: {
    NotificationComponent
  },
  props: {
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      navigationRoutes: [
        { path: '/', label: 'Home' },
        // { path: '/daily-dashboard', label: 'Daily Dashboard' }, // COMMENTED OUT
        { path: '/tentative', label: 'Editor Dashboard', requiresEditor: true }, // Renamed from 'Illustrative Dashboard'
        { path: '/final', label: 'Full Dashboard' },
        // { path: '/completed-tasks', label: 'Completed Tasks', requiresEditor: true }, // COMMENTED OUT
        { path: '/review-tasks', label: 'Review Tasks' },
        // { path: '/system-logs', label: 'System Logs', requiresEditor: true } // COMMENTED OUT
      ]
    }
  },
  computed: {
    isAuthenticated () {
      const hasUserInfo = document.cookie.split(';').some(cookie =>
        cookie.trim().startsWith('user_info=')
      )
      const isSignedIn = localStorage.getItem('signedIn') !== null
      return hasUserInfo && isSignedIn
    },

    userRole () {
      const userInfoCookie = document.cookie.split(';').find(cookie =>
        cookie.trim().startsWith('user_info=')
      )
      if (userInfoCookie) {
        try {
          const userInfo = JSON.parse(decodeURIComponent(userInfoCookie.split('=')[1]))
          return userInfo.role ? userInfo.role.toLowerCase() : null
        } catch (error) {
          return null
        }
      }
      return null
    },

    filteredNavigationRoutes () {
      // Custom logic for editor and reviewer roles
      if (this.userRole === 'editor') {
        return [
          { path: '/', label: 'Home' },
          // { path: '/daily-dashboard', label: 'Daily Dashboard' }, // COMMENTED OUT
          { path: '/tentative', label: 'Editor Dashboard' },
          { path: '/final', label: 'Full Dashboard' },
          // { path: '/completed-tasks', label: 'Completed Tasks' }, // COMMENTED OUT
          { path: '/review-tasks', label: 'Review Tasks' },
          // { path: '/system-logs', label: 'System Logs' } // COMMENTED OUT
        ]
      } else if (this.userRole === 'reviewer') {
        return [
          { path: '/', label: 'Home' },
          // { path: '/daily-dashboard', label: 'Daily Dashboard' }, // COMMENTED OUT
          { path: '/final', label: 'Full Dashboard' },
          { path: '/review-tasks', label: 'Review Tasks' }
        ]
      } else {
        // Default: show only Home
        return [
          { path: '/', label: 'Home' }
        ]
      }
    }
  },
  methods: {
    async handleSignOut () {
      try {
        await this.$http.secured.delete('/signout')
        document.cookie = 'user_info=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        localStorage.removeItem('signedIn')
        this.$router.replace('/login')
      } catch (error) {
        console.error('Signout failed:', error)
        this.$toast.error('Failed to sign out. Please try again.')
      }
    }
  }
}
</script>

<style>
/* Global styles to prevent horizontal scroll */
html, body {
  overflow-x: hidden !important;
  max-width: 100vw !important;
}
</style>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

* {
  font-family: 'Poppins', sans-serif;
  box-sizing: border-box;
}

/* Custom texture style for the header background */
.header-texture {
  background-color: #070e58;
  background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 4px 4px;
}

.header {
  position: sticky;
  top: 0;
  z-index: 1000;
  overflow-x: hidden;
  width: 100%;
}

.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.text-white {
  color: #ffffff;
}

.container {
  max-width: 100%;
  width: 100%;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.px-6 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.py-3 {
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

.flex {
  display: flex;
}

.justify-between {
  justify-content: space-between;
}

.justify-center {
  justify-content: center;
}

.items-center {
  align-items: center;
}

.header-container {
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.flex-1 {
  flex: 1 1 0%;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

/* Logo and Title */
.logo-section {
  text-decoration: none;
}

.gap-3 {
  gap: 0.75rem;
}

.ne-box {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  background-color: #ffffff;
  color: #4f46e5;
  font-weight: 700;
  font-size: 1.25rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.volve-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
}

/* Navigation */
.nav-center {
  gap: 0.5rem;
}

.mx-8 {
  margin-left: 2rem;
  margin-right: 2rem;
}

.hidden {
  display: none;
}

@media (min-width: 768px) {
  .md\:flex {
  display: flex;
  }
}

.space-x-2 > * + * {
  margin-left: 0.5rem;
}

.space-x-4 > * + * {
  margin-left: 0.75rem;
}

.bg-black\/20 {
  background-color: rgba(0, 0, 0, 0.2);
}

.p-1 {
  padding: 0.25rem;
}

.rounded-full {
  border-radius: 9999px;
}

.nav-link {
  text-decoration: none;
  position: relative;
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.font-medium {
  font-weight: 500;
}

.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.duration-300 {
  transition-duration: 300ms;
}

.relative {
  position: relative;
}

.overflow-hidden {
  overflow: hidden;
}

.group:hover .group-hover\:text-white {
  color: #ffffff;
}

.group:hover .group-hover\:scale-x-100 {
  transform: scaleX(1);
}

.bg-white {
  background-color: #ffffff;
}

.text-indigo-600 {
  color: #4f46e5;
}

.text-blue-200 {
  color: #bfdbfe;
}

.shadow-sm {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.z-10 {
  z-index: 10;
}

.z-0 {
  z-index: 0;
}

.absolute {
  position: absolute;
}

.inset-0 {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.bg-white\/10 {
  background-color: rgba(255, 255, 255, 0.1);
}

.transform {
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.scale-x-0 {
  --tw-scale-x: 0;
  transform: scaleX(0);
}

.transition-transform {
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.ease-out {
  transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
}

.origin-left {
  transform-origin: left;
}

/* Action Buttons */
.nav-right {
  position: relative;
  flex-shrink: 0;
  margin-left: auto;
}

.notification-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  overflow: visible;
}

.btn-auth {
  cursor: pointer;
  text-decoration: none;
  border-width: 1.5px;
  border-style: solid;
  background-color: transparent;
  white-space: nowrap;
  flex-shrink: 0;
}

.border-blue-400 {
  border-color: #60a5fa;
}

.btn-auth:hover {
  background-color: #ffffff;
}

.btn-auth:hover,
.btn-auth:hover span,
.btn-auth:hover svg {
  color: #070e58;
}

.h-5 {
  height: 1.25rem;
}

.w-5 {
  width: 1.25rem;
}

.w-10 {
  width: 2.5rem;
}

.h-10 {
  height: 2.5rem;
}

.text-xl {
  font-size: 1.25rem;
  line-height: 1.75rem;
}

.font-bold {
  font-weight: 700;
}

.rounded-md {
  border-radius: 0.375rem;
}

@media (max-width: 768px) {
  .header-container {
    padding: 0.5rem 0.75rem;
  }
  .px-6 {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
  .nav-center {
    display: none !important;
  }
  .mx-8 {
    margin-left: 0;
    margin-right: 0;
  }
  .logo-section {
    gap: 0.5rem;
  }
  .ne-box {
    width: 2rem;
    height: 2rem;
    font-size: 1rem;
  }
  .volve-text {
    font-size: 1.125rem;
  }
  .nav-right {
    gap: 0.5rem;
  }
  .space-x-4 > * + * {
    margin-left: 0.5rem;
  }
  .btn-auth {
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
  }
  .btn-auth svg {
    width: 1rem;
    height: 1rem;
  }
  .btn-auth span:last-child {
    display: none;
  }
}

@media (max-width: 480px) {
  .px-6 {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
  .nav-right {
    gap: 0.25rem;
  }
  .space-x-4 > * + * {
    margin-left: 0.25rem;
  }
}
</style>