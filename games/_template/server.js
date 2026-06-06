module.exports = function(io) {
	var gameNs = io.of('/template/socket.io');
	var rooms = {};

	gameNs.on('connection', function(socket) {
		var currentRoom = null;

		socket.on('join', function(data) {
			var roomId = data.roomId || 'default';
			currentRoom = roomId;
			socket.join(roomId);
			socket.emit('connected', { roomId: roomId });
			socket.to(roomId).emit('player_joined', { playerId: socket.id });
		});

		socket.on('game_action', function(data) {
			if (!currentRoom) return;
			socket.to(currentRoom).emit('game_update', data);
		});

		socket.on('disconnect', function() {
			if (!currentRoom) return;
			socket.to(currentRoom).emit('player_left', { playerId: socket.id });
		});
	});

	console.log('新游戏模板 已加载');
	return { name: '新游戏模板', route: '/game/template' };
};