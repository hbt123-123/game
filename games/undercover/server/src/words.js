const WORD_PAIRS = [
  ['苹果', '梨子'],
  ['香蕉', '芭蕉'],
  ['橘子', '橙子'],
  ['牛奶', '豆浆'],
  ['包子', '饺子'],
  ['火车', '地铁'],
  ['空调', '风扇'],
  ['手机', '电话'],
  ['电脑', '平板'],
  ['沙发', '椅子'],
  ['桌子', '茶几'],
  ['杯子', '水壶'],
  ['钢笔', '铅笔'],
  ['眼睛', '眼镜'],
  ['眉毛', '睫毛'],
  ['头发', '胡子'],
  ['米饭', '馒头'],
  ['面条', '米粉'],
  ['蛋糕', '面包'],
  ['饼干', '薯片'],
  ['可乐', '雪碧'],
  ['咖啡', '奶茶'],
  ['大象', '河马'],
  ['老虎', '狮子'],
  ['熊猫', '棕熊'],
  ['老鼠', '仓鼠'],
  ['青蛙', '蟾蜍'],
  ['蝴蝶', '蜻蜓'],
  ['玫瑰', '月季'],
  ['菊花', '向日葵'],
  ['篮球', '排球'],
  ['足球', '橄榄球'],
  ['游泳', '潜水'],
  ['跑步', '竞走'],
  ['唱歌', '跳舞'],
  ['画画', '书法'],
  ['医生', '护士'],
  ['老师', '教授'],
  ['警察', '军人'],
  ['厨师', '面点师'],
  ['北京', '上海'],
  ['长江', '黄河'],
  ['泰山', '黄山'],
  ['长城', '故宫'],
  ['春节', '元宵'],
  ['中秋', '端午'],
  ['晴天', '多云'],
  ['小雨', '阵雨'],
  ['春天', '秋天'],
  ['夏天', '冬天'],
  ['太阳', '月亮'],
  ['星星', '流星'],
  ['大海', '湖泊'],
  ['森林', '草原'],
  ['沙漠', '戈壁'],
  ['雪人', '冰雕'],
  ['烟花', '爆竹'],
  ['灯笼', '蜡烛'],
  ['风筝', '气球'],
  ['陀螺', '溜溜球'],
  ['象棋', '围棋'],
  ['麻将', '扑克'],
  ['钢琴', '吉他'],
  ['小提琴', '大提琴'],
  ['坦克', '装甲车'],
  ['战斗机', '直升机'],
  ['手枪', '步枪'],
  ['剪刀', '菜刀'],
  ['枕头', '抱枕'],
  ['被子', '毯子'],
  ['雨伞', '遮阳伞'],
  ['书包', '背包'],
  ['手表', '闹钟'],
  ['牙刷', '牙膏'],
  ['肥皂', '洗手液'],
  ['尺子', '卷尺'],
]

let usedIndices = []

// 全局函数（向后兼容，但建议改用 createWordPicker 获取每个 Room 独立实例）
function getRandomWordPair() {
  if (usedIndices.length >= WORD_PAIRS.length) {
    usedIndices = []
  }
  let index
  do {
    index = Math.floor(Math.random() * WORD_PAIRS.length)
  } while (usedIndices.includes(index))
  usedIndices.push(index)
  return WORD_PAIRS[index]
}

function resetUsedWords() {
  usedIndices = []
}

// 工厂函数：为每个 Room 返回独立的"无重复词组"选词器
function createWordPicker() {
  let used = []
  return {
    pick() {
      if (used.length >= WORD_PAIRS.length) {
        used = []
      }
      let idx
      do {
        idx = Math.floor(Math.random() * WORD_PAIRS.length)
      } while (used.includes(idx))
      used.push(idx)
      return WORD_PAIRS[idx]
    },
    reset() {
      used = []
    },
  }
}

function getPairCount() {
  return WORD_PAIRS.length
}

module.exports = {
  WORD_PAIRS,
  getRandomWordPair,
  resetUsedWords,
  createWordPicker,
  getPairCount,
}