import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cfg } from '@/config'

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

function generateChatId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).slice(2, 10)
  return `${timestamp}${randomPart}`
}

function nowFR(): string {
  return new Date().toLocaleString('fr-FR')
}

export const useChatStore = defineStore('chat', () => {
  // state
  const chats = ref<Chat[]>([])
  const currentId = ref<string | null>(null)
  const isLoading = ref(false)

  // getters
  const currentChat = computed(() => chats.value.find((c) => c.id === currentId.value))

  // --- HTTP helpers (lisent cfg à l'exécution) ------------------------------
  function withKey(path: string): string {
    const key = cfg.PUBLIC_API_KEY ?? ''
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}key=${encodeURIComponent(key)}`
  }

  async function httpGET(path: string): Promise<any> {
    const url = `${cfg.API_BASE}${path}`
    const resp = await fetch(url, { mode: 'cors' })
    if (!resp.ok) throw new Error(`${resp.status} ${await resp.text()}`)
    return resp.json()
  }

  async function httpPOST(path: string, body: any): Promise<any> {
    const url = `${cfg.API_BASE}${path}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      mode: 'cors',
    })
    if (!resp.ok) throw new Error(`${resp.status} ${await resp.text()}`)
    return resp.json()
  }
  // -------------------------------------------------------------------------

  // actions
  async function loadExistingChats(): Promise<void> {
    chats.value = []
    currentId.value = null

    try {
      const data = await httpGET(withKey('/messaging'))

      if (!data || !Array.isArray(data.chats)) {
        console.error('Unexpected payload shape for /messaging:', data)
        return
      }

      for (const entry of data.chats) {
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
    if (currentId.value === id && currentChat.value?.messages.length) return
    currentId.value = id
    const chat = chats.value.find((c) => c.id === id)
    if (!chat) return
    if (chat.messages.length) return

    try {
      const data = await httpGET(withKey(`/messaging/${encodeURIComponent(id)}`))
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

    const stamp = nowFR()
    chat.messages.push({ role: 'user', content: `[${stamp}] : ${clean}` })

    const payload: Record<string, any> = {
      prompt: clean,
      key: cfg.PUBLIC_API_KEY ?? '',
      name: chat.name,
    }

    isLoading.value = true
    try {
      let assistant = 'I think an error happened inside me'
      const data = await httpPOST(`/messaging/${encodeURIComponent(chat.id)}`, payload)
      if (typeof data?.response === 'string') assistant = data.response

      const stamp2 = nowFR()
      chat.messages.push({ role: 'assistant', content: `[${stamp2}] : ${assistant}` })
    } catch (e) {
      console.error('sendMessage error:', e)
      const stamp2 = nowFR()
      chat.messages.push({
        role: 'assistant',
        content: `[${stamp2}] : I think an error happened inside me`,
      })
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
