import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('ship-canvas');
if (canvas) {
  const TARGET_SIZE = 2.0;
  // Applied to the camera fit distance: >1 keeps a gap around the model so its
  // corners are never clipped by the square canvas while it rotates.
  const FIT_MARGIN = 1.18;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
  camera.position.set(0, 0, 5);

  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(3, 5, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x88aaff, 0.8);
  rimLight.position.set(-4, -2, -3);
  scene.add(rimLight);

  // pivot: fixed anchor the camera frames.
  // tilt: cursor-driven orientation (bank/pitch) applied in world space.
  // spin: the saucer's own continuous spin, nested under tilt so the two don't
  // fight each other.
  const pivot = new THREE.Group();
  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  tilt.add(spin);
  pivot.add(tilt);
  scene.add(pivot);

  let model = null;
  let fitRadius = 1;

  function fitCamera() {
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = Math.max(fitRadius / Math.sin(vFov / 2), fitRadius / Math.sin(hFov / 2)) * FIT_MARGIN;
    camera.position.set(0, 0, dist);
    camera.near = Math.max(0.01, dist * 0.05);
    camera.far = dist + fitRadius * 4;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  // 3D model: "Mothership (Team Fortress 2)" by Elite Big Speakerman, CC-BY-4.0
  new GLTFLoader().load(
    'assets/3d_4/scene.gltf',
    (gltf) => {
      model = gltf.scene;
      spin.add(model);

      let box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      model.scale.setScalar(TARGET_SIZE / maxDim);

      // recenter with the final scale applied
      model.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      // rotation-invariant radius (half the bounding-box diagonal)
      box = new THREE.Box3().setFromObject(model);
      fitRadius = box.getSize(new THREE.Vector3()).multiplyScalar(0.5).length();

      tilt.rotation.x = -0.12;
      fitCamera();
      canvas.classList.add('is-ready');
    },
    undefined,
    (err) => console.warn('Ship model failed to load:', err)
  );

  function resize() {
    const w = canvas.clientWidth || 128;
    const h = canvas.clientHeight || 128;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    fitCamera();
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  resize();

  // ---- motion: the saucer keeps spinning on its own axis (realistic UFO), while
  // its overall orientation leans toward wherever the cursor is on screen
  // (left half -> lean left, top half -> lean back). The two live on separate
  // groups so the constant spin and the cursor-driven tilt don't cancel out.
  let pointerNX = 0; // -1 = left edge, 0 = centre, 1 = right edge
  let pointerNY = 0; // -1 = top edge, 0 = centre, 1 = bottom edge
  let baseYaw = 0;
  const SPIN_SPEED = 0.8; // rad/s, the saucer's own continuous spin
  const MAX_ROLL = 0.5;   // how far it leans left/right
  const MAX_PITCH = 0.4;  // how far it leans up/down

  function clamp(v, m) { return Math.max(-m, Math.min(m, v)); }

  window.addEventListener('pointermove', (e) => {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    pointerNX = (e.clientX / w - 0.5) * 2;
    pointerNY = (e.clientY / h - 0.5) * 2;
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (model) {
      // keep the saucer spinning
      baseYaw += SPIN_SPEED * dt;
      spin.rotation.y = baseYaw;

      const k = Math.min(1, 8 * dt);

      // lean toward the cursor: right edge dips when the cursor is on the right
      const targetRoll = -clamp(pointerNX, 1) * MAX_ROLL;
      // lean back when the cursor is high, forward when it's low
      const targetPitch = -0.12 + clamp(pointerNY, 1) * MAX_PITCH;

      tilt.rotation.z += (targetRoll - tilt.rotation.z) * k;
      tilt.rotation.x += (targetPitch - tilt.rotation.x) * k;
    }
    renderer.render(scene, camera);
  }
  animate();
}
