// JumpJump Three.js 场景/相机/光照封装
var JumpJumpRenderer = (function () {
	var scene, camera, renderer, container;
	var dirLight;
	var ground;

	function init(containerId) {
		container = document.getElementById(containerId);
		if (!container) {
			console.error('JumpJumpRenderer: container not found: ' + containerId);
			return null;
		}

		scene = new THREE.Scene();
		scene.background = new THREE.Color(JUMPJUMP_CONFIG.COLOR_BG);
		scene.fog = new THREE.Fog(JUMPJUMP_CONFIG.COLOR_BG, 18, 45);

		var w = container.clientWidth || window.innerWidth;
		var h = container.clientHeight || window.innerHeight;
		camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
		camera.position.set(
			JUMPJUMP_CONFIG.CAMERA_OFFSET.x,
			JUMPJUMP_CONFIG.CAMERA_OFFSET.y,
			JUMPJUMP_CONFIG.CAMERA_OFFSET.z
		);
		camera.lookAt(0, 0, 0);

		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(w, h);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		container.appendChild(renderer.domElement);

		// 光照
		var ambient = new THREE.AmbientLight(0xffffff, 0.55);
		scene.add(ambient);

		dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
		dirLight.position.set(10, 20, 10);
		dirLight.castShadow = true;
		dirLight.shadow.mapSize.width = 1024;
		dirLight.shadow.mapSize.height = 1024;
		dirLight.shadow.camera.near = 0.5;
		dirLight.shadow.camera.far = 50;
		dirLight.shadow.camera.left = -15;
		dirLight.shadow.camera.right = 15;
		dirLight.shadow.camera.top = 15;
		dirLight.shadow.camera.bottom = -15;
		dirLight.shadow.bias = -0.0005;
		scene.add(dirLight);

		// 半球光补充环境感
		var hemi = new THREE.HemisphereLight(0xffffff, 0x444466, 0.3);
		scene.add(hemi);

		// 地面
		var groundGeo = new THREE.PlaneGeometry(60, 60);
		var groundMat = new THREE.MeshStandardMaterial({ color: JUMPJUMP_CONFIG.COLOR_GROUND });
		ground = new THREE.Mesh(groundGeo, groundMat);
		ground.rotation.x = -Math.PI / 2;
		ground.position.y = 0;
		ground.receiveShadow = true;
		scene.add(ground);

		window.addEventListener('resize', onResize);

		return {
			scene: scene,
			camera: camera,
			renderer: renderer,
			domElement: renderer.domElement,
			addToScene: addToScene,
			removeFromScene: removeFromScene,
			render: render,
			updateCamera: updateCamera,
			resize: onResize
		};
	}

	function addToScene(obj) {
		scene.add(obj);
	}

	function removeFromScene(obj) {
		scene.remove(obj);
	}

	function render() {
		renderer.render(scene, camera);
	}

	function updateCamera(targetPos, lookAtPos) {
		var desired = new THREE.Vector3(
			targetPos.x + JUMPJUMP_CONFIG.CAMERA_OFFSET.x,
			targetPos.y + JUMPJUMP_CONFIG.CAMERA_OFFSET.y,
			targetPos.z + JUMPJUMP_CONFIG.CAMERA_OFFSET.z
		);
		camera.position.lerp(desired, JUMPJUMP_CONFIG.CAMERA_LERP);
		camera.lookAt(lookAtPos);

		// 地面跟随玩家移动，形成"无限地面"效果，避免跑到世界边缘看到虚空背景
		if (ground) {
			var groundSize = 60;
			var snap = function (v) { return Math.floor(v / groundSize + 0.5) * groundSize; };
			ground.position.x = snap(targetPos.x);
			ground.position.z = snap(targetPos.z);
		}
	}

	function onResize() {
		if (!container || !camera || !renderer) return;
		var w = container.clientWidth || window.innerWidth;
		var h = container.clientHeight || window.innerHeight;
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		renderer.setSize(w, h);
	}

	return { init: init };
})();
