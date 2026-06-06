<template>
  <div class="game">
    <div class="game-container">
      <div class="game-header">
        <div class="header-left">
          <div class="round-info">第 {{ gameState?.round || 1 }} 轮</div>
        </div>
        <div class="phase-info">{{ phaseText }}</div>
        <div class="alive-count">存活: {{ aliveCount }}</div>
      </div>

      <PlayerGrid
        :players="gameState?.players || []"
        :myPlayerId="myPlayerId"
        :myVotedForId="myVotedForId"
        :selectedTargetId="selectedTargetId"
        :hasVoted="hasVoted"
        :phase="gameState?.phase"
        :isVoting="gameState?.phase === 'voting'"
        @select="onSelectTarget"
      />

      <div v-if="gameState?.phase === 'voting'" class="vote-action">
        <template v-if="!hasVoted">
          <button
            class="vote-btn"
            :disabled="!selectedTargetId"
            @click="onConfirmVote"
          >
            {{ selectedTargetId ? '确认投票' : '请选择投票对象' }}
          </button>
        </template>
        <div v-else class="voted-status">
          已完成投票，等待其他玩家...
        </div>
      </div>

      <WordReveal
        v-if="revealData && gameState?.phase === 'revealing'"
        :word="myWord"
        :role="myRole"
        :roleName="roleName"
        @confirmed="gameStore.confirmReveal()"
      />

      <DiscussPanel
        v-if="gameState?.phase === 'discussing' && speakData"
        :discussOrder="gameState?.discussOrder || []"
        :discussIndex="speakData.discussIndex"
        :speakerSocketId="speakData.speakerSocketId"
        :speakerName="speakData.speakerName"
        :myPlayerId="mySocketId"
        :players="gameState?.players || []"
        @speakDone="gameStore.confirmSpeak()"
      />

      <VotePanel
        v-if="gameState?.phase === 'voting' && voteResult && voteResult.status !== 'voted'"
        :voteResult="voteResult"
        :players="gameState?.players || []"
        :myPlayerId="myPlayerId"
      />

      <GameOver
        v-if="gameOverData"
        :winner="gameOverData.winner"
        :players="gameOverData.room?.players || []"
        :isHost="isHost"
        @restart="gameStore.restartGame()"
        @leave="handleLeave"
      />

      <div v-if="error && gameState?.phase !== 'voting'" class="error-toast" @click="gameStore.clearError()">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../store/game'
import PlayerGrid from '../components/PlayerGrid.vue'
import WordReveal from '../components/WordReveal.vue'
import DiscussPanel from '../components/DiscussPanel.vue'
import VotePanel from '../components/VotePanel.vue'
import GameOver from '../components/GameOver.vue'

const router = useRouter()
const gameStore = useGameStore()

const gameState = computed(() => gameStore.gameState)
const myPlayerId = computed(() => gameStore.myPlayerId)
const myRole = computed(() => gameStore.myRole)
const myWord = computed(() => gameStore.myWord)
const room = computed(() => gameStore.room)
const revealData = computed(() => gameStore.revealData)
const voteResult = computed(() => gameStore.voteResult)
const gameOverData = computed(() => gameStore.gameOverData)
const speakData = computed(() => gameStore.speakData)
const isHost = computed(() => gameStore.isHost)
const error = computed(() => gameStore.error)

const mySocketId = computed(() => {
  const p = gameState.value?.players?.find(p => p.id === myPlayerId.value)
  return p?.socketId || ''
})

const myVotedForId = computed(() => {
  if (!voteResult.value?.votes || !myPlayerId.value) return ''
  const myVote = voteResult.value.votes.find(v => v.id === myPlayerId.value)
  return myVote?.votedFor || ''
})

const hasVoted = computed(() => !!myVotedForId.value)

const selectedTargetId = ref('')

watch(() => gameState.value?.phase, (phase) => {
  if (phase === 'voting') {
    selectedTargetId.value = ''
  }
})

watch(() => gameStore.room?.phase, (phase) => {
  if (phase === 'lobby' && gameStore.room?.id) {
    router.push(`/room/${gameStore.room.id}`)
  }
})

const aliveCount = computed(() => {
  if (!gameState.value?.players) return 0
  return gameState.value.players.filter(p => !p.eliminated).length
})

const roleName = computed(() => {
  if (myRole.value === 0) return '卧底'
  if (myRole.value === 1) return '平民'
  if (myRole.value === 2) return '白板'
  return ''
})

const identityClass = computed(() => {
  if (myRole.value === 0) return 'spy'
  if (myRole.value === 1) return 'civilian'
  if (myRole.value === 2) return 'blank'
  return ''
})

const phaseText = computed(() => {
  const phase = gameState.value?.phase
  const map = {
    revealing: '查看身份中',
    discussing: '讨论阶段',
    voting: '投票阶段',
    result: '公布结果',
    over: '游戏结束',
  }
  return map[phase] || ''
})

function onSelectTarget(playerId) {
  selectedTargetId.value = playerId
}

function onConfirmVote() {
  if (!selectedTargetId.value || hasVoted.value) return
  gameStore.castVote(selectedTargetId.value)
}

function handleLeave() {
  gameStore.leaveRoom()
  router.push('/')
}
</script>

<style scoped>
.game {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.game-container {
  width: 100%;
  max-width: 520px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 20px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.round-info {
  font-size: 14px;
  font-weight: 600;
  color: #f6d365;
}

.phase-info {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.alive-count {
  font-size: 13px;
  color: #5ee7df;
  background: rgba(94, 231, 223, 0.1);
  padding: 3px 10px;
  border-radius: 8px;
}

.vote-action {
  padding: 0 4px;
}

.vote-btn {
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

.vote-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.35);
  box-shadow: none;
  cursor: default;
}

.voted-status {
  text-align: center;
  padding: 14px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.error-toast {
  margin-top: 8px;
  padding: 10px 14px;
  background: rgba(255, 71, 87, 0.15);
  border: 1px solid rgba(255, 71, 87, 0.3);
  border-radius: 12px;
  color: #ff6b81;
  font-size: 13px;
  text-align: center;
  cursor: pointer;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
</style>