import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type MsgRole = 'assistant' | 'user'

export type Message = {
  role: MsgRole
  content: string
}

export type Chat = {
  id: string
  name: string
  messages: Message[]
}
const API_BASE =
  import.meta.env.VITE_USE_PROXY === 'true'
    ? '/api'
    : String(import.meta.env.VITE_API_BASE || '/api') // fallback proxy

const apiKey = 'a9$Kz!3Q@pL7*Xw2#bV5%tY8&nR0^jM1*'

function generateChatId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `${timestamp}${randomPart}`
}

function nowFR(): string {
  return new Date().toLocaleString('fr-FR')
}

export const useChatStore = defineStore('chat', () => {
  // état
  const chats = ref<Chat[]>([])
  const currentId = ref<string | null>(null)
  const isLoading = ref(false) // pour router + UI

  // dérivés
  const currentChat = computed<Chat | undefined>(() =>
    chats.value.find((c) => c.id === currentId.value),
  )

  // API helpers
  async function apiGET(path: string): Promise<any | null> {
    try {
      const resp = await fetch(`${API_BASE}${path}`)
      if (!resp.ok) return null
      return await resp.json()
    } catch {
      return null
    }
  }

  async function apiPOST(path: string, body: any): Promise<any | null> {
    try {
      const resp = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!resp.ok) return null
      return await resp.json()
    } catch {
      return null
    }
  }

  // charge la liste des sessions côté serveur + sélectionne la 1ère
  async function loadExistingChats(): Promise<void> {
    chats.value = []
    currentId.value = null

    try {
      const resp = await fetch(`${API_BASE}/messaging?key=${encodeURIComponent(apiKey)}`, {
        mode: 'cors',
      })
      if (!resp.ok) {
        console.error('GET /messaging failed:', resp.status, await resp.text())
        return
      }
      const data = await resp.json()

      if (!data || !Array.isArray(data.chats)) {
        console.error('Unexpected payload shape for /messaging:', data)
        return
      }

      for (const entry of data.chats) {
        // on s'attend à { id, name }
        if (!entry || typeof entry !== 'object' || !entry.id) continue
        const id = String(entry.id)
        const name = entry.name ? String(entry.name) : id
        chats.value.push({ id, name, messages: [] })
      }

      if (chats.value.length) {
        currentId.value = chats.value[0].id
        await selectChat(currentId.value)
      }
    } catch (e) {
      console.error('loadExistingChats error:', e)
    }
  }
  async function selectChat(id: string): Promise<void> {
    currentId.value = id
    const chat = chats.value.find((c) => c.id === id)
    if (!chat) return
    if (chat.messages.length) return

    try {
      const resp = await fetch(
        `${API_BASE}/messaging/${encodeURIComponent(id)}?key=${encodeURIComponent(apiKey)}`,
        { mode: 'cors' },
      )
      if (!resp.ok) {
        console.error('GET /messaging/:id failed:', resp.status, await resp.text())
        return
      }
      const data = await resp.json()
      if (Array.isArray(data?.history)) {
        chat.messages = data.history.map((m: any) => ({
          role: (m?.role === 'user' ? 'user' : 'assistant') as MsgRole,
          content: String(m?.content ?? ''),
        }))
      }
      if (data?.name && data.name !== chat.name) chat.name = String(data.name)
    } catch (e) {
      console.error('selectChat error:', e)
    }
  }

  async function sendMessage(text: string): Promise<void> {
    const chat = currentChat.value
    if (!chat) return
    const clean = text.trim()
    if (!clean) return

    const stamp = new Date().toLocaleString('fr-FR')
    chat.messages.push({ role: 'user', content: `[${stamp}] : ${clean}` })

    const payload: Record<string, any> = { prompt: clean, key: apiKey, name: chat.name }

    isLoading.value = true
    try {
      const resp = await fetch(`${API_BASE}/messaging/${encodeURIComponent(chat.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      let assistant = 'I think an error happened inside me'
      if (resp.ok) {
        const data = await resp.json()
        if (typeof data?.response === 'string') assistant = data.response
      } else {
        console.error('POST /messaging/:id failed:', resp.status, await resp.text())
      }
      const stamp2 = new Date().toLocaleString('fr-FR')
      chat.messages.push({ role: 'assistant', content: `[${stamp2}] : ${assistant}` })
    } catch (e) {
      console.error('sendMessage error:', e)
    } finally {
      isLoading.value = false
    }
  }

  // crée un nouveau chat (ID client-side) et le sélectionne
  function addChat(name: string): string {
    const id = generateChatId()
    const displayName = name?.trim() || `Chat ${chats.value.length + 1}`
    const chat: Chat = { id, name: displayName, messages: [] }
    chats.value.unshift(chat)
    currentId.value = id
    return id
  }

  return {
    // state
    chats,
    currentId,
    isLoading,
    // getters
    currentChat,
    // actions
    loadExistingChats,
    selectChat,
    addChat,
    sendMessage,
  }
})
