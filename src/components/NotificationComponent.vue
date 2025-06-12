<template>
  <div class="notification-wrapper" v-click-outside="closeNotifications">
    <div class="notification-icon" @click="toggleNotifications">
      <img src="../assets/img/bell.png" alt="notifications" class="bell-icon"/>
      <span v-if="unreadCount > 0" class="notification-badge">
        {{ unreadCount }}
      </span>
    </div>

    <div v-if="showNotifications" class="notification-panel">
      <div class="notification-header">
        <h3>Notifications</h3>
        <button
          v-if="unreadCount > 0"
          @click="handleMarkAllAsRead"
          class="btn-mark-all"
        >
          Mark all as read
        </button>
      </div>

      <div class="notification-list">
        <template v-if="notifications.length > 0">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            :class="['notification-item', { 'unread': !notification.read }]"
            @click="handleNotificationClick(notification)"
          >
            <p class="notification-message">{{ notification.message }}</p>
            <small class="notification-time">{{ formatDate(notification.created_at) }}</small>
          </div>
        </template>
        <div v-else class="no-notifications">
          No notifications
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NotificationService from '../services/NotificationService'

export default {
  name: 'NotificationComponent',

  data() {
    return {
      showNotifications: false,
      notifications: [],
      refreshInterval: null,
      notificationService: null
    }
  },

  computed: {
    unreadCount() {
      return this.notifications.filter(n => !n.read).length
    }
  },

  created() {
    this.notificationService = new NotificationService(this.$http.secured)
    this.initializeNotifications()
    this.bus.$on('notifications-updated', this.fetchNotifications)
  },

  mounted() {
    this.refreshInterval = setInterval(() => this.fetchNotifications(), 30000)
  },

  beforeDestroy () {
    this.bus.$off('notifications-updated', this.fetchNotifications)
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  },

  methods: {
    async initializeNotifications () {
      await this.fetchNotifications()
    },

    async fetchNotifications() {
      try {
        this.notifications = await this.notificationService.fetchNotifications()
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    },

    async handleNotificationClick(notification) {
      try {
        if (!notification.read) {
          await this.notificationService.markAsRead(notification.id)
          notification.read = true
        }
        this.$router.push({
          name: 'TentativeDashboard',
          query: { highlightTaskId: notification.task_id }
        })
        setTimeout(() => {
          this.$router.replace({
            name: 'TentativeDashboard'
          })
        }, 3000)
        this.showNotifications = false
      } catch (error) {
        console.error('Error handling notification click:', error)
      }
    },

    async handleMarkAllAsRead() {
      try {
        const success = await this.notificationService.markAllAsRead()
        if (success) {
          this.notifications = this.notifications.map(n => ({ ...n, read: true }))
        }
      } catch (error) {
        console.error('Error marking all as read:', error)
      }
    },

    toggleNotifications() {
      this.showNotifications = !this.showNotifications
      if (this.showNotifications) {
        this.fetchNotifications()
      }
    },

    closeNotifications() {
      this.showNotifications = false
    },

    formatDate(date) {
      return new Date(date).toLocaleString()
    }
  },

  directives: {
    'click-outside': {
      bind(el, binding) {
        el.clickOutsideEvent = function(event) {
          if (!(el === event.target || el.contains(event.target))) {
            binding.value(event)
          }
        }
        document.addEventListener('click', el.clickOutsideEvent)
      },
      unbind(el) {
        document.removeEventListener('click', el.clickOutsideEvent)
      }
    }
  }
}
</script>

<style scoped>

.notification-wrapper {
  position: relative;
}

.notification-icon {
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.bell-icon {
  height: 24px;
  width: 24px;
  /* Change from inverting to using a blue filter */
  filter: invert(29%) sepia(93%) saturate(1079%) hue-rotate(182deg) brightness(91%) contrast(101%);
  transition: all 0.3s ease;
}

.notification-icon:hover .bell-icon {
  transform: scale(1.1);
  /* Slightly adjust the filter on hover for a different shade of blue */
  filter: invert(21%) sepia(85%) saturate(1942%) hue-rotate(187deg) brightness(94%) contrast(101%);
}

.notification-icon:active .bell-icon {
  transform: scale(0.95);
}

.notification-badge {
  position: absolute;
  top: -8px;
  right: -6px;
  background: #dc3545;
  color: white;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  animation: pulse 2s infinite;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(220, 53, 69, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0);
  }
}

.notification-panel {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: 0;
  width: 380px;
  max-height: 480px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  animation: slideIn 0.3s ease;
  border: 1px solid rgba(0, 70, 128, 0.1);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.notification-header {
  background: #0066FF;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-header h3 {
  color: white;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn-mark-all {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.btn-mark-all:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.notification-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
}

.notification-item {
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 70, 128, 0.1);
}

.notification-item:hover {
  transform: translateX(2px);
  background: rgba(0, 70, 128, 0.05);
}

.notification-item.unread {
  background: linear-gradient(
    to right,
    rgba(0, 70, 128, 0.1),
    rgba(0, 54, 102, 0.05)
  );
  border-left: 3px solid #004680;
}

.notification-message {
  margin: 0 0 0.5rem 0;
  color: #1f2937;
  line-height: 1.5;
  font-size: 0.925rem;
}

.notification-time {
  color: #6b7280;
  font-size: 0.8rem;
  display: block;
  margin-top: 0.5rem;
}

.no-notifications {
  padding: 2rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.925rem;
  background: linear-gradient(
    to right,
    rgba(0, 70, 128, 0.02),
    rgba(0, 54, 102, 0.02)
  );
}

/* Custom scrollbar */
.notification-list::-webkit-scrollbar {
  width: 6px;
}

.notification-list::-webkit-scrollbar-track {
  background: rgba(0, 70, 128, 0.05);
  border-radius: 3px;
}

.notification-list::-webkit-scrollbar-thumb {
  background: #004680;
  border-radius: 3px;
}

/* Animation for new notifications */
@keyframes highlight {
  0% {
    transform: translateX(0);
    background: rgba(0, 70, 128, 0.2);
  }
  50% {
    transform: translateX(4px);
  }
  100% {
    transform: translateX(0);
    background: linear-gradient(
      to right,
      rgba(0, 70, 128, 0.1),
      rgba(0, 54, 102, 0.05)
    );
  }
}

.notification-item.unread:first-child {
  animation: highlight 1s ease;
}
</style>
