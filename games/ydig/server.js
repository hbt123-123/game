module.exports = function(io) {
	var rooms = {};

	var wordBank = [
		{ word: '狗', category: '动物', chars: 1 },
		{ word: '猫', category: '动物', chars: 1 },
		{ word: '兔子', category: '动物', chars: 2 },
		{ word: '老鼠', category: '动物', chars: 2 },
		{ word: '大象', category: '动物', chars: 2 },
		{ word: '狮子', category: '动物', chars: 2 },
		{ word: '老虎', category: '动物', chars: 2 },
		{ word: '熊猫', category: '动物', chars: 2 },
		{ word: '猴子', category: '动物', chars: 2 },
		{ word: '长颈鹿', category: '动物', chars: 3 },
		{ word: '企鹅', category: '动物', chars: 2 },
		{ word: '蛇', category: '动物', chars: 1 },
		{ word: '鱼', category: '动物', chars: 1 },
		{ word: '鲨鱼', category: '动物', chars: 2 },
		{ word: '螃蟹', category: '动物', chars: 2 },
		{ word: '乌龟', category: '动物', chars: 2 },
		{ word: '青蛙', category: '动物', chars: 2 },
		{ word: '蝴蝶', category: '动物', chars: 2 },
		{ word: '蜜蜂', category: '动物', chars: 2 },
		{ word: '蚂蚁', category: '动物', chars: 2 },
		{ word: '苹果', category: '水果', chars: 2 },
		{ word: '香蕉', category: '水果', chars: 2 },
		{ word: '西瓜', category: '水果', chars: 2 },
		{ word: '葡萄', category: '水果', chars: 2 },
		{ word: '草莓', category: '水果', chars: 2 },
		{ word: '橙子', category: '水果', chars: 2 },
		{ word: '桃子', category: '水果', chars: 2 },
		{ word: '樱桃', category: '水果', chars: 2 },
		{ word: '菠萝', category: '水果', chars: 2 },
		{ word: '柠檬', category: '水果', chars: 2 },
		{ word: '蛋糕', category: '食物', chars: 2 },
		{ word: '面包', category: '食物', chars: 2 },
		{ word: '饺子', category: '食物', chars: 2 },
		{ word: '面条', category: '食物', chars: 2 },
		{ word: '火锅', category: '食物', chars: 2 },
		{ word: '寿司', category: '食物', chars: 2 },
		{ word: '汉堡', category: '食物', chars: 2 },
		{ word: '薯条', category: '食物', chars: 2 },
		{ word: '冰淇淋', category: '食物', chars: 3 },
		{ word: '棒棒糖', category: '食物', chars: 3 },
		{ word: '电脑', category: '电子电器', chars: 2 },
		{ word: '手机', category: '电子电器', chars: 2 },
		{ word: '电视', category: '电子电器', chars: 2 },
		{ word: '冰箱', category: '电子电器', chars: 2 },
		{ word: '空调', category: '电子电器', chars: 2 },
		{ word: '洗衣机', category: '电子电器', chars: 3 },
		{ word: '台灯', category: '电子电器', chars: 2 },
		{ word: '闹钟', category: '电子电器', chars: 2 },
		{ word: '眼镜', category: '电子电器', chars: 2 },
		{ word: '手表', category: '电子电器', chars: 2 },
		{ word: '书包', category: '日常用品', chars: 2 },
		{ word: '剪刀', category: '日常用品', chars: 2 },
		{ word: '雨伞', category: '日常用品', chars: 2 },
		{ word: '钥匙', category: '日常用品', chars: 2 },
		{ word: '蜡烛', category: '日常用品', chars: 2 },
		{ word: '气球', category: '日常用品', chars: 2 },
		{ word: '信封', category: '日常用品', chars: 2 },
		{ word: '礼物', category: '日常用品', chars: 2 },
		{ word: '吉他', category: '乐器', chars: 2 },
		{ word: '钢琴', category: '乐器', chars: 2 },
		{ word: '汽车', category: '交通工具', chars: 2 },
		{ word: '自行车', category: '交通工具', chars: 3 },
		{ word: '飞机', category: '交通工具', chars: 2 },
		{ word: '轮船', category: '交通工具', chars: 2 },
		{ word: '火车', category: '交通工具', chars: 2 },
		{ word: '公交车', category: '交通工具', chars: 3 },
		{ word: '出租车', category: '交通工具', chars: 3 },
		{ word: '直升机', category: '交通工具', chars: 3 },
		{ word: '火箭', category: '交通工具', chars: 2 },
		{ word: '潜艇', category: '交通工具', chars: 2 },
		{ word: '太阳', category: '自然', chars: 2 },
		{ word: '月亮', category: '自然', chars: 2 },
		{ word: '星星', category: '自然', chars: 2 },
		{ word: '彩虹', category: '自然', chars: 2 },
		{ word: '雪花', category: '自然', chars: 2 },
		{ word: '闪电', category: '自然', chars: 2 },
		{ word: '龙卷风', category: '自然', chars: 3 },
		{ word: '火山', category: '自然', chars: 2 },
		{ word: '冰山', category: '自然', chars: 2 },
		{ word: '瀑布', category: '自然', chars: 2 },
		{ word: '玫瑰', category: '植物', chars: 2 },
		{ word: '向日葵', category: '植物', chars: 3 },
		{ word: '仙人掌', category: '植物', chars: 3 },
		{ word: '蘑菇', category: '植物', chars: 2 },
		{ word: '枫叶', category: '植物', chars: 2 },
		{ word: '松树', category: '植物', chars: 2 },
		{ word: '竹子', category: '植物', chars: 2 },
		{ word: '荷花', category: '植物', chars: 2 },
		{ word: '蒲公英', category: '植物', chars: 3 },
		{ word: '柳树', category: '植物', chars: 2 },
		{ word: '房子', category: '建筑场所', chars: 2 },
		{ word: '学校', category: '建筑场所', chars: 2 },
		{ word: '医院', category: '建筑场所', chars: 2 },
		{ word: '公园', category: '建筑场所', chars: 2 },
		{ word: '超市', category: '建筑场所', chars: 2 },
		{ word: '图书馆', category: '建筑场所', chars: 3 },
		{ word: '城堡', category: '建筑场所', chars: 2 },
		{ word: '灯塔', category: '建筑场所', chars: 2 },
		{ word: '帐篷', category: '建筑场所', chars: 2 },
		{ word: '金字塔', category: '建筑场所', chars: 3 },
		{ word: '足球', category: '体育运动', chars: 2 },
		{ word: '篮球', category: '体育运动', chars: 2 },
		{ word: '羽毛球', category: '体育运动', chars: 3 },
		{ word: '乒乓球', category: '体育运动', chars: 3 },
		{ word: '棒球', category: '体育运动', chars: 2 },
		{ word: '网球', category: '体育运动', chars: 2 },
		{ word: '高尔夫', category: '体育运动', chars: 3 },
		{ word: '保龄球', category: '体育运动', chars: 3 },
		{ word: '射箭', category: '体育运动', chars: 2 },
		{ word: '举重', category: '体育运动', chars: 2 },
		{ word: '医生', category: '人物角色', chars: 2 },
		{ word: '老师', category: '人物角色', chars: 2 },
		{ word: '警察', category: '人物角色', chars: 2 },
		{ word: '厨师', category: '人物角色', chars: 2 },
		{ word: '宇航员', category: '人物角色', chars: 3 },
		{ word: '画家', category: '人物角色', chars: 2 },
		{ word: '水手', category: '人物角色', chars: 2 },
		{ word: '小丑', category: '人物角色', chars: 2 },
		{ word: '国王', category: '人物角色', chars: 2 },
		{ word: '王子', category: '人物角色', chars: 2 },
		{ word: '眼睛', category: '身体服饰', chars: 2 },
		{ word: '头发', category: '身体服饰', chars: 2 },
		{ word: '耳朵', category: '身体服饰', chars: 2 },
		{ word: '鼻子', category: '身体服饰', chars: 2 },
		{ word: '手指', category: '身体服饰', chars: 2 },
		{ word: '牙齿', category: '身体服饰', chars: 2 },
		{ word: '帽子', category: '身体服饰', chars: 2 },
		{ word: '手套', category: '身体服饰', chars: 2 },
		{ word: '袜子', category: '身体服饰', chars: 2 },
		{ word: '围巾', category: '身体服饰', chars: 2 },
		{ word: '桌子', category: '家具家居', chars: 2 },
		{ word: '椅子', category: '家具家居', chars: 2 },
		{ word: '沙发', category: '家具家居', chars: 2 },
		{ word: '床', category: '家具家居', chars: 1 },
		{ word: '镜子', category: '家具家居', chars: 2 },
		{ word: '楼梯', category: '家具家居', chars: 2 },
		{ word: '窗户', category: '家具家居', chars: 2 },
		{ word: '门', category: '家具家居', chars: 1 },
		{ word: '烟囱', category: '家具家居', chars: 2 },
		{ word: '水龙头', category: '家具家居', chars: 3 },
		{ word: '铅笔', category: '文具工具', chars: 2 },
		{ word: '尺子', category: '文具工具', chars: 2 },
		{ word: '橡皮', category: '文具工具', chars: 2 },
		{ word: '望远镜', category: '文具工具', chars: 3 },
		{ word: '显微镜', category: '文具工具', chars: 3 },
		{ word: '指南针', category: '文具工具', chars: 3 },
		{ word: '放大镜', category: '文具工具', chars: 3 },
		{ word: '温度计', category: '文具工具', chars: 3 },
		{ word: '磁铁', category: '文具工具', chars: 2 },
		{ word: '电池', category: '文具工具', chars: 2 },
		{ word: '海盗', category: '人物角色', chars: 2 },
		{ word: '公主', category: '人物角色', chars: 2 },
		{ word: '恐龙', category: '人物角色', chars: 2 },
		{ word: '外星人', category: '人物角色', chars: 3 },
		{ word: '机器人', category: '人物角色', chars: 3 },
		{ word: '雪人', category: '人物角色', chars: 2 },
		{ word: '幽灵', category: '人物角色', chars: 2 },
		{ word: '圣诞老人', category: '人物角色', chars: 4 },
		{ word: '天使', category: '人物角色', chars: 2 },
		{ word: '超人', category: '人物角色', chars: 2 },
		{ word: '炒饭', category: '食物', chars: 2 },
		{ word: '蛋挞', category: '食物', chars: 2 },
		{ word: '糖果', category: '食物', chars: 2 },
		{ word: '巧克力', category: '食物', chars: 3 },
		{ word: '棉花糖', category: '食物', chars: 3 },
		{ word: '冰糖葫芦', category: '食物', chars: 4 },
		{ word: '烤串', category: '食物', chars: 2 },
		{ word: '奶茶', category: '食物', chars: 2 },
		{ word: '西瓜汁', category: '食物', chars: 3 },
		{ word: '爆米花', category: '食物', chars: 3 },
		{ word: '三轮车', category: '体育运动', chars: 3 },
		{ word: '滑板', category: '体育运动', chars: 2 },
		{ word: '溜冰鞋', category: '体育运动', chars: 3 },
		{ word: '秋千', category: '体育运动', chars: 2 },
		{ word: '蹦床', category: '体育运动', chars: 2 },
		{ word: '风筝', category: '体育运动', chars: 2 },
		{ word: '毽子', category: '体育运动', chars: 2 },
		{ word: '跳绳', category: '体育运动', chars: 2 },
		{ word: '陀螺', category: '体育运动', chars: 2 },
		{ word: '魔方', category: '体育运动', chars: 2 },
		{ word: '梳子', category: '日常用品', chars: 2 },
		{ word: '牙刷', category: '日常用品', chars: 2 },
		{ word: '肥皂', category: '日常用品', chars: 2 },
		{ word: '枕头', category: '日常用品', chars: 2 },
		{ word: '衣架', category: '日常用品', chars: 2 },
		{ word: '垃圾桶', category: '日常用品', chars: 3 },
		{ word: '扫帚', category: '日常用品', chars: 2 },
		{ word: '拖把', category: '日常用品', chars: 2 },
		{ word: '篮子', category: '日常用品', chars: 2 },
		{ word: '秤', category: '日常用品', chars: 1 },
		{ word: '晚霞', category: '自然', chars: 2 },
		{ word: '日出', category: '自然', chars: 2 },
		{ word: '夕阳', category: '自然', chars: 2 },
		{ word: '云朵', category: '自然', chars: 2 },
		{ word: '烟花', category: '自然', chars: 2 },
		{ word: '热气球', category: '自然', chars: 3 },
		{ word: '降落伞', category: '自然', chars: 3 },
		{ word: '滑翔机', category: '自然', chars: 3 },
		{ word: '摩天轮', category: '自然', chars: 3 },
		{ word: '喷泉', category: '自然', chars: 2 }
	];

	function generateRoomId() {
		return Math.random().toString(36).substring(2, 8);
	}

	function pickRandomWords(count) {
		var pool = wordBank.slice();
		var result = [];
		for (var i = 0; i < count && pool.length > 0; i++) {
			var idx = Math.floor(Math.random() * pool.length);
			result.push(pool[idx]);
			pool.splice(idx, 1);
		}
		return result;
	}

	io.on('connection', function(socket) {
		var currentRoom = null;
		// 错误答案限流：1 秒窗口内最多 5 次错误，超出静默丢弃，防止暴力枚举词库
		var wrongAnswerTimes = [];

		socket.on('create_room', function(data) {
			var username = (data && data.username) || '玩家';
			var roomId = generateRoomId();
			while (rooms[roomId]) {
				roomId = generateRoomId();
			}

			var player = {
				id: socket.id,
				name: username,
				avatar: username.charAt(0).toUpperCase(),
				score: 0
			};

			rooms[roomId] = {
				id: roomId,
				hostId: socket.id,
				players: [player],
				gameState: 'waiting',
				currentDrawerIndex: 0,
				keyword: '',
				roundTimer: null,
				endRoundTimer: null,
				answeredPlayers: [],
				currentRound: 0,
				completedCycles: 0,
				maxRounds: 3,
				drawings: []
			};

			currentRoom = roomId;
			socket.join(roomId);
			socket.emit('room_created', { roomId: roomId, player: player });
		});

		socket.on('join_room', function(data) {
			var roomId = data.roomId;
			var username = (data && data.username) || '玩家';
			var room = rooms[roomId];

			if (!room) {
				socket.emit('join_error', { message: '房间不存在' });
				return;
			}
			if (room.gameState !== 'waiting') {
				socket.emit('join_error', { message: '游戏已开始，无法加入' });
				return;
			}
			if (room.players.some(function(p) { return p.id === socket.id; })) {
				socket.emit('join_error', { message: '你已在房间中' });
				return;
			}

			var player = {
				id: socket.id,
				name: username,
				avatar: username.charAt(0).toUpperCase(),
				score: 0
			};

			room.players.push(player);
			currentRoom = roomId;
			socket.join(roomId);

			socket.emit('room_joined', { roomId: roomId, player: player, players: room.players, maxRounds: room.maxRounds });
			socket.to(roomId).emit('player_joined', { player: player, players: room.players });
		});

		socket.on('start_game', function(data) {
			var room = rooms[currentRoom];
			if (!room) return;
			if (socket.id !== room.hostId) {
				socket.emit('game_error', { message: '只有房主可以开始游戏' });
				return;
			}
			if (room.players.length < 2) {
				socket.emit('game_error', { message: '至少需要2名玩家' });
				return;
			}
			if (room.gameState !== 'waiting') return;

			// maxRounds 范围校验：1 ~ 10，防止负数/极大值破坏游戏流程
			var newMaxRounds = (data && data.maxRounds != null) ? Number(data.maxRounds) : room.maxRounds;
			if (isFinite(newMaxRounds) && newMaxRounds >= 1 && newMaxRounds <= 10) {
				room.maxRounds = Math.floor(newMaxRounds);
			}
			room.gameState = 'playing';
			room.currentDrawerIndex = 0;
			room.currentRound = 0;
			room.completedCycles = 0;
			room.drawings = [];
			room.players.forEach(function(p) { p.score = 0; });
			startRound(room);
		});

		socket.on('set_keyword', function(data) {
			var room = rooms[currentRoom];
			if (!room || room.gameState !== 'playing') return;
			var drawer = room.players[room.currentDrawerIndex];
			if (!drawer || drawer.id !== socket.id) return;

			room.keyword = data.keyword || '';
			room.answeredPlayers = [];
			room.roundStartTime = Date.now();

			var wordInfo = data.category || '';
			var wordChars = data.chars || room.keyword.length;

			io.to(currentRoom).emit('keyword_set', {
				keywordLength: room.keyword.length,
				drawerName: drawer.name,
				category: wordInfo,
				chars: wordChars
			});

			if (room.roundTimer) clearTimeout(room.roundTimer);
			room.roundTimer = setTimeout(function() {
				endRound(room);
			}, 60000);
		});

		socket.on('refresh_words', function() {
			var room = rooms[currentRoom];
			if (!room || room.gameState !== 'playing') return;
			var drawer = room.players[room.currentDrawerIndex];
			if (!drawer || drawer.id !== socket.id) return;
			if (room.refreshUsed) return;

			room.refreshUsed = true;
			room.wordOptions = pickRandomWords(4);
			socket.emit('word_options', {
				words: room.wordOptions
			});
		});

		socket.on('draw', function(data) {
			var room = rooms[currentRoom];
			if (!room || room.gameState !== 'playing') return;
			var drawer = room.players[room.currentDrawerIndex];
			if (!drawer || drawer.id !== socket.id) return;
			socket.to(currentRoom).emit('paint', data);
		});

		socket.on('stop', function(data) {
			var room = rooms[currentRoom];
			if (!room || room.gameState !== 'playing') return;
			var drawer = room.players[room.currentDrawerIndex];
			if (!drawer || drawer.id !== socket.id) return;
			socket.to(currentRoom).emit('paint', data);
		});

		socket.on('clear', function() {
			var room = rooms[currentRoom];
			if (!room || room.gameState !== 'playing') return;
			var drawer = room.players[room.currentDrawerIndex];
			if (!drawer || drawer.id !== socket.id) return;
			socket.to(currentRoom).emit('clear_canvas');
		});

		socket.on('undo', function() {
			if (!currentRoom) return;
			var room = rooms[currentRoom];
			if (!room || room.gameState !== 'playing') return;
			var drawer = room.players[room.currentDrawerIndex];
			if (!drawer || drawer.id !== socket.id) return;
			socket.to(currentRoom).emit('undo_draw');
		});

		socket.on('save_drawing', function(data) {
			var room = rooms[currentRoom];
			if (!room) return;
			var drawer = room.players[room.currentDrawerIndex];
			if (!drawer || drawer.id !== socket.id) return;
			if (!data || typeof data.image !== 'string') return;
			// 限制 base64 图片最大约 500KB
			if (data.image.length > 700000) return;
			room.drawings.push({
				drawerName: data.drawerName,
				keyword: data.keyword,
				round: data.round,
				image: data.image
			});
		});

		socket.on('submit_answer', function(data) {
			var room = rooms[currentRoom];
			if (!room || room.gameState !== 'playing') return;

			var drawer = room.players[room.currentDrawerIndex];
			if (!drawer || drawer.id === socket.id) return;

			var already = room.answeredPlayers.some(function(a) { return a.playerId === socket.id; });
			if (already) return;

			var answerTime = Date.now() - room.roundStartTime;

			if (data.answer && room.keyword && data.answer === room.keyword) {
				room.answeredPlayers.push({ playerId: socket.id, time: answerTime });
				io.to(currentRoom).emit('answer_result', {
					playerId: socket.id,
					correct: true,
					message: '正确'
				});

				var stillCanAnswer = room.players.length - 1 - room.answeredPlayers.length;
				if (stillCanAnswer <= 0) {
					if (room.roundTimer) clearTimeout(room.roundTimer);
					endRound(room);
				}
			} else {
				var now = Date.now();
				wrongAnswerTimes = wrongAnswerTimes.filter(function(t) { return now - t < 1000; });
				if (wrongAnswerTimes.length >= 5) {
					// 限流：1 秒内错误超过 5 次，静默丢弃，防止暴力枚举
					return;
				}
				wrongAnswerTimes.push(now);
				socket.emit('answer_result', {
					playerId: socket.id,
					correct: false,
					message: '错误'
				});
			}
		});

		socket.on('disconnect', function() {
			if (!currentRoom || !rooms[currentRoom]) return;
			var room = rooms[currentRoom];
			var disconnectedDrawerName = null;
			if (room.gameState === 'playing') {
				var drawer = room.players[room.currentDrawerIndex];
				if (drawer && drawer.id === socket.id) {
					disconnectedDrawerName = drawer.name;
				}
			}
			room.players = room.players.filter(function(p) { return p.id !== socket.id; });
			if (room.hostId === socket.id && room.players.length > 0) {
				room.hostId = room.players[0].id;
			}
			if (room.players.length === 0) {
				if (room.roundTimer) clearTimeout(room.roundTimer);
				if (room.endRoundTimer) clearTimeout(room.endRoundTimer);
				delete rooms[currentRoom];
				return;
			}
			io.to(currentRoom).emit('player_left', {
				playerId: socket.id,
				players: room.players
			});
			if (room.gameState !== 'playing') return;

			if (room.players.length < 2) {
				if (room.roundTimer) clearTimeout(room.roundTimer);
				if (room.endRoundTimer) clearTimeout(room.endRoundTimer);
				room.gameState = 'waiting';
				io.to(currentRoom).emit('game_over', {
					players: room.players,
					message: '玩家不足，游戏结束',
					drawings: room.drawings || []
				});
				return;
			}

			if (disconnectedDrawerName) {
				if (room.currentDrawerIndex >= room.players.length) {
					room.currentDrawerIndex = room.players.length - 1;
				}
				endRound(room, disconnectedDrawerName);
			} else if (room.currentDrawerIndex >= room.players.length) {
				room.currentDrawerIndex = room.players.length - 1;
			}
		});
	});

	function startRound(room) {
		// 防御：游戏已结束或房间已销毁时不再启动新一轮，防止 endRound 延迟触发导致状态混乱
		if (!room || room.gameState !== 'playing') return;
		room.answeredPlayers = [];
		room.keyword = '';
		room.roundStartTime = 0;
		room.refreshUsed = false;
		room.wordOptions = pickRandomWords(4);

		if (room.roundTimer) clearTimeout(room.roundTimer);

		var drawer = room.players[room.currentDrawerIndex];
		room.currentRound++;

		io.to(room.id).emit('clear_canvas');
		io.to(room.id).emit('round_start', {
			drawerId: drawer.id,
			drawerName: drawer.name,
			round: room.currentRound,
			players: room.players
		});

		io.to(drawer.id).emit('word_options', {
			words: room.wordOptions
		});
	}

	function endRound(room, disconnectedDrawerName) {
		if (room.roundTimer) clearTimeout(room.roundTimer);
		room.roundTimer = null;
		if (room.endRoundTimer) clearTimeout(room.endRoundTimer);

		var drawer = room.players[room.currentDrawerIndex];
		var drawerName = disconnectedDrawerName || (drawer && drawer.name) || '';

		// 画手仍在场时才计分；断线则跳过本轮计分
		if (drawer && !disconnectedDrawerName) {
			drawer.score += room.answeredPlayers.length;

			room.answeredPlayers.sort(function(a, b) { return a.time - b.time; });
			var totalCorrect = room.answeredPlayers.length;
			room.answeredPlayers.forEach(function(record, index) {
				var guesser = room.players.find(function(p) { return p.id === record.playerId; });
				if (guesser) {
					guesser.score += totalCorrect - index;
				}
			});
		}

		// 画手断线时，下一轮从断线者原位置继续（players 数组已删除该位置，currentDrawerIndex 仍指向有效位置或末尾）
		var nextIndex;
		if (disconnectedDrawerName) {
			nextIndex = room.currentDrawerIndex % room.players.length;
		} else {
			nextIndex = (room.currentDrawerIndex + 1) % room.players.length;
		}
		if (nextIndex === 0) {
			room.completedCycles++;
		}

		io.to(room.id).emit('round_end', {
			keyword: room.keyword,
			drawerName: drawerName,
			answeredPlayers: room.answeredPlayers.map(function(r) {
				var p = room.players.find(function(pl) { return pl.id === r.playerId; });
				return { name: p ? p.name : '', time: r.time };
			}),
			players: room.players,
			completedCycles: room.completedCycles,
			maxRounds: room.maxRounds,
			message: disconnectedDrawerName ? '画手已离开，本轮跳过' : undefined
		});

		if (room.completedCycles >= room.maxRounds) {
			room.endRoundTimer = setTimeout(function() {
				room.endRoundTimer = null;
				room.gameState = 'waiting';
				var sorted = room.players.slice().sort(function(a, b) { return b.score - a.score; });
				io.to(room.id).emit('game_over', {
					players: room.players,
					winner: sorted[0] ? sorted[0].name : '',
					winnerScore: sorted[0] ? sorted[0].score : 0,
					drawings: room.drawings
				});
			}, 5000);
		} else {
			room.endRoundTimer = setTimeout(function() {
				room.endRoundTimer = null;
				room.currentDrawerIndex = nextIndex;
				startRound(room);
			}, 5000);
		}
	}

	console.log('YDIG(你画我猜) - 房间版 已加载');
	return { name: '你画我猜', route: '/ydig', socketPath: '/ydig/socket.io' };
};
