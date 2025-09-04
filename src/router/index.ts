import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Chat from '@/pages/Chat.vue'
import { useChatStore } from '@/stores/chat'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => {
      const store = useChatStore()
      return store.chats.length > 0 ? `/${store.chats[0].id}` : '/404'
    },
  },
  { path: '/:id', name: 'chat', component: Chat },
  {
    path: '/:pathMatch(.*)*',
    redirect: () => {
      const store = useChatStore()
      return store.chats.length > 0 ? `/${store.chats[0].id}` : '/404'
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to, from) => {
  const store = useChatStore()
  if (store.isLoading && to.fullPath !== from.fullPath) {
    const ok = window.confirm('Une requête est encore en cours. Quitter cette page ?')
    if (!ok) return false
  }
  return true
})
window.addEventListener('beforeunload', (e) => {
  const store = useChatStore()
  if (store.isLoading) {
    e.preventDefault()
    e.returnValue = ''
  }
})

export default router
