// src/services/NotificationService.js
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
