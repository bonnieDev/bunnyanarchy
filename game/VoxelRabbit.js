import React, {useMemo, useRef, useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {BoxGeometry, MeshBasicMaterial} from 'three';
import {createMovement, move, hop, RABBIT} from './playerMovement.js';
const h = React.createElement;
// Pixel grid derived from RabBit: split hooked ears, tan brow pixels,
// black rectangular eye sockets and a broad, uninterrupted lower jaw.
const parts = [
  // Little legs and chunky torso / arms.
  [-.28,.12,.08,.32,.24,.5,0], [.28,.12,.08,.32,.24,.5,0],
  [0,.57,0,.72,.66,.44,0],
  [-.49,.59,0,.22,.42,.38,0], [.49,.59,0,.22,.42,.38,0],
  [0,.62,.23,.12,.3,.025,1],
  // Recessed black head, pink brow, bridge, cheek rails and jaw.
  [0,1.23,-.04,1.1,.78,.42,1],
  [0,1.59,.02,1.1,.16,.5,0],
  [-.625,1.27,.02,.15,.48,.5,0], [.625,1.27,.02,.15,.48,.5,0],
  [0,1.43,.02,.15,.16,.5,0],
  [0,1.19,.02,.76,.32,.5,0],
  [0,.95,.02,1.1,.16,.5,0],
  [-.175,1.625,.295,.15,.15,.06,2], [.175,1.625,.295,.15,.15,.06,2],
  // Ears float one pixel above the brow, as in the supplied sprite.
  [-.325,2.075,0,.15,.35,.3,0], [.325,2.075,0,.15,.35,.3,0],
  [-.475,2.075,0,.15,.15,.3,0], [.475,2.075,0,.15,.15,.3,0]
];
export default function VoxelRabbit({input, active, movement}) {
  const root = useRef(), visual = useRef();
  const ownMovement = useRef(createMovement());
  const state = movement || ownMovement;
  const assets = useMemo(() => ({geometry: new BoxGeometry(1,1,1), materials: ['#ff008c','#090909','#b99062'].map(color => new MeshBasicMaterial({color}))}), []);
  useEffect(() => () => { assets.geometry.dispose(); assets.materials.forEach(m => m.dispose()); }, [assets]);
  useFrame((_, delta) => {
    if (!active.current) return;
    const m = state.current;
    if (input.hop) hop(m);
    input.hop = false;
    move(m, Number(input.right) - Number(input.left), delta);
    root.current.position.set(m.x, m.y - .98, 0);
    const squash = m.landing / .2;
    const stretch = m.grounded ? 0 : .06 * Math.max(0, m.vy / RABBIT.jump);
    visual.current.scale.set(1 + squash * .12 - stretch / 2, 1 - squash * .16 + stretch, 1);
    // Sheerly cosmetic; movement and collision dimensions remain stable.
    visual.current.rotation.z = -.045 * m.vx / RABBIT.speed;
    visual.current.rotation.y = .12 + .08 * m.vx / RABBIT.speed;
  });
  return h('group', {ref: root, position:[0,-.98,0]},
    h('group', {ref: visual, dispose:null}, ...parts.map(([x,y,z,w,ht,d,c], key) =>
      h('mesh', {key, geometry:assets.geometry, material:assets.materials[c], position:[x,y,z], scale:[w,ht,d]}))));
}
