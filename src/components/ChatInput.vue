<template>
  <footer class="footer">
    <div class="send">
      <textarea
        v-model="text"
        class="ta"
        rows="1"
        placeholder="Tapez votre message…"
        :disabled="isLoading"
        @keydown.enter.exact.prevent="trySend"
      />
      <button class="btn-send" :disabled="isLoading" @click="trySend">
        {{ isLoading ? '...' : 'Envoyer' }}
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore } from '@/stores/chat'

const store = useChatStore()
const isLoading = computed(() => store.isLoading)

const text = ref('')

async function trySend(): Promise<void> {
  const t = text.value.trim()
  if (!t) return
  await store.sendMessage(t)
  text.value = ''
}
</script>

<style scoped>
.footer {
  border-top: 1px solid var(--line);
  background: #0d0d13aa;
  backdrop-filter: blur(6px);
  padding: 14px 16px;
  flex: 0 0 auto;
}
.send {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}
.ta {
  resize: none;
  min-height: 44px;
  max-height: 220px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #0f0f18;
  border: 1px solid #262637;
  color: var(--text);
  outline: none;
}
.ta:focus {
  border-color: var(--brand);
}
.btn-send {
  padding: 10px 16px;
  border-radius: 12px;
  background: var(--brand);
  border: none;
  color: white;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: default;
}
</style>
