<template>
  <div class="discuss-panel">
    <div class="discuss-header">
      <span class="discuss-title">讨论阶段</span>
      <span class="discuss-progress">{{ discussIndex + 1 }}/{{ discussOrder.length }}</span>
    </div>

    <div class="speaker-list">
      <div
        v-for="(sid, idx) in discussOrder"
        :key="sid"
        class="speaker-item"
        :class="{
          speaking: idx === discussIndex,
          spoken: idx < discussIndex,
          pending: idx > discussIndex,
        }"
      >
        <div class="speaker-num">{{ idx + 1 }}</div>
        <div class="speaker-name">{{ getPlayerName(sid) }}</div>
        <div class="speaker-status">
          <span v-if="idx === discussIndex" class="badge speaking-badge">发言中</span>
          <span v-else-if="idx < discussIndex" class="badge spoken-badge">已发言</span>
          <span v-else class="badge pending-badge">等待中</span>
        </div>
      </div>
    </div>

    <div v-if="speakerSocketId === myPlayerId" class="my-turn">
      <p class="turn-hint">轮到你了，请描述你的词语</p>
      <button class="confirm-btn" @click="$emit('speakDone')">
        我已完成发言
      </button>
    </div>
    <div v-else class="my-turn waiting">
      <p class="turn-hint">当前发言: {{ speakerName }}</p>
      <p class="wait-hint">请等待轮到你发言</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  discussOrder: { type: Array, default: () => [] },
  discussIndex: { type: Number, default: 0 },
  speakerSocketId: { type: String, default: '' },
  speakerName: { type: String, default: '' },
  myPlayerId: { type: String, default: '' },
  players: { type: Array, default: () => [] },
})

defineEmits(['speakDone'])

function getPlayerName(socketId) {
  const p = props.players.find(p => p.socketId === socketId)
  return p?.name || '未知'
}
</script>

<style scoped>
.discuss-panel {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.discuss-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.discuss-title {
  font-size: 15px;
  font-weight: 600;
  color: #5ee7df;
}

.discuss-progress {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
}

.speaker-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.speaker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.3s;
}

.speaker-item.speaking {
  background: rgba(94, 231, 223, 0.1);
  border: 1px solid rgba(94, 231, 223, 0.25);
}

.speaker-item.spoken {
  opacity: 0.5;
}

.speaker-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.speaker-item.speaking .speaker-num {
  background: #5ee7df;
  color: #1a1a2e;
}

.speaker-name {
  flex: 1;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.speaking-badge {
  background: rgba(94, 231, 223, 0.15);
  color: #5ee7df;
}

.spoken-badge {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.3);
}

.pending-badge {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.25);
}

.my-turn {
  padding: 14px;
  border-radius: 12px;
  text-align: center;
}

.my-turn:not(.waiting) {
  background: rgba(94, 231, 223, 0.06);
  border: 1px solid rgba(94, 231, 223, 0.15);
}

.my-turn.waiting {
  background: rgba(255, 255, 255, 0.02);
}

.turn-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 10px;
}

.wait-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 4px;
}

.confirm-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #5ee7df, #3db8b0);
  border-radius: 10px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(94, 231, 223, 0.25);
  transition: all 0.2s;
}

.confirm-btn:active {
  transform: scale(0.97);
}
</style>