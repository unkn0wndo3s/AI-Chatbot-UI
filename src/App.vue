<!-- App.vue -->
<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <RouterView />
  </div>
</template>

<style>
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}

.app {
  height: 100vh;
  display: grid;
  grid-template-columns: 280px 1fr;
  overflow: hidden;
}
</style>
