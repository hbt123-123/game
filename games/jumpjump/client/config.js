// JumpJump 游戏参数配置
// 提取自 Unity Player.cs / Materials / Prefabs
var JUMPJUMP_CONFIG = {
	// 颜色（提取自 Unity Materials）
	COLOR_GROUND: 0x7A7A7A,        // RGB(0.478, 0.478, 0.478) from Ground.mat
	COLOR_PLAYER: 0x5C0061,        // RGB(0.361, 0, 0.382) from Player.mat
	COLOR_STAGE_DEFAULT: 0xF5F5F5,
	COLOR_BG: 0x1a1a2e,

	// 几何（提取自 Unity Prefabs）
	STAGE_BOX_HEIGHT: 0.5,         // Stage.prefab BoxGeometry y
	STAGE_BOX_WIDTH: 1.0,          // Stage.prefab BoxGeometry x/z
	STAGE_CYL_HEIGHT: 0.25,        // StageCylinder.prefab height
	STAGE_CYL_RADIUS: 0.5,         // StageCylinder.prefab radius
	STAGE_CYL_SEGMENTS: 32,

	// 玩家几何
	PLAYER_BODY_SIZE: { x: 0.4, y: 0.6, z: 0.4 },
	PLAYER_HEAD_RADIUS: 0.25,
	PLAYER_HEAD_Y: 0.8,            // 头部中心 y（相对玩家脚底）
	PLAYER_BODY_Y: 0.3,            // 身体中心 y（相对玩家脚底）

	// 物理（提取自 Player.cs）
	GRAVITY: -9.8,
	JUMP_VERTICAL_BASE: 5,         // 垂直冲量基础值 (Player.cs OnJump: AddForce(0,5,0))
	JUMP_FACTOR: 2,                // 水平力度系数 (Player.cs Factor)
	MAX_CHARGE_TIME: 1.5,          // 最大蓄力时长（秒），超出不再增加力度

	// 玩法（提取自 Player.cs SpawnStage / AddScore）
	// 最大蓄力水平距离 = MAX_CHARGE_TIME × JUMP_FACTOR × 跳跃时间 ≈ 1.5×2×1.02 ≈ 3.06m
	// STAGE_MAX_DISTANCE 必须 ≤ 3.06 才能保证最大蓄力可覆盖所有台子
	STAGE_MIN_DISTANCE: 1.0,
	STAGE_MAX_DISTANCE: 2.8,       // 留余量，最大蓄力覆盖 3.06m
	STAGE_MIN_SCALE: 0.5,          // Random.Range(0.5f, 1)
	STAGE_MAX_SCALE: 1.0,
	CENTER_HIT_THRESHOLD: 0.1,     // 中心命中翻倍阈值 (Player.cs AddScore: < 0.1)
	CENTER_HIT_MULTIPLIER: 2,      // 翻倍倍数

	// 蓄力形变
	CHARGE_BODY_MIN_SCALE: 0.6,    // 蓄力时身体最小 y 缩放
	CHARGE_STAGE_MIN_SCALE: 0.7,   // 蓄力时台子最小 y 缩放
	CHARGE_BAR_SPEED: 1.0,         // 蓄力进度条速度倍数

	// 相机（沿 +X 方向观察，与台子初始生成方向一致）
	CAMERA_OFFSET: { x: -8, y: 6, z: 0 },
	CAMERA_LERP: 0.12,             // 相机跟随平滑系数

	// 失败判定
	FAIL_Y_THRESHOLD: -1.0,        // 玩家 y 低于此值判定为掉落

	// 旋转
	JUMP_ROTATION_DURATION: 0.6,   // 跳跃旋转动画时长（秒）
	JUMP_ROTATION_ANGLE: 360       // 跳跃时旋转角度
};
