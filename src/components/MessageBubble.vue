<template>
  <div class="row" :class="rowClass">
    <div class="bubble" :class="roleClass">
      <template v-for="(seg, i) in segments" :key="i">
        <div v-if="seg.type === 'code'" class="code-wrap">
          <pre class="code"><code ref="setCodeRef(i)">{{ seg.code }}</code></pre>
          <button class="btn copy" type="button" @click="copySegment(i)">
            {{ copiedIndex === i ? 'Copié' : 'Copier' }}
          </button>
        </div>
        <div v-else class="text" v-html="seg.html"></div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, computed, ref } from 'vue'
import type { Message } from '@/stores/chat'

const props = defineProps<{ msg: Message }>()

const rowClass = computed(() => (props.msg.role === 'user' ? 'right' : 'left'))
const roleClass = computed(() => (props.msg.role === 'user' ? 'user' : 'assist'))

type Segment = { type: 'text'; html: string } | { type: 'code'; lang?: string; code: string }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function parseContent(content: string): Segment[] {
  const parts: Segment[] = []
  const re = /```(\w+)?\n?([\s\S]*?)```/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) {
      const raw = content.slice(last, m.index)
      parts.push({
        type: 'text',
        html: escapeHtml(raw)
          .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
          .replace(/_(.+?)_/g, '<i>$1</i>')
          .replace(/\n/g, '<br>'),
      })
    }
    parts.push({
      type: 'code',
      lang: m[1] || undefined,
      code: m[2] || '',
    })
    last = re.lastIndex
  }
  if (last < content.length) {
    const raw = content.slice(last)
    parts.push({
      type: 'text',
      html: escapeHtml(raw)
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
        .replace(/_(.+?)_/g, '<i>$1</i>')
        .replace(/\n/g, '<br>'),
    })
  }
  return parts
}

const segments = computed(() => parseContent(props.msg.content))

// copier
const copiedIndex = ref<number | null>(null)
const codeRefs = ref<Record<number, HTMLElement | null>>({})

function setCodeRef(i: number) {
  return (el: HTMLElement | null) => {
    codeRefs.value[i] = el
  }
}

function flash(i: number) {
  copiedIndex.value = i
  window.setTimeout(() => (copiedIndex.value = null), 1200)
}

async function copySegment(i: number) {
  const seg = segments.value[i]
  if (!seg || seg.type !== 'code') return
  const str = seg.code

  try {
    if (
      'clipboard' in navigator &&
      (window.isSecureContext ||
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1')
    ) {
      await navigator.clipboard.writeText(str)
      flash(i)
      return
    }

    const ta = document.createElement('textarea')
    ta.value = str
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    flash(i)
  } catch {
    // ignore
  }
}
</script>
<style>
.row {
  display: flex;
  height: fit-content;
}
.row.left {
  justify-content: flex-start;
}
.row.right {
  justify-content: flex-end;
}
.btn {
  appearance: none;
  border: 1px solid #2a2a3a;
  background: #171722;
  color: var(--text);
  padding: 6px 10px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.15s ease;
}
.btn:hover {
  background: #1b1b29;
  border-color: #35354a;
}
.btn.brand {
  background: var(--brand);
  border-color: transparent;
}
.btn.brand:hover {
  background: var(--brand-2);
}
.bubble {
  max-width: 68ch;
  border: 1px solid #23233a;
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.15),
    0 0 20px rgba(99, 102, 241, 0.1);
  background: #0f0f18;
  display: grid;
  gap: 10px;
}
.assist {
  background: #0f0f18;
}
.user {
  background: #1a1f5a22;
  border-color: #3035a5;
}

.text {
  white-space: pre-wrap;
  line-height: 1.55;
}

.code-wrap {
  position: relative;
}
.code {
  background: var(--code);
  border: 1px solid var(--code-line);
  border-radius: 14px;
  padding: 12px 14px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #dfe3ff;
}
.copy {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: 0.15s ease;
  pointer-events: none;
}
.code-wrap:hover .copy {
  opacity: 1;
  pointer-events: auto;
}
</style>
