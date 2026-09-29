// Reggie: spectator in his pen. Listens to game events, never touches game physics.
import React, {useMemo, useRef, useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {BoxGeometry, PlaneGeometry, MeshBasicMaterial, CanvasTexture} from 'three';
import {createBrain, send, force, tick, STATES} from './reggieBrain.js';
import ReggiePlaceholder from './ReggiePlaceholder.js';
const h = React.createElement;

const PEN_W = 2.9, GLITTER = 90, GLITTER_LIFE = 2.2;
// Pen placement: top-right, clear of the drop lane when the screen is wide enough.
const PEN_SCALE = 1.3, PEN_Y = 2.5, LANE_EDGE = 3.7, PEN_MIN_X = 2.3;
const REST = {neck: 0, tail: 0};   // flat model: head/neck rest at 0
const BUBBLES = {cheer: 'ROIT!', laugh: 'HA HA HA'};

function bubbleTexture(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0a0c'; g.fillRect(8, 8, 240, 88);
  g.fillStyle = '#ffffff'; g.fillRect(14, 14, 228, 76);
  g.beginPath(); g.moveTo(60, 90); g.lineTo(52, 120); g.lineTo(90, 90); g.fill();
  g.fillStyle = '#0b0a0c'; g.font = 'bold 44px Anton, Impact, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 54);
  return new CanvasTexture(c);
}

// Poses read the brain; each state owns its motion. Add a case to add a reaction.
function pose(rig, brain, jitter) {
  const t = brain.time, s = brain.state;
  const env = STATES[s].duration ? Math.sin(Math.PI * Math.min(1, t / STATES[s].duration)) : 0;
  const [fa, fb] = rig.frontLegs, [ha, hb] = rig.hindLegs;
  rig.root.position.set(brain.x, 0, 0);
  rig.root.scale.x = brain.facing;
  rig.body.rotation.z = 0; rig.neck.rotation.set(0, 0, REST.neck); rig.head.rotation.set(0, 0, 0);
  rig.tail.rotation.z = REST.tail;
  for (const leg of [fa, fb, ha, hb]) leg.rotation.z = 0;

  if (s === 'idle' && brain.fidget) {
    const f = brain.fidget, e = Math.sin(Math.PI * f.time / f.duration);
    if (f.kind === 'pace' && brain.moving) {
      const swing = Math.sin(f.time * 14) * .35;
      fa.rotation.z = ha.rotation.z = swing; fb.rotation.z = hb.rotation.z = -swing;
      rig.root.position.y = Math.abs(Math.sin(f.time * 14)) * .025;
      rig.neck.rotation.z = REST.neck + Math.sin(f.time * 14) * .05;
    } else if (f.kind === 'look') {
      // Turn toward the player (screen left), then sigh back.
      rig.neck.rotation.z = REST.neck - .25 * e;               // crane down at the player
      rig.head.rotation.z = Math.sin(f.time * 5) * .06 * e;
    } else if (f.kind === 'tap') {
      fa.rotation.z = -Math.abs(Math.sin(f.time * 11)) * .45;
      rig.head.rotation.z = -.15 * e;
      rig.tail.rotation.z = Math.sin(f.time * 16) * .25;
    }
  } else if (s === 'cheer') {
    rig.body.rotation.z = .6 * env;                                   // rear up
    rig.root.position.y = Math.max(0, Math.sin(t * 7)) * .18 * env;   // little hops
    fa.rotation.z = Math.sin(t * 22) * .6 * env; fb.rotation.z = -fa.rotation.z;
    rig.neck.rotation.z = REST.neck - .6 * env + Math.sin(t * 13) * .3 * env;
    rig.tail.rotation.z = .8 * env;
  } else if (s === 'laugh') {
    rig.root.position.x += Math.sin(t * 43) * .035 * env;             // body shake
    rig.body.rotation.z = (-.08 + Math.sin(t * 26) * .06) * env;
    rig.neck.rotation.z = REST.neck + (.35 + Math.sin(t * 15) * .45) * env; // head thrown back + bob
    rig.head.rotation.z = Math.sin(t * 15) * .3 * env;
    fa.rotation.z = Math.abs(Math.sin(t * 9)) * -.9 * env;           // knee slap
    rig.tail.rotation.z = Math.sin(t * 20) * .5 * env;
  } else if (s === 'scoot') {
    const pull = Math.sin(t * 9), sit = Math.min(1, t * 5, (STATES.scoot.duration - t) * 5);
    rig.root.position.y = -.17 * sit;
    rig.body.rotation.z = .55 * sit;
    ha.rotation.z = hb.rotation.z = 1.1 * sit;                        // hind legs forward, butt down
    fa.rotation.z = fb.rotation.z = (-.55 + pull * .35) * sit;         // front legs drag
    rig.neck.rotation.z = REST.neck + pull * .12 * sit;
    rig.head.rotation.z = jitter * .08;
    rig.tail.rotation.z = -.4 * sit;
  }
}

export default function Reggie({reactions, active}) {
  const rig = useMemo(() => ({}), []);
  const brain = useRef(createBrain());
  const sparks = useRef([]), bubble = useRef(), pen = useRef();
  const glitter = useMemo(() => Array.from({length: GLITTER}, () => ({life: 0, x: 0, y: 0, spin: 0})), []);
  const a = useMemo(() => ({
    box: new BoxGeometry(1, 1, 1), plane: new PlaneGeometry(1.1, .55),
    rail: new MeshBasicMaterial({color: '#39ff6e'}), post: new MeshBasicMaterial({color: '#e51e59'}),
    floor: new MeshBasicMaterial({color: '#2a2530'}),
    sparks: ['#ff008c', '#ffe84d', '#ffffff', '#ff4fa3'].map(color => new MeshBasicMaterial({color})),
    bubbles: Object.fromEntries(Object.entries(BUBBLES).map(([k, text]) =>
      [k, new MeshBasicMaterial({map: bubbleTexture(text), transparent: true, toneMapped: false})]))
  }), []);
  useEffect(() => () => {
    a.box.dispose(); a.plane.dispose();
    [a.rail, a.post, a.floor, ...a.sparks].forEach(m => m.dispose());
    Object.values(a.bubbles).forEach(m => { m.map.dispose(); m.dispose(); });
  }, [a]);
  useEffect(() => reactions.subscribe(type => type.startsWith('force:') ? force(brain.current, type.slice(6)) : send(brain.current, type)), [reactions]);

  const emitAcc = useRef(0);
  useFrame(({camera, size}, delta) => {
    const halfW = size.width / (2 * camera.zoom), penHalf = PEN_W / 2 * PEN_SCALE + .15;
    pen.current.position.x = Math.max(PEN_MIN_X, Math.min(LANE_EDGE + penHalf, halfW - penHalf));
    if (!active.current || !rig.root) return;
    const dt = Math.min(delta, .1), b = brain.current;
    tick(b, dt);
    pose(rig, b, Math.random() - .5);

    // Pink glitter skid while the butt is actually dragging.
    if (b.state === 'scoot' && b.moving) {
      emitAcc.current += dt * 70;
      for (const g of glitter) {
        if (emitAcc.current < 1) break;
        if (g.life > 0) continue;
        g.life = GLITTER_LIFE; g.x = b.x - b.facing * .3 + (Math.random() - .5) * .12;
        g.y = .03 + Math.random() * .06; g.spin = Math.random() * 6; emitAcc.current -= 1;
      }
    }
    glitter.forEach((g, i) => {
      const mesh = sparks.current[i];
      g.life = Math.max(0, g.life - dt);
      mesh.visible = g.life > 0;
      if (!mesh.visible) return;
      const k = g.life / GLITTER_LIFE;
      mesh.position.set(g.x, g.y + Math.sin(g.spin + g.life * 9) * .015, .15);
      mesh.rotation.z = g.spin + g.life * 4;
      mesh.scale.setScalar(.09 * k + .02);
    });

    const text = BUBBLES[b.state], bub = bubble.current;
    bub.visible = !!text && b.time > .1;
    if (bub.visible) {
      bub.material = a.bubbles[b.state];
      bub.position.set(Math.max(-.55, Math.min(.55, b.x)) + .35, 1.45, .4);
      bub.scale.setScalar(Math.min(1, b.time * 6));
    }
  });

  const posts = [-1.45, -.72, 0, .72, 1.45];
  return h('group', {ref: pen, position: [PEN_MIN_X, PEN_Y, -1.2], scale: PEN_SCALE},
    h('mesh', {geometry: a.box, material: a.floor, position: [0, -.04, 0], scale: [PEN_W + .1, .08, .9]}),
    posts.map(x => h('mesh', {key: x, geometry: a.box, material: a.post, position: [x, .3, .42], scale: [.07, .6, .07]})),
    h('mesh', {geometry: a.box, material: a.rail, position: [0, .52, .42], scale: [PEN_W, .05, .04]}),
    h('mesh', {geometry: a.box, material: a.rail, position: [0, .26, .42], scale: [PEN_W, .05, .04]}),
    glitter.map((_, i) => h('mesh', {key: 'g' + i, ref: el => { sparks.current[i] = el; }, geometry: a.box,
      material: a.sparks[i % a.sparks.length], visible: false})),
    h(ReggiePlaceholder, {rig}),
    h('mesh', {ref: bubble, geometry: a.plane, material: a.bubbles.laugh, visible: false}));
}

// Tiny pub/sub so the game can announce events without knowing who listens.
export function createReactions() {
  const listeners = new Set();
  return {
    emit(type) { listeners.forEach(fn => fn(type)); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
}

