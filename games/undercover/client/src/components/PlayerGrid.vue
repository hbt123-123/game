<template>
  <div class="player-grid">
    <div
      v-for="player in players"
      :key="player.id"
      class="player-card"
      :class="{
        eliminated: player.eliminated,
        isMe: player.id === myPlayerId,
        selectable: isVoting && !player.eliminated && player.id !== myPlayerId && !hasVoted,
        selected: isVoting && selectedTargetId === player.id,
        voted: isVoting && hasVoted && myVotedForId === player.id,
      }"
      @click="handleClick(player)"
    >
      <div class="avatar">
        <img v-if="player.photo" :src="player.photo" alt="" />
        <img v-else class="default-avatar" src="/img/person.png" alt="" />
        <div v-if="player.eliminated" class="eliminated-overlay">
          <span>{{ player.roleName || '出局' }}</span>
        </div>
      </div>
      <div class="name">{{ player.name }}</div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  players: { type: Array, default: () => [] },
  myPlayerId: { type: String, default: '' },
  myVotedForId: { type: String, default: '' },
  selectedTargetId: { type: String, default: '' },
  hasVoted: { type: Boolean, default: false },
  phase: { type: String, default: '' },
  isVoting: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

function handleClick(player) {
  if (!props.isVoting || player.eliminated || player.id === props.myPlayerId || props.hasVoted) return
  emit('select', player.id)
}
</script>

<style scoped>
.player-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  flex: 1;
  overflow-y: auto;
  align-content: start;
  padding: 4px 0;
}

.player-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 12px 6px;
  text-align: center;
  transition: all 0.2s;
  border: 2px solid transparent;
  cursor: default;
}

.player-card.eliminated {
  opacity: 0.35;
}

.player-card.isMe {
  border-color: #5ee7df;
  background: rgba(94, 231, 223, 0.06);
}

.player-card.selectable {
  cursor: pointer;
  border-color: rgba(255, 255, 255, 0.08);
}

.player-card.selectable:hover {
  border-color: #fda085;
  background: rgba(253, 160, 133, 0.08);
}

.player-card.selected {
  border-color: #fda085;
  background: rgba(253, 160, 133, 0.12);
  box-shadow: 0 0 12px rgba(253, 160, 133, 0.2);
}

.player-card.voted {
  border-color: #f6d365;
  background: rgba(246, 211, 101, 0.08);
  cursor: default;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  font-size: 22px;
  font-weight: 700;
  color: #f6d365;
  position: relative;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-avatar {
  opacity: 0.5;
}

.eliminated-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
}

.eliminated-overlay span {
  font-size: 11px;
  color: #ff6b81;
  font-weight: 600;
}

.name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vote-count {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #ff6b81;
  background: rgba(255, 107, 129, 0.1);
  border-radius: 6px;
  padding: 2px 8px;
  display: inline-block;
}
</style>