var socket = io({ path: '/genshin/socket.io' });

/**
 * 通过 User-Agent 检测客户端平台
 */
function detectPlatform() {
	var ua = navigator.userAgent || '';
	if (/android/i.test(ua)) return 'android';
	if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
	if (/win/i.test(ua)) return 'windows';
	if (/mac/i.test(ua)) return 'mac';
	if (/linux/i.test(ua)) return 'linux';
	return 'other';
}

/**
 * 判断当前访问是否为本地开发环境
 * 本地开发：服务端 = 访客机，注册表扫描/启动 exe 才有意义
 * 生产环境：服务端是远程服务器，无法检测访客电脑，必须走引导流程
 */
function isLocalDevHost() {
	var host = window.location.hostname;
	return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '';
}

/**
 * 原神自定义协议（用于浏览器唤起本机原神）
 * 注：该协议未由官方公开文档化，不同版本/启动器可能不响应，
 * 失败时由用户在模态框中选择"下载 PC 客户端"等其他方式。
 */
var GENSHIN_PROTOCOL_URL = 'genshinimpact://launch';

/**
 * 判断是否为移动端
 */
function isMobile(platform) {
	return platform === 'android' || platform === 'ios';
}

/**
 * Android 包名配置
 */
var GENSHIN_PACKAGES = {
	cn: 'com.miHoYo.GenshinImpact',
	global: 'com.miHoYo.GenshinImpact'
};

/**
 * 构建 Android Intent URI，用于深度链接唤醒原神
 */
function buildIntentUrl(packageName) {
	return 'intent://' + packageName
		+ '/#Intent;scheme=genshin;package=' + packageName
		+ ';S.browser_fallback_url=' + encodeURIComponent('https://ys.mihoyo.com/cloud/?utm_source=yuanshen_web#/')
		+ ';end';
}

/**
 * 尝试通过 Intent URI 唤醒 Android 上的原神
 * 如果唤醒失败（未安装），2.5 秒后弹出备选方案
 */
function tryOpenAndroidApp() {
	var intentUrl = buildIntentUrl(GENSHIN_PACKAGES.cn);

	// 记录跳转前时间，用于 visibility 检测
	var launchTime = Date.now();
	window.location.href = intentUrl;

	// 2.5 秒后检查是否还在当前页面
	setTimeout(function() {
		// 如果页面没有被隐藏，说明跳转未成功（未安装原神）
		if (!document.hidden && Date.now() - launchTime < 3500) {
			app.showModal = true;
			app.modalType = 'mobile_not_installed';
		}
	}, 2500);
}

/**
 * iOS 没有通用的深度链接方案，直接展示云游戏 / App Store 选项
 */
function showIOSOptions() {
	app.showModal = true;
	app.modalType = 'ios';
}

var app = new Vue({
	el: '#app',
	data: {
		state: 'idle',            // 'idle' | 'scanning' | 'success' | 'error'
		showModal: false,
		modalType: 'not_found',   // 'not_found' | 'mobile_not_installed' | 'ios' | 'mac' | 'choose_launcher'
		errorMessage: '',
		gamePath: '',
		clientPlatform: '',
		serverLocalDev: true,     // 服务端是否为本地开发模式（收到 env_info 后更新）
		protocolLaunching: false, // 协议唤起中
		protocolHint: '',         // 协议唤起后的提示文案
		_intentTimer: null
	},
	computed: {
		modalTitle: function() {
			switch (this.modalType) {
				case 'mobile_not_installed': return '未检测到原神';
				case 'ios': return '原神';
				case 'mac': return 'Mac 暂不支持直接运行';
				case 'choose_launcher': return '请选择启动方式';
				default: return '未检测到原神';
			}
		},
		modalMessage: function() {
			switch (this.modalType) {
				case 'mobile_not_installed': return '未能启动原神，可能尚未安装。请选择以下方式：';
				case 'ios': return 'iOS 暂不支持直接启动原神。您可以通过以下方式体验：';
				case 'mac': return 'Mac 系统暂不支持直接运行原神客户端。您可以通过以下方式体验：';
				case 'choose_launcher': return '网页无法直接检测本机原神，请选择以下方式启动：';
				default: return '请选择以下方式开始游戏';
			}
		},
		showDownloadBtn: function() {
			// 未安装 / 移动端未安装 / 选择启动方式 时显示下载按钮
			return this.modalType === 'not_found'
				|| this.modalType === 'mobile_not_installed'
				|| this.modalType === 'choose_launcher';
		},
		showProtocolBtn: function() {
			// 仅 PC 引导模式显示「一键启动」按钮
			return this.modalType === 'choose_launcher';
		},
		showHoyoplayBtn: function() {
			// 仅 PC 引导模式显示「HoYoPlay」按钮
			return this.modalType === 'choose_launcher';
		},
		downloadUrl: function() {
			// 移动端跳转移动端下载页
			if (this.modalType === 'mobile_not_installed') {
				return 'https://ys-api.mihoyo.com/event/download_porter/link/ys_cn/official/android';
			}
			// 桌面端跳转 PC 下载页
			return 'https://ys-api.mihoyo.com/event/download_porter/link/ys_cn/official/pc_backup319';
		},
		downloadLabel: function() {
			if (this.modalType === 'mobile_not_installed') return '下载手游';
			if (this.modalType === 'choose_launcher') return '下载 PC 客户端';
			return '下载游戏';
		}
	},
	methods: {
		scanGame: function() {
			var self = this;

			// Android 手机：尝试深度链接唤醒原神
			if (self.clientPlatform === 'android') {
				self.state = 'scanning';
				tryOpenAndroidApp();
				return;
			}

			// iOS：直接展示选项
			if (self.clientPlatform === 'ios') {
				showIOSOptions();
				return;
			}

			// Mac / Linux / 其他桌面端：展示引导
			if (self.clientPlatform !== 'windows') {
				self.modalType = self.clientPlatform === 'mac' ? 'mac' : 'not_found';
				self.showModal = true;
				return;
			}

			// Windows + 生产环境：直接显示启动方式选择
			// 浏览器无法读取访客电脑注册表，跳过服务端扫描
			if (!self.serverLocalDev || !isLocalDevHost()) {
				self.modalType = 'choose_launcher';
				self.showModal = true;
				self.protocolHint = '';
				return;
			}

			// Windows + 本地开发：走服务端注册表扫描流程
			self.state = 'scanning';
			self.showModal = false;
			self.errorMessage = '';
			socket.emit('scan_game', { platform: self.clientPlatform });
		},
		launchGame: function() {
			var self = this;
			socket.emit('launch_game', { path: self.gamePath });
		},
		/**
		 * 通过自定义协议尝试唤起本机原神
		 * 浏览器无法预知协议是否注册，失败时由用户选择其他方式
		 */
		tryLaunchViaProtocol: function() {
			var self = this;
			if (self.protocolLaunching) return;

			self.protocolLaunching = true;
			self.protocolHint = '正在尝试唤起本机原神...';

			// 用隐藏 iframe 触发协议，避免页面跳转/卸载
			var iframe = document.createElement('iframe');
			iframe.style.width = '1px';
			iframe.style.height = '1px';
			iframe.style.border = '0';
			iframe.style.position = 'absolute';
			iframe.style.left = '-9999px';
			iframe.style.top = '0';
			iframe.src = GENSHIN_PROTOCOL_URL;
			document.body.appendChild(iframe);

			// 2.5 秒后清理 iframe 并给出提示
			setTimeout(function() {
				if (iframe.parentNode) {
					document.body.removeChild(iframe);
				}
				self.protocolLaunching = false;
				self.protocolHint = '若未自动启动，请点击下方「下载 PC 客户端」或「云游戏」';
			}, 2500);
		}
	},
	mounted: function() {
		var self = this;

		// 页面加载时检测客户端平台
		self.clientPlatform = detectPlatform();

		// 用户从原神切回浏览器时，重置为空闲状态
		document.addEventListener('visibilitychange', function() {
			if (!document.hidden && self.state === 'scanning' && self.clientPlatform === 'android') {
				// 从原神切回来，重置
				self.state = 'idle';
			}
		});

		// 接收服务端环境信息：判断是否为本地开发模式
		// 双重判定：服务端 platform=win32 + 客户端 host=localhost 才走扫描流程
		socket.on('env_info', function(data) {
			self.serverLocalDev = !!(data && data.localDev);
		});

		socket.on('scan_result', function(data) {
			if (data.found) {
				self.gamePath = data.path;
				// 找到游戏，自动启动
				self.launchGame();
			} else if (data.reason === 'disabled_in_production') {
				// 服务端禁用（生产环境兜底）：走引导流程
				self.state = 'idle';
				self.modalType = 'choose_launcher';
				self.showModal = true;
			} else {
				self.state = 'idle';
				self.modalType = 'not_found';
				self.showModal = true;
			}
		});

		socket.on('launch_result', function(data) {
			if (data.success) {
				self.state = 'success';
			} else if (data.error === 'disabled_in_production') {
				// 服务端禁用启动：回到引导流程
				self.state = 'idle';
				self.modalType = 'choose_launcher';
				self.showModal = true;
			} else {
				self.state = 'error';
				self.errorMessage = '启动失败: ' + (data.error || '未知错误');
			}
		});
	}
});
