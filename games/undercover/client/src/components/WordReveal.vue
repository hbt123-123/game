<template>
  <div class="word-reveal-overlay">
    <div class="word-reveal">
      <div class="reveal-header">
        <span class="reveal-title">{{ role === 2 ? '你是白板' : '请查看你的词语' }}</span>
      </div>

      <div class="word-display">
        <div class="word-label">{{ role === 2 ? '你没有词语' : '你的词语是' }}</div>
        <div class="word-text" :class="{ blank: role === 2 }">{{ word }}</div>
      </div>

      <p class="warn-text" v-if="role === 2">靠听别人描述来伪装，不要暴露身份</p>
      <p class="warn-text" v-else>请牢记你的词语，不要让他人看到</p>
      <p class="wait-text">等待所有玩家确认后开始讨论...</p>

      <button
        class="confirm-btn"
        :class="{ confirmed: isConfirmed }"
        :disabled="isConfirmed"
        @click="handleConfirm"
      >
        {{ isConfirmed ? '已确认' : '我已记住' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  word: { type: String, default: '' },
  role: { type: Number, default: null },
  roleName: { type: String, default: '' },
  revealIndex: { type: Number, default: 1 },
  totalPlayers: { type: Number, default: 1 },
})

const emit = defineEmits(['confirmed'])

const isConfirmed = ref(false)

function handleConfirm() {
  if (isConfirmed.value) return
  isConfirmed.value = true
  emit('confirmed')
}
</script>

<style scoped>
.word-reveal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
  backdrop-filter: blur(8px);
}

.word-reveal {
  width: 100%;
  max-width: 380px;
  background: rgba(30, 30, 60, 0.95);
  background-image: url('/img/pai.png');
  background-size: cover;
  background-position: center;
  background-blend-mode: overlay;
  border-radius: 24px;
  padding: 36px 28px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.reveal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.reveal-title {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.5);
}

.role-badge {
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.role-icon {
  width: 20px;
  height: 20px;
}

.role-icon-text {
  font-size: 18px;
  font-weight: 700;
  color: #c8b4ff;
}

.role-badge.spy {
  background: rgba(255, 107, 129, 0.15);
  color: #ff6b81;
}

.role-badge.civilian {
  background: rgba(94, 231, 223, 0.15);
  color: #5ee7df;
}

.role-badge.blank {
  background: rgba(200, 180, 255, 0.15);
  color: #c8b4ff;
}

.word-display {
  margin-bottom: 24px;
}

.word-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 12px;
}

.word-text {
  font-size: 56px;
  font-weight: 800;
  background: linear-gradient(135deg, #f6d365, #fda085);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.word-text.blank {
  background: linear-gradient(135deg, #c8b4ff, #a18cd1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 48px;
}

.warn-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 8px;
}

.wait-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.25);
  margin-bottom: 20px;
}

.confirm-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #f6d365, #fda085);
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(246, 211, 101, 0.3);
  transition: all 0.3s;
}

.confirm-btn.confirmed {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.35);
  box-shadow: none;
  cursor: default;
}

.confirm-btn:disabled {
  cursor: default;
  transform: none;
}
</style>