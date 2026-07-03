// JumpJump 入口：初始化 renderer + game + input + ranking，启动渲染循环
(function () {
	// 检测 Three.js 是否加载成功
	if (typeof THREE === 'undefined') {
		var tip = document.getElementById('loading-tip');
		if (tip) tip.innerHTML = 'Three.js 加载失败，请检查网络或刷新重试';
		return;
	}

	var renderer = JumpJumpRenderer.init('game-canvas-container');
	if (!renderer) {
		console.error('JumpJump main: renderer init failed');
		return;
	}

	var game = JumpJumpGame.init(renderer);

	// 初始化输入：鼠标/触屏按下蓄力，释放跳跃
	JumpJumpInput.init(renderer.domElement, {
		onChargeStart: function () { game.startCharge(); },
		onChargeEnd: function (elapse) { game.endCharge(elapse); }
	});

	// 初始化排行榜 Socket.IO 连接
	JumpJumpRanking.init();

	// DOM 引用
	var scoreEl = document.getElementById('score');
	var comboHintEl = document.getElementById('combo-hint');
	var chargeBarFillEl = document.getElementById('charge-bar-fill');
	var gameOverPanelEl = document.getElementById('game-over-panel');
	var finalScoreEl = document.getElementById('final-score');
	var restartBtn = document.getElementById('restart-btn');
	var submitBtn = document.getElementById('submit-score-btn');
	var playerNameInput = document.getElementById('player-name');
	var loadingTip = document.getElementById('loading-tip');

	// 隐藏加载提示
	if (loadingTip) loadingTip.classList.add('hidden');

	// 注册 game 回调 → 更新 HUD
	game.onScore(function (newScore) {
		if (scoreEl) scoreEl.textContent = newScore;
	});

	game.onCombo(function (combo, reward) {
		if (!comboHintEl) return;
		if (combo > 0) {
			comboHintEl.textContent = '连击 ×' + combo + ' 倍率 ' + reward;
		} else {
			comboHintEl.textContent = '';
		}
	});

	game.onChargeProgress(function (ratio) {
		if (chargeBarFillEl) chargeBarFillEl.style.width = (ratio * 100) + '%';
	});

	game.onGameOver(function (finalScore) {
		showGameOverPanel(finalScore);
	});

	// 显示 Game Over 面板并拉取榜单
	function showGameOverPanel(finalScore) {
		if (finalScoreEl) finalScoreEl.textContent = finalScore;
		if (gameOverPanelEl) gameOverPanelEl.classList.remove('hidden');
		// 重置提交按钮状态
		JumpJumpRanking.resetSubmitButton();
		// 主动拉取最新榜单
		JumpJumpRanking.requestTop10();
	}

	// 隐藏 Game Over 面板
	function hideGameOverPanel() {
		if (gameOverPanelEl) gameOverPanelEl.classList.add('hidden');
	}

	// 提交分数按钮
	if (submitBtn) {
		submitBtn.addEventListener('click', function () {
			var name = (playerNameInput && playerNameInput.value) || '匿名玩家';
			var score = game.getScore();
			if (score <= 0) return;
			JumpJumpRanking.submitScore(name, score);
			// 立即禁用防止重复点击，服务端结果返回后由 onSubmitResult 更新文案
			submitBtn.disabled = true;
			submitBtn.textContent = '提交中...';
		});
	}

	// 重新开始按钮
	if (restartBtn) {
		restartBtn.addEventListener('click', function () {
			// 重置游戏
			game.reset();
			// 隐藏面板
			hideGameOverPanel();
			// 重置 HUD
			if (scoreEl) scoreEl.textContent = '0';
			if (comboHintEl) comboHintEl.textContent = '';
			if (chargeBarFillEl) chargeBarFillEl.style.width = '0%';
			// 重置提交按钮
			JumpJumpRanking.resetSubmitButton();
		});
	}

	// 渲染循环
	var lastTime = performance.now();
	function loop() {
		requestAnimationFrame(loop);
		var now = performance.now();
		var dt = Math.min((now - lastTime) / 1000, 0.05); // 限制最大 dt 防止跳帧
		lastTime = now;
		game.update(dt);
		renderer.render();
	}
	loop();
})();
