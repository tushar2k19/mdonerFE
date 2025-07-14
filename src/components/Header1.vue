<template>
  <header class="header">
    <div class="header-container">
      <router-link to="/" class="logo-section">
        <div class="govt-logo">
          <span class="ne">NE</span><span class="volve">volve</span>
        </div>
      </router-link>

      <nav class="nav-center" v-if="isAuthenticated">
        <router-link
          v-for="route in filteredNavigationRoutes"
          :key="route.path"
          :to="route.path"
          class="nav-link"
          :class="{ active: $route.path === route.path }"
        >
          {{ route.label }}
        </router-link>
      </nav>

      <div class="nav-right">
        <NotificationComponent
          v-if="isAuthenticated"
          class="notification-wrapper"
          :is-loading="isLoading"
        />
        <button
          v-if="isAuthenticated"
          class="btn-auth"
          @click="handleSignOut"
        >
          <span class="logout-icon">⟲</span>
          <span class="auth-text">Log out</span>
        </button>
        <router-link
          v-else
          to="/login"
          class="btn-auth"
        >
          <span class="auth-text">Login</span>
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

<style scoped>
.header {
  background: #fff;
  border-bottom: 3px solid #1e3a8a;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(30,64,175,0.04);
}

.header-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
}

.logo-section {
  display: flex;
  align-items: center;
  background: none;
  border-radius: 0;
  box-shadow: none;
  padding: 0;
  margin-right: 2rem;
  position: relative;
  overflow: visible;
  text-decoration: none;
}

.govt-logo {
  display: flex;
  align-items: center;
  font-size: 2.1rem;
  font-weight: 800;
  letter-spacing: -1px;
  color: #1e3a8a;
  background: none;
  filter: none;
  text-shadow: none;
  position: relative;
}

.ne {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2em;
  height: 1.8em;
  border-radius: 90%;
  background: #1e3a8a;
  color: #fff;
  font-size: 0.6em;
  font-weight: 800;
  margin-right: 0.15em;
  box-shadow: 0 2px 8px rgba(30,64,175,0.08);
  border: 2.5px solid #fbbf24;
  letter-spacing: 0.01em;
  padding: 6px 12px;
  color:#fbbf24
}

.volve {
  font-size: 0.9em;
  font-weight: 800;
  color: #1dc13b;
  letter-spacing: 0.01em;
  background: none;
  text-shadow:#056b0c;
  
}

/* Simple underline for logo for authority */
.govt-logo::after {
  content: '';
  display: block;
  height: 5px;
  width: 80%;
  margin: 0.18em auto 0 auto;
  border-radius: 2px;
  background: linear-gradient(90deg, #fbbf24 0%, #fff 100%);
  opacity: 0.7;
}

.nav-center {
  display: flex;
  gap: 8px;
  align-items: center;
  background: none;
  padding: 0;
  border-radius: 0;
}

.nav-link {
  text-decoration: none;
  color: #1e3a8a;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 20px;
  height: 36px;
  min-width: fit-content;
  transition: all 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  border: none;
  background: #f8fafc;
}

.nav-link:not(.active) {
  background: #f8fafc;
  color: #1e3a8a;
}

.nav-link:hover:not(.active) {
  background: #fbbf24;
  color: #1e3a8a;
}

.nav-link.active {
  background: #1e3a8a;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(30,64,175,0.08);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.notification-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.btn-auth {
  height: 36px;
  padding: 8px 16px;
  background: #fff;
  border: 1.5px solid #1e3a8a;
  border-radius: 6px;
  text-decoration: none;
  color: #1e3a8a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.18s, color 0.18s, border 0.18s;
}

.btn-auth:hover {
  background: #fbbf24;
  color: #1e3a8a;
  border-color: #fbbf24;
}

.logout-icon {
  font-size: 16px;
  color: #1e3a8a;
}

@media (max-width: 768px) {
  .header-container {
    padding: 0.5rem 1rem;
  }
  .nav-center {
    gap: 4px;
  }
  .nav-link {
    padding: 6px 10px;
    font-size: 13px;
  }
  .logo-section {
    margin-right: 0.7rem;
  }
  .govt-logo, .ne, .volve {
    font-size: 1.1rem;
  }
  .ne {
    width: 1.5em;
    height: 1.5em;
    font-size: 1em;
  }
  .nav-right {
    gap: 1rem;
  }
  .btn-auth {
    padding: 6px 10px;
    font-size: 13px;
  }
}
</style>
