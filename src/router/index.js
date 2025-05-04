import Vue from 'vue'
import Router from 'vue-router'
import Signin from '../components/Signin.vue'
import TentativeDashboard from '../components/TentativeDashboard.vue'
import FinalDashboard from '../components/FinalDashboard.vue'
import CompletedTasks from '../components/CompletedTasks.vue'
import Home from '../components/Home.vue'

Vue.use(Router)

const router = new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/login',
      name: 'Signin',
      component: Signin
    },
    {
      path: '/tentative',
      name: 'TentativeDashboard',
      component: TentativeDashboard
    },
    {
      path: '/final',
      name: 'FinalDashboard',
      component: FinalDashboard
    },
    {
      path: '/completed',
      name: 'CompletedTasks',
      component: CompletedTasks
    },
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
      next({ name: 'LandingPage' })
    } else {
      next()
    }
  } else if (to.name === 'Signin' || to.name === 'LandingPage') {
    if (isSignedIn) {
      next({ name: 'Dashboard' })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
