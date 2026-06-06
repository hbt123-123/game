const { Room, GamePhase } = require('../Room')
const Player = require('../Player')

describe('Room', () => {
  let room

  beforeEach(() => {
    room = new Room('房主', 'host-socket')
  })

  test('创建房间时应初始化房主', () => {
    expect(room.id).toBeDefined()
    expect(room.id.length).toBe(6)
    expect(room.players.size).toBe(1)
    expect(room.phase).toBe(GamePhase.LOBBY)
    const host = room.players.get('host-socket')
    expect(host.isHost).toBe(true)
    expect(host.name).toBe('房主')
  })

  test('addPlayer 应添加玩家到房间', () => {
    const player = room.addPlayer('玩家2', 'socket-2')
    expect(player).not.toBeNull()
    expect(room.players.size).toBe(2)
    expect(player.name).toBe('玩家2')
  })

  test('addPlayer 达到最大人数时应返回 null', () => {
    room.config.playerCount = 10
    for (let i = 0; i < 9; i++) {
      room.addPlayer(`玩家${i}`, `socket-${i}`)
    }
    const result = room.addPlayer('溢出玩家', 'overflow')
    expect(result).toBeNull()
  })

  test('removePlayer 应移除玩家', () => {
    room.addPlayer('玩家2', 'socket-2')
    const result = room.removePlayer('socket-2')
    expect(result.player.name).toBe('玩家2')
    expect(room.players.size).toBe(1)
  })

  test('房主离开时应转移房主', () => {
    room.addPlayer('玩家2', 'socket-2')
    const result = room.removePlayer('host-socket')
    expect(result.newHostSocketId).toBe('socket-2')
    const newHost = room.players.get('socket-2')
    expect(newHost.isHost).toBe(true)
  })

  test('updateConfig 应正确更新配置', () => {
    room.updateConfig(8, 2, 0)
    expect(room.config.playerCount).toBe(8)
    expect(room.config.spyCount).toBe(2)
    expect(room.config.blankCount).toBe(0)
  })

  test('updateConfig 应限制范围', () => {
    room.updateConfig(100, 0, 5)
    expect(room.config.playerCount).toBe(10)
    expect(room.config.spyCount).toBe(1)
    expect(room.config.blankCount).toBe(1)
  })

  test('canStart 应在人数足够时返回 true', () => {
    room.config.playerCount = 3
    room.addPlayer('玩家2', 'socket-2')
    room.addPlayer('玩家3', 'socket-3')
    expect(room.canStart()).toBe(true)
  })

  test('startGame 应正确初始化游戏', () => {
    room.config.playerCount = 3
    room.addPlayer('玩家2', 'socket-2')
    room.addPlayer('玩家3', 'socket-3')
    room.startGame()

    expect(room.phase).toBe(GamePhase.REVEALING)
    expect(room.wordPair).toBeDefined()
    expect(room.wordPair.length).toBe(2)
    expect(room.revealOrder.length).toBe(3)
    expect(room.currentPlayerIndex).toBe(0)

    room.players.forEach(p => {
      expect(p.role).not.toBeNull()
      expect(p.word).toBeDefined()
    })
  })

  test('游戏流程：揭示阶段到讨论阶段', () => {
    room.config.playerCount = 3
    room.addPlayer('玩家2', 'socket-2')
    room.addPlayer('玩家3', 'socket-3')
    room.startGame()

    expect(room.phase).toBe(GamePhase.REVEALING)

    const firstPlayer = room.getRevealPlayer()
    expect(firstPlayer).not.toBeNull()

    room.revealWord(firstPlayer.socketId)
    room.confirmReveal(firstPlayer.socketId)
    room.confirmReveal('socket-2')
    room.confirmReveal('socket-3')

    expect(room.phase).toBe(GamePhase.DISCUSSING)
  })

  test('confirmReveal 全部确认后应进入讨论阶段', () => {
    setupTestGame(room, 3)
    expect(room.phase).toBe(GamePhase.DISCUSSING)
  })

  test('投票应正确淘汰玩家', () => {
    setupTestGame(room, 4)
    room.confirmSpeak(room.discussOrder[0])
    room.confirmSpeak(room.discussOrder[1])
    room.confirmSpeak(room.discussOrder[2])
    room.confirmSpeak(room.discussOrder[3])

    expect(room.phase).toBe(GamePhase.VOTING)

    const players = Array.from(room.players.values())
    const alivePlayers = players.filter(p => !p.eliminated)
    const target = alivePlayers[0]

    alivePlayers.slice(1).forEach(voter => {
      room.castVote(voter.socketId, target.id)
    })

    const result = room.castVote(target.socketId, alivePlayers[1].id)
    expect(result.status).toBe('eliminated')
  })

  test('不能投票给自己', () => {
    setupTestGame(room, 4)
    room.confirmSpeak(room.discussOrder[0])
    room.confirmSpeak(room.discussOrder[1])
    room.confirmSpeak(room.discussOrder[2])
    room.confirmSpeak(room.discussOrder[3])

    const players = Array.from(room.players.values())
    const result = room.castVote(players[0].socketId, players[0].id)
    expect(result).toBeNull()
  })

  test('平票应返回 tie 状态', () => {
    setupTestGame(room, 6)
    room.discussOrder.forEach(sid => room.confirmSpeak(sid))

    const players = Array.from(room.players.values()).filter(p => !p.eliminated)

    players.slice(0, 3).forEach(v => room.castVote(v.socketId, players[3].id))
    const result = players.slice(3, 6).reduce((_, v) => room.castVote(v.socketId, players[0].id), null)

    expect(result.status).toBe('tie')
    expect(result.tiedPlayers.length).toBe(2)
  })

  test('restart 应重置所有状态', () => {
    room.addPlayer('玩家2', 'socket-2')
    room.addPlayer('玩家3', 'socket-3')
    room.startGame()
    room.restart()

    expect(room.phase).toBe(GamePhase.LOBBY)
    expect(room.round).toBe(0)
    expect(room.winner).toBeNull()
    expect(room.wordPair).toBeNull()
  })

  test('toLobbyJSON 应返回正确的房间信息', () => {
    room.addPlayer('玩家2', 'socket-2')
    const lobby = room.toLobbyJSON()
    expect(lobby.id).toBe(room.id)
    expect(lobby.players.length).toBe(2)
    expect(lobby.config).toBeDefined()
    expect(lobby.hostSocketId).toBe('host-socket')
  })

  test('白板角色：5人以上游戏应随机分配白板', () => {
    room.updateConfig(5, 1, 1)
    room.addPlayer('玩家2', 'socket-2')
    room.addPlayer('玩家3', 'socket-3')
    room.addPlayer('玩家4', 'socket-4')
    room.addPlayer('玩家5', 'socket-5')
    room.startGame()

    const players = Array.from(room.players.values())
    const blanks = players.filter(p => p.role === 2)
    expect(blanks.length).toBe(1)
    expect(blanks[0].roleName).toBe('白板')
    expect(blanks[0].word).toBe('???')
  })

  test('卧底胜利条件：卧底数 >= 平民数', () => {
    room.updateConfig(5, 1, 1)
    room.addPlayer('玩家2', 'socket-2')
    room.addPlayer('玩家3', 'socket-3')
    room.addPlayer('玩家4', 'socket-4')
    room.addPlayer('玩家5', 'socket-5')
    room.startGame()

    const players = Array.from(room.players.values())
    const civilians = players.filter(p => p.role === 1)
    const spies = players.filter(p => p.role === 0)

    civilians.slice(0, 2).forEach(c => c.markEliminated())
    const result = room.checkWinCondition()
    if (spies.length >= civilians.filter(c => !c.eliminated).length) {
      expect(result).toBe('卧底胜利')
    }
  })

  test('getRecommendedConfig 应返回正确的推荐配置', () => {
    const config3 = Room.getRecommendedConfig(3)
    expect(config3.spyCount).toBe(1)
    expect(config3.blankCount).toBe(0)
    expect(config3.civilianCount).toBe(2)

    const config5 = Room.getRecommendedConfig(5)
    expect(config5.spyCount).toBe(2)
    expect(config5.blankCount).toBe(1)
    expect(config5.civilianCount).toBe(2)

    const config8 = Room.getRecommendedConfig(8)
    expect(config8.spyCount).toBe(2)
    expect(config8.blankCount).toBe(1)
    expect(config8.civilianCount).toBe(5)
  })

  test('validateConfig 应正确校验配置', () => {
    expect(Room.validateConfig(3, 1, 0)).toBe(true)
    expect(Room.validateConfig(5, 1, 1)).toBe(true)
    expect(Room.validateConfig(3, 2, 0)).toBe(false)
    expect(Room.validateConfig(5, 3, 1)).toBe(false)
  })

  test('addPlayer 超过 config.playerCount 应返回 null', () => {
    room.config.playerCount = 3
    room.addPlayer('玩家2', 'socket-2')
    room.addPlayer('玩家3', 'socket-3')
    const overflow = room.addPlayer('玩家4', 'socket-4')
    expect(overflow).toBeNull()
    expect(room.players.size).toBe(3)
  })

  test('restartDiscuss 不应递增 round，应递增 tieRound', () => {
    setupTestGame(room, 4)
    room.discussOrder.forEach(sid => room.confirmSpeak(sid))
    const roundBefore = room.round
    const tiedIds = ['p1', 'p2']
    room.restartDiscuss(tiedIds)
    expect(room.round).toBe(roundBefore)
    expect(room.tieRound).toBe(1)
    expect(room.tieCandidateIds).toEqual(tiedIds)
    expect(room.discussIndex).toBe(0)
    expect(room.phase).toBe(GamePhase.DISCUSSING)
    const players = Array.from(room.players.values())
    players.forEach(p => {
      expect(p.votedFor).toBeNull()
      expect(p.voteCount).toBe(0)
    })
  })

  test('restartDiscuss 多次调用应累加 tieRound', () => {
    setupTestGame(room, 4)
    room.discussOrder.forEach(sid => room.confirmSpeak(sid))
    room.restartDiscuss([])
    room.restartDiscuss([])
    expect(room.tieRound).toBe(2)
    expect(room.round).toBe(1)
  })

  test('第3次平票应强制随机淘汰（forced=true）', () => {
    setupTestGame(room, 6)
    room.discussOrder.forEach(sid => room.confirmSpeak(sid))

    // 模拟两次平票
    room.tieRound = 2
    const players = Array.from(room.players.values()).filter(p => !p.eliminated)
    // 让所有人投票，平票
    players.slice(0, 3).forEach(v => room.castVote(v.socketId, players[3].id))
    const result = players.slice(3, 6).reduce(
      (_, v) => room.castVote(v.socketId, players[0].id),
      null
    )

    expect(result.status).toBe('eliminated')
    expect(result.forced).toBe(true)
    expect(room.tieRound).toBe(0)
  })

  test('每个 Room 的 wordPicker 互相独立，不共享 usedIndices', () => {
    const roomA = new Room('A', 'sa')
    const roomB = new Room('B', 'sb')
    // 在 A 中连续抽 5 个不重复词组
    const pickedA = new Set()
    for (let i = 0; i < 5; i++) {
      pickedA.add(roomA.wordPicker.pick().join('|'))
    }
    // B 应能独立抽词，不受 A 影响
    const firstB = roomB.wordPicker.pick().join('|')
    expect(firstB).toBeDefined()
    // B 的 picker 内部应只记录 1 个，而非 6 个
    let countB = 0
    for (let i = 0; i < 80; i++) {
      const p = roomB.wordPicker.pick()
      if (p) countB++
    }
    expect(countB).toBeGreaterThan(0)
  })

  test('addPlayer 在非 lobby 阶段应拒绝新玩家（纵深防御）', () => {
    setupTestGame(room, 3)
    expect(room.phase).not.toBe(GamePhase.LOBBY)
    const overflow = room.addPlayer('迟到者', 'late-socket')
    expect(overflow).toBeNull()
  })
})

function setupTestGame(room, count) {
  room.config.playerCount = count
  room.config.spyCount = 1
  room.config.blankCount = 0
  for (let i = room.players.size; i < count; i++) {
    room.addPlayer(`玩家${i + 1}`, `socket-${i + 1}`)
  }
  room.startGame()
  room.revealOrder.forEach(socketId => {
    room.revealWord(socketId)
    room.confirmReveal(socketId)
  })
}