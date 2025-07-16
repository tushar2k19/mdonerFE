<template>
  <div v-if="showBackendDownModal" class="backend-down-modal">
    <div class="modal-overlay">
      <div class="modal-content">
        <div class="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#f44336"/>
          </svg>
        </div>
        
        <h2 class="modal-title">Service Temporarily Unavailable</h2>
        
        <div class="modal-body">
          <p class="error-message">
            We're experiencing technical difficulties with our backend service. 
            This may be due to:
          </p>
          
          <ul class="error-details">
            <li>Scheduled maintenance</li>
            <li>High server load</li>
            <li>Network connectivity issues</li>
            <li>Temporary service outage</li>
          </ul>
          
          <div class="status-info">
            <p><strong>Status:</strong> 
              <span class="status-badge offline">Offline</span>
            </p>
            <p><strong>Last Check:</strong> {{ lastCheckTime }}</p>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="retryConnection" class="retry-btn" :disabled="isRetrying">
            <span v-if="isRetrying" class="spinner"></span>
            {{ isRetrying ? 'Checking...' : 'Retry Connection' }}
          </button>
          
          <button @click="refreshPage" class="refresh-btn">
            Refresh Page
          </button>
        </div>
        
        <div class="contact-info">
          <p>If this problem persists, please contact your system administrator.</p>
          <p class="support-email">Support: tushar.jha@in.gt.com</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import backendHealthService from '../services/BackendHealthService.js'

export default {
  name: 'BackendDownModal',
  data() {
    return {
      showBackendDownModal: false,
      isRetrying: false,
      lastCheckTime: 'Just now',
      healthCheckInterval: null
    }
  },
  
  mounted() {
    // Listen for backend health changes
    window.addEventListener('backendHealthChange', this.handleHealthChange)
    
    // Start periodic status updates
    this.startStatusUpdates()
    
    // Initial check
    this.checkBackendStatus()
  },
  
  beforeDestroy() {
    window.removeEventListener('backendHealthChange', this.handleHealthChange)
    this.stopStatusUpdates()
  },
  
  methods: {
    handleHealthChange(event) {
      const { isHealthy } = event.detail
      this.showBackendDownModal = !isHealthy
      this.updateLastCheckTime()
    },
    
    async checkBackendStatus() {
      const status = backendHealthService.getBackendStatus()
      this.showBackendDownModal = !status.isHealthy
      this.updateLastCheckTime()
    },
    
    updateLastCheckTime() {
      const now = new Date()
      this.lastCheckTime = now.toLocaleTimeString()
    },
    
    startStatusUpdates() {
      this.healthCheckInterval = setInterval(() => {
        this.updateLastCheckTime()
      }, 10000) // Update every 10 seconds
    },
    
    stopStatusUpdates() {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }
    },
    
    async retryConnection() {
      this.isRetrying = true
      
      try {
        const isHealthy = await backendHealthService.checkBackendHealth()
        
        if (isHealthy) {
          this.showBackendDownModal = false
          this.$toast.success('Connection restored!')
        } else {
          this.$toast.error('Service is still unavailable')
        }
      } catch (error) {
        this.$toast.error('Failed to check connection')
      } finally {
        this.isRetrying = false
        this.updateLastCheckTime()
      }
    },
    
    refreshPage() {
      window.location.reload()
    }
  }
}
</script>

<style scoped>
.backend-down-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
}

.modal-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: 99999;
  pointer-events: all;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-icon {
  margin-bottom: 24px;
}

.modal-title {
  color: #d32f2f;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
}

.modal-body {
  margin-bottom: 30px;
}

.error-message {
  color: #666;
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 16px;
}

.error-details {
  text-align: left;
  color: #666;
  margin: 16px 0;
  padding-left: 20px;
}

.error-details li {
  margin: 8px 0;
  font-size: 14px;
}

.status-info {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: left;
}

.status-info p {
  margin: 8px 0;
  font-size: 14px;
  color: #333;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.offline {
  background: #ffebee;
  color: #d32f2f;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.retry-btn, .refresh-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.retry-btn {
  background: #1976d2;
  color: white;
}

.retry-btn:hover:not(:disabled) {
  background: #1565c0;
}

.retry-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.refresh-btn {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.refresh-btn:hover {
  background: #e0e0e0;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.contact-info {
  border-top: 1px solid #eee;
  padding-top: 20px;
  color: #666;
  font-size: 14px;
}

.contact-info p {
  margin: 8px 0;
}

.support-email {
  color: #1976d2;
  font-weight: 500;
}

/* Responsive design */
@media (max-width: 600px) {
  .modal-content {
    padding: 24px;
    margin: 20px;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .retry-btn, .refresh-btn {
    width: 100%;
    justify-content: center;
  }
}
</style> 