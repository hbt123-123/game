var GameManager = require('./server/src/game/GameManager');
var handler = require('./server/src/socket/handler');

module.exports = function(io) {
	var gameManager = new GameManager();
	handler.setupSocketHandlers(io, gameManager);

	console.log('Undercover(谁是卧底) 已加载');
	return { name: '谁是卧底', route: '/undercover', socketPath: '/undercover/socket.io' };
};