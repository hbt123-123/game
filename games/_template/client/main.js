var socket = io({ path: '/template/socket.io' });

var app = new Vue({
	el: '#app',
	data: {
		message: '游戏已连接'
	},
	mounted: function() {
		var self = this;
		socket.on('connected', function(data) {
			self.message = '已连接到房间: ' + data.roomId;
		});
		socket.emit('join', { roomId: 'default' });
	}
});