<template>
  <div class="room">
    <div v-if="!room && !myPlayerId" class="join-form">
      <div class="join-card">
        <h2>加入房间</h2>
        <div class="room-code-display">{{ routeRoomId }}</div>
        <input
          v-model="joinName"
          class="name-input"
          placeholder="请输入你的昵称"
          maxlength="8"
          @keyup.enter="handleJoinByLink"
        />
        <button
          class="btn join-btn"
          :disabled="!joinName.trim() || loading"
          @click="handleJoinByLink"
        >
          {{ loading ? '加入中...' : '加入房间' }}
        </button>
        <div v-if="error" class="error-toast" @click="gameStore.clearError()">
          {{ error }}
        </div>
      </div>
    </div>

    <div v-else-if="!room" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else class="room-container">
      <div class="room-header">
        <button class="back-btn" @click="handleLeave">← 退出</button>
        <div class="room-info">
          <h2>房间号</h2>
          <div class="room-code">{{ room.id }}</div>
          <div class="copy-btns">
            <button class="copy-btn" @click="copyRoomId">
              {{ copiedId ? '已复制' : '复制房间号' }}
            </button>
            <button class="copy-btn" @click="copyRoomLink">
              {{ copiedLink ? '已复制' : '复制链接' }}
            </button>
          </div>
        </div>
        <div class="player-count">
          {{ room.players?.length || 0 }} 人
        </div>
      </div>

      <div class="config-section" v-if="isHost">
        <h3>游戏设置</h3>
        <div class="config-row">
          <label>玩家人数: <strong>{{ room.config?.playerCount }}</strong></label>
          <input
            type="range"
            :min="3"
            :max="10"
            :value="room.config?.playerCount"
            @input="e => onPlayerCountChange(Number(e.target.value))"
          />
        </div>
        <div class="config-row">
          <label>卧底人数: <strong>{{ room.config?.spyCount }}</strong></label>
          <input
            type="range"
            :min="1"
            :max="maxSpies"
            :value="room.config?.spyCount"
            @input="e => onConfigChange('spyCount', Number(e.target.value))"
          />
        </div>
        <div class="config-row">
          <label>白板人数: <strong>{{ room.config?.blankCount }}</strong></label>
          <input
            type="range"
            :min="0"
            :max="room.config?.playerCount >= 5 ? 1 : 0"
            :disabled="room.config?.playerCount < 5"
            :value="room.config?.blankCount"
            @input="e => onConfigChange('blankCount', Number(e.target.value))"
          />
        </div>
        <button
          class="btn start-btn"
          :disabled="(room.players?.length || 0) < (room.config?.playerCount || 3)"
          @click="gameStore.startGame()"
        >
          <img src="/img/begin.png" class="start-icon" alt="" />
          开始游戏 ({{ room.players?.length || 0 }}/{{ room.config?.playerCount || 3 }})
        </button>
      </div>

      <div class="config-section" v-else>
        <p class="wait-text">等待房主开始游戏...</p>
        <p class="config-summary">
          玩家人数: {{ room.config?.playerCount }} | 卧底: {{ room.config?.spyCount }} | 白板: {{ room.config?.blankCount }}
        </p>
      </div>

      <div class="players-section">
        <h3>玩家列表</h3>
        <div class="players-grid">
          <div
            v-for="player in room.players"
            :key="player.id"
            class="player-card"
            :class="{ isMe: player.id === myPlayerId, isHost: player.isHost }"
          >
            <div class="player-avatar">
              <img v-if="player.photo" :src="player.photo" alt="" />
              <span v-else>{{ player.name.charAt(0) }}</span>
            </div>
            <div class="player-name">
              {{ player.name }}
              <span v-if="player.isHost" class="host-badge">房主</span>
              <span v-if="player.id === myPlayerId" class="me-badge">我</span>
            </div>
          </div>

          <div
            v-for="i in emptySlots"
            :key="'empty-' + i"
            class="player-card empty"
          >
            <div class="player-avatar empty-avatar">+</div>
            <div class="player-name">等待中</div>
          </div>
        </div>
      </div>

      <div v-if="error" class="error-toast" @click="gameStore.clearError()">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '../store/game'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

const room = computed(() => gameStore.room)
const myPlayerId = computed(() => gameStore.myPlayerId)
const isHost = computed(() => gameStore.isHost)
const error = computed(() => gameStore.error)
const loading = computed(() => gameStore.loading)

const routeRoomId = route.params.id
const joinName = ref(localStorage.getItem('playerName') || '')
const copiedId = ref(false)
const copiedLink = ref(false)

function handleJoinByLink() {
  if (!joinName.value.trim() || loading.value) return
  localStorage.setItem('playerName', joinName.value.trim())
  gameStore.joinRoom(routeRoomId, joinName.value.trim())
}

function copyRoomId() {
  if (!room.value) return
  navigator.clipboard.writeText(room.value.id).then(() => {
    copiedId.value = true
    setTimeout(() => { copiedId.value = false }, 2000)
  })
}

function copyRoomLink() {
  if (!room.value) return
  const link = `${window.location.origin}/undercover/room/${room.value.id}`
  navigator.clipboard.writeText(link).then(() => {
    copiedLink.value = true
    setTimeout(() => { copiedLink.value = false }, 2000)
  })
}

const emptySlots = computed(() => {
  if (!room.value) return 0
  return Math.max(0, (room.value.config?.playerCount || 3) - (room.value.players?.length || 0))
})

watch(() => gameStore.gameState, (state) => {
  if (state && state.phase !== 'lobby') {
    router.push(`/game/${room.value?.id}`)
  }
})

function onPlayerCountChange(value) {
  const spyCount = Math.ceil(value / 4)
  const blankCount = value >= 5 ? 1 : 0
  gameStore.updateConfig(value, spyCount, blankCount)
}
function onConfigChange(key, value) {
  gameStore.updateConfig(
    key === 'playerCount' ? value : room.value?.config?.playerCount,
    key === 'spyCount' ? value : room.value?.config?.spyCount,
    key === 'blankCount' ? value : room.value?.config?.blankCount,
  )
}

const maxSpies = computed(() => {
  if (!room.value) return 3
  const pc = room.value.config?.playerCount || 3
  const bc = room.value.config?.blankCount || 0
  return Math.min(3, pc - bc - 2)
})

function handleLeave() {
  gameStore.leaveRoom()
  router.push('/')
}
</script>

<style scoped>
.room {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.loading-state {
  text-align: center;
}

.join-form {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.join-card {
  width: 100%;
  max-width: 380px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.join-card h2 {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 16px;
}

.room-code-display {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: 10px;
  color: #f6d365;
  margin-bottom: 24px;
}

.join-card .name-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  margin-bottom: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: border-color 0.2s;
}

.join-card .name-input:focus {
  border-color: #f6d365;
}

.join-card .name-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.join-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #f6d365, #fda085);
  border-radius: 12px;
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(246, 211, 101, 0.3);
}

.join-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.join-card .error-toast {
  margin-top: 14px;
  padding: 10px 14px;
  background: rgba(255, 71, 87, 0.15);
  border: 1px solid rgba(255, 71, 87, 0.3);
  border-radius: 12px;
  color: #ff6b81;
  font-size: 13px;
  text-align: center;
  cursor: pointer;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #f6d365;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.room-container {
  width: 100%;
  max-width: 480px;
  max-height: 100%;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 20px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.room-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 14px;
}

.room-info {
  flex: 1;
  text-align: center;
}

.room-info h2 {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.room-code {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 8px;
  color: #f6d365;
  margin-top: 4px;
}

.copy-btns {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  justify-content: center;
}

.copy-btn {
  background: rgba(246, 211, 101, 0.12);
  color: #f6d365;
  border: 1px solid rgba(246, 211, 101, 0.25);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(246, 211, 101, 0.22);
}

.copy-btn:active {
  transform: scale(0.95);
}

.player-count {
  background: rgba(255, 255, 255, 0.08);
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
}

.config-section {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.config-section h3 {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 16px;
}

.config-row {
  margin-bottom: 14px;
}

.config-row label {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
}

.config-row strong {
  color: #f6d365;
}

.config-row input[type="range"] {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
}

.config-row input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #f6d365;
  cursor: pointer;
}

.wait-text {
  text-align: center;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
}

.config-summary {
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
}

.start-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #f6d365, #fda085);
  border-radius: 12px;
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  margin-top: 8px;
  box-shadow: 0 4px 15px rgba(246, 211, 101, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.start-icon {
  width: 24px;
  height: 24px;
}

.start-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.players-section h3 {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 12px;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.player-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 14px 8px;
  text-align: center;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.player-card.isMe {
  border-color: #5ee7df;
  background: rgba(94, 231, 223, 0.08);
}

.player-card.isHost {
  border-color: rgba(246, 211, 101, 0.3);
}

.player-card.empty {
  opacity: 0.3;
  border-style: dashed;
  border-color: rgba(255, 255, 255, 0.08);
}

.player-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  font-size: 20px;
  font-weight: 700;
  color: #f6d365;
  overflow: hidden;
}

.player-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty-avatar {
  color: rgba(255, 255, 255, 0.2);
}

.player-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.host-badge, .me-badge {
  display: inline-block;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 6px;
  margin-left: 2px;
  vertical-align: top;
}

.host-badge {
  background: rgba(246, 211, 101, 0.2);
  color: #f6d365;
}

.me-badge {
  background: rgba(94, 231, 223, 0.2);
  color: #5ee7df;
}

.error-toast {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(255, 71, 87, 0.15);
  border: 1px solid rgba(255, 71, 87, 0.3);
  border-radius: 12px;
  color: #ff6b81;
  font-size: 14px;
  text-align: center;
  cursor: pointer;
}
</style>