var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

module.exports = function(io) {
	// 原神注册表路径（国服 + 国际服）
	var REG_PATHS = [
		{ key: 'HKCU\\Software\\miHoYo\\HYP\\1_1\\hk4e_cn',           label: 'cn_mihoyo' },
		{ key: 'HKCU\\Software\\miHoYo\\HYP\\1_1\\hk4e_global',       label: 'global_mihoyo' },
		{ key: 'HKCU\\Software\\Cognosphere\\HYP\\1_0\\hk4e_global',  label: 'global_cognosphere' }
	];
	var REG_VALUE = 'GameInstallPath';
	// 可能的 exe 文件名
	var EXE_NAMES = ['YuanShen.exe', 'GenshinImpact.exe'];

	/**
	 * 查询注册表指定键值，返回 installPath 或 null
	 */
	function queryReg(regKey, regValue, callback) {
		var cmd = 'reg query "' + regKey + '" /v ' + regValue;
		child_process.exec(cmd, function(err, stdout, stderr) {
			if (err) return callback(null);
			// 解析输出中的 REG_SZ 值
			// 输出格式：    GameInstallPath    REG_SZ    C:\path\to\game
			var re = new RegExp(regValue + '\\s+REG_(?:SZ|EXPAND_SZ)\\s+(.+)', 'i');
			var match = stdout.match(re);
			if (!match) return callback(null);
			var installPath = match[1].trim();
			callback(installPath);
		});
	}

	/**
	 * 在安装目录中查找有效的游戏 exe
	 */
	function findExe(installPath) {
		for (var i = 0; i < EXE_NAMES.length; i++) {
			var exePath = path.join(installPath, EXE_NAMES[i]);
			if (fs.existsSync(exePath)) {
				return exePath;
			}
		}
		return null;
	}

	/**
	 * 依次扫描所有注册表路径，找到第一个有效游戏即返回
	 */
	function scanRegistry(index, socket) {
		if (index >= REG_PATHS.length) {
			// 所有路径都未找到
			socket.emit('scan_result', { found: false, reason: 'game_not_installed' });
			return;
		}

		var entry = REG_PATHS[index];
		queryReg(entry.key, REG_VALUE, function(installPath) {
			if (installPath) {
				var exePath = findExe(installPath);
				if (exePath) {
					socket.emit('scan_result', {
						found: true,
						path: exePath,
						version: entry.label
					});
					return;
				}
			}
			// 当前路径未找到，尝试下一个
			scanRegistry(index + 1, socket);
		});
	}

	// 允许启动的 exe 文件名白名单（防止任意 exe 启动 / 命令注入）
	var ALLOWED_EXE_NAMES = ['YuanShen.exe', 'GenshinImpact.exe'];

	io.on('connection', function(socket) {
		socket.on('scan_game', function(data) {
			// 二次校验：服务端 + 客户端都必须支持
			// 客户端已在前端拦截非 Windows，这里作为安全保障
			if (process.platform !== 'win32') {
				socket.emit('scan_result', { found: false, reason: 'platform_not_supported' });
				return;
			}
			scanRegistry(0, socket);
		});

		socket.on('launch_game', function(data) {
			// 平台守卫：仅 Windows 服务端允许启动
			if (process.platform !== 'win32') {
				socket.emit('launch_result', { success: false, error: 'platform_not_supported' });
				return;
			}
			if (!data || typeof data.path !== 'string') {
				socket.emit('launch_result', { success: false, error: 'invalid_path' });
				return;
			}

			var exePath = data.path;

			// 白名单校验：仅允许启动原神 exe，避免任意 exe 启动
			var baseName = path.basename(exePath);
			var isAllowed = ALLOWED_EXE_NAMES.some(function(name) {
				return baseName.toLowerCase() === name.toLowerCase();
			});
			if (!isAllowed) {
				socket.emit('launch_result', { success: false, error: 'exe_not_allowed' });
				return;
			}

			if (!fs.existsSync(exePath)) {
				socket.emit('launch_result', { success: false, error: 'exe_not_found' });
				return;
			}

			// 直接 spawn 启动 exe，避免经过 cmd.exe 导致的命令行解析风险
			// detached + stdio:'ignore' + unref 让子进程独立于服务端运行
			try {
				var child = child_process.spawn(exePath, [], {
					detached: true,
					stdio: 'ignore'
				});
				child.on('error', function(err) {
					console.error('[genshin] 启动失败 ' + exePath + ': ' + err.message);
				});
				child.unref();
				socket.emit('launch_result', { success: true });
			} catch (err) {
				socket.emit('launch_result', { success: false, error: err.message });
			}
		});
	});

	console.log('原神 已加载');
	return { name: '原神', route: '/genshin' };
};
