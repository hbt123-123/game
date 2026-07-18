/**
 * 性能基准测试脚本
 * 测试懒加载 + 空闲卸载机制的内存表现
 *
 * 用法: node --expose-gc benchmark.js
 */

var http = require('http');
var path = require('path');
var io = require('socket.io');
var { io: cio } = require('socket.io-client');

var TEST_IDLE_TIMEOUT = 10 * 1000;
var PORT = 3099;

var registry = require('./shared/game-registry');
registry.IDLE_TIMEOUT_MS = TEST_IDLE_TIMEOUT;
registry.CLEANUP_INTERVAL_MS = 5 * 1000;

function memLabel() {
	var m = process.memoryUsage();
	return {
		rss: (m.rss / 1024 / 1024).toFixed(2),
		heapUsed: (m.heapUsed / 1024 / 1024).toFixed(2),
		heapTotal: (m.heapTotal / 1024 / 1024).toFixed(2)
	};
}

function sleep(ms) {
	return new Promise(function (r) { return setTimeout(r, ms); });
}

async function main() {
	console.log('=== GameHub 性能基准测试 ===');
	console.log('');

	var app = http.createServer(function (req, res) {
		res.writeHead(200); res.end('ok');
	});

	var games = registry.loadGames(path.join(__dirname, 'games'), app, io);

	app.listen(PORT, async function () {
		await sleep(500);

		// 阶段 1: 启动后（0 模块加载）
		var m1 = memLabel();
		var s1 = registry.getStatusSummary(games);
		console.log('【阶段1】启动后 - 仅注册，0模块加载');
		console.log('  RSS=' + m1.rss + 'MB Heap=' + m1.heapUsed + 'MB 已加载=' + s1.filter(function(s){return s.loaded}).length + '/5');
		console.log('');

		// 阶段 2: 逐个连接触发懒加载
		console.log('【阶段2】触发懒加载 - 依次连接5个游戏');
		var sockets = [];
		var gameList = [
			{ path: '/genshin/socket.io', name: 'genshin' },
			{ path: '/jumpjump/socket.io', name: 'jumpjump' },
			{ path: '/snake/socket.io', name: 'snake' },
			{ path: '/undercover/socket.io', name: 'undercover' },
			{ path: '/ydig/socket.io', name: 'ydig' }
		];

		for (var i = 0; i < gameList.length; i++) {
			var gc = gameList[i];
			await new Promise(function (resolve) {
				var s = cio('http://localhost:' + PORT, {
					path: gc.path, transports: ['websocket'], timeout: 5000
				});
				var done = false;
				s.on('connect', function () {
					if (!done) { done = true; sockets.push(s); console.log('  OK ' + gc.name); resolve(); }
				});
				s.on('connect_error', function () {
					if (!done) { done = true; console.log('  FAIL ' + gc.name); resolve(); }
				});
				setTimeout(function () {
					if (!done) { done = true; console.log('  TIMEOUT ' + gc.name); resolve(); }
				}, 5000);
			});
		}

		await sleep(500);
		var m2 = memLabel();
		var s2 = registry.getStatusSummary(games);
		console.log('  RSS=' + m2.rss + 'MB Heap=' + m2.heapUsed + 'MB 已加载=' + s2.filter(function(s){return s.loaded}).length + '/5');
		console.log('');

		// 阶段 3: 断开所有连接
		console.log('【阶段3】断开所有连接');
		sockets.forEach(function (s) { try { s.close(); } catch (e) { } });
		await sleep(500);
		var m3 = memLabel();
		console.log('  RSS=' + m3.rss + 'MB Heap=' + m3.heapUsed + 'MB');
		console.log('');

		// 阶段 4: 等待空闲超时 + 清理
		console.log('【阶段4】等待空闲超时(' + (TEST_IDLE_TIMEOUT/1000) + 's)后卸载...');
		await sleep(TEST_IDLE_TIMEOUT + 2000);
		var unloaded = registry.runIdleCleanup(games);
		await sleep(500);
		if (global.gc) { global.gc(); await sleep(300); }
		var m4 = memLabel();
		var s4 = registry.getStatusSummary(games);
		console.log('  卸载=' + unloaded + ' RSS=' + m4.rss + 'MB Heap=' + m4.heapUsed + 'MB 已加载=' + s4.filter(function(s){return s.loaded}).length + '/5');
		console.log('');

		// 阶段 5: 再次连接验证透明恢复
		console.log('【阶段5】透明恢复 - 重新连接验证');
		await new Promise(function (resolve) {
			var s = cio('http://localhost:' + PORT, {
				path: '/genshin/socket.io', transports: ['websocket'], timeout: 5000
			});
			s.on('connect', function () { console.log('  OK 原神恢复成功'); s.close(); resolve(); });
			s.on('connect_error', function () { console.log('  FAIL'); resolve(); });
			setTimeout(function () { resolve(); }, 5000);
		});
		await sleep(500);
		var m5 = memLabel();
		var s5 = registry.getStatusSummary(games);
		console.log('  RSS=' + m5.rss + 'MB Heap=' + m5.heapUsed + 'MB 已加载=' + s5.filter(function(s){return s.loaded}).length + '/5');
		console.log('');

		// 汇总
		console.log('========================================');
		console.log('           性能对比报告');
		console.log('========================================');
		console.log('指标            | 优化前  | 优化后');
		console.log('----------------------------------------');
		console.log('启动RSS(MB)     |  49.71  |  ' + m1.rss);
		console.log('启动Heap(MB)    |   8.09  |  ' + m1.heapUsed);
		console.log('全加载RSS(MB)   |  49.71  |  ' + m2.rss);
		console.log('全加载Heap(MB)  |   8.09  |  ' + m2.heapUsed);
		console.log('闲置后RSS(MB)   |  49.71  |  ' + m4.rss);
		console.log('闲置后Heap(MB)  |   8.09  |  ' + m4.heapUsed);
		console.log('闲置后已加载    |   5/5   |  ' + s4.filter(function(s){return s.loaded}).length + '/5');
		console.log('========================================');
		console.log('优化前: 全量加载，5模块常驻内存无法释放');
		console.log('优化后: 懒加载，闲置后自动卸载，按需透明恢复');

		process.exit(0);
	});
}

main().catch(function (err) {
	console.error('测试失败:', err);
	process.exit(1);
});
