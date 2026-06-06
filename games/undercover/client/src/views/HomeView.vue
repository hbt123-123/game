<template>
  <div class="home">
    <div class="home-container">
      <div class="logo-section">
        <div class="logo-icon">🔍</div>
        <h1 class="title">谁是卧底</h1>
        <p class="subtitle">多人聚会推理游戏</p>
      </div>

      <div class="menu-section">
        <div class="create-section">
          <h2>创建房间</h2>
          <input
            v-model="playerName"
            class="name-input"
            placeholder="请输入你的昵称"
            maxlength="8"
            @keyup.enter="handleCreate"
          />
          <button
            class="btn primary-btn"
            :disabled="!playerName.trim() || loading"
            @click="handleCreate"
          >
            {{ loading ? '创建中...' : '创建新房间' }}
          </button>
        </div>

        <div class="divider">
          <span>或</span>
        </div>

        <div class="join-section">
          <h2>加入房间</h2>
          <input
            v-model="roomCode"
            class="code-input"
            placeholder="输入6位房间号"
            maxlength="6"
            @keyup.enter="handleJoin"
          />
          <button
            class="btn secondary-btn"
            :disabled="!playerName.trim() || !roomCode.trim() || loading"
            @click="handleJoin"
          >
            {{ loading ? '加入中...' : '加入房间' }}
          </button>
        </div>
      </div>

      <div v-if="error" class="error-toast" @click="gameStore.clearError()">
        {{ error }}
      </div>

      <div class="connection-status" :class="{ online: connected }">
        {{ connected ? '已连接服务器' : '连接中...' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'

const router = useRouter()
const gameStore = useGameStore()

const playerName = ref(localStorage.getItem('playerName') || '')
const roomCode = ref('')
const loading = ref(false)
const connected = ref(false)

watch(() => gameStore.connected, (val) => {
  connected.value = val
})

watch(playerName, (val) => {
  localStorage.setItem('playerName', val)
})

watch(() => gameStore.room, (room) => {
  if (room) {
    loading.value = false
    router.push(`/room/${room.id}`)
  }
})

watch(() => gameStore.loading, (val) => {
  loading.value = val
})

function handleCreate() {
  if (!playerName.value.trim()) return
  gameStore.createRoom(playerName.value.trim())
}

function handleJoin() {
  if (!playerName.value.trim() || !roomCode.value.trim()) return
  gameStore.joinRoom(roomCode.value.trim().toUpperCase(), playerName.value.trim())
}
</script>

<style scoped>
.home {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.home-container {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-section {
  text-align: center;
  margin-bottom: 40px;
}

.logo-icon {
  font-size: 72px;
  margin-bottom: 10px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.title {
  font-size: 42px;
  font-weight: 700;
  background: linear-gradient(135deg, #f6d365, #fda085);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
}

.menu-section {
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 30px 24px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.create-section, .join-section {
  text-align: center;
}

.create-section h2, .join-section h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.8);
}

.name-input, .code-input {
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

.name-input:focus, .code-input:focus {
  border-color: #f6d365;
}

.name-input::placeholder, .code-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.code-input {
  text-transform: uppercase;
  letter-spacing: 4px;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
}

.btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 600;
  color: #fff;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.primary-btn {
  background: linear-gradient(135deg, #f6d365, #fda085);
  box-shadow: 0 4px 15px rgba(246, 211, 101, 0.3);
}

.secondary-btn {
  background: linear-gradient(135deg, #5ee7df, #b490ca);
  box-shadow: 0 4px 15px rgba(94, 231, 223, 0.3);
}

.divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
}

.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.divider span {
  margin: 0 16px;
}

.error-toast {
  width: 100%;
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(255, 71, 87, 0.15);
  border: 1px solid rgba(255, 71, 87, 0.3);
  border-radius: 12px;
  color: #ff6b81;
  font-size: 14px;
  text-align: center;
  cursor: pointer;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.connection-status {
  margin-top: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  gap: 6px;
}

.connection-status::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4757;
}

.connection-status.online::before {
  background: #2ed573;
}
</style>