// Meeting-workflow notifications (isolated from legacy NotificationService).
let sharedMeetingEventSource = null

function bindMeetingHandlers (eventSource, onMessage, onError) {
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (onMessage) onMessage(data)
    } catch (e) {
      console.error('Error parsing meeting SSE data:', e)
    }
  }

  eventSource.onerror = (error) => {
    console.debug('Meeting SSE error; slow poll fallback may run.', error)
    if (onError) onError(error)
  }
}

class MeetingNotificationService {
  constructor (axiosInstance) {
    this.http = axiosInstance
  }

  async fetchNotifications () {
    try {
      const response = await this.http.get('/meeting_pack_notifications')
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error('Error fetching meeting notifications:', error)
      return []
    }
  }

  subscribeToStream (onMessage, onError) {
    const token = localStorage.getItem('jwt_access')
    if (!token) return null

    if (
      sharedMeetingEventSource &&
      (sharedMeetingEventSource.readyState === EventSource.OPEN ||
        sharedMeetingEventSource.readyState === EventSource.CONNECTING)
    ) {
      bindMeetingHandlers(sharedMeetingEventSource, onMessage, onError)
      return sharedMeetingEventSource
    }

    const baseUrl = this.http.defaults.baseURL || ''
    sharedMeetingEventSource = new EventSource(
      `${baseUrl}/meeting_pack_notifications/stream?token=${encodeURIComponent(token)}`
    )
    bindMeetingHandlers(sharedMeetingEventSource, onMessage, onError)
    return sharedMeetingEventSource
  }

  async markRead (notificationId) {
    try {
      await this.http.put(`/meeting_pack_notifications/${notificationId}/read`)
      return true
    } catch (error) {
      console.error('Error marking meeting notification read:', error)
      return false
    }
  }

  async markAllRead () {
    try {
      await this.http.put('/meeting_pack_notifications/read_all')
      return true
    } catch (error) {
      console.error('Error marking all meeting notifications read:', error)
      return false
    }
  }
}

export default MeetingNotificationService
