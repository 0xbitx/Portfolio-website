// Shared depth model for the fullscreen 3D layers.
//
// Every layer gets a DEPTH between 0 (right in front of the viewer) and 1
// (far away). Two cues make that distance readable:
//
//   1. Pointer parallax — as the cursor moves, near layers swing across the
//      screen while far layers barely budge. This is done by nudging each
//      scene's camera, so it never fights the module's own pivot/scroll maths.
//   2. Atmospheric haze — far layers blur, dim and desaturate, so they recede
//      into the void instead of sitting flat against the near ones.
//
// Each *-model.js module just calls attachDepth(camera, '<its-canvas-id>').

export const DEPTH = {
  'ship-canvas': 0.05,       // cursor ship — nearest foreground
  'astro-canvas': 0.12,
  'gltf-canvas': 0.20,
  'laptop-canvas': 0.35,
  'iss-canvas': 0.45,
  'satellite-canvas': 0.58,
  'starlink-canvas': 0.70,
  'earth-canvas': 0.85,      // deepest of the lit layers
};

// Per-layer blur strength (px per unit of DEPTH). Defaults to 2.2; a big,
// detailed layer can lower it so it isn't softened as much as its depth would
// normally imply, without touching its parallax or dimming.
const BLUR = {
  'iss-canvas': 0.8,
  'starlink-canvas': 0.8,
};

const PARALLAX = 0.06;   // world units of camera travel at the near extreme
const EASE = 0.1;        // larger = pointer follow is slower and softer

// Drag-to-pan: dragging empty space nudges every layer's camera, using the
// same near-moves-more parallax as the cursor, so the whole 3D scene shifts
// together and reads as moving through space. A model module calls
// beginModelDrag()/endModelDrag() while the user rotates a model so the two
// gestures never fight.
const PAN = 2.0;         // world units of camera travel for a full-screen drag
const PAN_MAX = 3.0;     // clamp on the accumulated pan (normalised units)
const PAN_FAR = 0.45;    // how much depth still dampens the pan (lower = far layers move more)
const PAN_SMOOTH = 0.06; // seconds; eases the applied pan toward the drag target
const PAN_FRICTION = 0.94; // per-frame momentum decay after the drag ends
// Layers left out of the space-pan: they're framed widgets (or the cursor
// ship) whose tight camera fit would clip if the whole scene shifted.
const PAN_MULT = {
  'ship-canvas': 0,
  'laptop-canvas': 0,
  'satellite-canvas': 0,
};

const target = { x: 0, y: 0 };
const eased = { x: 0, y: 0 };

const pan = { x: 0, y: 0 };       // drag target (normalised)
const panVel = { x: 0, y: 0 };    // momentum
const panEased = { x: 0, y: 0 };
let panPointer = null;
let lastPanX = 0;
let lastPanY = 0;
let modelDrag = 0;

const attached = [];
let started = false;

function offsetFor(depth, panScale = 1) {
  const f = (1 - depth) * PARALLAX;      // near moves more, far moves less
  const g = (1 - depth * PAN_FAR) * PAN * panScale; // flatter falloff, so far layers pan too
  return { x: eased.x * f + panEased.x * g, y: eased.y * f + panEased.y * g };
}

function start() {
  if (started) return;
  started = true;

  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener('pointerout', () => {
    target.x = 0;
    target.y = 0;
  });

  // Drag empty space to pan the whole scene. Skipped on real UI and when a
  // model is being rotated (modelDrag > 0).
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    if (modelDrag > 0) return;
    if (e.target && e.target.closest && e.target.closest('a, button, input, textarea, select, [role="button"]')) return;
    panPointer = e.pointerId;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    panVel.x = 0;
    panVel.y = 0;
    // stop the drag from selecting page text
    if (e.cancelable) e.preventDefault();
  });
  window.addEventListener('pointermove', (e) => {
    if (panPointer === null || e.pointerId !== panPointer) return;
    if (modelDrag > 0) { panPointer = null; return; }
    // inverted on both axes: dragging right pulls the scene in from the left,
    // dragging up pulls it in from below
    const dx = -(e.clientX - lastPanX) / window.innerWidth;
    const dy = (e.clientY - lastPanY) / window.innerHeight;
    lastPanX = e.clientX;
    lastPanY = e.clientY;
    panVel.x = dx;
    panVel.y = dy;
    pan.x += dx;
    pan.y += dy;
  });
  window.addEventListener('pointerup', (e) => {
    if (e.pointerId === panPointer) panPointer = null;
  });

  let last = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const k = 1 - Math.pow(EASE, dt);
    eased.x += (target.x - eased.x) * k;
    eased.y += (target.y - eased.y) * k;

    // pan: apply momentum after release, clamp, then ease the applied value
    if (panPointer === null) {
      pan.x += panVel.x;
      pan.y += panVel.y;
      panVel.x *= PAN_FRICTION;
      panVel.y *= PAN_FRICTION;
    }
    pan.x = Math.max(-PAN_MAX, Math.min(PAN_MAX, pan.x));
    pan.y = Math.max(-PAN_MAX, Math.min(PAN_MAX, pan.y));
    const kp = 1 - Math.exp(-dt / PAN_SMOOTH);
    panEased.x += (pan.x - panEased.x) * kp;
    panEased.y += (pan.y - panEased.y) * kp;

    for (let i = 0; i < attached.length; i++) {
      const a = attached[i];
      const o = offsetFor(a.depth, a.pan);
      // add only the delta so we never clobber a camera base position the
      // module may have set (e.g. a model-fit distance).
      a.camera.position.x += o.x - a.px;
      a.camera.position.y += o.y - a.py;
      a.px = o.x;
      a.py = o.y;
    }
  })(last);
}

// Recompute a canvas's atmospheric haze for an (effective) depth. Exported so
// a layer can pull itself into focus as it comes forward — e.g. the globe zooms
// in toward the end of the page and should sharpen instead of staying soft.
export function setHaze(canvas, depth) {
  const el = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
  if (!el) return;
  const blur = (depth * (BLUR[el.id] ?? 2.2)).toFixed(2);
  const bright = (1 - depth * 0.30).toFixed(3);
  const sat = (1 - depth * 0.25).toFixed(3);
  el.style.filter = `blur(${blur}px) brightness(${bright}) saturate(${sat})`;
}

// Register a scene camera for parallax and apply its canvas haze.
export function attachDepth(camera, canvas) {
  const id = typeof canvas === 'string' ? canvas : (canvas && canvas.id);
  const depth = DEPTH[id] ?? 0.4;

  setHaze(canvas, depth);

  attached.push({ camera, depth, pan: PAN_MULT[id] ?? 1, px: 0, py: 0 });
  start();
}

// For layers that prefer to move a group instead of the camera.
export function pointerOffset(depth) {
  start();
  return offsetFor(depth, 1);
}

// Model modules call these around their own drag so the space-pan gesture is
// suppressed while the user is rotating a model.
export function beginModelDrag() {
  modelDrag++;
}
export function endModelDrag() {
  modelDrag = Math.max(0, modelDrag - 1);
}

