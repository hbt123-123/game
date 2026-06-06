var http = require('http');
var fs = require('fs');
var path = require('path');
var io = require('socket.io');

var PORT = 3000;

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

	if (lowerPath === '/ydig') {
		res.writeHead(302, { Location: '/ydig/' });
		return res.end();
	}

	if (lowerPath.indexOf('/ydig/') === 0) {
		var ydigRoot = path.join(__dirname, 'games/ydig/client');
		var ydigRel = urlPath.substring('/ydig'.length);
		if (ydigRel === '' || ydigRel === '/') {
			ydigRel = '/index.html';
		}
		var ydigPath = safeResolve(ydigRoot, ydigRel);
		if (!ydigPath) return sendForbidden(res);
		var ydigExt = path.extname(ydigPath);
		if (!ydigExt) {
			// 无扩展名（如 /ydig/<roomId>）回退到 SPA 首页
			ydigPath = path.join(ydigRoot, 'index.html');
			ydigExt = '.html';
		}
		return serveFile(res, ydigPath, getContentType(ydigExt));
	}

	if (lowerPath === '/undercover') {
		res.writeHead(302, { Location: '/undercover/' });
		return res.end();
	}

	if (lowerPath.indexOf('/undercover/') === 0) {
		var distDir = path.join(__dirname, 'games/undercover/client/dist');
		var distIndex = path.join(distDir, 'index.html');
		if (!fs.existsSync(distIndex)) {
			res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
			return res.end('<h1>谁是卧底 — 未构建</h1><p>请先在 <code>games/undercover/client/</code> 目录执行：</p><pre>npm install &amp;&amp; npm run build</pre>');
		}
		var ucRel = urlPath.substring('/undercover'.length);
		if (ucRel === '' || ucRel === '/') {
			ucRel = '/index.html';
		}
		var ucPath = safeResolve(distDir, ucRel);
		if (!ucPath) return sendForbidden(res);
		var ucExt = path.extname(ucPath);
		if (ucExt && fs.existsSync(ucPath)) {
			return serveFile(res, ucPath, getContentType(ucExt));
		}
		// Vue Router 前端路由：未匹配实际文件时回退到 index.html
		return serveFile(res, distIndex, 'text/html');
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
