<script setup lang="ts">
import { RouterView } from 'vue-router'
import navbar from '@/components/navbar.vue'
</script>

<template>
  <div class="app">
    <navbar />
    <RouterView />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: row;
  width: 100vw;
  min-height: 100vh;
  max-width: 100vw;
  overflow: hidden;
}
</style>
