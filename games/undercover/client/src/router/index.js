import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import RoomView from '../views/RoomView.vue'
import GameView from '../views/GameView.vue'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/room/:id', name: 'Room', component: RoomView },
  { path: '/game/:id', name: 'Game', component: GameView },
]

const router = createRouter({
  history: createWebHistory('/undercover/'),
  routes,
})

export default router