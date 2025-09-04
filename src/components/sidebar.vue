<template>
  <aside class="sidebar">
    <div class="side-head">
      <h2 class="side-title">Conversations</h2>
      <button class="btn" type="button" @click="openNew">Nouveau</button>
    </div>
    <div class="new-wrap" v-show="showNew">
      <input
        ref="inputRef"
        v-model="newName"
        class="new-input"
        placeholder="Nom du chat"
        @keydown.enter.prevent="confirmNew"
        @keydown.esc.prevent="cancelNew"
      />
      <button class="btn brand" type="button" @click="confirmNew">OK</button>
      <button class="btn" type="button" @click="cancelNew">Annuler</button>
    </div>

    <div class="side-body">
      <div class="scroll" style="min-height: 0; flex: 1">
        <ul class="side-list">
          <li
            v-for="c in chats"
            :key="c.id"
            class="chat-item"
            :class="{ active: c.id === currentId }"
            @click="selectChat(c.id)"
          >
            <span class="chat-name">{{ c.name }}</span>
            <span class="chat-count">{{ c.messages.length }}</span>
          </li>
        </ul>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat'

const store = useChatStore()
const { chats, currentId } = storeToRefs(store)
const { selectChat, addChat } = store

const showNew = ref(false)
const newName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

function openNew(): void {
  showNew.value = true
  nextTick(() => inputRef.value?.focus())
}

function confirmNew(): void {
  const name = newName.value.trim() || 'Nouveau chat'
  addChat(name)
  showNew.value = false
  newName.value = ''
}

function cancelNew(): void {
  showNew.value = false
  newName.value = ''
}
</script>

<style scoped>
.sidebar {
  background: linear-gradient(180deg, var(--panel) 0%, var(--panel2) 100%);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  min-width: 240px;
  min-height: 0;
}

.side-head {
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
}

.side-title {
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-weight: 700;
  margin: 0;
}

.new-wrap {
  border-bottom: 1px solid var(--line);
  padding: 10px;
  gap: 8px;
  grid-template-columns: 1fr auto auto;
  flex: 0 0 auto;
  display: grid;
}

.new-input {
  width: 100%;
  background: #0f0f18;
  border: 1px solid #262637;
  color: var(--text);
  padding: 8px 10px;
  border-radius: 8px;
  outline: none;
}
.new-input:focus {
  border-color: var(--brand);
}

.side-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.side-list {
  padding: 8px;
  display: grid;
  gap: 6px;
}

.chat-item {
  width: 100%;
  text-align: left;
  background: #11111a;
  border: 1px solid #1d1d2a;
  border-radius: 10px;
  padding: 10px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: 0.15s ease;
}
.chat-item:hover {
  background: #141425;
  border-color: #252536;
}
.chat-item.active {
  background: #151534;
  border-color: #2f2f48;
  box-shadow:
    0 0 0 1px rgba(91, 97, 255, 0.25),
    0 0 26px rgba(91, 97, 255, 0.15);
}

.chat-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.chat-count {
  color: var(--muted);
  font-size: 12px;
  padding-left: 8px;
}
</style>
