// Catch-the-drop rules. Pure state + events; knows nothing about rendering or Reggie.
import {getCollisionBounds, RABBIT} from './playerMovement.js';

export const PRODUCT_TYPES = ['sticker', 'cap', 'mug', 'tee'];
export const GAME = Object.freeze({
  lives: 3, pool: 10, half: .3,        // product collision half-size
  floor: -1, spawnY: 5.2,              // world y: platform top, spawn height
  left: -3.3, right: 3.3,              // spawn lane
  feetY: -.98,                         // rabbit feet offset in world (see VoxelRabbit)
  cheerEvery: 4,                       // consecutive catches per "streak" event
  rampSeconds: 90                      // time to reach full difficulty
});

const lerp = (a, b, t) => a + (b - a) * t;

export function createGame() {
  return {
    status: 'playing', score: 0, streak: 0, lives: GAME.lives, time: 0,
    spawnIn: .9, lastX: 0, interval: 1.35,
    products: Array.from({length: GAME.pool}, () => ({active: false, type: 0, x: 0, y: 0, vy: 0, rot: 0, spin: 0}))
  };
}

export function resetGame(game) {
  const fresh = createGame();
  fresh.products = game.products;
  fresh.products.forEach(p => { p.active = false; });
  return Object.assign(game, fresh);
}

function spawn(game, d) {
  const slot = game.products.find(p => !p.active);
  if (!slot) return;
  // Keep each drop reachable from the last one so misses feel fair.
  const reach = RABBIT.speed * game.interval * .8;
  const x = Math.max(GAME.left, Math.min(GAME.right, game.lastX + (Math.random() * 2 - 1) * reach));
  Object.assign(slot, {
    active: true, type: Math.floor(Math.random() * PRODUCT_TYPES.length),
    x, y: GAME.spawnY, vy: lerp(1.8, 4, d) + Math.random() * .4,
    rot: 0, spin: (Math.random() * 2 - 1) * 2.5
  });
  game.lastX = x;
}

const bounds = {};
// emit(type, detail): 'catch' | 'streak' | 'miss' | 'gameover'
export function updateGame(game, rabbit, delta, emit) {
  if (game.status !== 'playing') return;
  const dt = Math.min(delta, .1), d = Math.min(1, game.time / GAME.rampSeconds);
  game.time += dt;
  game.spawnIn -= dt;
  if (game.spawnIn <= 0) {
    spawn(game, d);
    game.interval = lerp(1.35, .6, d);
    game.spawnIn = game.interval * (.8 + Math.random() * .4);
  }
  getCollisionBounds(rabbit, bounds);
  const s = GAME.half, bottom = bounds.bottom + GAME.feetY, top = bounds.top + GAME.feetY;
  for (const p of game.products) {
    if (!p.active) continue;
    p.y -= p.vy * dt;
    p.rot += p.spin * dt;
    if (p.x + s > bounds.left && p.x - s < bounds.right && p.y - s < top && p.y + s > bottom) {
      p.active = false; game.score += 1; game.streak += 1;
      emit('catch', {score: game.score, streak: game.streak});
      if (game.streak % GAME.cheerEvery === 0) emit('streak', {streak: game.streak});
    } else if (p.y + s < GAME.floor) {
      p.active = false; game.streak = 0; game.lives -= 1;
      emit('miss', {lives: game.lives});
      if (game.lives <= 0) {
        game.status = 'over';
        game.products.forEach(q => { q.active = false; });
        emit('gameover', {score: game.score});
        return;
      }
    }
  }
}
