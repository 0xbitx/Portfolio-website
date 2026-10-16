import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSpin } from './dragInertia.js';
import { attachDepth, beginModelDrag, endModelDrag } from './depth.js';

const canvas = document.getElementById('gltf-canvas');
if (canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 5);
  attachDepth(camera, 'gltf-canvas');

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(3, 5, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x88aaff, 0.6);
  rimLight.position.set(-4, -2, -3);
  scene.add(rimLight);

  const pivot = new THREE.Group();
  pivot.rotation.x = -0.25;
  scene.add(pivot);

  // Free-floating drift: constant velocity that bounces off the edges of the
  // visible frustum, plus a slow depth drift so the object feels like it is
  // tumbling through space.
  const drift = new THREE.Vector3(
    (Math.random() < 0.5 ? -1 : 1) * (0.09 + Math.random() * 0.11),
    (Math.random() < 0.5 ? -1 : 1) * (0.07 + Math.random() * 0.09),
    (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.04)
  );
  // `drift` is the target velocity; `vel` eases toward it so the turnaround at
  // each edge is a smooth curve instead of an abrupt snap.
  const vel = drift.clone();
  const DEPTH_MIN = -1.6;
  const DEPTH_MAX = 1.6;

  // Half-size of the model in pivot space (filled in once it loads). Bouncing
  // subtracts this so the model stops at the visible edge, not an invisible
  // margin inside the viewport.
  const halfModel = new THREE.Vector3(0.5, 0.5, 0.5);

  function bounds() {
    const dist = Math.max(0.5, camera.position.z - pivot.position.z);
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    const halfW = halfH * camera.aspect;
    // Only a fraction of the model's half-size is held inside the border, so the
    // drive can roam much closer to the viewport edges (freer drift), matching
    // the astronaut/ISS.
    const keep = 0.2;
    const edge = 0.0;
    return {
      x: Math.max(0.02, halfW - (halfModel.x * keep + edge)),
      y: Math.max(0.02, halfH - (halfModel.y * keep + edge)),
    };
  }

  let model = null;
  new GLTFLoader().load(
    'assets/3d/scene.gltf',
    (gltf) => {
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const sizeVec = box.getSize(new THREE.Vector3());
      const fit = 1.2 / (sizeVec.length() || 1);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.scale.setScalar(fit);
      halfModel.copy(sizeVec).multiplyScalar(0.5 * fit);
      pivot.add(model);
      canvas.classList.add('is-ready');
    },
    undefined,
    (err) => console.warn('3D model failed to load:', err)
  );

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovering = false;
  let dragging = false;
  const fling = createSpin({ damping: 0.05 });

  // Interaction is handled on window (not the canvas) so it keeps working even
  // though the canvas now renders behind the page content. The raycast decides
  // whether the cursor is actually over the model.
  window.addEventListener('pointermove', (e) => {
    if (!model) return;

    if (dragging) {
      // spin the model under the cursor (fling momentum on release)
      fling.move(model, e.clientX, e.clientY);
      return;
    }

    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const over = raycaster.intersectObject(model, true).length > 0;
    if (over !== hovering) {
      hovering = over;
      document.body.style.cursor = over ? 'grab' : '';
    }
  });

  window.addEventListener('pointerdown', (e) => {
    if (!hovering || !model) return;
    dragging = true;
    beginModelDrag();
    fling.begin(e.clientX, e.clientY);
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    endModelDrag();
    document.body.style.cursor = hovering ? 'grab' : '';
  });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (model) {
      // wander freely, easing toward the target velocity so the bounce stays
      // smooth (kept running even while the user drags/spins the model)
      vel.lerp(drift, 1 - Math.exp(-3.5 * dt));
      pivot.position.addScaledVector(vel, dt);

      const b = bounds();
      const wx = Math.min(0.5, b.x * 0.4);
      const wy = Math.min(0.5, b.y * 0.4);
      if (pivot.position.x > b.x - wx) drift.x = -Math.abs(drift.x);
      else if (pivot.position.x < -b.x + wx) drift.x = Math.abs(drift.x);
      if (pivot.position.y > b.y - wy) drift.y = -Math.abs(drift.y);
      else if (pivot.position.y < -b.y + wy) drift.y = Math.abs(drift.y);
      if (pivot.position.z > DEPTH_MAX - 0.5) drift.z = -Math.abs(drift.z);
      else if (pivot.position.z < DEPTH_MIN + 0.5) drift.z = Math.abs(drift.z);

      pivot.position.x = Math.max(-b.x, Math.min(b.x, pivot.position.x));
      pivot.position.y = Math.max(-b.y, Math.min(b.y, pivot.position.y));
      pivot.position.z = Math.max(DEPTH_MIN, Math.min(DEPTH_MAX, pivot.position.z));

      // fling momentum after a drag, then the slow ambient tumble
      fling.update(model, dt, dragging);
      model.rotation.y += 0.11 * dt;
      model.rotation.x += 0.05 * dt;
    }
    renderer.render(scene, camera);
  }
  animate();
}
