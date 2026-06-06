const Player = require('../Player')

describe('Player', () => {
  let player

  beforeEach(() => {
    player = new Player('socket-1', '测试玩家')
  })

  test('创建玩家时应正确初始化', () => {
    expect(player.name).toBe('测试玩家')
    expect(player.socketId).toBe('socket-1')
    expect(player.role).toBeNull()
    expect(player.eliminated).toBe(false)
    expect(player.isHost).toBe(false)
    expect(player.id).toBeDefined()
  })

  test('assignRole 应正确分配角色', () => {
    player.assignRole(0)
    expect(player.role).toBe(0)
    expect(player.roleName).toBe('卧底')

    player.assignRole(1)
    expect(player.role).toBe(1)
    expect(player.roleName).toBe('平民')
  })

  test('assignWord 应正确设置词语', () => {
    player.assignWord('苹果')
    expect(player.word).toBe('苹果')
  })

  test('markEliminated 应标记玩家为淘汰', () => {
    expect(player.eliminated).toBe(false)
    player.markEliminated()
    expect(player.eliminated).toBe(true)
  })

  test('toPublicJSON 不应暴露敏感信息', () => {
    player.assignRole(0)
    player.assignWord('秘密词')
    const pub = player.toPublicJSON()
    expect(pub.name).toBe('测试玩家')
    expect(pub.role).toBeUndefined()
    expect(pub.word).toBeUndefined()
    expect(pub.eliminated).toBe(false)
  })

  test('toPrivateJSON 应包含完整信息', () => {
    player.assignRole(1)
    player.assignWord('平民词')
    const priv = player.toPrivateJSON()
    expect(priv.role).toBe(1)
    expect(priv.word).toBe('平民词')
    expect(priv.roleName).toBe('平民')
  })

  test('resetForNewGame 应重置回合状态', () => {
    player.assignRole(0)
    player.assignWord('测试')
    player.markEliminated()
    player.votedFor = 'someone'
    player.voteCount = 3

    player.resetForNewGame()

    expect(player.role).toBeNull()
    expect(player.word).toBeNull()
    expect(player.eliminated).toBe(false)
    expect(player.votedFor).toBeNull()
    expect(player.voteCount).toBe(0)
  })

  test('未提供名称时应生成默认名称', () => {
    const p = new Player('socket-2')
    expect(p.name).toBeDefined()
    expect(p.name.length).toBeGreaterThan(0)
  })
})