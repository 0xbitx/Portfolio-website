import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 3D model: "drifting Astronaut" by Lukas Hahn Graphics (Sketchfab), CC-BY-4.0
// https://sketchfab.com/3d-models/drifting-astronaut-739af7000c0242d8b327d7fdf6062aaa

// Minimal KHR_materials_pbrSpecularGlossiness support (removed from three.js
// GLTFLoader in r150+) so this Sketchfab model's materials render correctly.
class GLTFSpecGlossExtension {
  constructor(parser) {
    this.parser = parser;
    this.name = 'KHR_materials_pbrSpecularGlossiness';
  }

  getMaterialType(materialIndex) {
    const md = this.parser.json.materials[materialIndex];
    if (!md || !md.extensions || !md.extensions[this.name]) return null;
    return THREE.MeshStandardMaterial;
  }

  extendMaterialParams(materialIndex, materialParams) {
    const md = this.parser.json.materials[materialIndex];
    const ext = md && md.extensions && md.extensions[this.name];
    if (!ext) return Promise.resolve();
    const d = ext.diffuseFactor || [1, 1, 1, 1];
    materialParams.color = new THREE.Color().setRGB(d[0], d[1], d[2], THREE.LinearSRGBColorSpace);
    materialParams.opacity = d[3];
    const gloss = ext.glossinessFactor !== undefined ? ext.glossinessFactor : 1;
    materialParams.roughness = 1 - gloss;
    materialParams.metalness = 0;
    if (materialParams.opacity < 1) materialParams.transparent = true;
    return Promise.resolve();
  }
}

const canvas = document.getElementById('astro-canvas');
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

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
  keyLight.position.set(3, 5, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x88aaff, 0.35);
  rimLight.position.set(-4, -2, -3);
  scene.add(rimLight);

  const pivot = new THREE.Group();
  // start lower-left so it doesn't spawn on top of the USB
  pivot.position.set(-1.6, 1.1, 0);
  scene.add(pivot);

  // Free-floating drift: constant velocity that bounces off the edges of the
  // visible frustum, plus a slow depth drift so the astronaut drifts through
  // space like the USB.
  const drift = new THREE.Vector3(
    (Math.random() < 0.5 ? -1 : 1) * (0.07 + Math.random() * 0.09),
    (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.07),
    (Math.random() < 0.5 ? -1 : 1) * (0.03 + Math.random() * 0.04)
  );
  const DEPTH_MIN = -1.6;
  const DEPTH_MAX = 1.6;

  // Scroll-driven zoom: the astronaut is small on the hero (top of the page)
  // and scales up as you scroll toward the bottom.
  const SCALE_MIN = 0.3;
  const SCALE_MAX = 1.7;
  pivot.scale.setScalar(SCALE_MIN);

  function bounds() {
    const dist = Math.max(0.5, camera.position.z - pivot.position.z);
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    const halfW = halfH * camera.aspect;
    const m = 0.82;
    return { x: halfW * m, y: halfH * m };
  }

  let model = null;
  const loader = new GLTFLoader();
  loader.register((parser) => new GLTFSpecGlossExtension(parser));
  loader.load(
    'assets/3d_5/scene.gltf',
    (gltf) => {
      model = gltf.scene;
      let box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3()).length();
      model.scale.setScalar(1.4 / (size || 1));
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
    (err) => console.warn('Astronaut model failed to load:', err)
  );

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovering = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  // Interaction is handled on window (not the canvas) so it keeps working even
  // though the canvas renders behind the page content. The raycast decides
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
    if (model) {
      // scroll-driven zoom: small at the top, grows as you scroll to the bottom
      const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, (window.scrollY || 0) / scrollMax));
      const targetScale = SCALE_MIN + (SCALE_MAX - SCALE_MIN) * progress;
      const ks = Math.min(1, 6 * dt);
      const s = pivot.scale.x + (targetScale - pivot.scale.x) * ks;
      pivot.scale.set(s, s, s);

      if (!dragging) {
        // wander freely and bounce off the screen edges
        pivot.position.addScaledVector(drift, dt);
        const b = bounds();
        if (pivot.position.x > b.x) { pivot.position.x = b.x; drift.x = -Math.abs(drift.x); }
        if (pivot.position.x < -b.x) { pivot.position.x = -b.x; drift.x = Math.abs(drift.x); }
        if (pivot.position.y > b.y) { pivot.position.y = b.y; drift.y = -Math.abs(drift.y); }
        if (pivot.position.y < -b.y) { pivot.position.y = -b.y; drift.y = Math.abs(drift.y); }
        if (pivot.position.z > DEPTH_MAX) { pivot.position.z = DEPTH_MAX; drift.z = -Math.abs(drift.z); }
        if (pivot.position.z < DEPTH_MIN) { pivot.position.z = DEPTH_MIN; drift.z = Math.abs(drift.z); }

        // slow tumble through space
        model.rotation.y += 0.14 * dt;
        model.rotation.x += 0.06 * dt;
      }
    }
    renderer.render(scene, camera);
  }
  animate();
}
