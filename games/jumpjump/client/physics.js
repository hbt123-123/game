// JumpJump 简化物理：抛物线积分（重力 + 跳跃初速度）
// 参考 Player.cs OnJump: _rigidbody.AddForce((0,5,0) + _direction * elapse * Factor, ForceMode.Impulse)
var JumpJumpPhysics = (function () {
	function createJumpState() {
		return {
			velocity: new THREE.Vector3(0, 0, 0),
			isJumping: false,
			time: 0,
			startPos: new THREE.Vector3(),
			startStageTopY: 0
		};
	}

	// 施加跳跃冲量
	// elapse: 蓄力时长（秒）
	// direction: 跳跃方向（单位向量，X 或 Z 轴）
	// currentPos: 玩家当前位置
	// startStageTopY: 起跳台子顶面 y（用于判断是否回落到起点高度）
	function applyJump(state, elapse, direction, currentPos, startStageTopY) {
		state.isJumping = true;
		state.time = 0;
		state.startPos.copy(currentPos);
		state.startStageTopY = startStageTopY;

		// 限制最大蓄力时长
		var clampedElapse = Math.min(elapse, JUMPJUMP_CONFIG.MAX_CHARGE_TIME);

		// 垂直初速度（Player.cs: AddForce(0, 5, 0)）
		state.velocity.y = JUMPJUMP_CONFIG.JUMP_VERTICAL_BASE;
		// 水平初速度（Player.cs: _direction * elapse * Factor）
		state.velocity.x = direction.x * clampedElapse * JUMPJUMP_CONFIG.JUMP_FACTOR;
		state.velocity.z = direction.z * clampedElapse * JUMPJUMP_CONFIG.JUMP_FACTOR;
	}

	// 每帧更新位置与速度
	// 返回当前是否处于下落阶段（velocity.y < 0）
	function update(state, dt, currentPos) {
		if (!state.isJumping) return false;

		state.time += dt;
		// 重力积分
		state.velocity.y += JUMPJUMP_CONFIG.GRAVITY * dt;
		// 位置积分
		currentPos.x += state.velocity.x * dt;
		currentPos.y += state.velocity.y * dt;
		currentPos.z += state.velocity.z * dt;

		return state.velocity.y < 0; // 是否下落中
	}

	function stop(state) {
		state.isJumping = false;
		state.velocity.set(0, 0, 0);
		state.time = 0;
	}

	return {
		createJumpState: createJumpState,
		applyJump: applyJump,
		update: update,
		stop: stop
	};
})();
