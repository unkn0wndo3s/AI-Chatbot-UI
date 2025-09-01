<template>
  <nav>
    <div class="navitem" v-for="chat in chats" :key="chat.id">
      <RouterLink class="navitem" :to="'/' + chat.id">{{ chat.name }}</RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

const apiBase = 'http://54.37.68.129:8000'
const apiKey = 'a9$Kz!3Q@pL7*Xw2#bV5%tY8&nR0^jM1*'

const chats = ref<{ id: string; name: string }[]>([])

onMounted(async () => {
  try {
    const response = await fetch(`${apiBase}/messaging?key=${encodeURIComponent(apiKey)}`)
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`)
    }
    const data = await response.json()
    chats.value = data.chats ?? []
  } catch (err) {
    console.error('Erreur de récupération des chats :', err)
    chats.value = []
  }
})
</script>

<style scoped>
nav,
.navitem {
  width: max-content;
  display: flex;
  flex-direction: column;
}
</style>
