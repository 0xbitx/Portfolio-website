import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createSpin } from './dragInertia.js';
import { attachDepth, beginModelDrag, endModelDrag } from './depth.js';

// 3D model: "drifting Astronaut" by Lukas Hahn Graphics (Sketchfab), CC-BY-4.0
// https://sketchfab.com/3d-models/drifting-astronaut-739af7000c0242d8b327d7fdf6062aaa

// KHR_materials_pbrSpecularGlossiness is basically Blinn-Phong: a diffuse colour
// plus a specular colour scaled by a glossiness value. three.js removed its
// built-in support, so map it onto MeshPhongMaterial — that keeps the specular
// "light catching" highlights that MeshStandardMaterial (default F0 ≈ 0.04)
// renders as a flat, matte surface.
class GLTFSpecGlossExtension {
  constructor(parser) {
    this.parser = parser;
    this.name = 'KHR_materials_pbrSpecularGlossiness';
  }

  getMaterialType(materialIndex) {
    const md = this.parser.json.materials[materialIndex];
    if (!md || !md.extensions || !md.extensions[this.name]) return null;
    return THREE.MeshPhongMaterial;
  }

  extendMaterialParams(materialIndex, materialParams) {
    const parser = this.parser;
    const md = parser.json.materials[materialIndex];
    const ext = md && md.extensions && md.extensions[this.name];
    if (!ext) return Promise.resolve();

    const pending = [];

    const d = ext.diffuseFactor || [1, 1, 1, 1];
    materialParams.color = new THREE.Color().setRGB(d[0], d[1], d[2], THREE.LinearSRGBColorSpace);
    materialParams.opacity = d[3];
    if (materialParams.opacity < 1) materialParams.transparent = true;

    const s = ext.specularFactor || [1, 1, 1];
    materialParams.specular = new THREE.Color().setRGB(s[0], s[1], s[2], THREE.LinearSRGBColorSpace);
    const gloss = ext.glossinessFactor !== undefined ? ext.glossinessFactor : 1;
    materialParams.shininess = Math.max(1, Math.round(gloss * 80));

    // Diffuse texture = the model's colour.
    if (ext.diffuseTexture !== undefined) {
      pending.push(parser.assignTexture(materialParams, 'map', ext.diffuseTexture, THREE.SRGBColorSpace));
    }
    // In spec-gloss the RGB of this texture is the specular colour, which maps
    // directly to a Phong specular map (gives the "light hitting" highlights).
    if (ext.specularGlossinessTexture !== undefined) {
      pending.push(parser.assignTexture(materialParams, 'specularMap', ext.specularGlossinessTexture));
    }

    return Promise.all(pending);
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
  attachDepth(camera, 'astro-canvas');

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
    (Math.random() < 0.5 ? -1 : 1) * (0.035 + Math.random() * 0.045),
    (Math.random() < 0.5 ? -1 : 1) * (0.025 + Math.random() * 0.035),
    (Math.random() < 0.5 ? -1 : 1) * (0.015 + Math.random() * 0.02)
  );
  // `drift` is the target velocity; `vel` eases toward it so each turnaround is
  // a smooth curve rather than an abrupt snap.
  const vel = drift.clone();
  const DEPTH_MIN = -1.6;
  const DEPTH_MAX = 1.6;

  // Scroll-driven zoom: the astronaut is small on the hero (top of the page)
  // and scales up as you scroll toward the bottom.
  const SCALE_MIN = 0.3;
  const SCALE_MAX = 1.7;
  pivot.scale.setScalar(SCALE_MIN);

  // Half-size of the model in pivot space (filled in once it loads). Bouncing
  // subtracts this so the model stops at the visible edge, not an invisible
  // margin inside the viewport.
  const halfModel = new THREE.Vector3(0.5, 0.5, 0.5);

  function bounds() {
    const dist = Math.max(0.5, camera.position.z - pivot.position.z);
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    const halfW = halfH * camera.aspect;
    // Size the bounce border from the model's largest (fully scrolled-in) size,
    // not the live scale. Using the live scale shrank the border on every scroll
    // frame, which shoved the astronaut toward the centre and read as the object
    // being "pushed". A fixed border keeps the turnaround stable while scrolling.
    // Only a fraction of the model's half-size is held inside the border, so the
    // astronaut can roam much closer to the viewport edges (freer drift).
    const s = SCALE_MAX;
    const keep = 0.2;
    const edge = 0.0;
    return {
      x: Math.max(0.2, halfW - (halfModel.x * s * keep + edge)),
      y: Math.max(0.2, halfH - (halfModel.y * s * keep + edge)),
    };
  }

  let model = null;
  let spin = null;
  let mixer = null;
  const loader = new GLTFLoader();
  loader.register((parser) => new GLTFSpecGlossExtension(parser));
  loader.load(
    'assets/3d_5/scene.gltf',
    (gltf) => {
      model = gltf.scene;
      // Update world matrices BEFORE measuring: skinned models otherwise report
      // a bogus (near-zero) bounding box and the normalisation blows the scale up.
      model.updateMatrixWorld(true);
      let box = new THREE.Box3().setFromObject(model);
      const sizeVec = box.getSize(new THREE.Vector3());
      const fit = 1.4 / (sizeVec.length() || 1);
      model.scale.setScalar(fit);
      halfModel.copy(sizeVec).multiplyScalar(0.5 * fit);
      // recenter AFTER scaling using the world-space box, otherwise the offset
      // is applied in unscaled units and throws the model far off-camera.
      model.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      // Wrap the model in a group sitting at the body centre, then rotate THAT
      // group. Rotating the gltf root directly spins the astronaut about its
      // origin (the feet); this turns it about its middle instead.
      model.position.sub(center);
      spin = new THREE.Group();
      spin.add(model);
      pivot.add(spin);

      // Play the model's built-in animation (the astronaut is a skinned model
      // with one clip; without a mixer it would just stand frozen).
      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        for (let i = 0; i < gltf.animations.length; i++) {
          mixer.clipAction(gltf.animations[i]).play();
        }
      }

      canvas.classList.add('is-ready');
    },
    undefined,
    (err) => console.warn('Astronaut model failed to load:', err)
  );

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovering = false;
  let dragging = false;
  const fling = createSpin({ damping: 0.05 });

  // Wheel-to-zoom while hovered. Kept separate from the scroll-driven base
  // scale so releasing the cursor eases the zoom back to 1.
  let scrollScale = SCALE_MIN;
  let zoom = 1;
  let zoomTarget = 1;

  // Interaction is handled on window (not the canvas) so it keeps working even
  // though the canvas renders behind the page content. The raycast decides
  // whether the cursor is actually over the model.
  window.addEventListener('pointermove', (e) => {
    if (!model) return;

    if (dragging) {
      // spin the model under the cursor (fling momentum on release)
      fling.move(spin, e.clientX, e.clientY);
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
    if (mixer) mixer.update(dt);
    if (model) {
      // scroll-driven zoom: small at the top, grows as you scroll to the bottom
      const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, (window.scrollY || 0) / scrollMax));
      const targetScale = SCALE_MIN + (SCALE_MAX - SCALE_MIN) * progress;
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

      // Smooth bounce: flip the target a little before the edge so the model
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

      // hard clamp as a safety net
      pivot.position.x = Math.max(-b.x, Math.min(b.x, pivot.position.x));
      pivot.position.y = Math.max(-b.y, Math.min(b.y, pivot.position.y));
      pivot.position.z = Math.max(DEPTH_MIN, Math.min(DEPTH_MAX, pivot.position.z));

      // fling momentum after a drag, then the slow ambient tumble
      fling.update(spin, dt, dragging);
      spin.rotation.y += 0.06 * dt;
      spin.rotation.x += 0.025 * dt;
    }
    renderer.render(scene, camera);
  }
  animate();
}
