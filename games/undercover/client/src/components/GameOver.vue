<template>
  <div class="gameover-overlay">
    <div class="gameover-panel">
      <img src="/img/win.png" class="win-image" alt="" />
      <div class="winner-icon">{{ isSpyWin ? '🕵️' : '🎉' }}</div>
      <h2 class="winner-text">{{ winner }}</h2>
      <p class="winner-sub">游戏结束</p>

      <div class="result-players">
        <div
          v-for="player in players"
          :key="player.id"
          class="result-player"
          :class="{ eliminated: player.eliminated }"
        >
          <span class="result-name">{{ player.name }}</span>
          <span class="result-role">{{ player.roleName || '?' }}</span>
          <span class="result-status">{{ player.eliminated ? '淘汰' : '存活' }}</span>
        </div>
      </div>

      <div class="actions">
        <button class="btn leave-btn" @click="$emit('leave')">退出</button>
        <button v-if="isHost" class="btn restart-btn" @click="$emit('restart')">
          再来一局
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  winner: { type: String, default: '' },
  players: { type: Array, default: () => [] },
  isHost: { type: Boolean, default: false },
})

defineEmits(['restart', 'leave'])

const isSpyWin = computed(() => props.winner?.includes('卧底'))
</script>

<style scoped>
.gameover-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
  backdrop-filter: blur(12px);
}

.gameover-panel {
  width: 100%;
  max-width: 400px;
  background: rgba(30, 30, 60, 0.97);
  border-radius: 24px;
  padding: 36px 24px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.winner-icon {
  font-size: 64px;
  margin-bottom: 8px;
  animation: bounce 0.6s ease infinite alternate;
}

.win-image {
  width: 120px;
  height: auto;
  margin-bottom: 12px;
  animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-10px); }
}

.winner-text {
  font-size: 38px;
  font-weight: 800;
  background: linear-gradient(135deg, #f6d365, #fda085);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
}

.winner-sub {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 24px;
}

.result-players {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
  max-height: 200px;
  overflow-y: auto;
}

.result-player {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  font-size: 14px;
}

.result-player.eliminated {
  opacity: 0.4;
  text-decoration: line-through;
}

.result-name {
  color: rgba(255, 255, 255, 0.8);
}

.result-role {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.result-status {
  font-size: 12px;
  color: #ff6b81;
}

.actions {
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.leave-btn {
  background: rgba(255, 255, 255, 0.08);
}

.restart-btn {
  background: linear-gradient(135deg, #f6d365, #fda085);
  box-shadow: 0 4px 15px rgba(246, 211, 101, 0.3);
}
</style>