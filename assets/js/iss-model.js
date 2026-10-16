import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSpin } from './dragInertia.js';
import { attachDepth, beginModelDrag, endModelDrag } from './depth.js';

// 3D model: "ISS" by uperesito (Sketchfab)
// https://sketchfab.com/3d-models/iss-813f5b296e584c26bf386ca39de6c3d4

const canvas = document.getElementById('iss-canvas');
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
  attachDepth(camera, 'iss-canvas');

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(3, 5, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x88aaff, 0.35);
  rimLight.position.set(-4, -2, -3);
  scene.add(rimLight);

  const pivot = new THREE.Group();
  // start upper-right so it doesn't spawn on top of the astronaut/USB
  pivot.position.set(1.5, 0.9, 0);
  scene.add(pivot);

  // Free-floating drift: constant velocity that bounces off the edges of the
  // visible frustum, plus a slow depth drift like the astronaut.
  const drift = new THREE.Vector3(
    (Math.random() < 0.5 ? -1 : 1) * (0.003 + Math.random() * 0.0045),
    (Math.random() < 0.5 ? -1 : 1) * (0.0022 + Math.random() * 0.0035),
    (Math.random() < 0.5 ? -1 : 1) * (0.0015 + Math.random() * 0.0025)
  );
  // `drift` is the target velocity; `vel` eases toward it so the turnaround at
  // each edge is a smooth curve instead of an abrupt snap.
  const vel = drift.clone();
  const DEPTH_MIN = -1.6;
  const DEPTH_MAX = 1.6;

  // Scroll-driven zoom: small on the hero (top of the page) and scales up
  // as you scroll toward the bottom.
  const SCALE_MIN = 0.22;
  const SCALE_MAX = 3.25;
  pivot.scale.setScalar(SCALE_MIN);

  // Half-size of the model in pivot space (filled in once it loads). Bouncing
  // subtracts this so the model stops at the visible edge, not an invisible
  // margin inside the viewport.
  const halfModel = new THREE.Vector3(0.75, 0.75, 0.75);

  function bounds() {
    const dist = Math.max(0.5, camera.position.z - pivot.position.z);
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    const halfW = halfH * camera.aspect;
    // Size the bounce border from the model's largest (fully scrolled-in) size,
    // not the live scale. Using the live scale shrank the border on every scroll
    // frame, which shoved the station toward the centre and read as the object
    // being "pushed". A fixed border keeps the turnaround stable while scrolling.
    // Only a fraction of the model's half-size is held inside the border, so the
    // station can roam much closer to the viewport edges (freer drift).
    const s = SCALE_MAX;
    const keep = 0.4;
    const edge = 0.05;
    return {
      x: Math.max(0.2, halfW - (halfModel.x * s * keep + edge)),
      y: Math.max(0.2, halfH - (halfModel.y * s * keep + edge)),
    };
  }

  // Sketchfab exports sometimes include stray helper meshes parked far away
  // from the actual model. Left in, they blow up the bounding box so the
  // station renders tiny and offset. This looks for a single dominant jump in
  // the distance-from-centre distribution (a stray far from the main cluster)
  // and drops everything beyond it.
  function stripStrays(root) {
    root.updateMatrixWorld(true);
    const meshes = [];
    root.traverse((o) => { if (o.isMesh) meshes.push(o); });
    if (meshes.length < 3) return;

    const centers = meshes.map((m) =>
      new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3())
    );
    const median = (arr) => {
      const s = arr.slice().sort((a, b) => a - b);
      return s[s.length >> 1];
    };
    const mid = new THREE.Vector3(
      median(centers.map((c) => c.x)),
      median(centers.map((c) => c.y)),
      median(centers.map((c) => c.z))
    );
    const dists = centers.map((c) => c.distanceTo(mid));
    const sorted = dists.slice().sort((a, b) => a - b);
    const med = median(dists);

    let cut = Infinity;
    let bestGap = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1] < med * 10) continue;
      const gap = sorted[i + 1] - sorted[i];
      if (gap > bestGap) { bestGap = gap; cut = sorted[i]; }
    }
    if (!isFinite(cut)) return;

    for (let i = 0; i < meshes.length; i++) {
      if (dists[i] > cut) meshes[i].removeFromParent();
    }
  }

  // Some exports also ship a background sphere/dome that encloses the whole
  // model. It isn't part of the station, so drop any near-cubic mesh large
  // enough to wrap most of the scene.
  function stripEnclosingSphere(root) {
    root.updateMatrixWorld(true);
    const whole = new THREE.Box3().setFromObject(root);
    const dims = whole.getSize(new THREE.Vector3());
    const maxDim = Math.max(dims.x, dims.y, dims.z);
    const meshes = [];
    root.traverse((o) => { if (o.isMesh) meshes.push(o); });
    for (const m of meshes) {
      const s = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
      const lo = Math.min(s.x, s.y, s.z);
      const hi = Math.max(s.x, s.y, s.z);
      if (lo > 0 && hi / lo < 1.15 && hi > maxDim * 0.5) m.removeFromParent();
    }
  }

  let model = null;
  new GLTFLoader().load(
    'assets/3d_7/scene.gltf',
    (gltf) => {
      model = gltf.scene;
      stripStrays(model);
      stripEnclosingSphere(model);
      let box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fit = 1.5 / maxDim;
      model.scale.setScalar(fit);
      halfModel.copy(size).multiplyScalar(0.5 * fit);
      // recenter AFTER scaling using the world-space box, otherwise the offset
      // is applied in unscaled units and throws the model far off-camera.
      model.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      pivot.add(model);
      canvas.classList.add('is-ready');
    },
    undefined,
    (err) => console.warn('ISS model failed to load:', err)
  );

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovering = false;
  let dragging = false;
  const fling = createSpin({ damping: 0.06 });

  // Wheel-to-zoom while hovered. Kept separate from the scroll-driven base
  // scale so it can ease back to the original size once the cursor leaves.
  let scrollScale = SCALE_MIN;
  let zoom = 1;
  let zoomTarget = 1;

  // Interaction is handled on window (not the canvas) so it keeps working even
  // though the canvas renders behind the page content. The raycast decides
  // whether the cursor is actually over the model.
  window.addEventListener('pointermove', (e) => {
    if (!model) return;

    if (dragging) {
      // spin the station under the cursor (fling momentum on release)
      fling.move(pivot, e.clientX, e.clientY);
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

  // scroll wheel over the model zooms it in/out instead of scrolling the page
  window.addEventListener('wheel', (e) => {
    if (!hovering || !model) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    zoomTarget = Math.min(3.5, Math.max(0.4, zoomTarget * factor));
  }, { passive: false });

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
      // scroll-driven zoom: small at the top, grows as you scroll to the bottom
      const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, (window.scrollY || 0) / scrollMax));
      // Ramp in an extra 10% on top of the scroll-driven size, reaching +10%
      // by the bottom of the page.
      const targetScale = (SCALE_MIN + (SCALE_MAX - SCALE_MIN) * progress) * (1 + 0.1 * progress);
      const ks = Math.min(1, 6 * dt);
      scrollScale += (targetScale - scrollScale) * ks;

      // hover wheel-zoom eases back to 1 when the cursor is no longer on it
      if (!hovering && !dragging) zoomTarget = 1;
      zoom += (zoomTarget - zoom) * Math.min(1, 4 * dt);

      pivot.scale.setScalar(scrollScale * zoom);

      // wander freely and bounce off the screen edges (kept running even while
      // the user drags/spins the model)
      // ease the velocity toward its target, then drift with it
      vel.lerp(drift, 1 - Math.exp(-3.5 * dt));
      pivot.position.addScaledVector(vel, dt);

      // smooth bounce: flip the target a little before the edge so the model
      // eases to a stop and curves back instead of snapping off a wall.
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

      // fling momentum after a drag, then the slow ambient tumble (rotate the
      // pivot so it spins about the model's own centre, not the gltf origin)
      fling.update(pivot, dt, dragging);
      pivot.rotation.y += 0.0055 * dt;
      pivot.rotation.x += 0.0022 * dt;
    }
    renderer.render(scene, camera);
  }
  animate();
}
