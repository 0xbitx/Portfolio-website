import * as THREE from 'three';

// Drives the full-screen asset preloader.
//
// Progress target comes from three.js' shared DefaultLoadingManager (every
// GLTFLoader/TextureLoader file on the site reports through it). The loader
// only closes once every 3D model canvas is marked ready AND the window "load"
// event has fired (so CSS, fonts and images count too). The bar is animated
// towards that target so it keeps gliding even during one long download.
const CANVAS_IDS = [
  'gltf-canvas',
  'astro-canvas',
  'earth-canvas',
  'ship-canvas',
  'satellite-canvas',
  'iss-canvas',
  'starlink-canvas',
  'laptop-canvas',
];

const preloader = document.getElementById('preloader');

if (preloader) {
  // Signals to the inline fail-safe that the preloader is under control.
  window.__preloaderActive = true;

  const barFill = preloader.querySelector('.preloader-bar-fill');
  const statusEl = preloader.querySelector('.preloader-status');

  const MIN_VISIBLE = 700; // never flash away instantly
  const HARD_TIMEOUT = 45000; // safety net if a loader never reports back
  const startTime = performance.now();

  const canvases = CANVAS_IDS
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  let fileLoaded = 0;
  let fileTotal = 0;
  let windowLoaded = document.readyState === 'complete';
  let readyCount = 0;
  let finished = false;
  let display = 0; // animated percentage currently shown

  const manager = THREE.DefaultLoadingManager;
  manager.onProgress = function (_url, loaded, total) {
    fileLoaded = loaded;
    fileTotal = total;
  };

  // A model canvas gets .is-ready once it has fully loaded.
  const seen = new WeakSet();
  const observer = new MutationObserver(function () {
    canvases.forEach(function (c) {
      if (c.classList.contains('is-ready')) markReady(c);
    });
  });
  function markReady(c) {
    if (seen.has(c)) return;
    seen.add(c);
    readyCount++;
  }
  canvases.forEach(function (c) {
    observer.observe(c, { attributes: true, attributeFilter: ['class'] });
    if (c.classList.contains('is-ready')) markReady(c);
  });

  window.addEventListener('load', function () {
    windowLoaded = true;
  });

  function allReady() {
    return canvases.length > 0 && readyCount >= canvases.length;
  }

  function progress() {
    let modelPart = fileTotal > 0 ? fileLoaded / fileTotal : 0;
    if (allReady()) modelPart = 1;
    let pct = modelPart * 0.9;
    if (windowLoaded) pct += 0.1;
    return Math.min(1, Math.max(0, pct));
  }

  function maybeFinish() {
    if (finished) return;
    if (windowLoaded && allReady()) finish();
  }

  function finish() {
    if (finished) return;
    finished = true;
    display = 100;
    if (barFill) barFill.style.width = '100%';
    if (statusEl) statusEl.textContent = 'READY';
    const wait = Math.max(0, MIN_VISIBLE - (performance.now() - startTime));
    setTimeout(function () {
      preloader.classList.add('is-done');
      document.documentElement.classList.remove('is-loading');
      setTimeout(function () {
        if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
      }, 800);
    }, wait);
  }

  function frame() {
    if (finished) return;
    const target = progress() * 100;
    // ease towards the real target, plus a constant gentle creep so the bar
    // never looks frozen during a single long download (e.g. the 43MB .bin)
    display += (target - display) * 0.08;
    display += 0.03;
    const softCap = target >= 100 ? 100 : 97;
    if (display > softCap) display = softCap;
    if (barFill) barFill.style.width = display.toFixed(2) + '%';
    if (statusEl) statusEl.textContent = display >= 99 ? 'FINALIZING' : 'LOADING ASSETS';
    maybeFinish();
    requestAnimationFrame(frame);
  }

  frame();
  setTimeout(finish, HARD_TIMEOUT);
}
