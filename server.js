var http = require('http');
var fs = require('fs');
var path = require('path');
var io = require('socket.io');

var PORT = 3000;

// 已加载游戏列表（由 game-registry 填充）
var loadedGames = [];

var app = http.createServer(handler);

function serveFile(res, filePath, contentType) {
	fs.readFile(filePath, function(err, data) {
		if (err) {
			if (err.code === 'ENOENT') {
				res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
				return res.end('Not Found');
			}
			console.error('[serveFile] IO 错误 ' + filePath + ': ' + err.message);
			res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
			return res.end('Internal Server Error');
		}
		var cacheControl = contentType === 'text/html' ? 'no-cache' : 'public, max-age=300';
		res.writeHead(200, {
			'Content-Type': contentType,
			'Cache-Control': cacheControl
		});
		res.end(data);
	});
}

function getContentType(ext) {
	var types = {
		'.html': 'text/html',
		'.js': 'application/javascript',
		'.css': 'text/css',
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.svg': 'image/svg+xml',
		'.ico': 'image/x-icon',
		'.json': 'application/json'
	};
	return types[ext] || 'text/plain';
}

// 解析并校验路径在根目录内，防止 .. 穿越
function safeResolve(rootDir, relative) {
	var resolved = path.resolve(rootDir, '.' + relative);
	var normalizedRoot = path.resolve(rootDir);
	if (resolved !== normalizedRoot && resolved.indexOf(normalizedRoot + path.sep) !== 0) {
		return null;
	}
	return resolved;
}

function sendForbidden(res) {
	res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
	res.end('Forbidden');
}

function sendNotFound(res) {
	res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
	res.end('Not Found');
}

function handler(req, res) {
	var urlPath = req.url.split('?')[0];

	// URL 解码后再判断，防止 %2e%2e 绕过
	try {
		urlPath = decodeURIComponent(urlPath);
	} catch (e) {
		return sendForbidden(res);
	}

	// 大小写归一化（只影响路由前缀匹配，不影响实际文件读取）
	var lowerPath = urlPath.toLowerCase();

	if (lowerPath.indexOf('/socket.io') !== -1) {
		return;
	}

	if (lowerPath.indexOf('/shared/') === 0) {
		var sharedRel = urlPath.substring('/shared/'.length);
		var sharedRoot = path.join(__dirname, 'shared');
		var sharedPath = safeResolve(sharedRoot, '/' + sharedRel);
		if (!sharedPath) return sendForbidden(res);
		return serveFile(res, sharedPath, getContentType(path.extname(sharedPath)));
	}

	// ===== 通用游戏路由分发 =====
	// 遍历已注册游戏，匹配 route 前缀，从 clientDir 提供静态资源；
	// 对于使用前端路由 / 构建产物缺失的游戏做特殊回退。
	for (var i = 0; i < loadedGames.length; i++) {
		var g = loadedGames[i];
		var route = (g.config.route || '').toLowerCase();
		if (!route) continue;

		// /xxx → 重定向到 /xxx/
		if (lowerPath === route) {
			res.writeHead(302, { Location: g.config.route + '/' });
			return res.end();
		}

		var prefix = route + '/';
		if (lowerPath.indexOf(prefix) !== 0) continue;

		var clientRoot = g.clientDir;

		// undercover：Vue 3 SPA，需 build；产物目录在 client/dist/
		var distMarker = path.join(clientRoot, 'dist', 'index.html');
		var useDist = fs.existsSync(distMarker);
		if (useDist) {
			clientRoot = path.join(clientRoot, 'dist');
		} else if (g.config.id === 'undercover') {
			res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
			return res.end('<h1>谁是卧底 — 未构建</h1><p>请先在 <code>games/undercover/client/</code> 目录执行：</p><pre>npm install &amp;&amp; npm run build</pre>');
		}

		var gameRel = urlPath.substring(g.config.route.length);
		if (gameRel === '' || gameRel === '/') {
			gameRel = '/index.html';
		}
		var gamePath = safeResolve(clientRoot, gameRel);
		if (!gamePath) return sendForbidden(res);

		var gameExt = path.extname(gamePath);
		if (gameExt && fs.existsSync(gamePath)) {
			return serveFile(res, gamePath, getContentType(gameExt));
		}
		// 无扩展名 / 文件不存在 → SPA 路由回退到 index.html
		var spaIndex = path.join(clientRoot, 'index.html');
		if (fs.existsSync(spaIndex)) {
			return serveFile(res, spaIndex, 'text/html');
		}
		return sendNotFound(res);
	}

	if (lowerPath === '/' || lowerPath === '/index.html') {
		return serveFile(res, path.join(__dirname, 'public/index.html'), 'text/html');
	}

	var publicRoot = path.join(__dirname, 'public');
	var pubPath = safeResolve(publicRoot, urlPath);
	if (!pubPath) return sendForbidden(res);
	var pubExt = path.extname(pubPath);
	if (pubExt && fs.existsSync(pubPath)) {
		return serveFile(res, pubPath, getContentType(pubExt));
	}

	sendNotFound(res);
}

var registry = require('./shared/game-registry');
var games = registry.loadGames(path.join(__dirname, 'games'), app, io);
loadedGames = games;

app.listen(PORT, '0.0.0.0', function() {
	var os = require('os');
	var nets = os.networkInterfaces();
	var lanIps = [];
	Object.keys(nets).forEach(function(name) {
		nets[name].forEach(function(net) {
			if (net.family === 'IPv4' && !net.internal) {
				lanIps.push(net.address);
			}
		});
	});

	console.log('========================================');
	console.log('GameHub 已启动 (监听 0.0.0.0:' + PORT + ')');
	console.log('========================================');
	console.log('本机访问:    http://localhost:' + PORT);
	lanIps.forEach(function(ip) {
		console.log('局域网访问:  http://' + ip + ':' + PORT);
	});
	console.log('已加载 ' + games.length + ' 款游戏:');
	games.forEach(function(g) {
		console.log('  - ' + g.config.name + ' → ' + g.config.route);
	});
	console.log('========================================');
});

module.exports = app;
