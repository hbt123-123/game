// JumpJump 输入处理：鼠标 + 触屏
// 监听 renderer.domElement 上的 mousedown/mouseup/touchstart/touchend
var JumpJumpInput = (function () {
	function init(domElement, callbacks) {
		var chargeStartTime = 0;
		var isCharging = false;

		function onStart(e) {
			// 防止鼠标右键/中键触发
			if (e.button !== undefined && e.button !== 0) return;
			e.preventDefault();
			if (isCharging) return;
			isCharging = true;
			chargeStartTime = performance.now();
			if (callbacks && callbacks.onChargeStart) callbacks.onChargeStart();
		}

		function onEnd(e) {
			if (e.button !== undefined && e.button !== 0) return;
			e.preventDefault();
			if (!isCharging) return;
			isCharging = false;
			var elapse = (performance.now() - chargeStartTime) / 1000;
			if (callbacks && callbacks.onChargeEnd) callbacks.onChargeEnd(elapse);
		}

		// 鼠标离开窗口时也结束蓄力，防止卡住
		function onLeave() {
			if (!isCharging) return;
			isCharging = false;
			var elapse = (performance.now() - chargeStartTime) / 1000;
			if (callbacks && callbacks.onChargeEnd) callbacks.onChargeEnd(elapse);
		}

		domElement.addEventListener('mousedown', onStart);
		window.addEventListener('mouseup', onEnd);
		domElement.addEventListener('touchstart', onStart, { passive: false });
		window.addEventListener('touchend', onEnd, { passive: false });
		window.addEventListener('blur', onLeave);

		return {
			destroy: function () {
				domElement.removeEventListener('mousedown', onStart);
				window.removeEventListener('mouseup', onEnd);
				domElement.removeEventListener('touchstart', onStart);
				window.removeEventListener('touchend', onEnd);
				window.removeEventListener('blur', onLeave);
			}
		};
	}

	return { init: init };
})();
