// Reggie, traced from Bonnie's origami line drawing (flat paper facets, heavy ink lines).
// Swap this file for a finished model/SVG later.
//
// Rig contract (what Reggie.js animates) — any replacement must fill these refs on
// the `rig` object, facing +x, feet at y = 0, neck/head resting at rotation 0:
//   rig.root                    whole character (x, hop, facing flip)
//   rig.body                    pivot at the hip; +rotation.z rears the front up
//   rig.neck, rig.head          head motion (neck is a child of body)
//   rig.tail
//   rig.frontLegs[0..1]         pivots at shoulders (children of body)
//   rig.hindLegs[0..1]          pivots at hips (children of root)
import React, {useMemo, useEffect} from 'react';
import {PlaneGeometry, MeshBasicMaterial, CanvasTexture, SRGBColorSpace} from 'three';
const h = React.createElement;

// Coordinates below are pixels in the source drawing (870x800, facing left).
const PX = 700, OX = 400, OY = 800;          // 700px = 1 world unit; feet at y 800
const unit = ([x, y]) => [(OX - x) / PX, (OY - y) / PX];   // mirrored so he faces +x
const INK = '#0b0a0c', PAPER = '#ffffff', LINE = 12, RES = .6;

const PIVOT = {hip: [560, 600], neck: [320, 290], tail: [628, 420],
  frontA: [200, 560], frontB: [250, 615], hindA: [525, 612], hindB: [590, 665]};

const PARTS = {
  horn:   {pivot: 'neck', z: .004, polys: [[[82,25],[200,128],[165,168]]]},
  mane:   {pivot: 'neck', z: -.004, polys: [[[262,108],[268,66],[345,62],[430,140],[440,385],[375,185],[305,88]]]},
  head:   {pivot: 'neck', z: .012, polys: [[[160,168],[305,88],[290,280],[90,365],[35,293]]],
           dots: [[97,305,12]], lid: [178,237,225,16]},
  neck:   {pivot: 'hip', z: .006, polys: [[[290,280],[305,88],[375,185],[435,385],[160,520],[215,320]]]},
  chest:  {pivot: 'hip', z: .008, polys: [[[160,520],[435,388],[330,682],[238,605]]]},
  body:   {pivot: 'hip', z: 0, polys: [[[438,390],[608,408],[520,605],[348,635],[330,682]],
           [[608,408],[640,440],[668,590],[655,730],[520,605]]]},
  tail:   {pivot: 'tail', z: -.01, polys: [[[626,418],[705,383],[742,548],[650,470]]]},
  frontA: {pivot: 'frontA', z: -.006, polys: [[[183,548],[242,608],[242,665],[155,748]]]},
  frontB: {pivot: 'frontB', z: -.006, polys: [[[238,605],[330,683],[268,800]]]},
  hindA:  {pivot: 'hindA', z: -.008, polys: [[[505,612],[578,662],[525,745]]]},
  hindB:  {pivot: 'hindB', z: -.008, polys: [[[585,668],[655,732],[612,795]]]}
};

// Draw one part onto its own canvas; return a plane placed relative to its pivot.
function build(part) {
  const pts = part.polys.flat(), pad = LINE + 4;
  const minX = Math.min(...pts.map(p => p[0])) - pad, maxX = Math.max(...pts.map(p => p[0])) + pad;
  const minY = Math.min(...pts.map(p => p[1])) - pad, maxY = Math.max(...pts.map(p => p[1])) + pad;
  const c = document.createElement('canvas');
  c.width = Math.ceil((maxX - minX) * RES); c.height = Math.ceil((maxY - minY) * RES);
  const g = c.getContext('2d');
  g.scale(RES, RES); g.translate(maxX, -minY); g.scale(-1, 1);  // mirror to face +x
  g.lineJoin = g.lineCap = 'round'; g.lineWidth = LINE; g.strokeStyle = INK;
  for (const poly of part.polys) {
    g.beginPath(); poly.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
    g.fillStyle = PAPER; g.fill(); g.stroke();
  }
  g.fillStyle = INK;
  for (const [x, y, r] of part.dots || []) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  if (part.lid) {   // the bored half-lidded eye
    const [x1, x2, y, r] = part.lid;
    g.lineWidth = LINE - 1; g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke();
    g.beginPath(); g.arc((x1 + x2) / 2 + 2, y, r, 0, Math.PI); g.fill();
  }
  const map = new CanvasTexture(c); map.colorSpace = SRGBColorSpace;
  const [cx, cy] = unit([(minX + maxX) / 2, (minY + maxY) / 2]), [px, py] = unit(PIVOT[part.pivot]);
  return {
    geometry: new PlaneGeometry((maxX - minX) / PX, (maxY - minY) / PX),
    material: new MeshBasicMaterial({map, alphaTest: .5, toneMapped: false}),
    position: [cx - px, cy - py, part.z]
  };
}

export default function ReggiePlaceholder({rig}) {
  const parts = useMemo(() => Object.fromEntries(Object.entries(PARTS).map(([k, p]) => [k, build(p)])), []);
  useEffect(() => () => Object.values(parts).forEach(p => { p.geometry.dispose(); p.material.map.dispose(); p.material.dispose(); }), [parts]);
  const set = (key, i) => el => { if (i === undefined) rig[key] = el; else (rig[key] ||= [])[i] = el; };
  const mesh = name => h('mesh', {key: name, ...parts[name]});
  const at = (pivot, parent) => { const [a, b] = unit(PIVOT[pivot]), [c, d] = parent ? unit(PIVOT[parent]) : [0, 0]; return [a - c, b - d, 0]; };

  return h('group', {ref: set('root')},
    h('group', {ref: set('hindLegs', 0), position: at('hindA')}, mesh('hindA')),
    h('group', {ref: set('hindLegs', 1), position: at('hindB')}, mesh('hindB')),
    h('group', {ref: set('body'), position: at('hip')},
      mesh('body'), mesh('chest'), mesh('neck'),
      h('group', {ref: set('tail'), position: at('tail', 'hip')}, mesh('tail')),
      h('group', {ref: set('frontLegs', 0), position: at('frontA', 'hip')}, mesh('frontA')),
      h('group', {ref: set('frontLegs', 1), position: at('frontB', 'hip')}, mesh('frontB')),
      h('group', {ref: set('neck'), position: at('neck', 'hip')},
        h('group', {ref: set('head')}, mesh('mane'), mesh('horn'), mesh('head')))));
}
