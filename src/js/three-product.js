import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export function createProductScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
  const spherical = new THREE.Spherical();
  const look = new THREE.Vector3();
  const ndc = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const back = new THREE.Vector3();
  const pan = new THREE.Vector3();
  const sizeVec = new THREE.Vector3();
  const box = new THREE.Box3();
  const corners = Array.from({ length: 8 }, () => new THREE.Vector3());

  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x2c2824, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(2.4, 4.2, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe4cc, 1.05);
  rim.position.set(-3.6, 1.4, -2.8);
  scene.add(rim);
  const fill = new THREE.PointLight(0xe23c1f, 0.2, 20);
  fill.position.set(-1.8, 0.2, 2.8);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);

  let progress = 0;
  let ready = false;
  let lastW = 0;
  let lastH = 0;

  // Screen placement: x/y are NDC targets, fill is fraction of viewport height.
  const poses = [
    { theta: 0.58, phi: 1.2, fill: 0.34, x: 0, y: -0.08 },
    { theta: 0.16, phi: 1.22, fill: 0.46, x: 0, y: 0.02 },
    { theta: 0.95, phi: 1.16, fill: 0.28, x: 0, y: -0.12 },
    { theta: 1.62, phi: 1.24, fill: 0.4, x: -0.32, y: 0.02 },
    { theta: 0.52, phi: 1.12, fill: 0.36, x: 0, y: -0.22 },
  ];

  function lerpPose(t) {
    const scaled = t * (poses.length - 1);
    const i = Math.min(poses.length - 2, Math.floor(scaled));
    const f = scaled - i;
    const a = poses[i];
    const b = poses[i + 1];
    return {
      theta: THREE.MathUtils.lerp(a.theta, b.theta, f),
      phi: THREE.MathUtils.lerp(a.phi, b.phi, f),
      fill: THREE.MathUtils.lerp(a.fill, b.fill, f),
      x: THREE.MathUtils.lerp(a.x, b.x, f),
      y: THREE.MathUtils.lerp(a.y, b.y, f),
    };
  }

  function centerObject(object) {
    object.updateWorldMatrix(true, true);
    const local = new THREE.Box3().setFromObject(object);
    if (local.isEmpty()) return local;
    object.position.sub(local.getCenter(new THREE.Vector3()));
    object.updateWorldMatrix(true, true);
    return new THREE.Box3().setFromObject(object);
  }

  function projectBounds() {
    root.updateWorldMatrix(true, true);
    box.setFromObject(root);
    const { min, max } = box;
    corners[0].set(min.x, min.y, min.z);
    corners[1].set(min.x, min.y, max.z);
    corners[2].set(min.x, max.y, min.z);
    corners[3].set(min.x, max.y, max.z);
    corners[4].set(max.x, min.y, min.z);
    corners[5].set(max.x, min.y, max.z);
    corners[6].set(max.x, max.y, min.z);
    corners[7].set(max.x, max.y, max.z);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const point of corners) {
      ndc.copy(point).project(camera);
      minX = Math.min(minX, ndc.x);
      maxX = Math.max(maxX, ndc.x);
      minY = Math.min(minY, ndc.y);
      maxY = Math.max(maxY, ndc.y);
    }
    return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
  }

  function applyCamera() {
    if (!ready) return;
    const pose = lerpPose(progress);
    const aspect = Math.max(camera.aspect, 0.5);

    box.setFromObject(root);
    box.getSize(sizeVec);

    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const distH = sizeVec.y / (pose.fill * 2 * Math.tan(vFov / 2));
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const distW = Math.max(sizeVec.x, sizeVec.z) / (0.62 * 2 * Math.tan(hFov / 2));
    spherical.set(Math.max(distH, distW), pose.phi, pose.theta);
    camera.position.setFromSpherical(spherical);
    look.set(0, 0, 0);
    camera.lookAt(look);
    camera.updateMatrixWorld();

    const bounds = projectBounds();
    const dist = camera.position.distanceTo(look);
    const visibleH = 2 * Math.tan(vFov / 2) * dist;
    const visibleW = visibleH * aspect;
    camera.matrixWorld.extractBasis(right, up, back);
    pan.copy(right).multiplyScalar((bounds.cx - pose.x) * visibleW * 0.5);
    pan.addScaledVector(up, (bounds.cy - pose.y) * visibleH * 0.5);
    camera.position.add(pan);
    look.add(pan);
    camera.lookAt(look);
    camera.updateMatrixWorld();

    const fitted = projectBounds();
    const padX = 0.86;
    const padTop = 0.78;
    const padBot = -0.78;
    const extra = Math.max(
      fitted.maxX > padX ? fitted.maxX / padX : 1,
      fitted.minX < -padX ? -fitted.minX / padX : 1,
      fitted.maxY > padTop ? fitted.maxY / padTop : 1,
      fitted.minY < padBot ? fitted.minY / padBot : 1
    );
    if (extra > 1.01) {
      camera.position.addScaledVector(back, camera.position.distanceTo(look) * (extra - 1));
      camera.lookAt(look);
    }
  }

  const loadPromise = new Promise((resolve, reject) => {
    new GLTFLoader().load(
      "/3d/cleanser.glb",
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (!child.isMesh) return;
          child.material = new THREE.MeshStandardMaterial({
            color: 0x7a6854,
            metalness: 0.08,
            roughness: 0.38,
            envMapIntensity: 1,
            side: THREE.DoubleSide,
          });
        });

        let local = centerObject(model);
        let size = local.getSize(new THREE.Vector3());
        if (size.y < size.x * 0.88 && size.x >= size.z) model.rotation.z = Math.PI / 2;
        else if (size.y < size.z * 0.88 && size.z > size.x) model.rotation.x = -Math.PI / 2;
        local = centerObject(model);
        size = local.getSize(new THREE.Vector3());
        model.scale.setScalar(1.5 / (Math.max(size.x, size.y, size.z) || 1));
        root.add(model);
        centerObject(root);

        ready = true;
        lastW = 0;
        resize();
        document.querySelector(".product-fallback")?.classList.add("is-hidden");
        resolve(model);
      },
      undefined,
      reject
    );
  });

  function resize() {
    const parent = canvas.parentElement;
    const w = Math.round(parent?.clientWidth || window.innerWidth);
    const h = Math.round(parent?.clientHeight || window.innerHeight);
    if (!w || !h) return;
    if (w === lastW && h === lastH) {
      applyCamera();
      return;
    }
    lastW = w;
    lastH = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyCamera();
  }

  let running = true;
  const tick = () => {
    if (!running) return;
    requestAnimationFrame(tick);
    renderer.render(scene, camera);
  };

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(resize);
  tick();

  return {
    loadPromise,
    setScrollProgress(value) {
      progress = THREE.MathUtils.clamp(value, 0, 1);
      applyCamera();
    },
    destroy() {
      running = false;
      window.removeEventListener("resize", resize);
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
