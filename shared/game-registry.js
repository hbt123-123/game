var fs = require('fs');
var path = require('path');

function loadGames(gamesDir, httpServer, ioModule) {
	var games = [];
	var dir = path.resolve(gamesDir);
	var entries = fs.readdirSync(dir);
	entries.forEach(function(entry) {
		var gamePath = path.join(dir, entry);
		if (entry.startsWith('_') || entry.startsWith('.')) return;
		try {
			var stat = fs.statSync(gamePath);
			if (!stat.isDirectory()) return;

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

			var serverFile = path.join(gamePath, config.serverFile || 'server.js');
			if (!fs.existsSync(serverFile)) {
				console.warn('[game-registry] 跳过 ' + entry + '：找不到入口文件 ' + (config.serverFile || 'server.js'));
				return;
			}

			var socketPath = config.socketPath || '/socket.io';
			var gameIo = new ioModule.Server(httpServer, {
				path: socketPath,
				serveClient: config.id === 'ydig'
			});

			var gameModule = require(serverFile);
			var info = gameModule(gameIo);
			games.push({ config: config, info: info });
			console.log('已加载游戏: ' + config.name + ' (' + config.route + ')');
		} catch (err) {
			console.error('[game-registry] 加载游戏 ' + entry + ' 失败，已跳过：' + err.message);
			if (err.stack) console.error(err.stack);
		}
	});
	return games;
}

module.exports = { loadGames: loadGames };
