import Vue from 'vue'
import Router from 'vue-router'
import Signin from '../components/Signin.vue'

Vue.use(Router)

const router = new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Signin
    },
    {
      path: '/login',
      name: 'Signin',
      component: Signin
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
