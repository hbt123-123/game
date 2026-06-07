# GameHub 🎮

基于 Node.js + Socket.IO 的实时多人网页小游戏集合平台。

零构建即插即用，新增游戏只需添加一个目录。

---

## ✨ 已有游戏

| 游戏 | 路径 | 玩法 | 人数 |
|------|------|------|------|
| 🎨 **你画我猜** | `/ydig` | 一人画图，多人猜词，按答题速度计分 | 2-10 人 |
| 🕵️ **谁是卧底** | `/undercover` | 多人推理，找出拿到不同词语的卧底 | 3-10 人 |
| 🐍 **贪吃蛇** | `/snake` | 经典贪吃蛇，挑战全局最高分 | 单人 |
| ⚡ **原神** | `/genshin` | 检测本地原神安装，一键启动或跳转下载/云游戏 | 单人 |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
# 根目录
npm install

# 谁是卧底前端（首次或更新后需要构建）
cd games/undercover/client
npm install
npm run build
cd ../../..
```

### 2. 启动服务

```bash
node server.js
```

启动后会打印本机和局域网访问地址：

```
========================================
GameHub 已启动 (监听 0.0.0.0:3000)
========================================
本机访问:    http://localhost:3000
局域网访问:  http://192.168.x.x:3000
已加载 2 款游戏:
  - 谁是卧底 → /undercover
  - 你画我猜 → /ydig
========================================
```

### 3. 浏览器访问

- 大厅首页：http://localhost:3000
- 你画我猜：http://localhost:3000/ydig
- 谁是卧底：http://localhost:3000/undercover

---

## 🌐 局域网联机

服务默认绑定 `0.0.0.0`，同 Wi-Fi 下的手机/电脑用上面的 **局域网访问** 地址即可加入。

如果其他设备打不开，需要以管理员权限放行 Windows 防火墙：

```cmd
netsh advfirewall firewall add rule name="GameHub-3000" dir=in action=allow protocol=TCP localport=3000
```

---

## 📁 项目结构

```
game/
├── server.js                    # 统一 HTTP 入口 + 路由分发
├── package.json                 # 根依赖
├── public/
│   └── index.html               # 游戏大厅首页
├── shared/
│   ├── game-registry.js         # 游戏自动发现/加载器
│   └── libs/
│       └── vue.js               # Vue 2 公共库（YDIG 用）
└── games/
    ├── _template/               # 新游戏模板
    ├── ydig/                    # 你画我猜（零构建）
    │   ├── client/              # 静态 HTML + JS + CSS
    │   ├── server.js            # Socket.IO 事件 + 词库 + 房间状态
    │   └── game.json
    └── undercover/              # 谁是卧底（Vite 构建）
        ├── client/              # Vue 3 + Pinia SPA
        │   ├── src/             # 源码
        │   └── dist/            # 构建产物（运行时实际访问）
        ├── server/src/          # 游戏服务端逻辑
        ├── server.js            # 桥接到 game-registry
        └── game.json
```

---

## 🧩 游戏注册机制

`shared/game-registry.js` 在服务启动时自动：

1. 扫描 `games/*/` 目录（跳过 `_` 和 `.` 开头）
2. 读取 `game.json` 元信息
3. 为每个游戏创建独立的 Socket.IO Server，绑定到对应 `socketPath`
4. 加载并调用 `server.js` 导出的函数，传入 io 实例

**新增游戏无需修改任何核心代码**。

### 新游戏开发步骤

```bash
# 1. 复制模板
cp -r games/_template games/your-game

# 2. 修改 game.json
{
  "id": "your-game",
  "name": "你的游戏",
  "route": "/your-game",
  "socketPath": "/your-game/socket.io",
  "minPlayers": 1,
  "maxPlayers": 4
}

# 3. 实现 server.js
module.exports = function(io) {
  io.on('connection', function(socket) {
    // 你的游戏逻辑
  });
  return { name: '你的游戏', route: '/your-game' };
};

# 4. 实现 client/index.html + main.js + style.css
# 5. 重启 node server.js
```

---

## 🧪 测试

```bash
# 谁是卧底 服务端测试（jest）
cd games/undercover/server
npx jest

# 谁是卧底 前端测试（vitest）
cd games/undercover/client
npx vitest run

# 语法快速检查
node --check server.js
node --check shared/game-registry.js
node --check games/ydig/server.js
```

---

## 📜 代码风格

| 模块 | 风格 |
|------|------|
| 你画我猜 (YDIG) | ES5（`var` + `function`）+ Tab 缩进，与既有代码保持一致 |
| 谁是卧底 | ES6+ / Vue 3 Composition API / 2 空格缩进 |
| 通用 | Socket.IO 事件用 `snake_case`，`game.json` 字段用 `camelCase` |

---

## 🔌 Socket.IO 路径

| 游戏 | 客户端连接路径 |
|------|---------------|
| 你画我猜 | `/ydig/socket.io` |
| 谁是卧底 | `/undercover/socket.io` |

每个游戏拥有独立 Socket.IO Server 实例，互不干扰。

---

## 🛠️ 技术栈

- **后端**：Node.js + Socket.IO 4.x（原生 http，零框架）
- **YDIG 前端**：Vue 2 通过 `<script>` 直接引入，无需构建
- **Undercover 前端**：Vue 3 + Vite + Pinia + Vue Router

---

## 📝 License

MIT
