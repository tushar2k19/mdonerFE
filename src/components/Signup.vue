<template>
  <div class="signup-page">
    <div class="signup-container">
      <!-- Left Panel -->
      <div class="signup-box">
        <!-- Logo Section -->
        <div class="logo-section">
          <p class="welcome-text">Join</p>
          <h1 class="logo">
            <span class="ne">NE</span><span class="volve">volve</span>
          </h1>
          <p class="tagline">
            Create your account to start managing tasks<br>
            and collaborating with your team
          </p>
        </div>

        <!-- Signup Form Section -->
        <div class="signup-form">
          <h2 class="signup-title">Create Your Account</h2>
          <p class="signup-subtitle">Fill in your details to get started</p>

          <form @submit.prevent="signup">
            <div class="error-message" v-if="error">
              {{ error }}
            </div>

            <div class="form-row">
              <div class="form-group">
                <div class="input-wrapper modern-input">
                  <span class="input-icon">👤</span>
                  <input
                    type="text"
                    id="first_name"
                    v-model="form.first_name"
                    placeholder="First Name"
                    @input="clearError"
                    required
                    autocomplete="given-name"
                  >
                </div>
              </div>

        <div class="form-group">
                <div class="input-wrapper modern-input">
                  <span class="input-icon">👤</span>
                  <input
                    type="text"
                    id="last_name"
                    v-model="form.last_name"
                    placeholder="Last Name"
                    @input="clearError"
                    autocomplete="family-name"
                  >
                </div>
              </div>
        </div>

        <div class="form-group">
              <div class="input-wrapper modern-input">
                <span class="input-icon">✉</span>
                <input
                  type="email"
                  id="email"
                  v-model="form.email"
                  placeholder="Email Address"
                  @input="clearError"
                  required
                  autocomplete="email"
                >
              </div>
        </div>

        <div class="form-group">
              <div class="input-wrapper modern-input">
                <span class="input-icon">🔒</span>
                <input
                  :type="showPassword ? 'text' : 'password'"
                  id="password"
                  v-model="form.password"
                  placeholder="Password"
                  @input="clearError"
                  required
                  autocomplete="new-password"
                >
                <span class="password-toggle" @click="togglePassword" :title="showPassword ? 'Hide' : 'Show'">
                  <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="#666" stroke-width="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3.5" stroke="#666" stroke-width="2"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="#666" stroke-width="2" d="M17.94 17.94A10.97 10.97 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-6.06M9.88 9.88A3.5 3.5 0 0 1 12 8.5c1.93 0 3.5 1.57 3.5 3.5 0 .7-.21 1.36-.57 1.9M1 1l22 22"/></svg>
                </span>
              </div>
        </div>

        <div class="form-group">
              <div class="input-wrapper modern-input">
                <span class="input-icon">🔒</span>
                <input
                  :type="showConfirmPassword ? 'text' : 'password'"
                  id="password_confirmation"
                  v-model="form.password_confirmation"
                  placeholder="Confirm Password"
                  @input="clearError"
                  required
                  autocomplete="new-password"
                >
                <span class="password-toggle" @click="toggleConfirmPassword" :title="showConfirmPassword ? 'Hide' : 'Show'">
                  <svg v-if="!showConfirmPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="#666" stroke-width="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/><circle cx="12" cy="12" r="3.5" stroke="#666" stroke-width="2"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="#666" stroke-width="2" d="M17.94 17.94A10.97 10.97 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-6.06M9.88 9.88A3.5 3.5 0 0 1 12 8.5c1.93 0 3.5 1.57 3.5 3.5 0 .7-.21 1.36-.57 1.9M1 1l22 22"/></svg>
                </span>
              </div>
        </div>

        <div class="form-group">
              <div class="input-wrapper modern-input">
                <span class="input-icon">🎯</span>
                <select
                  id="role"
                  v-model="form.role"
                  @change="clearError"
                  required
                  class="role-select"
                >
                  <option value="" disabled>Select your role</option>
            <option value="0">Editor</option>
            <option value="1">Reviewer</option>
            <option value="2">Final Reviewer</option>
          </select>
        </div>
            </div>

            <button type="submit" class="signup-button" :disabled="isLoading">
              <span v-if="isLoading" class="loading-spinner"></span>
              {{ isLoading ? 'Creating Account...' : 'Create Account' }}
            </button>

            <div class="login-link">
              Already have an account? 
              <router-link to="/login" class="link">Sign in here</router-link>
            </div>

            <p class="disclaimer">For illustration purpose only</p>
      </form>
        </div>
      </div>

      <!-- Right Panel -->
      <div class="illustration-panel">
        <div class="signup-diagram">
          <div class="signup-steps">
            <div class="step step-1">
              <span class="step-number">1</span>
              <span class="step-label">Create Account</span>
            </div>
            <div class="step step-2">
              <span class="step-number">2</span>
              <span class="step-label">Set Role</span>
            </div>
            <div class="step step-3">
              <span class="step-number">3</span>
              <span class="step-label">Start Working</span>
            </div>
          </div>

          <div class="preview-card">
            <div class="card-header">Welcome to NEvolve</div>
            <div class="card-content">
              <div class="preview-line"></div>
              <div class="preview-line"></div>
              <div class="preview-line"></div>
              <div class="preview-line"></div>
              <div class="preview-line"></div>
            </div>
          </div>
        </div>

        <div class="illustration-text">
          <h3>Join the team today</h3>
          <p>Create your account and start collaborating with your team on task management and project coordination.</p>
        </div>
      </div>
    </div>
    </div>
  </template>
  
  <script>
  import { plainAxiosInstance } from '../backend/axios/index1'

  export default {
    name: 'Signup',
    data() {
      return {
        form: {
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          password_confirmation: '',
          role: ''
        },
        error: '',
      success: false,
      isLoading: false,
      showPassword: false,
      showConfirmPassword: false
    }
  },
  created() {
    this.checkSignedin()
    },
    methods: {
    clearError() {
      this.error = ''
    },
    checkSignedin() {
      if (localStorage.signedIn) {
        this.$router.replace('/')
      }
    },
    togglePassword() {
      this.showPassword = !this.showPassword
    },
    toggleConfirmPassword() {
      this.showConfirmPassword = !this.showConfirmPassword
    },
    validateForm() {
      if (!this.form.first_name.trim()) {
        this.error = 'First name is required'
        return false
      }
      if (!this.form.email.trim()) {
        this.error = 'Email is required'
        return false
      }
      if (!this.form.password) {
        this.error = 'Password is required'
        return false
      }
      if (this.form.password.length < 6) {
        this.error = 'Password must be at least 6 characters long'
        return false
      }
      if (this.form.password !== this.form.password_confirmation) {
        this.error = 'Password confirmation does not match'
        return false
      }
      if (!this.form.role) {
        this.error = 'Please select a role'
        return false
      }
      return true
    },
      async signup() {
      if (!this.validateForm()) {
        return
      }

      this.isLoading = true
        this.error = ''
        this.success = false

        try {
          const response = await plainAxiosInstance.post('/signup', { user: this.form })
        
          if (response.data.success) {
            this.success = true
          // Use alert instead of toast since toast might not be available
          alert('Account created successfully! You can now sign in.')
          
          // Clear form
          this.form = {
            first_name: '',
            last_name: '',
            email: '',
            password: '',
            password_confirmation: '',
            role: ''
          }
          
          // Redirect to login after a short delay
          setTimeout(() => {
            this.$router.push('/login')
          }, 2000)
          } else {
            this.error = response.data.errors ? response.data.errors.join(', ') : 'Signup failed'
          }
        } catch (err) {
        console.error('Signup failed:', err)
          this.error = err.response && err.response.data && err.response.data.errors
            ? err.response.data.errors.join(', ')
          : 'Signup failed. Please try again.'
      } finally {
        this.isLoading = false
        }
      }
    }
  }
  </script>
  
  <style scoped>
.signup-page {
  min-height: 100vh;
  min-width: 100vw;
  display: flex;
  align-items: stretch;
  background-color: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow-x: hidden;
}

.signup-container {
  display: flex;
  width: 100%;
  min-width: 100vw;
  min-height: 600px;
  height: 100vh;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05);
  margin: 0;
  border-radius: 0;
}

/* Left Panel Styles */
.signup-box {
  flex: 1;
  padding: 40px 80px;
  display: flex;
  flex-direction: column;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.logo-section {
  text-align: center;
  margin-bottom: 48px;
}

.welcome-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.logo {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 16px 0;
}

.ne {
  color: #0066FF;
}

.volve {
  color: #009951;
}

.tagline {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

/* Signup Form Styles */
.signup-form {
  max-width: 500px;
  margin: 0 auto;
  width: 100%;
}

.signup-title {
  color: #0066FF;
  font-size: 24px;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.signup-subtitle {
  color: #666;
  font-size: 14px;
  margin-bottom: 32px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.input-wrapper.modern-input {
  background: #f4f8fb;
  border-radius: 10px;
  border: 1.5px solid #e0e7ef;
  box-shadow: 0 2px 8px rgba(30,64,175,0.04);
  transition: border 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: 0;
}

.input-wrapper.modern-input:focus-within {
  border: 1.5px solid #1e3a8a;
  box-shadow: 0 0 0 2px #1e3a8a22;
  background: #fff;
}

.input-wrapper.modern-input input,
.input-wrapper.modern-input select {
  background: transparent;
  border: none;
  box-shadow: none;
  padding-left: 2.5em;
  padding-right: 2.5em;
  font-size: 1.05em;
  color: #1e293b;
  font-weight: 500;
  height: 48px;
  border-radius: 10px;
  outline: none;
  transition: background 0.2s;
  width: 100%;
}

.input-wrapper.modern-input input:focus,
.input-wrapper.modern-input select:focus {
  background: #fff;
}

.input-wrapper .input-icon {
  left: 1em;
  color: #1e3a8a;
  font-size: 1.2em;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.input-wrapper .password-toggle {
  right: 1em;
  color: #1e3a8a;
  font-size: 1.2em;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.input-wrapper .password-toggle svg {
  display: block;
}

.input-wrapper .password-toggle:active {
  color: #fbbf24;
}

.role-select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231e3a8a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 1em center;
  background-size: 1em;
  padding-right: 2.5em;
}

.signup-button {
  width: 100%;
  padding: 12px;
  background: #0066FF;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
}

.signup-button:hover:not(:disabled) {
  background: #0052CC;
}

.signup-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
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

.login-link {
  text-align: center;
  margin: 24px 0;
  color: #666;
  font-size: 14px;
}

.login-link .link {
  color: #0066FF;
  text-decoration: none;
  font-weight: 500;
}

.login-link .link:hover {
  text-decoration: underline;
}

.disclaimer {
  text-align: center;
  color: #999;
  font-size: 12px;
  margin-top: 24px;
}

.error-message {
  background: #FEE2E2;
  color: #DC2626;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 14px;
}

/* Right Panel Styles */
.illustration-panel {
  height: 100%;
  flex: 1;
  background: #0066FF;
  padding: 48px;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.signup-diagram {
  position: relative;
  height: 300px;
  margin-bottom: 48px;
}

.signup-steps {
  position: relative;
  height: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.step-number {
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0066FF;
  font-weight: 700;
  font-size: 18px;
}

.step-label {
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
}

.preview-card {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: 240px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 14px;
  font-weight: 500;
}

.card-content {
  padding: 16px;
}

.preview-line {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin-bottom: 8px;
}

.illustration-text {
  text-align: center;
}

.illustration-text h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
}

.illustration-text p {
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.6;
  max-width: 400px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .signup-container {
    margin: 24px;
    flex-direction: column;
  }

  .signup-box {
    padding: 40px;
  }

  .illustration-panel {
    padding: 40px 24px;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }
}

@media (max-width: 640px) {
  .signup-box {
    padding: 24px;
  }

  .illustration-panel {
    display: none;
  }

  .signup-form {
    max-width: 100%;
  }
}
  </style>