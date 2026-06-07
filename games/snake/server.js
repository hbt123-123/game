module.exports = function (io) {
	var top10 = []; // { name: string, score: number, at: number }

	// 速率限制：每 socket 提交间隔（毫秒）
	var SUBMIT_COOLDOWN_MS = 5000;

	function sanitizeName(name) {
		if (typeof name !== 'string') return '匿名玩家';
		// 去除控制字符与 HTML 尖括号，避免注入到其它前端 / 日志
		var cleaned = name.replace(/[\x00-\x1F\x7F<>]/g, '');
		var trimmed = cleaned.trim().slice(0, 12);
		return trimmed || '匿名玩家';
	}

	io.on('connection', function (socket) {
		var lastSubmitAt = 0;

		socket.emit('top10', top10);

		socket.on('request_top10', function () {
			socket.emit('top10', top10);
		});

		socket.on('submit_score', function (data) {
			if (!data) return;

			// 速率限制：拒绝过于频繁的提交
			var now = Date.now();
			if (now - lastSubmitAt < SUBMIT_COOLDOWN_MS) {
				socket.emit('score_submitted', {
					rank: null,
					score: 0,
					error: 'rate_limited',
					retryAfter: SUBMIT_COOLDOWN_MS - (now - lastSubmitAt)
				});
				return;
			}

			var score = Math.floor(Number(data.score));
			if (!isFinite(score) || score <= 0 || score > 10000) {
				socket.emit('score_submitted', { rank: null, score: 0, error: 'invalid_score' });
				return;
			}

			// 通过基本校验才更新限速时间戳，避免合法用户被无效请求误伤
			lastSubmitAt = now;

			var name = sanitizeName(data.name);
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

	console.log('贪吃蛇 已加载');
	return { name: '贪吃蛇', route: '/snake' };
};
