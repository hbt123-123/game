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
		modalType: 'not_found',   // 'not_found' | 'mobile_not_installed' | 'ios' | 'mac'
		errorMessage: '',
		gamePath: '',
		clientPlatform: '',
		_intentTimer: null
	},
	computed: {
		modalTitle: function() {
			switch (this.modalType) {
				case 'mobile_not_installed': return '未检测到原神';
				case 'ios': return '原神';
				case 'mac': return 'Mac 暂不支持直接运行';
				default: return '未检测到原神';
			}
		},
		modalMessage: function() {
			switch (this.modalType) {
				case 'mobile_not_installed': return '未能启动原神，可能尚未安装。请选择以下方式：';
				case 'ios': return 'iOS 暂不支持直接启动原神。您可以通过以下方式体验：';
				case 'mac': return 'Mac 系统暂不支持直接运行原神客户端。您可以通过以下方式体验：';
				default: return '请选择以下方式开始游戏';
			}
		},
		showDownloadBtn: function() {
			// "未安装"和"移动端未安装"时显示下载按钮
			return this.modalType === 'not_found' || this.modalType === 'mobile_not_installed';
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
			return this.modalType === 'mobile_not_installed' ? '下载手游' : '下载游戏';
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

			// Windows：走注册表扫描流程
			self.state = 'scanning';
			self.showModal = false;
			self.errorMessage = '';
			socket.emit('scan_game', { platform: self.clientPlatform });
		},
		launchGame: function() {
			var self = this;
			socket.emit('launch_game', { path: self.gamePath });
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

		socket.on('scan_result', function(data) {
			if (data.found) {
				self.gamePath = data.path;
				// 找到游戏，自动启动
				self.launchGame();
			} else {
				self.state = 'idle';
				self.modalType = 'not_found';
				self.showModal = true;
			}
		});

		socket.on('launch_result', function(data) {
			if (data.success) {
				self.state = 'success';
			} else {
				self.state = 'error';
				self.errorMessage = '启动失败: ' + (data.error || '未知错误');
			}
		});
	}
});
