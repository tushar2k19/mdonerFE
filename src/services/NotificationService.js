// src/services/NotificationService.js
let sharedLegacyEventSource = null

function bindLegacyHandlers (eventSource, onMessage, onError) {
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (onMessage) onMessage(data)
    } catch (e) {
      console.error('Error parsing SSE data:', e)
    }
  }

  eventSource.onerror = (error) => {
    console.error('SSE Error:', error)
    if (onError) onError(error)
  }
}

class NotificationService {
  constructor (axiosInstance) {
    this.http = axiosInstance
  }

  async fetchNotifications () {
    try {
      const response = await this.http.get('/notifications')
      return response.data
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
  }

  subscribeToStream (onMessage, onError) {
    const token = localStorage.getItem('jwt_access')
    if (!token) return null

    if (
      sharedLegacyEventSource &&
      (sharedLegacyEventSource.readyState === EventSource.OPEN ||
        sharedLegacyEventSource.readyState === EventSource.CONNECTING)
    ) {
      bindLegacyHandlers(sharedLegacyEventSource, onMessage, onError)
      return sharedLegacyEventSource
    }

    const baseUrl = this.http.defaults.baseURL || ''
    sharedLegacyEventSource = new EventSource(`${baseUrl}/notifications/stream?token=${token}`)
    bindLegacyHandlers(sharedLegacyEventSource, onMessage, onError)
    return sharedLegacyEventSource
  }

  async markAsRead (notificationId) {
    try {
      await this.http.put(`/notification/${notificationId}/mark_as_read`)
      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  async markAllAsRead () {
    try {
      await this.http.put('/notifications/mark_all_as_read')
      return true
    } catch (error) {
      console.error('Error marking all as read:', error)
      return false
    }
  }
}

export default NotificationService
