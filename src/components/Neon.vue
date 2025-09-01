<template>
  <div :class="['neon', neonClass]">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  color: 'purple' | 'red' | 'green' | 'yellow' | 'lightgray'
}>()

const neonClass = computed(() => `neon-${props.color ?? 'purple'}`)
</script>

<style>
/* ===========================
   Neon Border Styles
   =========================== */

/* Variables globales */
:root {
  --neon-radius: 12px;
  --neon-border: 2px;
  --neon-glow1: 4px;
  --neon-glow2: 12px;
  --neon-glow3: 24px;
  --neon-padding: 4px;
}

/* Base commune */
.neon {
  border-radius: var(--neon-radius);
  padding: var(--neon-padding);
  border: var(--neon-border) solid transparent;
  font-weight: bold;
  text-align: center;
  display: inline-block;
  background: #000; /* fond sombre pour voir le glow */
  width: 100%;
}

/* Violet */
.neon-purple {
  --c: #a020f0;
  border-color: var(--c);
  color: var(--c);
  box-shadow:
    0 0 var(--neon-glow1) var(--c),
    0 0 var(--neon-glow2) var(--c),
    0 0 var(--neon-glow3) var(--c);
}

/* Rouge */
.neon-red {
  --c: #ff1a1a;
  border-color: var(--c);
  color: var(--c);
  box-shadow:
    0 0 var(--neon-glow1) var(--c),
    0 0 var(--neon-glow2) var(--c),
    0 0 var(--neon-glow3) var(--c);
}

/* Vert */
.neon-green {
  --c: #39ff14;
  border-color: var(--c);
  color: var(--c);
  box-shadow:
    0 0 var(--neon-glow1) var(--c),
    0 0 var(--neon-glow2) var(--c),
    0 0 var(--neon-glow3) var(--c);
}

/* Jaune */
.neon-yellow {
  --c: #ffff33;
  border-color: var(--c);
  color: #ffff33;
  box-shadow:
    0 0 var(--neon-glow1) var(--c),
    0 0 var(--neon-glow2) var(--c),
    0 0 var(--neon-glow3) var(--c);
}

/* Gris clair */
.neon-lightgray {
  --c: #d3d3d3;
  border-color: var(--c);
  color: #d3d3d3;
  box-shadow:
    0 0 var(--neon-glow1) var(--c),
    0 0 var(--neon-glow2) var(--c),
    0 0 var(--neon-glow3) var(--c);
}
</style>
