import Vue from 'vue'
import Vuex from 'vuex'
import {stat} from "copy-webpack-plugin/dist/utils/promisify";

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    isAuthenticated: false,
    username: null,
    csrf: null,
  },
  mutations: {
    setAuth(state, auth) {
      state.isAuthenticated = auth
      // console.log("name". isAuthenticated, state.isAuthenticated)
    },
    setUsername(state, username) {
      state.username = username
      // console.log("name". username, state.username)
    },
    setCsrf(state, csrf) {
      state.csrf = csrf
      // console.log("name". csrf, state.csrf)
    }
  },
  actions: {
    login({ commit }, response) {
      commit('setAuth', true)
      commit('setUsername', response.username)
      commit('setCsrf', response.csrf)
    },
    logout({ commit }) {
      commit('setAuth', false)
      commit('setUsername', null)
      commit('setCsrf', null)
    }
  },
  getters: {
    isAuthenticated: state => state.isAuthenticated,
    username: state => state.username,
    csrf: state => state.csrf
  }
})
