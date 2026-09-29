// Reggie's behavior: a small state machine plus his own pen movement.
// Completely separate from the product game — he only hears named events.
//
// To add a reaction: add a state to STATES (and a pose in Reggie.js),
// then map a game event to it in REACTIONS.

export const PEN = Object.freeze({half: 1.05});   // walkable half-width in pen space

export const STATES = {
  idle:  {},                                     // mostly still; occasional fidgets
  cheer: {duration: 1.6},                        // rear / buck / hop
  laugh: {duration: 2.1},                        // head-bob mockery
  scoot: {duration: 2.8}                         // butt drag + glitter
};

// event -> {state, chance}. chance < 1 keeps reactions from feeling automatic.
export const REACTIONS = {
  streak:   {state: 'cheer', chance: .85},
  miss:     {state: 'laugh', chance: .9},
  gameover: {state: 'laugh', chance: 1}
};

// Idle fidgets: short, then long stretches of standing still.
const FIDGETS = {pace: 1.8, look: 1.4, tap: 1.1};
const SCOOT = {calmBefore: 9, chance: .25, cooldown: [35, 70], speed: 1.1};

const rand = (a, b) => a + Math.random() * (b - a);

export function createBrain() {
  return {
    state: 'idle', time: 0, pending: null,
    fidget: null, fidgetIn: rand(2, 4), calmFor: 0,
    scootCooldown: rand(12, 20),
    x: .3, facing: -1, moving: false
  };
}

function enter(brain, state) {
  brain.state = state; brain.time = 0; brain.fidget = null; brain.moving = false;
  if (state === 'scoot') {
    // Drag toward whichever side of the pen has more room.
    brain.facing = brain.x > 0 ? -1 : 1;
    brain.scootCooldown = rand(...SCOOT.cooldown);
  }
}

// Returns true if Reggie decided to react.
export function send(brain, type) {
  const reaction = REACTIONS[type];
  if (!reaction || Math.random() > reaction.chance) return false;
  // A beat of delay so the reaction reads as Reggie noticing, not a sound effect.
  brain.pending = {state: reaction.state, in: rand(.12, .4)};
  return true;
}

// Debug / future hooks: jump straight into a state (e.g. from the console).
export function force(brain, state) {
  if (STATES[state]) { brain.pending = null; enter(brain, state); }
}

export function tick(brain, dt) {
  brain.time += dt;
  brain.scootCooldown = Math.max(0, brain.scootCooldown - dt);
  if (brain.pending && (brain.pending.in -= dt) <= 0) {
    enter(brain, brain.pending.state); brain.pending = null; return;
  }
  const def = STATES[brain.state];
  if (def.duration && brain.time >= def.duration) {
    enter(brain, 'idle'); brain.fidgetIn = rand(2.5, 5); brain.calmFor = 0;
  }
  if (brain.state === 'idle') idle(brain, dt);
  else if (brain.state === 'scoot') scoot(brain, dt);
}

function idle(brain, dt) {
  brain.calmFor += dt;
  brain.moving = false;
  if (!brain.fidget) {
    if ((brain.fidgetIn -= dt) > 0) return;
    if (brain.calmFor > SCOOT.calmBefore && brain.scootCooldown === 0 && Math.random() < SCOOT.chance) {
      enter(brain, 'scoot'); return;
    }
    const kinds = Object.keys(FIDGETS), kind = kinds[Math.floor(Math.random() * kinds.length)];
    brain.fidget = {kind, time: 0, duration: FIDGETS[kind], targetX: rand(-PEN.half, PEN.half)};
    if (kind === 'pace') brain.facing = Math.sign(brain.fidget.targetX - brain.x) || brain.facing;
    return;
  }
  const f = brain.fidget;
  f.time += dt;
  if (f.kind === 'pace') {
    const step = Math.sign(f.targetX - brain.x) * Math.min(Math.abs(f.targetX - brain.x), .7 * dt);
    brain.x += step; brain.moving = Math.abs(step) > 1e-4;
  }
  if (f.time >= f.duration) { brain.fidget = null; brain.fidgetIn = rand(2.5, 6.5); }
}

function scoot(brain, dt) {
  // Jerky pulls: forward in bursts, like a dog dragging across the carpet.
  const pull = Math.max(0, Math.sin(brain.time * 9));
  const next = brain.x + brain.facing * SCOOT.speed * pull * dt;
  brain.x = Math.max(-PEN.half, Math.min(PEN.half, next));
  brain.moving = pull > .2 && Math.abs(brain.x) < PEN.half;
}
