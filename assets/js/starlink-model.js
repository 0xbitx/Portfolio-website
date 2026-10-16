import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { attachDepth, beginModelDrag, endModelDrag } from './depth.js';
// 3D model: "Starlink Spacex Satellite" by Malacodart (Sketchfab), CC-BY-4.0
// A handful of them fly together in a "train" formation, like a Starlink launch.

const canvas = document.getElementById('starlink-canvas');
if (canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 11);
  attachDepth(camera, 'starlink-canvas');

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
  keyLight.position.set(5, 7, 9);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x88aaff, 0.5);
  rimLight.position.set(-7, -4, -5);
  scene.add(rimLight);

  const TRAIN_COUNT = 6;
  const SPACING = 8.0;
  const BASE_Y = 0.55;

  // Scroll-driven zoom, matching the ISS: small on the hero (top of the page)
  // and scaling up as you scroll toward the bottom.
  const SCALE_MIN = 0.22;
  const SCALE_MAX = 1.5;

  const train = new THREE.Group();
  train.scale.setScalar(SCALE_MIN);
  scene.add(train);

  const satellites = [];

  let trainHalfWidth = 0;
  let travelSpan = 1;

  function visibleWidth(z) {
    const dist = Math.max(0.5, camera.position.z - z);
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    return halfH * camera.aspect * 2;
  }

  function computeSpan() {
    trainHalfWidth = (TRAIN_COUNT - 1) * SPACING / 2;
    // The train scales up to SCALE_MAX toward the bottom of the page, so the
    // wrap distance must use the widest (fully scaled) train — otherwise it
    // would wrap while a satellite is still on screen and appear to teleport
    // into the middle of the viewport.
    travelSpan = visibleWidth(0) + trainHalfWidth * 2 * SCALE_MAX + 1;
  }

  let ready = false;

  new GLTFLoader().load('assets/3d_8/scene.gltf', (gltf) => {
    const model = gltf.scene;

    // Normalise size and centre on the origin so every clone lines up cleanly.
    let box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    model.scale.setScalar(1.05 / maxDim);

    box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.sub(center);

    const template = new THREE.Group();
    template.add(model);

    for (let i = 0; i < TRAIN_COUNT; i++) {
      const sat = template.clone(true);
      const offset = i - (TRAIN_COUNT - 1) / 2;
      sat.position.set(offset * SPACING, Math.sin(i * 1.7) * 0.05, Math.cos(i * 1.3) * 0.06);
      // Broadside to the viewer, with a small staggered tilt per satellite.
      sat.rotation.set(
        Math.PI / 2 - 0.22 + Math.sin(i * 2.1) * 0.04,
        0.32 + Math.sin(i * 1.1) * 0.05,
        0.10 + Math.cos(i * 1.9) * 0.05
      );
      sat.userData.baseRot = sat.rotation.clone();
      sat.userData.zoom = 1;
      sat.userData.zoomTarget = 1;
      train.add(sat);
      satellites.push(sat);
    }

    computeSpan();
    ready = true;
    requestAnimationFrame(function () { canvas.classList.add('is-ready'); });
  }, undefined, (err) => console.warn('Starlink model failed to load:', err));

  // ---- drag to rotate each satellite, like the ISS -------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovering = null;
  let dragging = null;
  let lastX = 0;
  let lastY = 0;

  function rootSatellite(obj) {
    while (obj && satellites.indexOf(obj) === -1) obj = obj.parent;
    return obj || null;
  }

  window.addEventListener('pointermove', (e) => {
    if (dragging) {
      // rotate the grabbed satellite; the train keeps travelling underneath
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      dragging.rotation.y += dx * 0.01;
      dragging.rotation.x += dy * 0.01;
      return;
    }
    if (!ready) return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(satellites, true)[0];
    const obj = hit ? rootSatellite(hit.object) : null;
    if (obj !== hovering) {
      hovering = obj;
      document.body.style.cursor = obj ? 'grab' : '';
    }
  });

  window.addEventListener('pointerdown', (e) => {
    if (!hovering) return;
    dragging = hovering;
    beginModelDrag();
    lastX = e.clientX;
    lastY = e.clientY;
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  });

  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = null;
    endModelDrag();
    document.body.style.cursor = hovering ? 'grab' : '';
  });

  // scroll wheel over a satellite zooms that one in/out instead of scrolling
  window.addEventListener('wheel', (e) => {
    if (!hovering) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    hovering.userData.zoomTarget = Math.min(4.2, Math.max(0.4, hovering.userData.zoomTarget * factor));
  }, { passive: false });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    computeSpan();
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  let phase = 0.45;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const now = performance.now() / 1000;

    if (ready) {
      // travel across the screen, then wrap back to the right
      phase += 0.015 * dt;
      if (phase >= 1) phase -= 1;

      train.position.set(
        (0.5 - phase) * travelSpan,
        BASE_Y + Math.sin(now * 0.22) * 0.3,
        0
      );
      train.rotation.z = -0.10;
      train.rotation.x = Math.sin(now * 0.18) * 0.04;

      // scroll-driven zoom: small at the top, grows as you scroll to the bottom
      const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, (window.scrollY || 0) / scrollMax));
      const targetScale = SCALE_MIN + (SCALE_MAX - SCALE_MIN) * progress;
      const ks = Math.min(1, 6 * dt);
      const s = train.scale.x + (targetScale - train.scale.x) * ks;
      train.scale.set(s, s, s);

      // Ease every satellite that isn't being dragged back toward its original
      // orientation. Slow factor = takes a few seconds to settle.
      const kr = Math.min(1, 0.7 * dt);
      const kz = Math.min(1, 4 * dt);
      for (let i = 0; i < satellites.length; i++) {
        const sat = satellites[i];

        // wheel-zoom the hovered/dragged satellite; others ease back to 1
        const zt = (sat === hovering || sat === dragging) ? sat.userData.zoomTarget : 1;
        sat.userData.zoom += (zt - sat.userData.zoom) * kz;
        sat.scale.setScalar(sat.userData.zoom);

        if (sat === dragging) continue;
        const b = sat.userData.baseRot;
        sat.rotation.x += (b.x - sat.rotation.x) * kr;
        sat.rotation.y += (b.y - sat.rotation.y) * kr;
        sat.rotation.z += (b.z - sat.rotation.z) * kr;
      }
    }

    renderer.render(scene, camera);
  }
  animate();
}
