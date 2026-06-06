<template>
  <div class="vote-panel-overlay" v-if="showPanel">
    <div class="vote-panel">
      <template v-if="voteResult.status === 'eliminated'">
        <div class="vote-icon">⚡</div>
        <h3>{{ voteResult.eliminated?.name }} 被淘汰</h3>
        <div class="eliminated-role" :class="eliminatedRoleClass">
          身份揭晓：<strong>{{ voteResult.eliminated?.roleName }}</strong>
        </div>
        <div v-if="voteFeedback" class="vote-feedback" :class="voteFeedback.correct ? 'correct' : 'wrong'">
          {{ voteFeedback.text }}
        </div>
        <p v-if="!voteResult.winner" class="vote-desc">进入下一轮...</p>
        <div class="vote-stats">
          <div v-for="p in voteCounts" :key="p.id" class="stat-item">
            <span class="stat-name">{{ p.name }}</span>
            <div class="stat-bar-wrap">
              <div
                class="stat-bar"
                :class="{ highlight: p.id === voteResult.eliminated?.id }"
                :style="{ width: p.percent + '%' }"
              ></div>
            </div>
            <span class="stat-count">{{ p.voteCount }}票</span>
          </div>
        </div>
      </template>

      <template v-else-if="voteResult.status === 'tie'">
        <div class="vote-icon">🤝</div>
        <h3>平票</h3>
        <p class="vote-desc">重新投票...</p>
        <div class="vote-stats">
          <div v-for="p in voteCounts" :key="p.id" class="stat-item">
            <span class="stat-name">{{ p.name }}</span>
            <div class="stat-bar-wrap">
              <div class="stat-bar highlight" :style="{ width: p.percent + '%' }"></div>
            </div>
            <span class="stat-count">{{ p.voteCount }}票</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  voteResult: { type: Object, default: null },
  players: { type: Array, default: () => [] },
  myPlayerId: { type: String, default: '' },
})

const showPanel = ref(false)

watch(() => props.voteResult, (val) => {
  if (val && val.status !== 'voted') {
    showPanel.value = true
  }
})

const voteCounts = computed(() => {
  if (!props.voteResult?.votes) return []
  const maxVotes = Math.max(...props.voteResult.votes.map(v => v.voteCount), 1)
  return props.voteResult.votes.map(v => ({
    ...v,
    percent: Math.round((v.voteCount / maxVotes) * 100),
  }))
})

const voteFeedback = computed(() => {
  if (props.voteResult?.status !== 'eliminated') return null
  const eliminated = props.voteResult.eliminated
  if (!eliminated) return null

  const myVote = props.voteResult.votes?.find(v => v.id === props.myPlayerId)
  if (!myVote || !myVote.votedFor) return null

  const isTargetEliminated = myVote.votedFor === eliminated.id
  if (isTargetEliminated) {
    return {
      correct: true,
      text: `✓ 你成功投票淘汰了 ${eliminated.roleName}！`,
    }
  }
  return {
    correct: false,
    text: `✗ 你投票的人没有被淘汰`,
  }
})

const eliminatedRoleClass = computed(() => {
  const role = props.voteResult?.eliminated?.role
  if (role === 0) return 'spy'
  if (role === 1) return 'civilian'
  if (role === 2) return 'blank'
  return ''
})
</script>

<style scoped>
.vote-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.vote-panel {
  width: 100%;
  max-width: 400px;
  background: rgba(30, 30, 60, 0.97);
  border-radius: 24px;
  padding: 32px 24px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.vote-icon { font-size: 48px; margin-bottom: 8px; }

h3 {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.vote-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 20px;
}

.eliminated-role {
  font-size: 15px;
  margin-bottom: 12px;
  padding: 6px 14px;
  border-radius: 10px;
  display: inline-block;
}

.eliminated-role.spy {
  background: rgba(255, 107, 129, 0.15);
  color: #ff6b81;
}

.eliminated-role.civilian {
  background: rgba(94, 231, 223, 0.15);
  color: #5ee7df;
}

.eliminated-role.blank {
  background: rgba(200, 180, 255, 0.15);
  color: #c8b4ff;
}

.vote-feedback {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  padding: 8px 14px;
  border-radius: 10px;
}

.vote-feedback.correct {
  background: rgba(46, 213, 115, 0.15);
  color: #2ed573;
}

.vote-feedback.wrong {
  background: rgba(255, 165, 0, 0.15);
  color: #ffa502;
}

.vote-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-name {
  width: 50px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-bar-wrap {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.stat-bar {
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  transition: width 0.5s ease;
  min-width: 0;
}

.stat-bar.highlight {
  background: linear-gradient(90deg, #f6d365, #fda085);
}

.stat-count {
  width: 30px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}
</style>