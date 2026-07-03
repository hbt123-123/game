// JumpJump 游戏核心逻辑
// 阶段 2：工厂函数 + 初始化 + 相机跟随
// 阶段 3：状态机 + 蓄力形变 + 跳跃物理 + 碰撞判定 + 计分 + 飘分 + 失败检测
var JumpJumpGame = (function () {
	var renderer;
	var player, currentStage, nextStage;
	var stages = [];
	var state = 'idle'; // idle | charging | jumping | landed | over
	var score = 0;
	var combo = 0;
	var lastReward = 1;
	var currentDirection = new THREE.Vector3(1, 0, 0);
	var onGameOverCallback = null;
	var onScoreCallback = null;
	var onComboCallback = null;
	var onChargeProgressCallback = null;

	// 蓄力状态
	var chargeStartTime = 0;
	var chargeBarEl = null;

	// 跳跃物理状态
	var jumpState = null;

	// 旋转动画
	var rotationTime = 0;

	function init(r) {
		renderer = r;
		jumpState = JumpJumpPhysics.createJumpState();
		chargeBarEl = document.getElementById('charge-bar');
		resetGame();
		return {
			startCharge: startCharge,
			endCharge: endCharge,
			update: update,
			reset: resetGame,
			onGameOver: function (cb) { onGameOverCallback = cb; },
			onScore: function (cb) { onScoreCallback = cb; },
			onCombo: function (cb) { onComboCallback = cb; },
			onChargeProgress: function (cb) { onChargeProgressCallback = cb; },
			getState: function () { return state; },
			getScore: function () { return score; },
			getCombo: function () { return combo; },
			getPlayer: function () { return player; }
		};
	}

	function resetGame() {
		// 清理旧对象
		for (var i = 0; i < stages.length; i++) {
			renderer.removeFromScene(stages[i]);
		}
		stages = [];
		if (player) renderer.removeFromScene(player);

		score = 0;
		combo = 0;
		lastReward = 1;
		state = 'idle';
		currentDirection.set(1, 0, 0);
		rotationTime = 0;
		if (jumpState) JumpJumpPhysics.stop(jumpState);

		// 隐藏蓄力条
		if (chargeBarEl) chargeBarEl.classList.add('hidden');

		// 创建初始台子（方盒，scale=1，默认颜色，位于原点）
		currentStage = createStage('box', new THREE.Vector3(0, 0, 0), 1.0, JUMPJUMP_CONFIG.COLOR_STAGE_DEFAULT);
		stages.push(currentStage);
		renderer.addToScene(currentStage);

		// 创建玩家
		player = createPlayer();
		player.position.set(0, getStageTopY(currentStage), 0);
		renderer.addToScene(player);

		// 生成下一个台子
		nextStage = spawnNextStage();
	}

	function createPlayer() {
		var group = new THREE.Group();
		var mat = new THREE.MeshStandardMaterial({ color: JUMPJUMP_CONFIG.COLOR_PLAYER });

		var bodyGeo = new THREE.BoxGeometry(
			JUMPJUMP_CONFIG.PLAYER_BODY_SIZE.x,
			JUMPJUMP_CONFIG.PLAYER_BODY_SIZE.y,
			JUMPJUMP_CONFIG.PLAYER_BODY_SIZE.z
		);
		var body = new THREE.Mesh(bodyGeo, mat);
		body.position.y = JUMPJUMP_CONFIG.PLAYER_BODY_Y;
		body.castShadow = true;
		body.name = 'body';
		group.add(body);

		var headGeo = new THREE.SphereGeometry(JUMPJUMP_CONFIG.PLAYER_HEAD_RADIUS, 16, 12);
		var head = new THREE.Mesh(headGeo, mat);
		head.position.y = JUMPJUMP_CONFIG.PLAYER_HEAD_Y;
		head.castShadow = true;
		head.name = 'head';
		group.add(head);

		group.userData = { body: body, head: head };
		return group;
	}

	function createStage(type, position, scale, color) {
		var geo, height;
		if (type === 'cylinder') {
			height = JUMPJUMP_CONFIG.STAGE_CYL_HEIGHT;
			geo = new THREE.CylinderGeometry(
				JUMPJUMP_CONFIG.STAGE_CYL_RADIUS,
				JUMPJUMP_CONFIG.STAGE_CYL_RADIUS,
				height,
				JUMPJUMP_CONFIG.STAGE_CYL_SEGMENTS
			);
		} else {
			height = JUMPJUMP_CONFIG.STAGE_BOX_HEIGHT;
			geo = new THREE.BoxGeometry(
				JUMPJUMP_CONFIG.STAGE_BOX_WIDTH,
				height,
				JUMPJUMP_CONFIG.STAGE_BOX_WIDTH
			);
		}

		var mat = new THREE.MeshStandardMaterial({ color: color });
		var mesh = new THREE.Mesh(geo, mat);
		mesh.scale.set(scale, scale, scale);
		mesh.position.set(position.x, height * scale / 2, position.z);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.userData = {
			type: type,
			baseScale: scale,
			baseHeight: height,
			topY: height * scale
		};
		return mesh;
	}

	function spawnNextStage() {
		var dir = Math.random() < 0.5
			? new THREE.Vector3(1, 0, 0)
			: new THREE.Vector3(0, 0, 1);
		currentDirection = dir;

		var dist = JUMPJUMP_CONFIG.STAGE_MIN_DISTANCE
			+ Math.random() * (JUMPJUMP_CONFIG.STAGE_MAX_DISTANCE - JUMPJUMP_CONFIG.STAGE_MIN_DISTANCE);
		var scale = JUMPJUMP_CONFIG.STAGE_MIN_SCALE
			+ Math.random() * (JUMPJUMP_CONFIG.STAGE_MAX_SCALE - JUMPJUMP_CONFIG.STAGE_MIN_SCALE);
		var type = Math.random() < 0.5 ? 'box' : 'cylinder';
		var hue = Math.random();
		var color = new THREE.Color().setHSL(hue, 0.55, 0.7);

		var pos = new THREE.Vector3();
		pos.copy(currentStage.position);
		pos.addScaledVector(dir, dist);
		pos.y = 0;

		var stage = createStage(type, pos, scale, color.getHex());
		stages.push(stage);
		renderer.addToScene(stage);
		return stage;
	}

	function getStageTopY(stage) {
		return stage.userData.topY;
	}

	// 蓄力形变：压缩玩家身体与当前台子
	function applyChargeSquash(chargeRatio) {
		if (!player || !currentStage) return;
		// chargeRatio: 0~1
		var bodyMinScale = JUMPJUMP_CONFIG.CHARGE_BODY_MIN_SCALE;
		var bodySy = 1 - chargeRatio * (1 - bodyMinScale);
		var body = player.userData.body;
		if (body) {
			body.scale.y = bodySy;
			body.position.y = JUMPJUMP_CONFIG.PLAYER_BODY_Y * bodySy;
		}

		// 台子下陷
		var stageMinScale = JUMPJUMP_CONFIG.CHARGE_STAGE_MIN_SCALE;
		var stageSy = 1 - chargeRatio * (1 - stageMinScale);
		var baseScale = currentStage.userData.baseScale;
		currentStage.scale.set(baseScale, baseScale * stageSy, baseScale);
		var height = currentStage.userData.baseHeight;
		currentStage.position.y = height * baseScale * stageSy / 2;
	}

	// 还原形变
	function resetSquash() {
		if (!player || !currentStage) return;
		var body = player.userData.body;
		if (body) {
			body.scale.y = 1;
			body.position.y = JUMPJUMP_CONFIG.PLAYER_BODY_Y;
		}
		var baseScale = currentStage.userData.baseScale;
		currentStage.scale.set(baseScale, baseScale, baseScale);
		var height = currentStage.userData.baseHeight;
		currentStage.position.y = height * baseScale / 2;
	}

	function startCharge() {
		if (state !== 'idle') return;
		state = 'charging';
		chargeStartTime = performance.now();
		if (chargeBarEl) {
			chargeBarEl.classList.remove('hidden');
			var fill = document.getElementById('charge-bar-fill');
			if (fill) fill.style.width = '0%';
		}
	}

	function endCharge(elapse) {
		if (state !== 'charging') return;
		// 隐藏蓄力条
		if (chargeBarEl) chargeBarEl.classList.add('hidden');
		// 还原形变
		resetSquash();
		// 开始跳跃
		state = 'jumping';
		rotationTime = 0;
		JumpJumpPhysics.applyJump(
			jumpState,
			elapse,
			currentDirection,
			player.position,
			getStageTopY(currentStage)
		);
	}

	// 落地判定：优先判定 nextStage（加分），其次判定 currentStage（落回原台子继续）
	function checkLanding() {
		var px = player.position.x;
		var pz = player.position.z;

		// 1. 判定是否落在 nextStage（目标台子）
		var nx = nextStage.position.x;
		var nz = nextStage.position.z;
		var nTop = getStageTopY(nextStage);
		var nRadius = 0.5 * nextStage.userData.baseScale;
		var ndx = px - nx;
		var ndz = pz - nz;
		var ndist = Math.sqrt(ndx * ndx + ndz * ndz);

		if (ndist <= nRadius) {
			// 落在目标台子上，吸附 + 计分 + 切换台子
			player.position.y = nTop;
			if (ndist < JUMPJUMP_CONFIG.CENTER_HIT_THRESHOLD) {
				// 中心命中，翻倍
				lastReward = lastReward * JUMPJUMP_CONFIG.CENTER_HIT_MULTIPLIER;
				combo = combo + 1;
			} else {
				lastReward = 1;
				combo = 0;
			}
			score += lastReward;
			showScoreFloat(player.position, '+' + lastReward);
			if (onScoreCallback) onScoreCallback(score);
			if (onComboCallback) onComboCallback(combo, lastReward);

			// 切换台子：nextStage 变为 currentStage
			currentStage = nextStage;
			// 生成下一个台子
			nextStage = spawnNextStage();
			state = 'idle';
			JumpJumpPhysics.stop(jumpState);
			return;
		}

		// 2. 判定是否落在 currentStage（落回原台子，不加分但可继续游戏）
		var cx = currentStage.position.x;
		var cz = currentStage.position.z;
		var cTop = getStageTopY(currentStage);
		var cRadius = currentStage.userData.type === 'cylinder'
			? JUMPJUMP_CONFIG.STAGE_CYL_RADIUS * currentStage.userData.baseScale
			: 0.5 * JUMPJUMP_CONFIG.STAGE_BOX_WIDTH * currentStage.userData.baseScale;
		var cdx = px - cx;
		var cdz = pz - cz;
		var cdist = Math.sqrt(cdx * cdx + cdz * cdz);

		if (cdist <= cRadius) {
			// 落回原台子，吸附顶面，连击中断但游戏继续
			player.position.y = cTop;
			lastReward = 1;
			combo = 0;
			if (onComboCallback) onComboCallback(combo, lastReward);
			state = 'idle';
			JumpJumpPhysics.stop(jumpState);
			return;
		}

		// 3. 都未命中，继续下落（最终触发 FAIL_Y_THRESHOLD）
	}

	// 飘分动画
	function showScoreFloat(worldPos, text) {
		var container = document.getElementById('score-floats');
		if (!container || !renderer.camera) return;
		// 世界坐标转屏幕坐标
		var vec = new THREE.Vector3();
		vec.copy(worldPos);
		vec.y += 1.5;
		vec.project(renderer.camera);
		var x = (vec.x * 0.5 + 0.5) * window.innerWidth;
		var y = (-vec.y * 0.5 + 0.5) * window.innerHeight;
		var el = document.createElement('div');
		el.className = 'score-float';
		el.textContent = text;
		el.style.left = x + 'px';
		el.style.top = y + 'px';
		container.appendChild(el);
		setTimeout(function () {
			if (el.parentNode) el.parentNode.removeChild(el);
		}, 1000);
	}

	function triggerGameOver() {
		state = 'over';
		JumpJumpPhysics.stop(jumpState);
		if (onGameOverCallback) onGameOverCallback(score);
	}

	function update(dt) {
		if (!player) return;

		// 状态机
		if (state === 'charging') {
			// 更新蓄力形变
			var elapsed = (performance.now() - chargeStartTime) / 1000;
			var ratio = Math.min(elapsed / JUMPJUMP_CONFIG.MAX_CHARGE_TIME, 1);
			applyChargeSquash(ratio);
			// 更新蓄力条
			if (onChargeProgressCallback) onChargeProgressCallback(ratio);
			var fill = document.getElementById('charge-bar-fill');
			if (fill) fill.style.width = (ratio * 100) + '%';
		} else if (state === 'jumping') {
			// 物理更新
			var isFalling = JumpJumpPhysics.update(jumpState, dt, player.position);

			// 旋转动画（沿 X 轴翻滚 360°）
			rotationTime += dt;
			var rotRatio = Math.min(rotationTime / JUMPJUMP_CONFIG.JUMP_ROTATION_DURATION, 1);
			player.rotation.x = -rotRatio * Math.PI * 2 * (JUMPJUMP_CONFIG.JUMP_ROTATION_ANGLE / 360);

			// 落地检测：下落中且接近目标台子顶面
			if (isFalling && player.position.y <= getStageTopY(nextStage) + 0.1) {
				checkLanding();
			}

			// 失败检测：掉到地面下方
			if (player.position.y < JUMPJUMP_CONFIG.FAIL_Y_THRESHOLD) {
				triggerGameOver();
			}
		}

		// 相机始终跟随
		renderer.updateCamera(player.position, player.position);
	}

	return { init: init };
})();
