import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
  const DEPTH_MIN = -1.6;
  const DEPTH_MAX = 1.6;

  function bounds() {
    const dist = Math.max(0.5, camera.position.z - pivot.position.z);
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    const halfW = halfH * camera.aspect;
    const m = 0.82;
    return { x: halfW * m, y: halfH * m };
  }

  let model = null;
  new GLTFLoader().load(
    'assets/3d/scene.gltf',
    (gltf) => {
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3()).length();
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.scale.setScalar(1.2 / (size || 1));
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
  let lastX = 0;
  let lastY = 0;

  // Interaction is handled on window (not the canvas) so it keeps working even
  // though the canvas now renders behind the page content. The raycast decides
  // whether the cursor is actually over the model.
  window.addEventListener('pointermove', (e) => {
    if (!model) return;

    if (dragging) {
      // spin the model in place under the cursor
      model.rotation.y += (e.clientX - lastX) * 0.01;
      model.rotation.x += (e.clientY - lastY) * 0.01;
      lastX = e.clientX;
      lastY = e.clientY;
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
    lastX = e.clientX;
    lastY = e.clientY;
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
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
    if (model && !dragging) {
      // wander freely and bounce off the screen edges
      pivot.position.addScaledVector(drift, dt);
      const b = bounds();
      if (pivot.position.x > b.x) { pivot.position.x = b.x; drift.x = -Math.abs(drift.x); }
      if (pivot.position.x < -b.x) { pivot.position.x = -b.x; drift.x = Math.abs(drift.x); }
      if (pivot.position.y > b.y) { pivot.position.y = b.y; drift.y = -Math.abs(drift.y); }
      if (pivot.position.y < -b.y) { pivot.position.y = -b.y; drift.y = Math.abs(drift.y); }
      if (pivot.position.z > DEPTH_MAX) { pivot.position.z = DEPTH_MAX; drift.z = -Math.abs(drift.z); }
      if (pivot.position.z < DEPTH_MIN) { pivot.position.z = DEPTH_MIN; drift.z = Math.abs(drift.z); }

      // slow tumble
      model.rotation.y += 0.11 * dt;
      model.rotation.x += 0.05 * dt;
    }
    renderer.render(scene, camera);
  }
  animate();
}
