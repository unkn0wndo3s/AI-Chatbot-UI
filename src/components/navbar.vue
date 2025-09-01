<template>
  <nav>
    <ul class="navbar">
      <li class="navitem" v-for="chat in chats" :key="chat.id">
        <Neon color="lightgray" v-if="chat.id === currentId">
          <RouterLink class="navitem active" :to="'/' + chat.id">{{ chat.name }}</RouterLink>
        </Neon>
        <RouterLink v-else class="navitem" :to="'/' + chat.id">{{ chat.name }}</RouterLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'

import Neon from '@/components/Neon.vue'

const apiBase = 'http://54.37.68.129:8000'
const apiKey = 'a9$Kz!3Q@pL7*Xw2#bV5%tY8&nR0^jM1*'

const chats = ref<{ id: string; name: string }[]>([])
const route = useRoute()
const currentId = computed(() => route.params.id as string)

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
  min-width: 10%;
  display: flex;
  flex-direction: column;
  font-size: 18px;
}
.navbar {
  top: 2rem;
  position: fixed;
  display: flex;
  gap: 0.5rem;
  flex-direction: column;
  width: max-content;
  text-align: left;
}
.navitem {
  width: 100%;
  text-align: left;
}
</style>
