import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 3D model: "Earth | Terra - Downloadable model" by murilo.kleine (Sketchfab),
// CC-BY-4.0. Sits half off the left edge, behind all content, and zooms in as
// the page is scrolled toward the bottom.

const canvas = document.getElementById('earth-canvas');
if (canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 5);

  // The model carries its own illumination: Material.001 uses its base-colour
  // texture as its emissive map, so it glows from within. It must NOT be
  // flooded with extra lights (especially none on the night side) — a single
  // sun lights only the day half and lets the other half fall into night.
  const sun = new THREE.DirectionalLight(0xffffff, 3.0);
  sun.position.set(4, 1, 1);
  scene.add(sun);

  // pivot: anchor + scroll-driven scale.
  // tilt: Earth's ~23.5-degree axial tilt.
  // model spins about its own (tilted) axis inside tilt.
  const pivot = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.z = THREE.MathUtils.degToRad(23.5);
  pivot.add(tilt);
  scene.add(pivot);

  // small but visible on the first screen (right side), then zooms in toward
  // the viewer as the page is scrolled toward the bottom
  const SCALE_MIN = 0.3;
  const SCALE_MAX = 2.4;
  pivot.scale.setScalar(SCALE_MIN);

  // Horizontal placement is scroll-driven: the globe appears on the right of
  // the first screen, then slides across to the left (ending roughly half off
  // the left edge) as the page is scrolled toward the bottom.
  const EDGE = 0.72;
  let halfWidth = 0;
  function updateHalfWidth() {
    const dist = Math.max(0.5, camera.position.z - pivot.position.z);
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    halfWidth = halfH * camera.aspect;
  }

  // cache the scrollable height: reading scrollHeight forces a layout, and
  // doing it every frame stalls the page, so refresh it on resize / at a low
  // cadence instead of on every animation frame.
  let scrollMax = 1;
  function updateScrollMax() {
    scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  let model = null;
  new GLTFLoader().load(
    'assets/3d_6/scene.gltf',
    (gltf) => {
      model = gltf.scene;
      // normalise to a radius of 1 regardless of the authored size
      let box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      model.scale.setScalar(2 / maxDim);
      model.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      // The surface material ships metallic (metalness 0.59). Without an
      // environment map that renders almost black, so force a matte, diffuse
      // look so the lit (day) side is visible.
      model.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if ('metalness' in m) m.metalness = 0.0;
          if ('roughness' in m) m.roughness = Math.max(m.roughness, 0.65);
          m.needsUpdate = true;
        }
      });

      tilt.add(model);
      canvas.classList.add('is-ready');
    },
    undefined,
    (err) => console.warn('Earth model failed to load:', err)
  );

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateHalfWidth();
    updateScrollMax();
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  let placed = false;
  let scrollMaxCheckedAt = -0.5;
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (model) {
      // refresh the cached height occasionally (images/fonts can shift layout)
      const now = clock.elapsedTime;
      if (now - scrollMaxCheckedAt > 0.5) {
        scrollMaxCheckedAt = now;
        updateScrollMax();
      }
      const progress = Math.min(1, Math.max(0, (window.scrollY || 0) / scrollMax));
      const ks = Math.min(1, 6 * dt);

      // appear on the right of the first screen, slide left while scrolling
      updateHalfWidth();
      const targetX = halfWidth * EDGE * (1 - 2 * progress);

      // zoom in from far away: a distant point on the first screen that grows
      // as it approaches while scrolling (eased so it accelerates into view)
      const eased = Math.pow(progress, 1.6);
      const target = SCALE_MIN + (SCALE_MAX - SCALE_MIN) * eased;

      if (!placed) {
        // snap to the resting spot on the first frame so a refresh doesn't
        // animate a slide in from the center (which read as lag)
        pivot.position.x = targetX;
        pivot.scale.set(target, target, target);
        placed = true;
      } else {
        pivot.position.x += (targetX - pivot.position.x) * ks;
        const s = pivot.scale.x + (target - pivot.scale.x) * ks;
        pivot.scale.set(s, s, s);
      }

      model.rotation.y += 0.03 * dt;
    }
    renderer.render(scene, camera);
  }
  animate();
}
