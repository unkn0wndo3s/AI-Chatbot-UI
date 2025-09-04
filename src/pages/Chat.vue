<template>
  <Sidebar />
  <main class="main">
    <Topbar />

    <section ref="messagesEl" class="messages scroll">
      <MessageBubble v-for="(m, i) in currentChat?.messages" :key="i" :msg="m" />
    </section>

    <ChatInput />
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUpdated, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat'
import Sidebar from '@/components/sidebar.vue'
import Topbar from '@/components/topbar.vue'
import ChatInput from '@/components/ChatInput.vue'
import MessageBubble from '@/components/MessageBubble.vue'

const store = useChatStore()
const { chats, currentId, currentChat } = storeToRefs(store)

onMounted(() => {
  store.loadExistingChats()
})

const messagesEl = ref<HTMLElement | null>(null)
onUpdated(() => {
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
})
</script>

<style>
.main {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-width: 0;
  background: radial-gradient(1200px 800px at 110% 120%, #121225 0%, transparent 60%);
  min-height: 0;
}
.messages {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  min-height: 0;
  flex: 1 1 auto;
}
.scroll {
  overflow: auto;
}
.scroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.scroll::-webkit-scrollbar-thumb {
  background: #2a2a35;
  border-radius: 9999px;
}
.scroll::-webkit-scrollbar-track {
  background: #12121a;
}
</style>
