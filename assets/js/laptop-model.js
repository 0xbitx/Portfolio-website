import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSpin } from './dragInertia.js';
import { attachDepth } from './depth.js';

const canvas = document.getElementById('laptop-canvas');
if (canvas) {
  const TARGET_SIZE = 2.2;
  // Applied to the camera fit distance: >1 leaves a safe gap around the model so
  // its corners never get clipped by the square canvas as it rotates. Keep this
  // above 1 (<1 zooms in past the frame and produces an "invisible box" cut).
  const FIT_MARGIN = 1.12;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
  camera.position.set(0, 0, 5);
  attachDepth(camera, 'laptop-canvas');

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(3, 5, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x99bbff, 0.7);
  rimLight.position.set(-4, -2, -3);
  scene.add(rimLight);

  // pivot: fixed anchor the camera frames. spin: rotates the model about its
  // own centre (tilt + drag/auto spin).
  const pivot = new THREE.Group();
  const spin = new THREE.Group();
  pivot.add(spin);
  scene.add(pivot);

  let model = null;
  let fitRadius = 1;

  // Frame the camera so the whole model fits with margin, honouring the canvas
  // aspect ratio. Uses a rotation-invariant radius so the fit never changes as
  // the model spins.
  function fitCamera() {
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const dist = Math.max(fitRadius / Math.sin(vFov / 2), fitRadius / Math.sin(hFov / 2)) * FIT_MARGIN;
    camera.position.set(0, fitRadius * 0.2, dist);
    camera.near = Math.max(0.01, dist * 0.05);
    camera.far = dist + fitRadius * 4;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  new GLTFLoader().load(
    'assets/3d_1/scene.gltf',
    (gltf) => {
      model = gltf.scene;
      spin.add(model);

      // spin is identity here, so world space == local space
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

      spin.rotation.x = -0.18;
      fitCamera();
      canvas.classList.add('is-ready');
    },
    undefined,
    (err) => console.warn('Laptop model failed to load:', err)
  );

  function resize() {
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    fitCamera();
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  resize();

  let dragging = false;
  const fling = createSpin({ damping: 0.05 });
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    fling.begin(e.clientX, e.clientY);
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !model) return;
    // spin the laptop under the cursor (fling momentum on release)
    fling.move(spin, e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (model) {
      // fling momentum after a drag, then the full 360 tumble on all three
      // axes, anchored in place (kept running even while the user drags)
      fling.update(spin, dt, dragging);
      spin.rotation.y += 0.35 * dt;
      spin.rotation.x += 0.16 * dt;
      spin.rotation.z += 0.09 * dt;
    }
    renderer.render(scene, camera);
  }
  animate();
}
