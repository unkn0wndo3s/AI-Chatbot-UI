import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/pages/Home.vue'
import Chat from '@/pages/chat.vue' // il faudra créer cette page

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/:id',
      name: 'chat',
      component: Chat,
      props: true, // pour que l'id soit injecté dans les props du composant
    },
  ],
})

export default router
