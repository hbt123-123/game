// JumpJump 排行榜：Socket.IO 客户端，连接 /jumpjump/socket.io
// 事件：submit_score / request_top10 / top10 / score_submitted
var JumpJumpRanking = (function () {
	var socket = null;
	var submitTimer = null;
	var SUBMIT_TIMEOUT_MS = 5000; // 提交超时：5 秒未收到响应则恢复按钮

	function init() {
		// path 必须与 game.json 中 socketPath 一致
		socket = io({ path: '/jumpjump/socket.io' });
		socket.on('top10', renderRanking);
		socket.on('score_submitted', onSubmitResult);
		// 断线重连保护：重连后重新拉取榜单，并恢复卡住的提交按钮
		socket.on('connect', function () {
			requestTop10();
		});
		socket.on('disconnect', function () {
			clearTimeout(submitTimer);
			recoverSubmitButton('网络断开，请重试');
		});
		return socket;
	}

	function requestTop10() {
		if (socket) socket.emit('request_top10');
	}

	function submitScore(name, score) {
		if (!socket) return;
		socket.emit('submit_score', { name: name, score: score });
		// 超时保护：服务端未响应时恢复按钮，避免永远卡在"提交中..."
		clearTimeout(submitTimer);
		submitTimer = setTimeout(function () {
			recoverSubmitButton('提交超时，请重试');
		}, SUBMIT_TIMEOUT_MS);
	}

	// 恢复提交按钮为可点击状态
	function recoverSubmitButton(text) {
		var btn = document.getElementById('submit-score-btn');
		if (btn && btn.disabled) {
			btn.disabled = false;
			btn.textContent = text || '提交分数';
		}
	}

	// 渲染 Top 10 列表到 #ranking-list
	function renderRanking(list) {
		var ol = document.getElementById('ranking-list');
		if (!ol) return;
		ol.innerHTML = '';
		if (!list || !list.length) {
			var empty = document.createElement('li');
			empty.textContent = '暂无记录，来抢首位！';
			empty.style.opacity = '0.6';
			ol.appendChild(empty);
			return;
		}
		for (var i = 0; i < list.length; i++) {
			var item = list[i];
			var li = document.createElement('li');
			// name 已在服务端清洗（去除 <> 控制字符），可安全使用 innerHTML
			li.innerHTML = escapeHtml(item.name) + ' <strong>' + item.score + '</strong>';
			ol.appendChild(li);
		}
	}

	// 提交结果反馈：高亮新记录 / 提示错误
	function onSubmitResult(res) {
		clearTimeout(submitTimer); // 收到响应，清除超时保护
		if (!res) return;
		var btn = document.getElementById('submit-score-btn');
		if (res.error === 'rate_limited') {
			if (btn) {
				btn.disabled = false; // 恢复可点击，允许稍后重试
				btn.textContent = '提交太快，请稍候';
				setTimeout(function () { if (!btn.disabled) btn.textContent = '提交分数'; }, 1500);
			}
			return;
		}
		if (res.error === 'invalid_score') {
			if (btn) {
				btn.disabled = false;
				btn.textContent = '分数无效';
				setTimeout(function () { if (!btn.disabled) btn.textContent = '提交分数'; }, 1500);
			}
			return;
		}
		if (res.unchanged) {
			if (btn) {
				btn.textContent = '未超越已有记录';
				btn.disabled = true;
			}
			return;
		}
		// 成功提交
		if (btn) {
			btn.textContent = res.rank ? '已提交（第' + res.rank + '名）' : '已提交';
			btn.disabled = true;
		}
	}

	// 简易 HTML 转义，双重防御
	function escapeHtml(str) {
		if (typeof str !== 'string') return '';
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	// 重置提交按钮状态（重启游戏时调用）
	function resetSubmitButton() {
		var btn = document.getElementById('submit-score-btn');
		if (btn) {
			btn.textContent = '提交分数';
			btn.disabled = false;
		}
	}

	return {
		init: init,
		requestTop10: requestTop10,
		submitScore: submitScore,
		resetSubmitButton: resetSubmitButton
	};
})();
