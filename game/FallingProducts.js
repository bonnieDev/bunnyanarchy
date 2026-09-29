import React, {useMemo, useRef, useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {BoxGeometry, MeshBasicMaterial} from 'three';
import {PRODUCT_TYPES, updateGame, resetGame} from './productGame.js';
const h = React.createElement;

const COLORS = ['#e51e59', '#ff008c', '#39ff6e', '#ffe84d', '#f2e9dc', '#2a2530'];
const [PINK, HOT, ACID, NOTE, BONE, MUG] = COLORS.map((_, i) => i);
// Voxel parts per product: [x, y, z, w, h, d, color]
const MODELS = {
  sticker: [[0,0,0,.6,.6,.05,ACID], [0,0,.04,.44,.44,.05,PINK], [0,0,.08,.16,.16,.05,NOTE]],
  cap: [[0,.02,0,.5,.3,.5,PINK], [0,.2,0,.32,.08,.4,PINK], [.34,-.1,.04,.26,.06,.44,HOT], [0,.26,0,.08,.05,.08,NOTE]],
  mug: [[0,0,0,.42,.5,.42,MUG], [0,.03,.22,.44,.14,.02,PINK], [.27,.02,0,.1,.3,.1,MUG], [0,.26,0,.44,.04,.44,BONE]],
  tee: [[0,-.05,0,.44,.5,.08,BONE], [-.3,.13,0,.2,.18,.08,BONE], [.3,.13,0,.2,.18,.08,BONE], [0,.18,.05,.14,.05,.02,PINK], [0,-.04,.05,.26,.09,.02,PINK]]
};

// Runs the product rules each frame and draws a fixed pool of product slots.
export default function FallingProducts({game, rabbit, active, input, emit}) {
  const slots = useRef([]);
  const assets = useMemo(() => ({geometry: new BoxGeometry(1, 1, 1), materials: COLORS.map(color => new MeshBasicMaterial({color}))}), []);
  useEffect(() => () => { assets.geometry.dispose(); assets.materials.forEach(m => m.dispose()); }, [assets]);
  useFrame((_, delta) => {
    if (input.restart) { input.restart = false; resetGame(game); emit('restart', {}); }
    if (!active.current) return;
    updateGame(game, rabbit.current, delta, emit);
    game.products.forEach((p, i) => {
      const slot = slots.current[i];
      slot.visible = p.active;
      if (!p.active) return;
      slot.position.set(p.x, p.y, .3);
      slot.rotation.z = p.rot * .25;
      slot.children.forEach((model, t) => { model.visible = t === p.type; });
    });
  });
  return h('group', null, game.products.map((_, i) =>
    h('group', {key: i, ref: el => { slots.current[i] = el; }, visible: false},
      PRODUCT_TYPES.map(type => h('group', {key: type, visible: false},
        MODELS[type].map(([x, y, z, w, ht, d, c], k) =>
          h('mesh', {key: k, geometry: assets.geometry, material: assets.materials[c], position: [x, y, z], scale: [w, ht, d]})))))));
}

