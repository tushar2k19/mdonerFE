<template>
  <div class="under-development-container">
    <div class="development-card">
      <div class="header-section">
        <div class="icon-section">
          <div class="construction-icon">🚧</div>
        </div>
        
        <div class="title-section">
          <h1 class="main-title">{{ pageTitle }}</h1>
          <p class="subtitle">Currently Under Development</p>
        </div>
      </div>
      
      <div class="content-section">
        <div class="description">
          <p class="desc-text">This feature is being actively developed and will be available soon.</p>
          <p class="desc-text">Our team is working hard to bring you the best experience possible.</p>
        </div>
        
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label">Development Progress</span>
            <span class="progress-percentage">{{ progressPercentage }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
          </div>
        </div>
        
        <div class="features-section">
          <h3 class="features-title">Coming Soon:</h3>
          <div class="features-grid">
            <div class="feature-item" v-for="feature in upcomingFeatures" :key="feature.id">
              <div class="feature-icon">{{ feature.icon }}</div>
              <span class="feature-text">{{ feature.text }}</span>
            </div>
          </div>
        </div>
        
        <div class="timeline-section">
          <div class="timeline-item">
            <div class="timeline-dot active"></div>
            <div class="timeline-content">
              <h4>Planning & Design</h4>
              <p>Requirements analysis and UI/UX design</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot" :class="{ active: progressPercentage >= 30 }"></div>
            <div class="timeline-content">
              <h4>Backend Development</h4>
              <p>API endpoints and database integration</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot" :class="{ active: progressPercentage >= 60 }"></div>
            <div class="timeline-content">
              <h4>Frontend Implementation</h4>
              <p>User interface and interactive components</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot" :class="{ active: progressPercentage >= 90 }"></div>
            <div class="timeline-content">
              <h4>Testing & Launch</h4>
              <p>Quality assurance and deployment</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="footer-section">
        <div class="contact-info">
          <p>Have questions or suggestions? Contact our development team.</p>
        </div>
        <div class="action-buttons">
          <button class="btn btn-primary" @click="goBack">
            ← Go Back
          </button>
          <button class="btn btn-secondary" @click="checkUpdates">
            🔄 Check Updates
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UnderDevelopment',
  props: {
    pageTitle: {
      type: String,
      default: 'Feature'
    }
  },
  computed: {
    progressPercentage() {
      const progressMap = {
        'Daily Dashboard': 90,
        'Completed Tasks': 80,
        'Review Tasks': 60,
        'System Logs': 20
      }
      return progressMap[this.pageTitle] || 50
    },
    upcomingFeatures() {
      const featuresMap = {
        'Daily Dashboard': [
          { id: 1, icon: '📊', text: 'Real-time task status updates' },
          { id: 2, icon: '📈', text: 'Daily performance metrics' },
          { id: 3, icon: '📅', text: 'Interactive charts and graphs' },
          { id: 4, icon: '🎯', text: 'Task completion trends' },
          { id: 5, icon: '⚡', text: 'Priority-based task sorting' },
          { id: 6, icon: '🔔', text: 'Smart notifications' }
        ],
        'Completed Tasks': [
          { id: 1, icon: '✅', text: 'Task completion history' },
          { id: 2, icon: '📋', text: 'Detailed completion reports' },
          { id: 3, icon: '🏆', text: 'Achievement tracking' },
          { id: 4, icon: '📊', text: 'Performance analytics' },
          { id: 5, icon: '📤', text: 'Export capabilities' },
          { id: 6, icon: '🔍', text: 'Advanced search filters' }
        ],
        'Review Tasks': [
          { id: 1, icon: '👥', text: 'Collaborative review system' },
          { id: 2, icon: '💬', text: 'Comment and feedback tools' },
          { id: 3, icon: '🔄', text: 'Version comparison' },
          { id: 4, icon: '✍️', text: 'Inline editing capabilities' },
          { id: 5, icon: '🎨', text: 'Diff highlighting' },
          { id: 6, icon: '📝', text: 'Review workflow management' }
        ],
        'System Logs': [
          { id: 1, icon: '📜', text: 'Comprehensive activity logs' },
          { id: 2, icon: '🔍', text: 'Advanced log filtering' },
          { id: 3, icon: '⚠️', text: 'Error tracking and alerts' },
          { id: 4, icon: '📊', text: 'System performance metrics' },
          { id: 5, icon: '🔐', text: 'Security audit trails' },
          { id: 6, icon: '📈', text: 'Usage analytics' }
        ]
      }
      return featuresMap[this.pageTitle] || [
        { id: 1, icon: '🚀', text: 'Enhanced functionality' },
        { id: 2, icon: '💡', text: 'Improved user experience' },
        { id: 3, icon: '⚡', text: 'Better performance' },
        { id: 4, icon: '🎨', text: 'Modern design' }
      ]
    }
  },
  methods: {
    goBack() {
      this.$router.go(-1)
    },
    checkUpdates() {
      this.$toast.info('Checking for updates...', {
        timeout: 2000
      })
      // Simulate checking for updates
      setTimeout(() => {
        this.$toast.success('You have the latest version!', {
          timeout: 3000
        })
      }, 2000)
    }
  }
}
</script>

<style scoped>
.under-development-container {
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
}

.development-card {
  width: 100%;
  max-width: 1200px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header-section {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 40px;
  display: flex;
  align-items: center;
  gap: 30px;
  border-bottom: 1px solid #e2e8f0;
}

.icon-section {
  flex-shrink: 0;
}

.construction-icon {
  font-size: 80px;
  animation: bounce 2s infinite;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

.title-section {
  flex: 1;
}

.main-title {
  font-size: 48px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 10px 0;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 24px;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}

.content-section {
  padding: 50px;
}

.description {
  text-align: center;
  margin-bottom: 40px;
}

.desc-text {
  font-size: 18px;
  color: #475569;
  margin: 10px 0;
  line-height: 1.6;
}

.progress-section {
  margin-bottom: 50px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.progress-label {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.progress-percentage {
  font-size: 24px;
  font-weight: 700;
  color: #3b82f6;
}

.progress-bar {
  height: 12px;
  background-color: #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 6px;
  transition: width 1s ease-out;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.features-section {
  margin-bottom: 50px;
}

.features-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 25px;
  text-align: center;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border-left: 4px solid #3b82f6;
  transition: all 0.3s ease;
}

.feature-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-left-color: #8b5cf6;
}

.feature-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.feature-text {
  font-size: 16px;
  color: #374151;
  font-weight: 500;
}

.timeline-section {
  margin-bottom: 30px;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  position: relative;
}

.timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 12px;
  top: 30px;
  width: 2px;
  height: 40px;
  background: #e2e8f0;
}

.timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #e2e8f0;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.timeline-dot.active {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

.timeline-content h4 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 5px 0;
}

.timeline-content p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.footer-section {
  background: #f8fafc;
  padding: 30px 50px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.contact-info p {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: 15px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: white;
  color: #475569;
  border: 2px solid #e2e8f0;
}

.btn-secondary:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .under-development-container {
    padding: 10px;
  }
  
  .header-section {
    flex-direction: column;
    text-align: center;
    padding: 30px 20px;
  }
  
  .main-title {
    font-size: 36px;
  }
  
  .subtitle {
    font-size: 20px;
  }
  
  .content-section {
    padding: 30px 20px;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .footer-section {
    flex-direction: column;
    text-align: center;
    padding: 20px;
  }
  
  .action-buttons {
    width: 100%;
    justify-content: center;
  }
}
</style> 