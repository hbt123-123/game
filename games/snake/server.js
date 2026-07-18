var fs = require('fs');
var path = require('path');

module.exports = function (io) {
	// 日志文件路径：
	// 1. 优先读环境变量 SNAKE_SCORE_FILE（生产部署用，指向代码目录外的持久化位置）
	// 2. 否则回退到项目目录下 score.log（本地开发默认）
	// 这样 git pull / git clean 等部署操作不会清掉榜单数据
	var LOG_FILE = process.env.SNAKE_SCORE_FILE || path.join(__dirname, 'score.log');

	// 贪吃蛇榜单（内存缓存，由日志文件重建）
	var top10 = []; // { name: string, score: number, at: number }

	// 速率限制：按玩家名冷却（毫秒），防止断开重连绕过
	var SUBMIT_COOLDOWN_MS = 5000;
	var nameLastSubmitAt = {}; // name → timestamp，跨连接共享

	function sanitizeName(name) {
		if (typeof name !== 'string') return '匿名玩家';
		// 去除控制字符与 HTML 尖括号，避免注入到其它前端 / 日志
		var cleaned = name.replace(/[\x00-\x1F\x7F<>]/g, '');
		var trimmed = cleaned.trim().slice(0, 12);
		return trimmed || '匿名玩家';
	}

	// 启动时从日志文件重建榜单
	// 文件格式：每行一个 JSON：{"name":"x","score":10,"at":1700000000000}
	// 容错：跳过空行、损坏行；同名只保留最高分
	function loadFromLog() {
		if (!fs.existsSync(LOG_FILE)) {
			console.log('贪吃蛇: 无历史日志文件，从空榜单开始');
			return;
		}

		var content = '';
		try {
			content = fs.readFileSync(LOG_FILE, 'utf8');
		} catch (e) {
			console.error('贪吃蛇: 读取日志文件失败，从空榜单开始：' + e.message);
			return;
		}

		var lines = content.split(/\r?\n/);
		var map = {}; // name → { name, score, at }，同名保留最高分
		var count = 0;

		for (var i = 0; i < lines.length; i++) {
			var line = lines[i].trim();
			if (!line) continue;
			var entry = null;
			try {
				entry = JSON.parse(line);
			} catch (e) {
				// 损坏行跳过，不影响其他记录
				continue;
			}
			if (!entry || typeof entry.name !== 'string' || typeof entry.score !== 'number') continue;
			if (entry.score <= 0 || entry.score > 10000) continue;

			var existing = map[entry.name];
			if (!existing || entry.score > existing.score) {
				map[entry.name] = {
					name: entry.name,
					score: entry.score,
					at: entry.at || 0
				};
			}
			count++;
		}

		// 转为数组并排序
		top10 = Object.keys(map).map(function (k) { return map[k]; });
		top10.sort(function (a, b) { return b.score - a.score; });
		if (top10.length > 10) top10.length = 10;

		console.log('贪吃蛇: 已从日志加载 ' + count + ' 条提交记录，重建榜单 ' + top10.length + ' 条');
	}

	// 追加一条记录到日志文件
	function appendLog(entry) {
		var line = JSON.stringify({
			name: entry.name,
			score: entry.score,
			at: entry.at
		}) + '\n';
		try {
			// appendFileSync：文件不存在会自动创建，存在则追加
			fs.appendFileSync(LOG_FILE, line, 'utf8');
		} catch (e) {
			console.error('贪吃蛇: 写入日志文件失败：' + e.message);
		}
	}

	// 启动时加载历史
	loadFromLog();

	io.on('connection', function (socket) {
		socket.emit('top10', top10);

		socket.on('request_top10', function () {
			socket.emit('top10', top10);
		});

		socket.on('submit_score', function (data) {
			if (!data) return;

			var name = sanitizeName(data.name);

			// 速率限制：按玩家名冷却，防止断开重连绕过
			var now = Date.now();
			var lastAt = nameLastSubmitAt[name] || 0;
			if (now - lastAt < SUBMIT_COOLDOWN_MS) {
				socket.emit('score_submitted', {
					rank: null,
					score: 0,
					error: 'rate_limited',
					retryAfter: SUBMIT_COOLDOWN_MS - (now - lastAt)
				});
				return;
			}

			var score = Math.floor(Number(data.score));
			if (!isFinite(score) || score <= 0 || score > 10000) {
				socket.emit('score_submitted', { rank: null, score: 0, error: 'invalid_score' });
				return;
			}

			// 通过基本校验才更新限速时间戳，避免合法用户被无效请求误伤
			nameLastSubmitAt[name] = now;

			var entry = {
				name: name,
				score: score,
				at: now
			};

			// 同名去重：同一名字只保留最高分的一条记录
			var existingIdx = -1;
			for (var i = 0; i < top10.length; i++) {
				if (top10[i].name === name) {
					existingIdx = i;
					break;
				}
			}

			if (existingIdx >= 0) {
				if (score <= top10[existingIdx].score) {
					// 新分数不高于已有记录，不更新榜单但告知排名
					// 仍记录到日志（保留完整提交历史，便于审计）
					appendLog(entry);
					io.emit('top10', top10);
					socket.emit('score_submitted', {
						rank: existingIdx + 1,
						score: top10[existingIdx].score,
						unchanged: true
					});
					return;
				}
				// 新分数更高，替换旧记录
				top10[existingIdx] = entry;
			} else {
				top10.push(entry);
			}

			// 写入日志文件
			appendLog(entry);

			top10.sort(function (a, b) { return b.score - a.score; });
			if (top10.length > 10) top10.length = 10;

			io.emit('top10', top10);

			var rank = top10.indexOf(entry);
			socket.emit('score_submitted', {
				rank: rank >= 0 ? rank + 1 : null,
				score: score
			});
		});
	});

	console.log('贪吃蛇 已加载（Socket.IO 排行榜，日志文件：' + LOG_FILE + '）');
	return { name: '贪吃蛇', route: '/snake' };
};
