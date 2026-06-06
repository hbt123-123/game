const { getRandomWordPair, resetUsedWords, getPairCount, WORD_PAIRS } = require('../words')

describe('Words', () => {
  beforeEach(() => {
    resetUsedWords()
  })

  test('getRandomWordPair 应返回两个词的数组', () => {
    const pair = getRandomWordPair()
    expect(Array.isArray(pair)).toBe(true)
    expect(pair.length).toBe(2)
    expect(typeof pair[0]).toBe('string')
    expect(typeof pair[1]).toBe('string')
  })

  test('getRandomWordPair 应在用完后重置', () => {
    const totalPairs = getPairCount()
    for (let i = 0; i < totalPairs; i++) {
      const pair = getRandomWordPair()
      expect(pair).toBeDefined()
    }
    const pairAfterReset = getRandomWordPair()
    expect(pairAfterReset).toBeDefined()
  })

  test('getRandomWordPair 每次应返回不同或随机的词组', () => {
    const pairs = new Set()
    for (let i = 0; i < 10; i++) {
      const pair = getRandomWordPair()
      pairs.add(pair.join('|'))
    }
    expect(pairs.size).toBeGreaterThan(1)
  })

  test('getPairCount 应返回正确数量', () => {
    expect(getPairCount()).toBe(WORD_PAIRS.length)
  })

  test('resetUsedWords 应允许重新使用词组', () => {
    const firstPair = getRandomWordPair()
    resetUsedWords()
    const pairAfterReset = getRandomWordPair()
    expect(pairAfterReset).toBeDefined()
  })
})