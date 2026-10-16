// Adds fling / momentum to a dragged three.js object. While dragging, the
// object spins under the cursor; on release it keeps spinning and coasts to a
// smooth stop instead of halting the instant the pointer lifts.
export function createSpin(options = {}) {
  const sens = options.sensitivity ?? 0.01;
  const damping = options.damping ?? 0.06; // larger = stops sooner
  const max = options.maxSpeed ?? 14;      // rad/sec clamp on the fling

  let vx = 0;
  let vy = 0;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;

  return {
    // Call on pointerdown.
    begin(x, y) {
      lastX = x;
      lastY = y;
      lastT = performance.now();
      vx = 0;
      vy = 0;
    },
    // Call on pointermove while dragging. `target` is any Object3D.
    move(target, x, y) {
      const now = performance.now();
      const dt = Math.max((now - lastT) / 1000, 1e-4);
      const dx = x - lastX;
      const dy = y - lastY;
      lastX = x;
      lastY = y;
      lastT = now;

      const ry = dx * sens;
      const rx = dy * sens;
      target.rotation.y += ry;
      target.rotation.x += rx;

      // remember the angular speed for the coast after release
      vy = Math.max(-max, Math.min(max, ry / dt));
      vx = Math.max(-max, Math.min(max, rx / dt));
    },
    // Call every frame. `dragging` pauses the coast while the pointer is down.
    update(target, dt, dragging) {
      if (dragging) return;
      target.rotation.y += vy * dt;
      target.rotation.x += vx * dt;
      const d = Math.pow(damping, dt);
      vx *= d;
      vy *= d;
      if (Math.abs(vx) < 0.002) vx = 0;
      if (Math.abs(vy) < 0.002) vy = 0;
    },
  };
}
