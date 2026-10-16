import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { attachDepth, setHaze, DEPTH } from './depth.js';
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
  attachDepth(camera, 'earth-canvas');

  // The model carries its own illumination: Material.001 uses its base-colour
  // texture as its emissive map, so it glows from within. It must NOT be
  // flooded with extra lights (especially none on the night side) — a single
  // sun lights only the day half and lets the other half fall into night.
  const sun = new THREE.DirectionalLight(0xffffff, 3.0);
  // sun sits to the left AND toward the camera, so the visible (front-left)
  // hemisphere is lit — a purely left-side sun is edge-on to the camera and
  // leaves the globe looking like night. This angle puts the shadowed night
  // side at ~40% of the visible disk (60% day / 40% night).
  sun.position.set(-4.7, 0.5, 1.54);
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
  // Far-back haze depth for the globe; fades as it zooms in (see animate).
  const EARTH_DEPTH = DEPTH['earth-canvas'] ?? 0.85;

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
  let mixer = null;
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
      // look so the lit (day) side is visible. The cloud/atmosphere shell
      // (Material.002) is left transparent so it overlays the surface.
      model.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m.name === 'Material.002') {
            // Cloud / atmosphere shell. The exported material uses a grayscale
            // cloud map (black = clear sky, white = cloud) as its *colour* at a
            // constant 0.94 opacity, which paints the whole globe a flat gray
            // and hides the blue surface. Reuse that grayscale map as the alpha
            // map instead, so only the actual clouds render — white and
            // see-through everywhere else.
            const cloudMap = m.map || m.alphaMap;
            m.alphaMap = cloudMap;
            m.map = null;
            if (cloudMap) cloudMap.colorSpace = THREE.NoColorSpace;
            if (m.color) m.color.set(0xffffff);
            m.transparent = true;
            m.opacity = 1.0;
            m.depthWrite = false;
            if ('metalness' in m) m.metalness = 0.0;
            if ('roughness' in m) m.roughness = 1.0;
            m.needsUpdate = true;
            continue;
          }
          if ('metalness' in m) m.metalness = 0.0;
          if ('roughness' in m) m.roughness = Math.max(m.roughness, 0.65);
          // Oceans: the base map's water is a pale, washed-out blue. Remap only
          // the blue-dominant (water) pixels to a deep, saturated ocean ramp —
          // driven by the original luminance so currents and coastlines still
          // read — while leaving land untouched. Reads like Earth from orbit.
          m.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <map_fragment>',
              `#include <map_fragment>
               float _oceanMask = smoothstep(0.0, 0.12, diffuseColor.b - max(diffuseColor.r, diffuseColor.g));
               float _oceanLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
               vec3 _oceanTone = mix(vec3(0.010, 0.050, 0.160), vec3(0.10, 0.35, 0.72), smoothstep(0.12, 0.62, _oceanLum));
               diffuseColor.rgb = mix(diffuseColor.rgb, _oceanTone, _oceanMask);`
            );
          };
          m.needsUpdate = true;
        }
      });

      // The artist rigged the cloud shell to a bone and shipped a 50s
      // "ArmatureAction" clip. Play it so the clouds drift the way the model
      // intends, instead of a hand-rolled rotation.
      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        mixer.timeScale = 0.12; // play the 50s clip at a slow drift
        for (let i = 0; i < gltf.animations.length; i++) {
          mixer.clipAction(gltf.animations[i]).play();
        }
      }

      tilt.add(model);
      canvas.classList.add('is-ready');
    },
    undefined,
    (err) => console.warn('Earth model failed to load:', err)
  );

  function resize() {
    const prevHalf = halfWidth;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateHalfWidth();
    updateScrollMax();
    // Dragging the window edge — or closing it — fires a burst of resize events
    // that change halfWidth, and targetX is a fraction of halfWidth, so the
    // globe would otherwise be flung across the screen. Re-anchor by the ratio
    // so it keeps the same on-screen position instead of jumping. The initial
    // call has no previous width to scale from.
    if (prevHalf > 0) {
      pivot.position.x *= halfWidth / prevHalf;
    }
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  let placed = false;
  let haze = -1;
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

      // Pull the globe into focus as it zooms in: at the top it sits far back
      // in the atmospheric haze, but by the end of the page it has grown into
      // the focal point, so ease its blur/dim away to keep it crisp.
      const targetHaze = EARTH_DEPTH * (1 - 0.85 * progress);
      if (Math.abs(targetHaze - haze) > 0.02) {
        haze = targetHaze;
        setHaze('earth-canvas', haze);
      }

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

      model.rotation.y += 0.012 * dt;

      // Advance the built-in cloud-shell animation (rigged bone).
      if (mixer) mixer.update(dt);
    }
    renderer.render(scene, camera);
  }
  animate();
}
