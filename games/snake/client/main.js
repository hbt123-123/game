(function () {
	'use strict';

	// ===== 常量配置 =====
	var COLS = 30;
	var ROWS = 30;
	var CELL = 20; // canvas 600/30
	var INITIAL_TICK_MS = 150;
	var MIN_TICK_MS = 60;
	var SPEEDUP_EVERY = 5;       // 每吃 N 个食物提速一档
	var SPEEDUP_STEP_MS = 12;    // 每档减少 ms
	var MAX_SPEED_LEVEL = 8;
	var SCORE_PER_FOOD = 10;

	// ===== DOM =====
	var canvas    = document.getElementById('board');
	var ctx       = canvas.getContext('2d');
	var scoreEl   = document.getElementById('score');
	var bestEl    = document.getElementById('best');
	var speedEl   = document.getElementById('speed');
	var startBtn  = document.getElementById('startBtn');
	var pauseBtn  = document.getElementById('pauseBtn');
	var resetBtn  = document.getElementById('resetBtn');
	var modal     = document.getElementById('overModal');
	var finalEl   = document.getElementById('finalScore');
	var rankHint  = document.getElementById('rankHint');
	var nameInput = document.getElementById('nameInput');
	var submitBtn = document.getElementById('submitBtn');
	var againBtn  = document.getElementById('againBtn');
	var closeModalBtn = document.getElementById('closeModalBtn');
	var topboard  = document.getElementById('topboard');

	// ===== 状态 =====
	var snake = [];
	var dir   = { x: 1, y: 0 };
	var nextDir = { x: 1, y: 0 };
	var food  = null;
	var score = 0;
	var best  = 0;
	var speedLevel = 1;
	var tickMs = INITIAL_TICK_MS;
	var loopTimer = null;
	var running = false;
	var paused  = false;
	var ended   = false; // 游戏已结束，需先 reset 才能再开
	var foodsEaten = 0;
	var lastSubmittedScore = 0; // 防重复提交

	// 持久化最高分（本地）
	try {
		var stored = localStorage.getItem('snake_best');
		if (stored) best = parseInt(stored, 10) || 0;
	} catch (e) { /* 隐私模式忽略 */ }
	bestEl.textContent = best;

	// ===== 工具 =====
	function reset() {
		snake = [
			{ x: 14, y: 15 },
			{ x: 13, y: 15 },
			{ x: 12, y: 15 }
		];
		dir = { x: 1, y: 0 };
		nextDir = { x: 1, y: 0 };
		score = 0;
		speedLevel = 1;
		tickMs = INITIAL_TICK_MS;
		foodsEaten = 0;
		lastSubmittedScore = 0;
		ended = false;
		scoreEl.textContent = '0';
		speedEl.textContent = '1';
		spawnFood();
		draw();
	}

	function spawnFood() {
		var occupied = {};
		for (var i = 0; i < snake.length; i++) {
			occupied[snake[i].x + ',' + snake[i].y] = true;
		}
		var free = [];
		for (var x = 0; x < COLS; x++) {
			for (var y = 0; y < ROWS; y++) {
				if (!occupied[x + ',' + y]) free.push({ x: x, y: y });
			}
		}
		if (free.length === 0) {
			food = null; // 满图
			return;
		}
		food = free[Math.floor(Math.random() * free.length)];
	}

	function setSpeedLevel(level) {
		if (speedLevel >= MAX_SPEED_LEVEL) return;
		speedLevel = Math.min(level, MAX_SPEED_LEVEL);
		tickMs = Math.max(MIN_TICK_MS, INITIAL_TICK_MS - (speedLevel - 1) * SPEEDUP_STEP_MS);
		speedEl.textContent = speedLevel;
		if (running && !paused) {
			clearInterval(loopTimer);
			loopTimer = setInterval(tick, tickMs);
		}
	}

	function tick() {
		if (!running || paused) return;

		// 应用缓冲方向
		dir = nextDir;

		var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

		// 撞墙
		if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
			return gameOver();
		}
		// 撞自身（注意：如果不吃食物，尾部会移动，所以撞最后一格是安全的）
		var willGrow = food && head.x === food.x && head.y === food.y;
		var bodyEnd = willGrow ? snake.length : snake.length - 1;
		for (var i = 0; i < bodyEnd; i++) {
			if (snake[i].x === head.x && snake[i].y === head.y) {
				return gameOver();
			}
		}

		snake.unshift(head);
		if (willGrow) {
			score += SCORE_PER_FOOD;
			scoreEl.textContent = score;
			foodsEaten++;
			if (foodsEaten % SPEEDUP_EVERY === 0) {
				setSpeedLevel(speedLevel + 1);
			}
			if (score > best) {
				best = score;
				bestEl.textContent = best;
				try { localStorage.setItem('snake_best', String(best)); } catch (e) {}
			}
			spawnFood();
			if (!food) {
				// 满图通关
				return gameOver(true);
			}
		} else {
			snake.pop();
		}

		draw();
	}

	function draw() {
		// 背景
		ctx.fillStyle = '#1F1B33';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// 网格底纹（隐约）
		ctx.fillStyle = 'rgba(255,255,255,0.025)';
		for (var x = 0; x < COLS; x++) {
			for (var y = 0; y < ROWS; y++) {
				if ((x + y) % 2 === 0) {
					ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
				}
			}
		}

		// 食物
		if (food) {
			var fx = food.x * CELL + CELL / 2;
			var fy = food.y * CELL + CELL / 2;
			var grad = ctx.createRadialGradient(fx, fy, 2, fx, fy, CELL / 2);
			grad.addColorStop(0, '#FFB199');
			grad.addColorStop(1, '#FD79A8');
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(fx, fy, CELL / 2 - 2, 0, Math.PI * 2);
			ctx.fill();
		}

		// 蛇
		for (var i = 0; i < snake.length; i++) {
			var s = snake[i];
			var isHead = i === 0;
			ctx.fillStyle = isHead ? '#6C5CE7' : 'rgba(108, 92, 231, ' + Math.max(0.15, 0.9 - i * 0.015).toFixed(2) + ')';
			roundRect(ctx, s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, isHead ? 6 : 4);
			ctx.fill();
		}

		// 头部眼睛
		if (snake.length > 0) {
			var h = snake[0];
			ctx.fillStyle = '#fff';
			var cx = h.x * CELL + CELL / 2;
			var cy = h.y * CELL + CELL / 2;
			var ex = cx + dir.x * 4;
			var ey = cy + dir.y * 4;
			var perpX = -dir.y * 4;
			var perpY =  dir.x * 4;
			ctx.beginPath(); ctx.arc(ex + perpX, ey + perpY, 2, 0, Math.PI * 2); ctx.fill();
			ctx.beginPath(); ctx.arc(ex - perpX, ey - perpY, 2, 0, Math.PI * 2); ctx.fill();
		}
	}

	function roundRect(ctx, x, y, w, h, r) {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y,     x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x,     y + h, r);
		ctx.arcTo(x,     y + h, x,     y,     r);
		ctx.arcTo(x,     y,     x + w, y,     r);
		ctx.closePath();
	}

	function start() {
		if (running) return;
		if (ended) reset();
		running = true;
		paused = false;
		ended = false;
		startBtn.disabled = true;
		pauseBtn.disabled = false;
		pauseBtn.textContent = '暂停';
		loopTimer = setInterval(tick, tickMs);
	}

	function pause() {
		if (!running) return;
		paused = !paused;
		pauseBtn.textContent = paused ? '继续' : '暂停';
	}

	function gameOver(cleared) {
		running = false;
		ended = true;
		clearInterval(loopTimer);
		loopTimer = null;
		startBtn.disabled = false;
		pauseBtn.disabled = true;
		pauseBtn.textContent = '暂停';

		finalEl.textContent = score;
		rankHint.textContent = cleared ? '🎉 满图通关！太强了！' : '';
		modal.classList.remove('hidden');
		setTimeout(function () { nameInput.focus(); }, 50);
	}

	function fullReset() {
		clearInterval(loopTimer);
		loopTimer = null;
		running = false;
		paused = false;
		startBtn.disabled = false;
		pauseBtn.disabled = true;
		pauseBtn.textContent = '暂停';
		modal.classList.add('hidden');
		reset();
	}

	// ===== 输入 =====
	function setDirection(nx, ny) {
		// 不允许 180 度反向（基于当前已应用方向 dir，而非 nextDir，避免一帧内连按反向自杀）
		if (dir.x === -nx && dir.y === -ny) return;
		nextDir = { x: nx, y: ny };
	}

	function handleKey(e) {
		var k = e.key;
		if (k === ' ') { e.preventDefault(); if (running) pause(); return; }

		var nx = null, ny = null;
		if (k === 'ArrowUp'    || k === 'w' || k === 'W') { nx = 0;  ny = -1; }
		else if (k === 'ArrowDown'  || k === 's' || k === 'S') { nx = 0;  ny = 1; }
		else if (k === 'ArrowLeft'  || k === 'a' || k === 'A') { nx = -1; ny = 0; }
		else if (k === 'ArrowRight' || k === 'd' || k === 'D') { nx = 1;  ny = 0; }
		if (nx === null) return;

		e.preventDefault();
		setDirection(nx, ny);
	}
	document.addEventListener('keydown', handleKey);

	// ===== 移动端：屏幕滑动手势 =====
	(function () {
		var touchStartX = 0;
		var touchStartY = 0;
		var SWIPE_MIN = 20; // 最小滑动距离（px）

		function onTouchStart(e) {
			if (e.touches.length !== 1) return;
			touchStartX = e.touches[0].clientX;
			touchStartY = e.touches[0].clientY;
		}

		function onTouchEnd(e) {
			if (e.changedTouches.length !== 1) return;
			var dx = e.changedTouches[0].clientX - touchStartX;
			var dy = e.changedTouches[0].clientY - touchStartY;
			var absDx = Math.abs(dx);
			var absDy = Math.abs(dy);

			if (Math.max(absDx, absDy) < SWIPE_MIN) return;

			var nx, ny;
			if (absDx > absDy) {
				nx = dx > 0 ? 1 : -1;
				ny = 0;
			} else {
				nx = 0;
				ny = dy > 0 ? 1 : -1;
			}
			setDirection(nx, ny);
		}

		canvas.addEventListener('touchstart', onTouchStart, { passive: true });
		canvas.addEventListener('touchend', onTouchEnd, { passive: true });
	})();

	// ===== 移动端：方向按钮 =====
	(function () {
		var btns = document.querySelectorAll('.dpad-btn[data-dir]');
		var dirMap = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

		for (var i = 0; i < btns.length; i++) {
			btns[i].addEventListener('pointerdown', function (e) {
				e.preventDefault();
				var d = dirMap[this.dataset.dir];
				if (d) setDirection(d.x, d.y);
			});
		}
	})();

	startBtn.addEventListener('click', start);
	pauseBtn.addEventListener('click', pause);
	resetBtn.addEventListener('click', fullReset);
	againBtn.addEventListener('click', function () {
		modal.classList.add('hidden');
		fullReset();
		start();
	});

	function closeModal() {
		modal.classList.add('hidden');
		// 重置提交按钮状态，避免下次打开时仍是 disabled
		submitBtn.disabled = false;
		submitBtn.textContent = '提交分数';
	}
	closeModalBtn.addEventListener('click', closeModal);
	// 点遮罩关闭（点卡片本身不关闭）
	modal.addEventListener('click', function (e) {
		if (e.target === modal) closeModal();
	});
	// ESC 关闭
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
			closeModal();
		}
	});

	// ===== Socket.IO =====
	var socket = io({ path: '/snake/socket.io' });

	socket.on('connect', function () {
		socket.emit('request_top10');
	});

	socket.on('top10', function (list) {
		renderTop(list);
	});

	socket.on('score_submitted', function (data) {
		if (!data) return;
		submitBtn.disabled = false;
		submitBtn.textContent = '提交分数';
		if (data.error === 'rate_limited') {
			var sec = Math.ceil((data.retryAfter || 5000) / 1000);
			rankHint.textContent = '⏳ 提交太频繁，请 ' + sec + ' 秒后重试';
			lastSubmittedScore = 0; // 允许重试
			return;
		}
		if (data.error) {
			rankHint.textContent = '⚠️ 分数无效，未上榜';
			return;
		}
		if (data.unchanged) {
			rankHint.textContent = 'ℹ️ 该昵称已有更高分（第 ' + data.rank + ' 名，' + data.score + ' 分），未更新';
			return;
		}
		if (data.rank) {
			rankHint.textContent = '🎉 恭喜，你当前排名第 ' + data.rank + ' 名！';
		} else {
			rankHint.textContent = '本次分数未进入 Top 10，再接再厉～';
		}
	});

	submitBtn.addEventListener('click', function () {
		if (lastSubmittedScore === score && score > 0) {
			rankHint.textContent = '已提交过这局成绩了。';
			return;
		}
		if (score <= 0) {
			rankHint.textContent = '分数为 0 无法上榜。';
			return;
		}
		var name = nameInput.value;
		try { if (name) localStorage.setItem('snake_name', name); } catch (e) {}
		submitBtn.disabled = true;
		submitBtn.textContent = '提交中…';
		lastSubmittedScore = score;
		socket.emit('submit_score', { name: name, score: score });
		// 兜底：5 秒后若服务端仍未回复，解锁按钮允许重试
		setTimeout(function () {
			if (submitBtn.disabled && submitBtn.textContent === '提交中…') {
				submitBtn.disabled = false;
				submitBtn.textContent = '提交分数';
				rankHint.textContent = '⚠️ 网络超时，请重试';
				lastSubmittedScore = 0;
			}
		}, 5000);
	});

	// 恢复昵称
	try {
		var savedName = localStorage.getItem('snake_name');
		if (savedName) nameInput.value = savedName;
	} catch (e) {}

	function renderTop(list) {
		topboard.innerHTML = '';
		if (!list || list.length === 0) {
			var li = document.createElement('li');
			li.className = 'empty';
			li.textContent = '还没有人上榜，快来第一个挑战！';
			topboard.appendChild(li);
			return;
		}
		var savedName = '';
		try { savedName = localStorage.getItem('snake_name') || ''; } catch (e) {}

		for (var i = 0; i < list.length; i++) {
			var item = list[i];
			var li2 = document.createElement('li');
			if (i === 0) li2.className = 'gold';
			else if (i === 1) li2.className = 'silver';
			else if (i === 2) li2.className = 'bronze';
			if (savedName && item.name === savedName) {
				li2.className = (li2.className + ' me').trim();
			}

			var rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = (i + 1);
			var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = item.name;
			var sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = item.score;

			li2.appendChild(rk);
			li2.appendChild(nm);
			li2.appendChild(sc);
			topboard.appendChild(li2);
		}
	}

	// 初始化
	reset();
})();
