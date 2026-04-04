import Vue from 'vue'
import Router from 'vue-router'
import Signin from '../components/Signin.vue'
import Signup from '../components/Signup.vue'
import TentativeDashboard from '../components/TentativeDashboard.vue'
import FinalDashboard from '../components/FinalDashboard.vue'
import NewTentativeDashboard from '../components/NewTentativeDashboard.vue'
import NewFinalDashboard from '../components/NewFinalDashboard.vue'
import CompletedTasks from '../components/CompletedTasks.vue'
import Home from '../components/Home.vue'
import ReviewInterface from '../components/ReviewInterface.vue'
import ReviewDashboard from '../components/ReviewDashboard.vue'
import TaskReviewHub from '../components/TaskReviewHub.vue'
import NewTaskReviewHub from '../components/NewTaskReviewHub.vue'
import UnderDevelopment from '../components/UnderDevelopment.vue'
import DailyReviewSlideshow from '../components/DailyReviewSlideshow.vue'
import ImportDashboardHtml from '../components/ImportDashboardHtml.vue'
import { isMeetingDashboardUiEnabled } from '@/utils/meetingDashboardUi'

Vue.use(Router)

function roleFromCookie () {
  if (typeof document === 'undefined') return null
  try {
    const entry = document.cookie.split(';').find(c => c.trim().startsWith('user_info='))
    if (!entry) return null
    const raw = decodeURIComponent(entry.split('=').slice(1).join('='))
    const u = JSON.parse(raw)
    return u.role ? String(u.role).toLowerCase() : null
  } catch (e) {
    return null
  }
}

const router = new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home,
      meta: { requiresAuth: true }
    },
    {
      path: '/login',
      name: 'Signin',
      component: Signin
    },
    {
      path: '/signup',
      name: 'Signup',
      component: Signup
    },
    {
      path: '/daily-dashboard',
      name: 'DailyDashboard',
      component: DailyReviewSlideshow,
      meta: { requiresAuth: true }
    },
    {
      path: '/tentative',
      name: 'TentativeDashboard',
      component: TentativeDashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/final',
      name: 'FinalDashboard',
      component: FinalDashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/new-tentative',
      name: 'NewTentativeDashboard',
      component: NewTentativeDashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/new-final',
      name: 'NewFinalDashboard',
      component: NewFinalDashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/completed-tasks',
      name: 'CompletedTasks',
      component: UnderDevelopment,
      props: {
        pageTitle: 'Completed Tasks',
        progressPercentage: 40,
        upcomingFeatures: [
          'Historical task completion data',
          'Performance analytics',
          'Completion time tracking',
          'Team productivity insights',
          'Advanced filtering options'
        ]
      },
      meta: { requiresAuth: true }
    },
    {
      path: '/review-tasks',
      name: 'ReviewTasks',
      component: ReviewDashboard,
      meta: { requiresAuth: true }
    },
    {
      path: '/system-logs',
      name: 'SystemLogs',
      component: UnderDevelopment,
      props: {
        pageTitle: 'System Logs',
        progressPercentage: 20,
        upcomingFeatures: [
          'Real-time system monitoring',
          'Error tracking and alerts',
          'User activity logs',
          'Performance metrics',
          'Audit trail functionality'
        ]
      }
    },
    {
      path: '/completed',
      name: 'CompletedTasksOld',
      component: CompletedTasks,
      meta: { requiresAuth: true }
    },
    {
      path: '/review/:id',
      name: 'ReviewInterface',
      component: ReviewInterface,
      props: route => ({ reviewId: route.params.id }),
      meta: { requiresAuth: true }
    },
    {
      path: '/task/:taskId/review-hub',
      name: 'TaskReviewHub',
      component: TaskReviewHub,
      props: route => ({ taskId: route.params.taskId }),
      meta: { requiresAuth: true }
    },
    {
      path: '/meeting-review-hub',
      name: 'NewTaskReviewHub',
      component: NewTaskReviewHub,
      meta: { requiresAuth: true }
    },
    {
      path: '/import-dashboard-html',
      name: 'ImportDashboardHtml',
      component: ImportDashboardHtml,
      meta: { requiresAuth: true }
    }
    
    // {
    //   path: '/dashboard',
    //   name: 'Dashboard',
    //   component: Dashboard,
    //   meta: { requiresAuth: true }
    // },
  ]
})

router.beforeEach((to, from, next) => {
  const isSignedIn = localStorage.signedIn

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isSignedIn) {
      next({ name: 'Signin' })
    } else {
      const role = roleFromCookie()
      if (to.name === 'NewTentativeDashboard') {
        if (role !== 'editor') {
          next({ name: 'Home' })
          return
        }
        if (!isMeetingDashboardUiEnabled()) {
          next({ path: '/tentative' })
          return
        }
      }
      if (to.name === 'NewFinalDashboard' && !isMeetingDashboardUiEnabled()) {
        next({ path: '/final' })
        return
      }
      next()
    }
  } else if (to.name === 'Signin' || to.name === 'LandingPage') {
    if (isSignedIn) {
      next({ name: 'Home' })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
