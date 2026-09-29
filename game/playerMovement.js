// World units; feet are the origin. Stable collision bounds exclude visual wobble.
export const RABBIT = Object.freeze({halfWidth: .72, height: 2.25, speed: 5.8, acceleration: 58, deceleration: 42, jump: 7, gravity: 27});
export function createMovement() { return {x: 0, y: 0, vx: 0, vy: 0, grounded: true, landing: 0}; }
export function hop(state) {
  if (!state.grounded) return false;
  state.vy = RABBIT.jump; state.grounded = false; state.landing = 0;
  return true;
}
export function move(state, direction, delta, left = -4, right = 4) {
  let remaining = Math.max(0, Math.min(delta, .1));
  const target = Math.max(-1, Math.min(1, direction)) * RABBIT.speed;
  const rate = direction ? RABBIT.acceleration : RABBIT.deceleration;
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 120); remaining -= dt;
    state.landing = Math.max(0, state.landing - dt);
    state.vx += Math.sign(target - state.vx) * Math.min(Math.abs(target - state.vx), rate * dt);
    state.x += state.vx * dt;
    const limit = Math.max(0, (right - left) / 2 - RABBIT.halfWidth);
    const center = (left + right) / 2;
    state.x = Math.max(center - limit, Math.min(center + limit, state.x));
    if ((state.x <= center - limit && state.vx < 0) || (state.x >= center + limit && state.vx > 0)) state.vx = 0;
    if (!state.grounded) {
      state.y += state.vy * dt - .5 * RABBIT.gravity * dt * dt;
      state.vy -= RABBIT.gravity * dt;
      if (state.y <= 0) { state.y = 0; state.vy = 0; state.grounded = true; state.landing = .2; }
    }
  }
  return state;
}
export function getCollisionBounds(state, out = {}) {
  out.left = state.x - .62; out.right = state.x + .62;
  out.bottom = state.y; out.top = state.y + RABBIT.height;
  return out;
}
