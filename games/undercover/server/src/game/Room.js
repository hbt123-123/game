const { v4: uuidv4 } = require('uuid')
const crypto = require('crypto')
const Player = require('./Player')
const { createWordPicker } = require('../words')
const { GAME: GAME_CONFIG } = require('../config')

const GamePhase = {
  LOBBY: 'lobby',
  REVEALING: 'revealing',
  DISCUSSING: 'discussing',
  VOTING: 'voting',
  RESULT: 'result',
  OVER: 'over',
}

class Room {
  constructor(hostName, hostSocketId) {
    this.id = uuidv4().slice(0, 6).toUpperCase()
    this.players = new Map()
    this.phase = GamePhase.LOBBY
    this.config = {
      playerCount: 3,
      spyCount: 1,
      blankCount: 0,
    }
    this.wordPicker = createWordPicker()
    this.currentPlayerIndex = 0
    this.revealOrder = []
    this.discussOrder = []
    this.discussIndex = 0
    this.round = 0
    this.wordPair = null
    this.winner = null
    this.tieRound = 0
    this.tieCandidateIds = []

    const host = new Player(hostSocketId, hostName)
    host.isHost = true
    this.players.set(hostSocketId, host)
    this.hostSocketId = hostSocketId
  }

  static getRecommendedConfig(totalPlayers) {
    const spyCount = Math.ceil(totalPlayers / 4)
    const blankCount = totalPlayers >= 5 ? 1 : 0
    const civilianCount = totalPlayers - spyCount - blankCount
    return { civilianCount, spyCount, blankCount }
  }

  static validateConfig(totalPlayers, spyCount, blankCount) {
    const civilianCount = totalPlayers - spyCount - blankCount
    return civilianCount > spyCount + blankCount
        && spyCount >= 1
        && blankCount >= 0
        && civilianCount >= 2
  }

  addPlayer(name, socketId) {
    if (this.players.has(socketId)) {
      return this.players.get(socketId)
    }
    // 纵深防御：游戏已开始时拒绝新玩家
    if (this.phase !== GamePhase.LOBBY) {
      return null
    }
    if (this.players.size >= GAME_CONFIG.MAX_PLAYERS) {
      return null
    }
    if (this.players.size >= this.config.playerCount) {
      return null
    }
    const player = new Player(socketId, name)
    this.players.set(socketId, player)
    return player
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId)
    if (!player) return null
    this.players.delete(socketId)

    if (this.players.size > 0 && socketId === this.hostSocketId) {
      const newHost = this.players.values().next().value
      if (newHost) {
        newHost.isHost = true
        this.hostSocketId = newHost.socketId
      }
    }

    if (this.players.size === 0) {
      return { player, roomEmpty: true }
    }

    return { player, roomEmpty: false, newHostSocketId: this.hostSocketId }
  }

  rejoinPlayer(playerId, newSocketId) {
    let oldSocketId = null
    for (const [sid, p] of this.players) {
      if (p.id === playerId) {
        oldSocketId = sid
        break
      }
    }
    if (!oldSocketId) return null

    const player = this.players.get(oldSocketId)
    this.players.delete(oldSocketId)
    player.socketId = newSocketId
    this.players.set(newSocketId, player)

    if (this.hostSocketId === oldSocketId) {
      this.hostSocketId = newSocketId
    }

    const idx = this.revealOrder.indexOf(oldSocketId)
    if (idx !== -1) {
      this.revealOrder[idx] = newSocketId
    }

    return player
  }

  updateConfig(playerCount, spyCount, blankCount) {
    let count = Number(playerCount)
    let spies = Number(spyCount)
    let blanks = blankCount !== undefined ? Number(blankCount) : this.config.blankCount

    if (count < GAME_CONFIG.MIN_PLAYERS || count > GAME_CONFIG.MAX_PLAYERS) {
      count = Math.max(GAME_CONFIG.MIN_PLAYERS, Math.min(GAME_CONFIG.MAX_PLAYERS, count))
    }
    if (spies < GAME_CONFIG.MIN_SPIES || spies > GAME_CONFIG.MAX_SPIES) {
      spies = Math.max(GAME_CONFIG.MIN_SPIES, Math.min(GAME_CONFIG.MAX_SPIES, spies))
    }
    if (blanks < GAME_CONFIG.MIN_BLANKS || blanks > GAME_CONFIG.MAX_BLANKS) {
      blanks = Math.max(GAME_CONFIG.MIN_BLANKS, Math.min(GAME_CONFIG.MAX_BLANKS, blanks))
    }
    if (blanks > 0 && count < 5) {
      blanks = 0
    }

    if (!Room.validateConfig(count, spies, blanks)) {
      spies = Math.ceil(count / 4)
      blanks = count >= 5 ? 1 : 0
    }

    this.config.playerCount = count
    this.config.spyCount = spies
    this.config.blankCount = blanks
  }

  canStart() {
    return this.players.size >= this.config.playerCount
  }

  startGame() {
    this.wordPair = this.wordPicker.pick()
    this.round = 1
    this.currentPlayerIndex = 0
    this.winner = null
    this.tieRound = 0
    this.tieCandidateIds = []

    const playerArray = Array.from(this.players.values())
    const n = playerArray.length
    const spyIndices = new Set()
    while (spyIndices.size < this.config.spyCount) {
      spyIndices.add(crypto.randomInt(0, n))
    }

    let blankIndex = -1
    if (this.config.blankCount > 0) {
      do {
        blankIndex = crypto.randomInt(0, n)
      } while (spyIndices.has(blankIndex))
    }

    playerArray.forEach((player, index) => {
      player.resetForNewGame()
      if (spyIndices.has(index)) {
        player.role = 0
        player.roleName = '卧底'
        player.word = this.wordPair[1]
      } else if (index === blankIndex) {
        player.role = 2
        player.roleName = '白板'
        player.word = '???'
      } else {
        player.role = 1
        player.roleName = '平民'
        player.word = this.wordPair[0]
      }
    })

    this.revealOrder = playerArray.map(p => p.socketId)
    this.phase = GamePhase.REVEALING

    const rolesSummary = playerArray.map((p, i) =>
      `${p.name}=${p.roleName}${spyIndices.has(i) ? '(卧底)' : ''}`
    ).join(', ')
    console.log(`[角色分配] 房间 ${this.id} | ${rolesSummary}`)
  }

  getRevealPlayer() {
    if (this.currentPlayerIndex >= this.revealOrder.length) {
      return null
    }
    const socketId = this.revealOrder[this.currentPlayerIndex]
    return this.players.get(socketId)
  }

  revealWord(socketId) {
    const expected = this.getRevealPlayer()
    if (!expected || expected.socketId !== socketId) return null
    return expected.toPrivateJSON()
  }

  confirmReveal(socketId) {
    const player = this.players.get(socketId)
    if (!player || player.confirmed) return false
    player.markConfirmed()

    const activePlayers = Array.from(this.players.values()).filter(p => !p.eliminated)
    const allConfirmed = activePlayers.every(p => p.confirmed)

    if (allConfirmed) {
      return this.startDiscussing()
    }
    return 'confirmed'
  }

  startDiscussing() {
    this.phase = GamePhase.DISCUSSING
    this.discussOrder = this.revealOrder.filter(sid => {
      const p = this.players.get(sid)
      return p && !p.eliminated
    })
    this.discussIndex = 0
    return 'phaseChange'
  }

  getCurrentSpeaker() {
    if (this.discussIndex >= this.discussOrder.length) return null
    const socketId = this.discussOrder[this.discussIndex]
    return this.players.get(socketId)
  }

  confirmSpeak(socketId) {
    if (this.phase !== GamePhase.DISCUSSING) return null
    const speaker = this.getCurrentSpeaker()
    if (!speaker || speaker.socketId !== socketId) return null
    this.discussIndex++
    if (this.discussIndex >= this.discussOrder.length) {
      this.phase = GamePhase.VOTING
      this.tieRound = 0
      this.tieCandidateIds = []
      this.players.forEach(p => {
        p.votedFor = null
        p.voteCount = 0
      })
      return 'discussDone'
    }
    return 'nextSpeaker'
  }

  castVote(voterSocketId, targetPlayerId) {
    const voter = this.players.get(voterSocketId)
    if (!voter || voter.eliminated || voter.votedFor) return null

    const targetPlayer = Array.from(this.players.values()).find(p => p.id === targetPlayerId)
    if (!targetPlayer || targetPlayer.eliminated) return null
    if (voter.id === targetPlayerId) return null

    voter.votedFor = targetPlayerId
    targetPlayer.voteCount++

    const activePlayers = Array.from(this.players.values()).filter(p => !p.eliminated)
    const allVoted = activePlayers.every(p => p.votedFor !== null)

    if (!allVoted) {
      return { status: 'voted', voterSocketId, targetPlayerId }
    }

    const maxVotes = Math.max(...activePlayers.map(p => p.voteCount))
    const topPlayers = activePlayers.filter(p => p.voteCount === maxVotes)

    if (topPlayers.length === 1) {
      const eliminated = topPlayers[0]
      eliminated.markEliminated()
      this.phase = GamePhase.RESULT
      this.tieRound = 0
      this.tieCandidateIds = []

      const result = this.checkWinCondition()
      if (result) {
        this.phase = GamePhase.OVER
        this.winner = result
        return {
          status: 'eliminated',
          eliminated: eliminated.toEliminatedJSON(),
          winner: result,
          votes: this.getVoteResults(),
        }
      }
      return {
        status: 'eliminated',
        eliminated: eliminated.toEliminatedJSON(),
        winner: null,
        votes: this.getVoteResults(),
      }
    }

    // 第 3 次平票（含本次）强制随机淘汰一名平票候选人，避免无限循环
    if (this.tieRound >= 2) {
      const forced = topPlayers[Math.floor(Math.random() * topPlayers.length)]
      forced.markEliminated()
      this.phase = GamePhase.RESULT
      this.tieRound = 0
      this.tieCandidateIds = []

      const result = this.checkWinCondition()
      if (result) {
        this.phase = GamePhase.OVER
        this.winner = result
      }
      return {
        status: 'eliminated',
        eliminated: forced.toEliminatedJSON(),
        winner: result,
        votes: this.getVoteResults(),
        forced: true,
      }
    }

    return {
      status: 'tie',
      tiedPlayers: topPlayers.map(p => p.toPublicJSON()),
      votes: this.getVoteResults(),
    }
  }

  checkWinCondition() {
    const alive = Array.from(this.players.values()).filter(p => !p.eliminated)
    const aliveSpies = alive.filter(p => p.role === 0)
    const aliveCivilians = alive.filter(p => p.role === 1)

    if (aliveSpies.length === 0) {
      return '平民胜利'
    }
    if (aliveSpies.length >= aliveCivilians.length) {
      return '卧底胜利'
    }
    return null
  }

  getVoteResults() {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      voteCount: p.voteCount,
      eliminated: p.eliminated,
      votedFor: p.votedFor,
    }))
  }

  nextRound() {
    this.round++
    this.currentPlayerIndex = 0
    this.discussIndex = 0
    this.tieRound = 0
    this.tieCandidateIds = []
    this.players.forEach(p => {
      p.confirmed = false
      p.votedFor = null
      p.voteCount = 0
    })
    this.discussOrder = this.revealOrder.filter(sid => {
      const p = this.players.get(sid)
      return p && !p.eliminated
    })
    this.phase = GamePhase.DISCUSSING
  }

  restartDiscuss(tiedPlayerIds) {
    this.discussIndex = 0
    this.tieRound++
    this.tieCandidateIds = tiedPlayerIds || []
    this.players.forEach(p => {
      p.votedFor = null
      p.voteCount = 0
    })
    this.discussOrder = this.revealOrder.filter(sid => {
      const p = this.players.get(sid)
      return p && !p.eliminated
    })
    this.phase = GamePhase.DISCUSSING
  }

  restart() {
    this.phase = GamePhase.LOBBY
    this.currentPlayerIndex = 0
    this.revealOrder = []
    this.round = 0
    this.wordPair = null
    this.winner = null
    this.tieRound = 0
    this.tieCandidateIds = []
    this.players.forEach(p => p.resetForNewGame())
  }

  toLobbyJSON() {
    return {
      id: this.id,
      phase: this.phase,
      players: Array.from(this.players.values()).map(p => p.toPublicJSON()),
      config: this.config,
      hostSocketId: this.hostSocketId,
    }
  }

  toGameStateJSON() {
    const phaseOver = this.phase === GamePhase.OVER
    return {
      id: this.id,
      phase: this.phase,
      round: this.round,
      // 游戏结束时揭示所有玩家身份（含角色），其他阶段只暴露公开信息
      players: Array.from(this.players.values()).map(p =>
        phaseOver ? p.toEliminatedJSON() : p.toPublicJSON()
      ),
      currentPlayerIndex: this.currentPlayerIndex,
      revealOrder: this.revealOrder,
      discussOrder: this.discussOrder,
      discussIndex: this.discussIndex,
      winner: this.winner,
      voteResults: this.getVoteResults(),
      tieRound: this.tieRound,
      tieCandidateIds: this.tieCandidateIds,
    }
  }
}

module.exports = { Room, GamePhase }