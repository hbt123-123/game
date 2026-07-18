/**
 * Game Registry — 游戏注册中心（懒加载 + 空闲卸载版）
 *
 * 核心策略：
 *   1. 启动时仅扫描 game.json 配置（轻量，不加载游戏模块）
 *   2. 为每个游戏创建 Socket.IO Server（轻量，仅监听升级事件）
 *   3. 游戏模块在首次客户端连接时懒加载（按需分配）
 *   4. 空闲超时后自动卸载游戏模块，释放内存
 *   5. 下次连接时重新加载（透明恢复）
 *
 * 内存模型：
 *   启动时：仅 config + io Server 骨架 ≈ 极低内存
 *   游戏中：按需加载模块，单游戏峰值 ≈ 原架构
 *   闲置时：自动卸载 → 回到启动基线
 */

var fs = require('fs');
var path = require('path');

// ===== 可配置参数（使用对象引用以支持运行时修改） =====
var runtimeConfig = {
	IDLE_TIMEOUT_MS: 5 * 60 * 1000, // 空闲超时：5 分钟
	CLEANUP_INTERVAL_MS: 60 * 1000  // 清理检查间隔：1 分钟
};

// ===== 内部工具函数 =====

/**
 * 安全地从 Socket.IO 命名空间移除所有 connection 监听器
 * 使用 removeAllListeners 仅移除用户注册的 handler，不触碰内部逻辑
 */
function removeConnectionHandlers(ioServer) {
	try {
		// 主命名空间
		var mainNs = ioServer.of('/');
		if (mainNs) mainNs.removeAllListeners('connection');

		// 其他命名空间（游戏可能创建了自定义命名空间）
		if (ioServer._nsps) {
			ioServer._nsps.forEach(function (nsp) {
				if (nsp && nsp.name !== '/') {
					nsp.removeAllListeners('connection');
				}
			});
		}
	} catch (e) {
		// 防御性：_nsps 是内部属性，未来版本可能变更
		console.warn('[game-registry] 移除连接处理器时出现警告: ' + e.message);
	}
}

/**
 * 安全地从 require.cache 中移除模块
 * 处理子模块的级联清理
 */
function purgeModuleCache(modulePath) {
	var resolved = require.resolve(modulePath);
	var baseDir = path.dirname(resolved);

	// 遍历缓存，移除所有属于该模块目录的缓存条目
	Object.keys(require.cache).forEach(function (key) {
		if (key === resolved || key.indexOf(baseDir + path.sep) === 0) {
			delete require.cache[key];
		}
	});
}

// ===== 懒加载包装器 =====

/**
 * 创建一个游戏的懒加载包装器
 *
 * @param {http.Server} httpServer - Node.js HTTP 服务器实例
 * @param {Object} ioModule - socket.io 模块
 * @param {Object} config - game.json 解析后的配置对象
 * @param {string} gameDir - 游戏目录绝对路径
 * @returns {Object} 懒加载包装器
 */
function createLazyGameWrapper(httpServer, ioModule, config, gameDir) {
	var serverFile = path.join(gameDir, config.serverFile || 'server.js');
	var clientDir = path.join(gameDir, config.clientDir || 'client');
	var socketPath = config.socketPath;

	// ===== 状态变量 =====
	var loaded = false; // 游戏模块是否已加载
	var moduleInfo = null; // 模块导出的 info 对象
	var activeConnections = 0; // 当前活跃连接数
	var lastActivityAt = 0; // 最后一次活动时间戳
	var unloadTimer = null; // 空闲卸载定时器

	// ===== Socket.IO Server（轻量，始终创建） =====
	var gameIo = null;
	if (socketPath) {
		var serveClient = (config.serveSocketClient === true);
		gameIo = new ioModule.Server(httpServer, {
			path: socketPath,
			serveClient: serveClient
		});

		// 中间件：在连接建立前确保模块已加载，并追踪连接
		gameIo.use(function (socket, next) {
			ensureLoaded();
			activeConnections++;
			lastActivityAt = Date.now();

			// 有新连接时取消卸载定时器
			if (unloadTimer) {
				clearTimeout(unloadTimer);
				unloadTimer = null;
			}

			socket.on('disconnect', function () {
				activeConnections--;
				lastActivityAt = Date.now();
				// 断开后启动空闲倒计时
				scheduleUnloadCheck();
			});

			next();
		});
	}

	// ===== 核心方法 =====

	/**
	 * 确保游戏模块已加载（懒加载入口）
	 * 首次调用时加载模块，后续调用为幂等操作
	 */
	function ensureLoaded() {
		if (loaded) return;

		// 清除可能残留的缓存
		purgeModuleCache(serverFile);

		var gameModule;
		try {
			gameModule = require(serverFile);
		} catch (err) {
			console.error('[game-registry] 加载游戏模块失败 ' + config.id + ': ' + err.message);
			throw err;
		}

		if (gameIo) {
			moduleInfo = gameModule(gameIo);
		} else {
			moduleInfo = gameModule();
		}

		loaded = true;
		lastActivityAt = Date.now();
		console.log('[game-registry] 懒加载: ' + config.name + ' (' + config.id + ')');
	}

	/**
	 * 尝试卸载游戏模块（空闲时）
	 * @returns {boolean} 是否成功卸载
	 */
	function tryUnload() {
			if (!loaded) return false;
			if (activeConnections > 0) return false;

			var idleMs = Date.now() - lastActivityAt;
			if (idleMs < runtimeConfig.IDLE_TIMEOUT_MS) return false;

		// 移除游戏模块注册的 connection 处理器
		if (gameIo) {
			removeConnectionHandlers(gameIo);
		}

		// 清除 require 缓存以释放内存
		purgeModuleCache(serverFile);

		// 重置状态
		moduleInfo = null;
		loaded = false;
		unloadTimer = null;

		console.log('[game-registry] 空闲卸载: ' + config.name + ' (' + config.id +
			') — 闲置 ' + (idleMs / 1000).toFixed(0) + 's');
		return true;
	}

	/**
	 * 启动空闲卸载倒计时
	 */
	function scheduleUnloadCheck() {
			if (unloadTimer) clearTimeout(unloadTimer);
			if (!loaded || activeConnections > 0) return;

			// 在空闲超时后检查一次，届时由定时器轮询接管
			unloadTimer = setTimeout(function () {
				unloadTimer = null;
				tryUnload();
			}, runtimeConfig.IDLE_TIMEOUT_MS + 1000);
	}

	// 初始化空闲时间戳
	lastActivityAt = Date.now();

	// 返回包装器
	return {
		config: config,
		clientDir: clientDir,
		gameDir: gameDir,

		// 懒加载控制
		ensureLoaded: ensureLoaded,
		tryUnload: tryUnload,

		// 状态查询（用于监控）
		get isLoaded() { return loaded; },
		get activeConnections() { return activeConnections; },
		get lastActivityAt() { return lastActivityAt; },
		get idleMs() { return loaded ? (Date.now() - lastActivityAt) : Infinity; },

		// 内部使用
		_gameIo: gameIo
	};
}

// ===== 公开 API =====

/**
 * 加载所有游戏（扫描配置 + 创建懒加载包装器）
 *
 * @param {string} gamesDir - games 目录绝对路径
 * @param {http.Server} httpServer - Node.js HTTP 服务器实例
 * @param {Object} ioModule - socket.io 模块
 * @returns {Array} 懒加载包装器数组
 */
function loadGames(gamesDir, httpServer, ioModule) {
	var games = [];
	var dir = path.resolve(gamesDir);

	if (!fs.existsSync(dir)) {
		console.warn('[game-registry] games 目录不存在: ' + dir);
		return games;
	}

	var entries = fs.readdirSync(dir);

	entries.forEach(function (entry) {
		// 跳过特殊目录
		if (entry.startsWith('_') || entry.startsWith('.')) return;

		var gamePath = path.join(dir, entry);
		var stat;
		try {
			stat = fs.statSync(gamePath);
		} catch (e) {
			return;
		}
		if (!stat.isDirectory()) return;

		// 读取 game.json
		var configPath = path.join(gamePath, 'game.json');
		if (!fs.existsSync(configPath)) {
			console.warn('[game-registry] 跳过 ' + entry + '：缺少 game.json');
			return;
		}

		var config;
		try {
			config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
		} catch (parseErr) {
			console.warn('[game-registry] 跳过 ' + entry + '：game.json 解析失败 - ' + parseErr.message);
			return;
		}

		// 验证必要字段
		if (!config.id || !config.route) {
			console.warn('[game-registry] 跳过 ' + entry + '：game.json 缺少 id 或 route');
			return;
		}

		// 验证 serverFile 存在（但不加载）
		var serverFile = path.join(gamePath, config.serverFile || 'server.js');
		if (!fs.existsSync(serverFile)) {
			console.warn('[game-registry] 跳过 ' + entry + '：找不到入口文件 ' + (config.serverFile || 'server.js'));
			return;
		}

		// 创建懒加载包装器
		var wrapper = createLazyGameWrapper(httpServer, ioModule, config, gamePath);
		games.push(wrapper);

		console.log('[game-registry] 已注册: ' + config.name + ' → ' + config.route + ' (待懒加载)');
	});

	return games;
}

/**
 * 执行一轮空闲清理（供外部定时调用）
 *
 * @param {Array} games - loadGames() 返回的包装器数组
 * @returns {number} 本轮卸载的游戏数量
 */
function runIdleCleanup(games) {
	var unloaded = 0;
	games.forEach(function (g) {
		if (g.tryUnload()) unloaded++;
	});
	return unloaded;
}

/**
 * 获取所有游戏的加载状态摘要（用于监控/调试）
 *
 * @param {Array} games - loadGames() 返回的包装器数组
 * @returns {Array<Object>} 状态摘要
 */
function getStatusSummary(games) {
	return games.map(function (g) {
		return {
			id: g.config.id,
			name: g.config.name,
			loaded: g.isLoaded,
			connections: g.activeConnections,
			idleSec: g.isLoaded ? Math.floor((Date.now() - g.lastActivityAt) / 1000) : 0
		};
	});
}

module.exports = {
	loadGames: loadGames,
	runIdleCleanup: runIdleCleanup,
	getStatusSummary: getStatusSummary,
	// 运行时配置（可修改以调整超时和间隔）
	get IDLE_TIMEOUT_MS() { return runtimeConfig.IDLE_TIMEOUT_MS; },
	set IDLE_TIMEOUT_MS(v) { runtimeConfig.IDLE_TIMEOUT_MS = v; },
	get CLEANUP_INTERVAL_MS() { return runtimeConfig.CLEANUP_INTERVAL_MS; },
	set CLEANUP_INTERVAL_MS(v) { runtimeConfig.CLEANUP_INTERVAL_MS = v; }
};