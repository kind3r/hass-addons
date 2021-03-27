import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Settings from '../views/Settings.vue';
import Credentials from '../views/Credentials.vue';
import Operations from '../views/Operations.vue';

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/settings/:address',
    name: 'Settings',
    component: Settings
  },
  {
    path: '/credentials/:address',
    name: 'Credentials',
    component: Credentials
  },
  {
    path: '/operations/:address',
    name: 'Operations',
    component: Operations
  }
]

const router = new VueRouter({
  routes
})

export default router
