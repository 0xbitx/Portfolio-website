import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSpin } from './dragInertia.js';
import { attachDepth, beginModelDrag, endModelDrag } from './depth.js';

const canvas = document.getElementById('satellite-canvas');
if (canvas) {
  const TARGET_SIZE = 2.0;
  const FIT_MARGIN = 1.18;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
  camera.position.set(0, 0, 5);
  attachDepth(camera, 'satellite-canvas');

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(3, 5, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x88aaff, 0.4);
  rimLight.position.set(-4, -2, -3);
  scene.add(rimLight);

  const pivot = new THREE.Group();
  const spin = new THREE.Group();
  pivot.add(spin);
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

  new GLTFLoader().load(
    'assets/3d_3/scene.gltf',
    (gltf) => {
      model = gltf.scene;
      spin.add(model);

      let box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      model.scale.setScalar(TARGET_SIZE / maxDim);

      model.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      box = new THREE.Box3().setFromObject(model);
      fitRadius = box.getSize(new THREE.Vector3()).multiplyScalar(0.5).length();

      spin.rotation.x = -0.12;
      fitCamera();
      canvas.classList.add('is-ready');
    },
    undefined,
    (err) => console.warn('Satellite model failed to load:', err)
  );

  function resize() {
    const w = canvas.clientWidth || 260;
    const h = canvas.clientHeight || 260;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    fitCamera();
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  resize();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovering = false;
  let dragging = false;
  const fling = createSpin({ damping: 0.05 });

  function projectPointer(e) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return true;
  }

  window.addEventListener('pointermove', (e) => {
    if (!model) return;

    if (dragging) {
      // spin the satellite under the cursor (fling momentum on release)
      fling.move(spin, e.clientX, e.clientY);
      return;
    }

    if (!projectPointer(e)) return;
    raycaster.setFromCamera(pointer, camera);
    const over = raycaster.intersectObject(model, true).length > 0;
    if (over !== hovering) {
      hovering = over;
      window.__satelliteHovering = over;
      document.body.style.cursor = over ? 'grab' : '';
    }
  });

  window.addEventListener('pointerdown', (e) => {
    if (!hovering || !model) return;
    dragging = true;
    window.__satelliteDragging = true;
    beginModelDrag();
    fling.begin(e.clientX, e.clientY);
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    window.__satelliteDragging = false;
    endModelDrag();
    document.body.style.cursor = hovering ? 'grab' : '';
  });

  // scroll wheel zoom is handled on the .satellite element (see index.html) so
  // the whole model scales without being clipped by this square canvas.

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (model) {
      // fling momentum after a drag, then the ambient spin
      fling.update(spin, dt, dragging);
      spin.rotation.y += 0.25 * dt;
      spin.rotation.z += 0.05 * dt;
    }
    renderer.render(scene, camera);
  }
  animate();
}
