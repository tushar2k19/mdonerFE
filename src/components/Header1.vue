<template>
  <header class="header">
    <div class="header-container">
      <div class="logo-section">
        <div class="govt-logo">
          <span class="ne">NE</span><span class="volve">volve</span>
        </div>
      </div>

      <nav class="nav-center" v-if="isAuthenticated">
        <router-link
          v-for="route in navigationRoutes"
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
  data() {
    return {
      navigationRoutes: [
        { path: '/', label: 'Home' },
        { path: '/tentative', label: 'Illustrative Dashboard' },
        // { path: '/final', label: 'Final Dashboard' },
      ]
    }
  },
  computed: {
    isAuthenticated() {
      const hasUserInfo = document.cookie.split(';').some(cookie =>
        cookie.trim().startsWith('user_info=')
      )
      const isSignedIn = localStorage.getItem('signedIn') !== null
      return hasUserInfo && isSignedIn
    }
  },
  methods: {
    async handleSignOut() {
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
  background: white;
  border-bottom: 1px solid #E5E7EB;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-container {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
}

.logo-section {
  display: flex;
  align-items: center;
}

.govt-logo {
  font-size: 28px;  /* Increased from 24px to 28px */
  font-weight: 700;
  display: flex;
  align-items: center;
  line-height: 1;  /* Added to improve vertical alignment */
  letter-spacing: -0.5px;  /* Added to improve text spacing */
}

.ne {
  color: #0066FF;
  font-weight: bolder;
  font-size: 40px;

}

.volve {
  color: #009951;
  font-weight: bolder;
  font-size: 40px;
}

.nav-center {
  display: flex;
  gap: 8px;
  align-items: center;
  background: white;
  padding: 4px;
  border-radius: 8px;
}

.nav-link {
  text-decoration: none;
  color: #1F2937;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 20px;
  height: 36px;
  min-width: fit-content;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border: none;
}

.nav-link:not(.active) {
  background: #F0F3FF;
}

.nav-link:hover:not(.active) {
  background: #E8F0FE;
}

.nav-link.active {
  background: #0066FF;
  color: white;
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
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  text-decoration: none;
  color: #1F2937;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-auth:hover {
  background: #F9FAFB;
}

.logout-icon {
  font-size: 16px;
  color: #1F2937;
}

@media (max-width: 768px) {
  .header-container {
    padding: 0.5rem 1rem;
  }

  .nav-center {
    gap: 6px;
  }

  .nav-link {
    padding: 6px 12px;
    font-size: 13px;
  }

  .govt-logo {
    font-size: 24px;  /* Adjusted mobile size */
  }

  .nav-right {
    gap: 1rem;
  }

  .btn-auth {
    padding: 6px 12px;
    font-size: 13px;
  }
}
</style>
