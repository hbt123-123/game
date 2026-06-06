<template>
  <div id="app-root">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useGameStore } from './store/game'

const gameStore = useGameStore()

onMounted(() => {
  gameStore.initSocket()
})
</script>

<style>
#app-root {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  background-image: url('/img/background.png');
  background-size: cover;
  background-position: center;
  background-blend-mode: overlay;
  color: #eee;
}

button, .btn {
  cursor: pointer;
  border: none;
  outline: none;
  font-family: inherit;
  transition: all 0.2s ease;
}

button:active, .btn:active {
  transform: scale(0.96);
}

input {
  border: none;
  outline: none;
  font-family: inherit;
}
</style>