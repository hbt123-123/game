var socket = io({ path: '/ydig/socket.io' });

var app = new Vue({
	el: '#app',
	data: {
		view: 'setup',
		setupMode: 'create',
		username: '',
		joinRoomId: '',
		roomId: '',
		players: [],
		myId: '',
		isHost: false,
		maxRounds: 3,
		round: 0,
		drawerId: '',
		drawerName: '',
		isMyTurn: false,
		roundStarted: false,
		roundEnded: false,
		keyword: '',
		keywordConfirmed: false,
		remainingTime: 60,
		timerInterval: null,
		myAnswer: '',
		myAnswerResult: null,
		canvasCtx: null,
		stageInfo: null,
		drawPath: { beginX: 0, beginY: 0, endX: 0, endY: 0 },
		isDrawing: false,
		roundKeyword: '',
		roundDrawerName: '',
		roundAnswerCount: 0,
		roundAnswers: [],
		toast: { show: false, text: '', fading: false },
		colors: ['#000000', '#E74C3C', '#E91E63', '#9B59B6', '#3498DB', '#1ABC9C', '#27AE60', '#F39C12', '#E67E22', '#795548', '#7F8C8D'],
		currentColor: '#000000',
		currentTool: 'pen',
		strokeHistory: [],
		currentStroke: null,
		gameOver: false,
		gameOverData: null,
		wordList: [],
		refreshUsed: false,
		keywordCategory: '',
		keywordChars: 0,
		drawings: [],
		selectedDrawing: null
	},
	computed: {
		usernamePreview: function () {
			return (this.username || '?').charAt(0).toUpperCase();
		},
		timerDisplay: function () {
			var m = Math.floor(this.remainingTime / 60);
			var s = this.remainingTime % 60;
			return m + ':' + (s < 10 ? '0' : '') + s;
		},
		sortedPlayers: function () {
			return this.players.slice().sort(function (a, b) { return b.score - a.score; });
		},
		groupedDrawings: function () {
			var groups = {};
			for (var i = 0; i < this.drawings.length; i++) {
				var d = this.drawings[i];
				var r = d.round;
				if (!groups[r]) groups[r] = [];
				groups[r].push(d);
			}
			var keys = Object.keys(groups).sort(function (a, b) { return a - b; });
			var result = [];
			for (var j = 0; j < keys.length; j++) {
				result.push({ round: parseInt(keys[j]), items: groups[keys[j]] });
			}
			return result;
		}
	},
	methods: {
		createRoom: function () {
			var self = this;
			var name = (this.username || '').trim() || '玩家';
			socket.emit('create_room', { username: name });
		},
		joinRoom: function () {
			var self = this;
			var rid = (this.joinRoomId || '').trim();
			if (!rid) {
				this.showToast('请输入房间号');
				return;
			}
			var name = (this.username || '').trim() || '玩家';
			socket.emit('join_room', { roomId: rid, username: name });
		},
		startGame: function () {
			socket.emit('start_game', { maxRounds: this.maxRounds });
		},
		selectWord: function (w) {
			this.keyword = w.word;
			this.keywordConfirmed = true;
			socket.emit('set_keyword', { keyword: w.word, category: w.category, chars: w.chars });
		},
		refreshWords: function () {
			this.refreshUsed = true;
			socket.emit('refresh_words');
		},
		clearCanvas: function () {
			if (this.canvasCtx) {
				this.canvasCtx.clearRect(0, 0, 520, 350);
				this.strokeHistory = [];
				this.currentStroke = null;
				socket.emit('clear');
			}
		},
		submitAnswer: function () {
			var a = (this.myAnswer || '').trim();
			if (!a) return;
			socket.emit('submit_answer', { answer: a });
			this.myAnswer = '';
		},
		selectColor: function (c) {
			this.currentColor = c;
			this.currentTool = 'pen';
		},
		toggleEraser: function () {
			if (this.currentTool === 'eraser') {
				this.currentTool = 'pen';
			} else {
				this.currentTool = 'eraser';
			}
		},
		undoStroke: function () {
			if (this.strokeHistory.length === 0) return;
			this.strokeHistory.pop();
			this.redrawAllStrokes();
			socket.emit('undo');
		},
		redrawAllStrokes: function () {
			var ctx = this.canvasCtx;
			if (!ctx) return;
			ctx.clearRect(0, 0, 520, 350);
			for (var i = 0; i < this.strokeHistory.length; i++) {
				var stroke = this.strokeHistory[i];
				var segs = stroke.segments;
				for (var j = 0; j < segs.length; j++) {
					var s = segs[j];
					ctx.beginPath();
					ctx.moveTo(s.beginX, s.beginY);
					ctx.lineTo(s.endX, s.endY);
					ctx.strokeStyle = stroke.color;
					ctx.lineWidth = stroke.tool === 'eraser' ? 30 : 2;
					ctx.lineCap = 'round';
					ctx.stroke();
				}
			}
		},
		captureAndSaveDrawing: function () {
			var canvas = document.getElementById('gameCanvas');
			if (!canvas) return;
			var image = canvas.toDataURL('image/png');
			socket.emit('save_drawing', {
				drawerName: this.drawerName,
				keyword: this.keyword,
				round: this.round,
				image: image
			});
		},
		downloadDrawing: function (image, name) {
			var link = document.createElement('a');
			link.download = name + '.png';
			link.href = image;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		},
		copyLink: function () {
			var url = location.origin + '/ydig/' + this.roomId;
			var input = document.createElement('input');
			input.value = url;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			this.showToast('链接已复制');
		},
		copyRoomId: function () {
			var input = document.createElement('input');
			input.value = this.roomId;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
			this.showToast('房间号已复制');
		},
		showToast: function (text) {
			var self = this;
			this.toast.show = true;
			this.toast.text = text;
			this.toast.fading = false;
			setTimeout(function () {
				self.toast.fading = true;
				setTimeout(function () {
					self.toast.show = false;
				}, 300);
			}, 2000);
		},
		onMouseDown: function (e) {
			if (!this.isMyTurn || !this.keywordConfirmed) return;
			var canvas = document.getElementById('gameCanvas');
			var rect = canvas.getBoundingClientRect();
			var scaleX = canvas.width / rect.width;
			var scaleY = canvas.height / rect.height;
			var x = (e.clientX - rect.left) * scaleX;
			var y = (e.clientY - rect.top) * scaleY;

			this.isDrawing = true;
			this.currentStroke = {
				color: this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor,
				tool: this.currentTool,
				segments: []
			};
			this.canvasCtx.strokeStyle = this.currentStroke.color;
			this.canvasCtx.lineWidth = this.currentTool === 'eraser' ? 30 : 2;
			this.canvasCtx.lineCap = 'round';
			this.canvasCtx.beginPath();
			this.canvasCtx.moveTo(x, y);
			this.drawPath.beginX = x;
			this.drawPath.beginY = y;
		},
		onMouseMove: function (e) {
			if (!this.isDrawing || !this.isMyTurn || !this.keywordConfirmed) return;
			var canvas = document.getElementById('gameCanvas');
			var rect = canvas.getBoundingClientRect();
			var scaleX = canvas.width / rect.width;
			var scaleY = canvas.height / rect.height;
			var x = (e.clientX - rect.left) * scaleX;
			var y = (e.clientY - rect.top) * scaleY;

			this.canvasCtx.lineTo(x, y);
			this.drawPath.endX = x;
			this.drawPath.endY = y;
			this.currentStroke.segments.push({
				beginX: this.drawPath.beginX,
				beginY: this.drawPath.beginY,
				endX: this.drawPath.endX,
				endY: this.drawPath.endY
			});
			socket.emit('draw', {
				beginX: this.drawPath.beginX,
				beginY: this.drawPath.beginY,
				endX: this.drawPath.endX,
				endY: this.drawPath.endY,
				color: this.currentStroke.color,
				tool: this.currentStroke.tool
			});
			this.canvasCtx.stroke();
			this.drawPath.beginX = x;
			this.drawPath.beginY = y;
		},
		onMouseUp: function () {
			if (this.isDrawing) {
				this.isDrawing = false;
				if (this.currentStroke) {
					this.strokeHistory.push(this.currentStroke);
					this.currentStroke = null;
				}
				socket.emit('stop', 'stop');
			}
		},
		onTouchStart: function (e) {
			if (!this.isMyTurn || !this.keywordConfirmed) return;
			var touch = e.touches[0];
			var canvas = document.getElementById('gameCanvas');
			var rect = canvas.getBoundingClientRect();
			var scaleX = canvas.width / rect.width;
			var scaleY = canvas.height / rect.height;
			var x = (touch.clientX - rect.left) * scaleX;
			var y = (touch.clientY - rect.top) * scaleY;
			this.isDrawing = true;
			this.currentStroke = {
				color: this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor,
				tool: this.currentTool,
				segments: []
			};
			this.canvasCtx.strokeStyle = this.currentStroke.color;
			this.canvasCtx.lineWidth = this.currentTool === 'eraser' ? 30 : 2;
			this.canvasCtx.lineCap = 'round';
			this.canvasCtx.beginPath();
			this.canvasCtx.moveTo(x, y);
			this.drawPath.beginX = x;
			this.drawPath.beginY = y;
		},
		onTouchMove: function (e) {
			if (!this.isDrawing || !this.isMyTurn || !this.keywordConfirmed) return;
			var touch = e.touches[0];
			var canvas = document.getElementById('gameCanvas');
			var rect = canvas.getBoundingClientRect();
			var scaleX = canvas.width / rect.width;
			var scaleY = canvas.height / rect.height;
			var x = (touch.clientX - rect.left) * scaleX;
			var y = (touch.clientY - rect.top) * scaleY;
			this.canvasCtx.lineTo(x, y);
			this.drawPath.endX = x;
			this.drawPath.endY = y;
			this.currentStroke.segments.push({
				beginX: this.drawPath.beginX,
				beginY: this.drawPath.beginY,
				endX: this.drawPath.endX,
				endY: this.drawPath.endY
			});
			socket.emit('draw', {
				beginX: this.drawPath.beginX,
				beginY: this.drawPath.beginY,
				endX: this.drawPath.endX,
				endY: this.drawPath.endY,
				color: this.currentStroke.color,
				tool: this.currentStroke.tool
			});
			this.canvasCtx.stroke();
			this.drawPath.beginX = x;
			this.drawPath.beginY = y;
		},
		onTouchEnd: function (e) {
			this.onMouseUp();
		},
			initCanvasCtx: function () {
			var canvas = document.getElementById('gameCanvas');
			if (!canvas) return;
			this.canvasCtx = canvas.getContext('2d');
		},
		resetGameUI: function () {
			this.keyword = '';
			this.keywordConfirmed = false;
			this.myAnswer = '';
			this.myAnswerResult = null;
			this.roundEnded = false;
			this.roundAnswers = [];
			this.roundKeyword = '';
			this.roundDrawerName = '';
			this.roundAnswerCount = 0;
			this.strokeHistory = [];
			this.currentStroke = null;
			this.currentColor = '#000000';
			this.currentTool = 'pen';
			this.gameOver = false;
			this.gameOverData = null;
			this.wordList = [];
			this.refreshUsed = false;
			this.keywordCategory = '';
			this.keywordChars = 0;
			if (this.timerInterval) clearInterval(this.timerInterval);
			this.timerInterval = null;
			this.remainingTime = 60;
			this.roundStarted = false;
		},
		startTimer: function () {
			var self = this;
			this.remainingTime = 60;
			this.roundStarted = true;
			if (this.timerInterval) clearInterval(this.timerInterval);
			this.timerInterval = setInterval(function () {
				self.remainingTime--;
				if (self.remainingTime <= 0) {
					clearInterval(self.timerInterval);
					self.timerInterval = null;
				}
			}, 1000);
		}
	},
	mounted: function () {
		var self = this;
		this.$nextTick(function () {
			self.initCanvasCtx();
		});

		socket.on('room_created', function (data) {
			self.roomId = data.roomId;
			self.myId = data.player.id;
			self.players = [{ id: data.player.id, name: data.player.name, avatar: data.player.avatar, score: 0 }];
			self.isHost = true;
			self.view = 'lobby';
			history.pushState(null, '', '/ydig/' + data.roomId);
			self.$nextTick(function () {
				self.initCanvasCtx();
				if (self.canvasCtx) self.canvasCtx.clearRect(0, 0, 520, 350);
			});
		});

		socket.on('room_joined', function (data) {
			self.roomId = data.roomId;
			self.myId = data.player.id;
			self.players = data.players;
			self.maxRounds = data.maxRounds || 3;
			self.isHost = false;
			self.view = 'lobby';
			history.pushState(null, '', '/ydig/' + data.roomId);
			self.$nextTick(function () { self.initCanvasCtx(); });
		});

		socket.on('player_joined', function (data) {
			self.players = data.players;
		});

		socket.on('player_left', function (data) {
			self.players = data.players;
		});

		socket.on('join_error', function (data) {
			self.showToast(data.message || '加入失败');
		});

		socket.on('game_error', function (data) {
			self.showToast(data.message || '无法开始');
		});

		socket.on('round_start', function (data) {
			self.resetGameUI();
			self.view = 'game';
			self.round = data.round;
			self.drawerId = data.drawerId;
			self.drawerName = data.drawerName;
			self.players = data.players;
			self.isMyTurn = (data.drawerId === self.myId);
			if (!self.isMyTurn) {
				self.roundStarted = true;
			}
			self.$nextTick(function () {
				self.initCanvasCtx();
				if (self.canvasCtx) self.canvasCtx.clearRect(0, 0, 520, 350);
			});
		});

		socket.on('word_options', function (data) {
			self.wordList = data.words;
		});

		socket.on('keyword_set', function (data) {
			self.roundStarted = true;
			self.keywordCategory = data.category || '';
			self.keywordChars = data.chars || data.keywordLength;
			self.startTimer();
		});

		socket.on('paint', function (data) {
			if (!self.canvasCtx) self.initCanvasCtx();
			if (!self.canvasCtx) return;
			if (data === 'stop') {
				if (self.currentStroke && self.currentStroke.segments.length > 0) {
					self.strokeHistory.push(self.currentStroke);
				}
				self.currentStroke = null;
				return;
			}
			if (!self.currentStroke) {
				self.currentStroke = {
					color: data.color || '#000000',
					tool: data.tool || 'pen',
					segments: []
				};
			}
			self.currentStroke.segments.push({
				beginX: data.beginX,
				beginY: data.beginY,
				endX: data.endX,
				endY: data.endY
			});
			self.canvasCtx.beginPath();
			self.canvasCtx.moveTo(data.beginX, data.beginY);
			self.canvasCtx.lineTo(data.endX, data.endY);
			self.canvasCtx.strokeStyle = data.color || '#000000';
			self.canvasCtx.lineWidth = (data.tool === 'eraser') ? 30 : 2;
			self.canvasCtx.lineCap = 'round';
			self.canvasCtx.stroke();
		});

		socket.on('clear_canvas', function () {
			if (self.canvasCtx) {
				self.canvasCtx.clearRect(0, 0, 520, 350);
			}
		});

		socket.on('undo_draw', function () {
			if (self.strokeHistory.length === 0) return;
			self.strokeHistory.pop();
			self.redrawAllStrokes();
		});

		socket.on('answer_result', function (data) {
			if (data.playerId === self.myId) {
				self.myAnswerResult = { correct: data.correct };
			}
		});

		socket.on('round_end', function (data) {
			if (self.timerInterval) clearInterval(self.timerInterval);
			self.timerInterval = null;
			if (self.isMyTurn) { self.captureAndSaveDrawing(); }
			self.roundStarted = false;
			self.roundEnded = true;
			self.roundKeyword = data.keyword;
			self.roundDrawerName = data.drawerName;
			self.roundAnswerCount = data.answeredPlayers.length;
			self.roundAnswers = data.answeredPlayers;
			self.players = data.players;
			self.myAnswerResult = null;
		});

		socket.on('game_over', function (data) {
			if (self.timerInterval) clearInterval(self.timerInterval);
			self.timerInterval = null;
			self.roundStarted = false;
			self.roundEnded = false;
			self.roundKeyword = '';
			self.roundDrawerName = '';
			self.roundAnswers = [];
			self.players = data.players;
			self.myAnswerResult = null;
			self.gameOver = true;
			self.gameOverData = data;
			self.drawings = data.drawings || [];
			self.view = 'result';
		});
	}
});

var path = location.pathname;
if (path !== '/' && path.indexOf('.') === -1 && path.length > 1) {
	var roomFromUrl = path.replace(/^\/ydig\//, '').replace(/^\//, '');
	app.joinRoomId = roomFromUrl;
}