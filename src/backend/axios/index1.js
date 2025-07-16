import axios from 'axios'
import backendHealthService from '../../services/BackendHealthService.js'

const API_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://mdoner-production.up.railway.app'
// const API_URL = 'https://wadibackend.com'

function getCookie (name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    let encodedValue = parts.pop().split(';').shift()
    return decodeURIComponent(encodedValue)
  }
}

const securedAxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Add timeout and debug interceptors
  timeout: 10000
})

const plainAxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor for secured instance
securedAxiosInstance.interceptors.request.use(config => {
  // Check if backend is healthy before making request
  if (!backendHealthService.canMakeRequest()) {
    const error = new Error('Backend service is currently unavailable. Please try again later.')
    error.isBackendDown = true
    return Promise.reject(error)
  }
  
  // Show loading overlay
  if (window.showGlobalLoading) {
    window.showGlobalLoading()
  }
  
  const method = config.method.toUpperCase()
  if (method !== 'OPTIONS' && method !== 'GET') {
    const csrfToken = getCookie('csrf_token')
    if (csrfToken) {
      config.headers['X-CSRF-TOKEN'] = csrfToken
    }
  }
  const token = localStorage.getItem('jwt_access')
  // alert (token)
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
}, error => {
  // Hide loading overlay on request error
  if (window.hideGlobalLoading) {
    window.hideGlobalLoading()
  }
  return Promise.reject(error)
})

// Response interceptor for secured instance
securedAxiosInstance.interceptors.response.use(response => {
  // Hide loading overlay on successful response
  if (window.hideGlobalLoading) {
    window.hideGlobalLoading()
  }
  
  // Mark backend as healthy on successful response
  backendHealthService.markBackendHealthy()
  
  return response
}, error => {
  // Hide loading overlay on error
  if (window.hideGlobalLoading) {
    window.hideGlobalLoading()
  }
  
  // Mark backend as unhealthy for network errors or 5xx errors
  if (error.isBackendDown || 
      error.code === 'ECONNABORTED' || 
      error.code === 'NETWORK_ERROR' ||
      (error.response && error.response.status >= 500)) {
    backendHealthService.markBackendUnhealthy()
  }
  
  if (error.response && error.response.config && error.response.status === 401) {
    // Show loading for refresh token request
    if (window.showGlobalLoading) {
      window.showGlobalLoading()
    }
    
    return plainAxiosInstance.post('/refresh', {}, { headers: { 'X-CSRF-TOKEN': getCookie('csrf_token') } })
      .then(response => {
        // Hide loading after refresh
        if (window.hideGlobalLoading) {
          window.hideGlobalLoading()
        }
        
        localStorage.csrf = response.data.csrf
        localStorage.signedIn = true

        let retryConfig = error.response.config
        retryConfig.headers['X-CSRF-TOKEN'] = getCookie('csrf_token')
        
        // Show loading for retry request
        if (window.showGlobalLoading) {
          window.showGlobalLoading()
        }
        
        return plainAxiosInstance.request(retryConfig)
      }).catch(error => {
        // Hide loading on refresh failure
        if (window.hideGlobalLoading) {
          window.hideGlobalLoading()
        }
        
        delete localStorage.csrf
        delete localStorage.signedIn
        location.replace('/login')
        return Promise.reject(error)
      })
  } else {
    return Promise.reject(error)
  }
})

// Request interceptor for plain instance
plainAxiosInstance.interceptors.request.use(config => {
  // Show loading overlay
  if (window.showGlobalLoading) {
    window.showGlobalLoading()
  }
  return config
}, error => {
  // Hide loading overlay on request error
  if (window.hideGlobalLoading) {
    window.hideGlobalLoading()
  }
  return Promise.reject(error)
})

// Response interceptor for plain instance
plainAxiosInstance.interceptors.response.use(response => {
  // Hide loading overlay on successful response
  if (window.hideGlobalLoading) {
    window.hideGlobalLoading()
  }
  return response
}, error => {
  // Hide loading overlay on error
  if (window.hideGlobalLoading) {
    window.hideGlobalLoading()
  }
  return Promise.reject(error)
})

export {securedAxiosInstance, plainAxiosInstance}
