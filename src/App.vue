<template>
  <div id="app">
    <component :is="layout">
      <router-view />
    </component>
  </div>
</template>

<script>
import Header1 from './components/Header1.vue'
// import Navbar from './components/Navbar.vue'

const AuthenticatedLayout = {
  // components: { Header1, Navbar },
  template: `
    <div>
      <Header1 class="header"/>
      <div class="content-wrapper">
<!--        <Navbar class="fixed-right-navbar" />-->
        <slot></slot>
      </div>
    </div>
  `
}

const UnauthenticatedLayout = {
  template: '<div><slot></slot></div>'
}

export default {
  name: 'App',
  data() {
    return {
      isAuthenticated: false
    }
  },
  computed: {
    layout() {
      return this.isAuthenticated ? AuthenticatedLayout : UnauthenticatedLayout
    }
  },
  watch: {
    $route: {
      immediate: true,
      handler() {
        this.checkAuthStatus()
      }
    }
  },
  methods: {
    checkAuthStatus() {
      const newAuthStatus = !!localStorage.getItem('signedIn')
      if (this.isAuthenticated !== newAuthStatus) {
        this.isAuthenticated = newAuthStatus
        this.$nextTick(() => {
          window.scrollTo(0, 0)
          console.log('Forced re-render and attempted scroll')
        })
      }
    },
  }
}
</script>

<style>
* {
  margin: 0px;
  padding: 0px;
}
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.content-wrapper {
  display: flex; /* Use flexbox for horizontal layout */
}



.router-view-container {
  flex: 1; /* Allow the router-view to fill the remaining space */
}
</style>


<!--<template>-->
<!--  <div id="app">-->
<!--    <div v-if="isAuthenticated">-->
<!--      <Header1 class="header"/>-->
<!--      <div class="content-wrapper">-->
<!--        <Navbar class="fixed-right-navbar" />-->
<!--        <router-view class="router-view-container" />-->
<!--      </div>-->
<!--    </div>-->
<!--    <div v-else>-->
<!--      <router-view style="margin-right: -5px"/>-->
<!--    </div>-->
<!--  </div>-->
<!--</template>-->

<!--<script>-->
<!--import Header1 from './components/Header1.vue'-->
<!--import Navbar from './components/Navbar.vue'-->

<!--export default {-->
<!--  name: 'App',-->
<!--  components: { Header1, Navbar },-->
<!--  data() {-->
<!--    return {-->
<!--      prevAuthState: false-->
<!--    }-->
<!--  },-->
<!--  computed: {-->
<!--    isAuthenticated() {-->
<!--      return !!localStorage.getItem('signedIn');-->
<!--    },-->
<!--  },-->
<!--  watch: {-->
<!--    isAuthenticated: {-->
<!--      handler(newVal) {-->
<!--        if (newVal && !this.prevAuthState) {-->
<!--          // User just logged in-->
<!--          this.$nextTick(() => {-->
<!--            alert('Auth state changed: ' + newVal);-->
<!--            window.scrollTo(0, 0);-->
<!--          });-->
<!--        }-->
<!--        this.prevAuthState = newVal;-->
<!--      },-->
<!--      immediate: true-->
<!--    }-->
<!--  },-->
<!--  created() {-->
<!--    console.log('Initial auth state:', this.isAuthenticated);-->
<!--    this.prevAuthState = this.isAuthenticated;-->
<!--  },-->
<!--}-->
<!--</script>-->
