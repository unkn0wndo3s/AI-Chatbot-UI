<template>
  <div class="chat">
    <h2>{{ id }}</h2>

    <div v-if="loading">Loading…</div>
    <div v-else-if="error" style="color: crimson">{{ error }}</div>

    <ul v-else>
      <li v-for="msg in messages" :key="msg.key">
        <div :class="msg.role == 'assistant' ? 'assistant' : 'user'">
          {{ msg.content }}
        </div>
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const apiBase = 'http://54.37.68.129:8000'
const apiKey = 'a9$Kz!3Q@pL7*Xw2#bV5%tY8&nR0^jM1*'

const route = useRoute()
const id = ref(route.params.id as string)

type RawMsg = { id?: string; role: string; content: string }
type MessageView = { key: string; role: string; content: string }

const messages = ref<MessageView[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Abort controller pour annuler la requête si l’URL change vite
let currentAbort: AbortController | null = null

function stripPrefix(s: string): string {
  // supprime un préfixe style: [01/09/2025 08:13:02] :
  return s.replace(/^\[\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\]\s*:\s*/, '').trim()
}

function normalizePayload(chatId: string, data: any): MessageView[] {
  const arr: RawMsg[] = Array.isArray(data?.messages)
    ? data.messages
    : Array.isArray(data?.history)
      ? data.history
      : []

  return arr.map((m: RawMsg, idx: number) => ({
    key: m.id ?? `${chatId}-${idx}`,
    role: m.role,
    content: stripPrefix(m.content ?? ''),
  }))
}

async function loadMessages(chatId: string) {
  // annule la requête précédente si besoin
  if (currentAbort) currentAbort.abort()
  currentAbort = new AbortController()

  loading.value = true
  error.value = null
  messages.value = []

  try {
    const url = `${apiBase}/messaging/${encodeURIComponent(chatId)}?key=${encodeURIComponent(apiKey)}`
    const response = await fetch(url, { signal: currentAbort.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    messages.value = normalizePayload(chatId, data)
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      error.value = e?.message ?? 'Fetch error'
      messages.value = []
    }
  } finally {
    if (currentAbort?.signal.aborted) {
      // si abort, ne pas toucher aux states (un nouveau load va les gérer)
    } else {
      loading.value = false
    }
  }
}

// premier chargement
loadMessages(id.value)

// rechargement si on change d’URL (donc d’id)
watch(
  () => route.params.id,
  (newId) => {
    if (typeof newId === 'string') {
      id.value = newId
      loadMessages(newId)
    }
  },
)
</script>
<style scoped>
.chat,
ul {
  max-width: 90%;
}

/* chaque ligne de message */
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

li {
  display: flex;
  margin: 0.5rem 0;
}

/* messages alignés gauche */
.assistant {
  max-width: 45%;
  align-self: flex-start;
  background: #f0f0f0;
  padding: 0.5rem;
  border-radius: 8px;
}

/* messages alignés droite */
.user {
  max-width: 45%;
  margin-left: auto;
  background: #d0f0ff;
  padding: 0.5rem;
  border-radius: 8px;
}
</style>
