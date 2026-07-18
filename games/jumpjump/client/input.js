// JumpJump 输入处理：鼠标 + 触屏
// 监听 renderer.domElement 上的 mousedown/mouseup/touchstart/touchend
var JumpJumpInput = (function () {
	function init(domElement, callbacks) {
		var chargeStartTime = 0;
		var isCharging = false;

		function onStart(e) {
			// 防止鼠标右键/中键触发
			if (e.button !== undefined && e.button !== 0) return;
			// 仅响应 canvas 上的触摸，避免拦截面板上 input/button 的事件
			if (e.target !== domElement) return;
			e.preventDefault();
			if (isCharging) return;
			isCharging = true;
			chargeStartTime = performance.now();
			if (callbacks && callbacks.onChargeStart) callbacks.onChargeStart();
		}

		function onEnd(e) {
			if (e.button !== undefined && e.button !== 0) return;
			// 关键：未蓄力时直接放行，不调用 preventDefault，
			// 否则 window 上的 touchend 会吞掉 click，导致 input 无法聚焦、按钮点不动
			if (!isCharging) return;
			e.preventDefault();
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
