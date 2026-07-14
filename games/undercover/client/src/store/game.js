import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSocket, EVENTS } from '../socket'

export const useGameStore = defineStore('game', () => {
  const socket = ref(null)
  const connected = ref(false)

  const room = ref(null)
  const myPlayerId = ref(null)
  const myRole = ref(null)
  const myWord = ref(null)

  const gameState = ref(null)
  const revealData = ref(null)
  const voteResult = ref(null)
  const gameOverData = ref(null)
  const speakData = ref(null)

  const error = ref(null)
  const loading = ref(false)

  const isHost = computed(() => {
    if (!room.value || !myPlayerId.value) return false
    const me = room.value.players?.find(p => p.id === myPlayerId.value)
    return me?.isHost || false
  })

  const myPlayer = computed(() => {
    if (!room.value || !myPlayerId.value) return null
    return room.value.players?.find(p => p.id === myPlayerId.value) || null
  })

  const alivePlayers = computed(() => {
    if (!room.value?.players) return []
    return room.value.players.filter(p => !p.eliminated)
  })

  const currentRevealIndex = ref(0)
  const totalRevealCount = ref(0)

  function initSocket() {
    const s = getSocket()
    socket.value = s

    s.on('connect', () => {
      connected.value = true
      error.value = null

      if (room.value?.id && myPlayerId.value) {
        s.emit(EVENTS.REJOIN, {
          roomId: room.value.id,
          playerId: myPlayerId.value,
        })
      }
    })

    s.on('disconnect', () => {
      connected.value = false
    })

    s.on(EVENTS.ERROR, (data) => {
      error.value = data.message
      loading.value = false
    })

    s.on(EVENTS.ROOM_CREATED, (data) => {
      room.value = data.room
      myPlayerId.value = data.player.id
      myRole.value = data.player.role
      loading.value = false
    })

    s.on(EVENTS.ROOM_JOINED, (data) => {
      room.value = data.room
      myPlayerId.value = data.player.id
      myRole.value = data.player.role
      loading.value = false
    })

    s.on(EVENTS.ROOM_PLAYER_JOINED, (data) => {
      room.value = data.room
    })

    s.on(EVENTS.ROOM_PLAYER_LEFT, (data) => {
      room.value = data.room
      if (data.newHostSocketId) {
        const hostPlayer = room.value.players.find(p => p.socketId === data.newHostSocketId)
        if (hostPlayer) {
          hostPlayer.isHost = true
        }
      }
    })

    s.on(EVENTS.ROOM_UPDATE, (data) => {
      room.value = data.room
      if (data.room.phase === 'lobby') {
        gameState.value = null
        revealData.value = null
        voteResult.value = null
        gameOverData.value = null
        speakData.value = null
        myRole.value = null
        myWord.value = null
      }
    })

    s.on(EVENTS.GAME_STARTED, (data) => {
      gameState.value = data.room
      room.value = { ...room.value, phase: data.room.phase }
      revealData.value = null
      voteResult.value = null
      gameOverData.value = null
      speakData.value = null
      // 清空上一局的身份信息，等待新的 GAME_REVEAL 事件下发新身份
      myRole.value = null
      myWord.value = null
    })

    s.on(EVENTS.GAME_REVEAL, (data) => {
      revealData.value = data.player
      myWord.value = data.player.word
      myRole.value = data.player.role
    })

    s.on(EVENTS.GAME_CONFIRMED, (data) => {
      revealData.value = null
    })

    s.on(EVENTS.GAME_SPEAK, (data) => {
      speakData.value = data
    })

    s.on(EVENTS.GAME_STATE, (data) => {
      gameState.value = data.room
      room.value = { ...room.value, phase: data.room.phase, players: data.room.players }
      if (data.room.phase === 'voting') {
        voteResult.value = null
        error.value = null
      } else if (data.room.phase === 'discussing') {
        voteResult.value = null
      }
    })

    s.on(EVENTS.GAME_VOTE_RESULT, (data) => {
      if (data.status === 'voted') {
        if (data.votes) {
          room.value = {
            ...room.value,
            players: room.value.players.map(p => {
              const vote = data.votes.find(v => v.id === p.id)
              return vote ? { ...p, voteCount: vote.voteCount, eliminated: vote.eliminated } : p
            }),
          }
        }
        voteResult.value = data
        return
      }
      voteResult.value = data
      if (data.votes) {
        room.value = {
          ...room.value,
          players: room.value.players.map(p => {
            const vote = data.votes.find(v => v.id === p.id)
            return vote ? { ...p, voteCount: vote.voteCount, eliminated: vote.eliminated } : p
          }),
        }
      }
    })

    s.on(EVENTS.GAME_OVER, (data) => {
      gameOverData.value = data
    })

    s.connect()
  }

  function ensureSocket() {
    if (!socket.value) {
      error.value = '连接尚未建立，请稍后再试'
      loading.value = false
      return null
    }
    return socket.value
  }

  function createRoom(playerName) {
    const s = ensureSocket()
    if (!s) return
    loading.value = true
    error.value = null
    s.emit(EVENTS.ROOM_CREATE, { playerName })
  }

  function joinRoom(roomId, playerName) {
    const s = ensureSocket()
    if (!s) return
    loading.value = true
    error.value = null
    s.emit(EVENTS.ROOM_JOIN, { roomId, playerName })
  }

  function leaveRoom() {
    const s = ensureSocket()
    if (s) s.emit(EVENTS.ROOM_LEAVE)
    resetState()
  }

  function updateConfig(playerCount, spyCount, blankCount) {
    const s = ensureSocket()
    if (!s) return
    s.emit(EVENTS.GAME_CONFIG, { playerCount, spyCount, blankCount })
  }

  function startGame() {
    const s = ensureSocket()
    if (!s) return
    loading.value = true
    s.emit(EVENTS.GAME_START)
  }

  function revealWord() {
    const s = ensureSocket()
    if (!s) return
    s.emit(EVENTS.GAME_REVEAL)
  }

  function confirmReveal() {
    const s = ensureSocket()
    if (!s) return
    s.emit(EVENTS.GAME_CONFIRMED)
  }

  function confirmSpeak() {
    const s = ensureSocket()
    if (!s) return
    s.emit(EVENTS.GAME_SPEAK_CONFIRMED)
  }

  function castVote(targetPlayerId) {
    const s = ensureSocket()
    if (!s) return
    s.emit(EVENTS.GAME_VOTE, { targetPlayerId })
  }

  function restartGame() {
    const s = ensureSocket()
    if (!s) return
    s.emit(EVENTS.GAME_RESTART)
  }

  function resetState() {
    room.value = null
    myPlayerId.value = null
    myRole.value = null
    myWord.value = null
    gameState.value = null
    revealData.value = null
    voteResult.value = null
    gameOverData.value = null
    error.value = null
    loading.value = false
    currentRevealIndex.value = 0
    totalRevealCount.value = 0
  }

  function clearError() {
    error.value = null
  }

  return {
    socket,
    connected,
    room,
    myPlayerId,
    myRole,
    myWord,
    gameState,
    revealData,
    voteResult,
    gameOverData,
    speakData,
    error,
    loading,
    isHost,
    myPlayer,
    alivePlayers,
    currentRevealIndex,
    totalRevealCount,
    initSocket,
    createRoom,
    joinRoom,
    leaveRoom,
    updateConfig,
    startGame,
    revealWord,
    confirmReveal,
    confirmSpeak,
    castVote,
    restartGame,
    resetState,
    clearError,
  }
})