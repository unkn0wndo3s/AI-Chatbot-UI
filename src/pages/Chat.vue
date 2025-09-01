<template>
  <div class="chat">
    <div v-if="loading">Loading…</div>
    <div v-else-if="error" style="color: crimson">{{ error }}</div>

    <ul v-else>
      <li v-for="msg in messages" :key="msg.key">
        <Neon
          :color="msg.role === 'assistant' ? 'yellow' : 'green'"
          :class="msg.role === 'assistant' ? 'assistant' : 'user'"
        >
          <!-- USER : aucun formatage -->
          <template v-if="msg.role !== 'assistant'">
            <span class="text user-text">{{ msg.content }}</span>
          </template>

          <!-- ASSISTANT : parsing texte / code -->
          <template v-else>
            <template v-if="parseMessage(msg.content).length">
              <template v-for="(part, i) in parseMessage(msg.content)" :key="i">
                <Neon v-if="part.type === 'code'" color="purple" class="inline-neon">
                  <div class="code-scroll">
                    <div class="copy-bar">
                      <button
                        class="copy-btn"
                        type="button"
                        aria-label="Copier le code"
                        @click="copyCode(part.text, $event)"
                      >
                        Copier
                      </button>
                    </div>

                    <pre class="code">
                      <code
                        v-highlight:[part.lang]="part.text"
                        class="hljs"
                      ></code>
                    </pre>
                  </div>
                </Neon>

                <span v-else class="text">{{ part.text }}</span>
              </template>
            </template>

            <!-- Fallback : si aucun segment n'a été extrait -->
            <template v-else>
              <span class="text">{{ msg.content }}</span>
            </template>
          </template>
        </Neon>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import Neon from '@/components/Neon.vue'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

/* ---------------------- Directive v-highlight ---------------------- */
const highlight = {
  mounted(el: HTMLElement, binding: any) {
    const code: string = binding.value ?? ''
    const lang: string | undefined = binding.arg
    renderHighlight(el, code, lang)
  },
  updated(el: HTMLElement, binding: any) {
    if (binding.value !== binding.oldValue || binding.arg !== binding.oldArg) {
      const code: string = binding.value ?? ''
      const lang: string | undefined = binding.arg
      renderHighlight(el, code, lang)
    }
  },
}
function renderHighlight(el: HTMLElement, code: string, lang?: string) {
  el.textContent = code
  try {
    if (lang && hljs.getLanguage(lang)) {
      const { value } = hljs.highlight(code, { language: lang, ignoreIllegals: true })
      el.innerHTML = value
    } else {
      const { value } = hljs.highlightAuto(code)
      el.innerHTML = value
    }
  } catch {
    el.textContent = code
  }
}
// expose comme v-highlight dans <script setup>
const vHighlight = highlight

/* ---------------------- Copier ---------------------- */
async function copyCode(text: string, ev: Event) {
  try {
    await navigator.clipboard.writeText(text)
    const btn = ev.currentTarget as HTMLButtonElement
    const original = btn.textContent
    btn.textContent = 'Copié'
    btn.disabled = true
    setTimeout(() => {
      btn.textContent = original || 'Copier'
      btn.disabled = false
    }, 1200)
  } catch {
    alert('Impossible de copier')
  }
}

/* ---------------------- Données ---------------------- */
const apiBase = 'http://54.37.68.129:8000'
const apiKey = 'a9$Kz!3Q@pL7*Xw2#bV5%tY8&nR0^jM1*'

const route = useRoute()
const id = ref(route.params.id as string)

type RawMsg = { id?: string; role: string; content: string }
type MessageView = { key: string; role: string; content: string }

const messages = ref<MessageView[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let currentAbort: AbortController | null = null

/* ---------------------- Utils ---------------------- */
function stripPrefix(s: string): string {
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

/**
 * Découpe message en segments texte/code.
 * Supporte:
 *  - ```lang\n...\n```
 *  - ``CODE``...\n``/CODE``
 */
function parseMessage(content: string) {
  const parts: Array<{ type: 'text' | 'code'; text: string; lang?: string }> = []
  let remaining = content

  // 1) Fences Markdown
  const fenceRe = /```(\w+)?\n([\s\S]*?)```/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = fenceRe.exec(content)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, m.index) })
    }
    parts.push({
      type: 'code',
      text: m[2].replace(/\n$/, ''),
      lang: (m[1] || '').toLowerCase() || undefined,
    })
    lastIndex = fenceRe.lastIndex
  }
  if (lastIndex < content.length) {
    remaining = content.slice(lastIndex)
  } else {
    remaining = ''
  }

  // 2) Blocs ``CODE`` ... ``/CODE``
  if (remaining) {
    const codeRe = /``CODE``([\s\S]*?)``\/CODE``/g
    let prev = 0
    let c: RegExpExecArray | null
    while ((c = codeRe.exec(remaining)) !== null) {
      if (c.index > prev) {
        parts.push({ type: 'text', text: remaining.slice(prev, c.index) })
      }
      parts.push({ type: 'code', text: c[1] })
      prev = codeRe.lastIndex
    }
    if (prev < remaining.length) {
      parts.push({ type: 'text', text: remaining.slice(prev) })
    }
  }

  // 3) Si rien détecté, renvoyer un segment texte brut
  if (parts.length === 0 && content) {
    parts.push({ type: 'text', text: content })
  }

  return parts
}

/* ---------------------- Fetch ---------------------- */
async function loadMessages(chatId: string) {
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
    if (!currentAbort?.signal.aborted) {
      loading.value = false
    }
  }
}

/* ---------------------- Init + Watch ---------------------- */
loadMessages(id.value)
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
.chat {
  width: 100%;
  padding: 2rem;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 1rem;
  flex-direction: column;
}
li {
  display: flex;
  margin: 0.5rem 0;
}

/* bulles alignées */
.assistant {
  max-width: 65%;
  width: fit-content;
  align-self: flex-start;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  text-align: left;
}
.user {
  max-width: 65%;
  width: fit-content;
  margin-left: auto;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  text-align: left;
}

/* texte normal */
.text {
  white-space: pre-wrap;
  color: inherit; /* s'assure que le texte reste visible */
}

/* texte user (brut) */
.user-text {
  display: inline-block;
  word-break: break-word;
}

/* NEON enfant pour blocs de code */
.inline-neon {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  vertical-align: baseline;
  margin: 0 0.15rem;
}

/* Conteneur scrollable du code */
.code-scroll {
  position: relative;
  max-height: 60vh; /* ajustable */
  overflow: auto;
  background: transparent;
  padding-top: 0.25rem;
}

/* Barre sticky (reste dans la zone) */
.copy-bar {
  position: sticky;
  top: 8px;
  right: 2rem;
  display: flex;
  justify-content: flex-end;
  z-index: 2;
  opacity: 0;
  transition: opacity 120ms ease-in-out;
  pointer-events: none;
}

/* Affiche la barre au survol de la zone de code */
.code-scroll:hover .copy-bar {
  opacity: 1;
  pointer-events: auto;
}

/* Bouton Copier */
.copy-btn {
  font-size: 12px;
  line-height: 1;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #8885;
  background: #1f2937;
  color: #f3f4f6;
  cursor: pointer;
  user-select: none;
  backdrop-filter: blur(2px);
}
.copy-btn:hover {
  filter: brightness(1.1);
}
.copy-btn:active {
  transform: translateY(1px);
}
.copy-btn:disabled {
  opacity: 0.7;
  cursor: default;
}

/* bloc code */
.code {
  margin: 0;
  overflow: auto;
}
.code > .hljs {
  display: block;
  text-align: left;
  background-color: transparent;
  padding-right: 0.25rem;
}
</style>
