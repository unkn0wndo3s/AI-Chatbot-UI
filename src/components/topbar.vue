<template>
  <header class="header">
    <h1 class="title">{{ currentChat?.name || '—' }}</h1>
    <div class="meta">Maquette</div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat'

const store = useChatStore()
const { chats, currentId } = storeToRefs(store)

const currentChat = computed(() => chats.value.find((c) => c.id === currentId.value))
</script>

<style scoped>
.header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  background: #0d0d13aa;
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
}
.title {
  margin: 0;
  font-weight: 700;
}
.meta {
  color: var(--muted);
  font-size: 12px;
}
</style>
