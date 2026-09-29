// Reggie's page-load stunt: leaps onto the hero stickers, skids, does a headspin
// on his horn with lightning, then perches on "Roit." Plain DOM/SVG, no game bundle.
(() => {
  const hero = document.querySelector('.hero');
  const roit = hero && hero.querySelector('.st-roit');
  const wot = hero && hero.querySelector('.st-wot');
  if (!roit || !wot) return;

  const INK = '#0b0a0c', GLITTER = ['#ff008c', '#e51e59', '#ffe84d', '#ffffff', '#ff4fa3'];
  // Same facets as the game's Reggie (source drawing pixels, facing left).
  const POLYS = [
    [[626,418],[705,383],[742,548],[650,470]],                               // tail
    [[505,612],[578,662],[525,745]], [[585,668],[655,732],[612,795]],        // hind legs
    [[183,548],[242,608],[242,665],[155,748]], [[238,605],[330,683],[268,800]], // front legs
    [[438,390],[608,408],[520,605],[348,635],[330,682]],
    [[608,408],[640,440],[668,590],[655,730],[520,605]],                     // body
    [[160,520],[435,388],[330,682],[238,605]],                               // chest
    [[290,280],[305,88],[375,185],[435,385],[160,520],[215,320]],            // neck
    [[262,108],[268,66],[345,62],[430,140],[440,385],[375,185],[305,88]],    // mane
    [[82,25],[200,128],[165,168]],                                           // horn
    [[160,168],[305,88],[290,280],[90,365],[35,293]]                         // head
  ];
  const VB = {x: 20, y: 10, w: 740, h: 800}, HORN = [82, 25];
  const W = 86, H = W * VB.h / VB.w;
  const svg = `<svg viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" width="${W}" height="${H}" aria-hidden="true">
    <g fill="#fff" stroke="${INK}" stroke-width="13" stroke-linejoin="round">
      ${POLYS.map(p => `<polygon points="${p.join(' ')}"/>`).join('')}</g>
    <line x1="178" y1="225" x2="237" y2="225" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>
    <path d="M193 225 a16 16 0 0 0 32 0z" fill="${INK}"/><circle cx="97" cy="305" r="12" fill="${INK}"/></svg>`;

  // Horn tip relative to the feet anchor (bottom-center of the drawing).
  const TIP = {x: (HORN[0] - VB.x) / VB.w * W - W / 2, y: (HORN[1] - VB.y) / VB.h * H - H};

  const wrap = document.createElement('div');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.style.cssText = 'position:absolute;left:0;top:0;z-index:4;pointer-events:none;will-change:transform';
  const inner = document.createElement('div');
  inner.style.cssText = `position:absolute;left:${-W / 2}px;top:${-H}px;width:${W}px;height:${H}px;transform-origin:50% 100%`;
  inner.innerHTML = svg;
  wrap.append(inner);

  let pos = {x: 0, y: 0}, face = 1, perchOffset = 0, perched = false;
  const place = p => { pos = p; wrap.style.transform = `translate(${p.x}px,${p.y}px)`; };
  const pose = extra => { inner.style.transform = `scaleX(${face}) ${extra || ''}`; };
  const top = (el, along = .5) => {
    const r = el.getBoundingClientRect(), h = hero.getBoundingClientRect();
    return {x: r.left - h.left + r.width * along, y: r.top - h.top + 4};
  };
  const tween = (ms, fn) => new Promise(done => {
    const start = performance.now();
    const step = now => { const t = Math.min(1, (now - start) / ms); fn(t); t < 1 ? requestAnimationFrame(step) : done(); };
    requestAnimationFrame(step);
  });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - (1 - t) ** 3;

  function glitter(x, y, burst = 1) {
    for (let i = 0; i < burst; i++) {
      const g = document.createElement('i'), s = 4 + Math.random() * 5;
      g.style.cssText = `position:absolute;left:${x + (Math.random() - .5) * 14}px;top:${y - Math.random() * 6}px;width:${s}px;height:${s}px;background:${GLITTER[Math.floor(Math.random() * GLITTER.length)]};z-index:3;pointer-events:none`;
      hero.append(g);
      const dx = (Math.random() - .5) * 30, dy = -10 - Math.random() * 25, r = Math.random() * 540;
      g.animate([
        {transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1},
        {transform: `translate(${dx * .3}px,${dy * .2}px) rotate(${r * .4}deg) scale(1)`, opacity: 1, offset: .45},
        {transform: `translate(${dx}px,${dy}px) rotate(${r}deg) scale(.2)`, opacity: 0}
      ], {duration: 1400 + Math.random() * 900, easing: 'ease-out'}).finished.then(() => g.remove());
    }
  }

  function bolt(x, y, angle) {
    const b = document.createElement('div');
    b.innerHTML = `<svg viewBox="0 0 22 34" width="22" height="34"><path d="M13 1 3 18h8l-4 15 13-20h-8l5-12z" fill="#ffe84d" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></svg>`;
    b.style.cssText = `position:absolute;left:${x - 11}px;top:${y - 17}px;width:22px;height:34px;z-index:5;pointer-events:none`;
    hero.append(b);
    const dx = Math.cos(angle) * 55, dy = Math.sin(angle) * 55, rot = angle * 180 / Math.PI + 90;
    b.animate([
      {transform: `rotate(${rot}deg) scale(.2)`, opacity: 1},
      {transform: `translate(${dx * .6}px,${dy * .6}px) rotate(${rot}deg) scale(1.3)`, opacity: 1, offset: .35},
      {transform: `translate(${dx}px,${dy}px) rotate(${rot}deg) scale(.9)`, opacity: 0}
    ], {duration: 520, easing: 'ease-out'}).finished.then(() => b.remove());
  }

  function bump(sticker) {
    const base = getComputedStyle(sticker).transform;
    sticker.animate([{transform: base}, {transform: `${base} translateY(5px)`}, {transform: base}], {duration: 260, easing: 'ease-out'});
  }

  async function leap(to, ms, height) {
    const from = {...pos};
    await tween(ms, t => {
      place({x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) - height * 4 * t * (1 - t)});
      pose(`rotate(${-14 * Math.sin(Math.PI * t)}deg)`);
    });
  }
  async function land(sticker) {
    bump(sticker); glitter(pos.x, pos.y, 8);
    await tween(220, t => pose(`scale(${1 + .14 * Math.sin(Math.PI * t)},${1 - .16 * Math.sin(Math.PI * t)})`));
  }
  async function skid(dx, ms) {
    const from = pos.x;
    await tween(ms, t => {
      place({x: from + dx * easeOut(t), y: pos.y});
      pose(`rotate(${4 * (1 - t)}deg)`);
      if (t < .9) glitter(pos.x - Math.sign(dx) * W * .35, pos.y, 2);   // butt/heels drag glitter
    });
  }
  async function headspin(target) {
    // Hop onto the horn: rotate 180° about the tip while the tip settles on the sticker.
    inner.style.transformOrigin = `${TIP.x + W / 2}px ${TIP.y + H}px`;
    const feet = {...pos}, flipped = {x: target.x - TIP.x, y: target.y - TIP.y};
    await tween(380, t => {
      const e = easeOut(t);
      place({x: lerp(feet.x, flipped.x, e), y: lerp(feet.y, flipped.y, e) - 40 * Math.sin(Math.PI * t)});
      pose(`rotate(${180 * e}deg)`);
    });
    bump(wot);
    let nextBolt = 0;
    await tween(1500, t => {
      pose(`rotate(180deg) scaleX(${Math.cos(t * Math.PI * 9)})`);          // fake 3D spin
      if (t >= nextBolt) {
        bolt(target.x, target.y, -Math.PI / 2 + (Math.random() - .5) * 2.4);
        glitter(target.x, target.y, 4); nextBolt += .3;
      }
    });
    await tween(380, t => {
      const e = easeOut(t);
      place({x: lerp(flipped.x, feet.x, e), y: lerp(flipped.y, feet.y, e) - 40 * Math.sin(Math.PI * t)});
      pose(`rotate(${180 * (1 - e)}deg)`);
    });
    inner.style.transformOrigin = '50% 100%';
    pose();
  }

  async function show() {
    hero.append(wrap);
    const heroW = hero.clientWidth;
    let r = top(roit, .6);
    place({x: heroW + 90, y: r.y - 80}); pose();
    await leap(r, 850, 70); await land(roit); await skid(-26, 420);
    await wait(250);
    await leap(top(wot, .5), 1050, 95); await land(wot);
    await wait(150);
    await headspin(top(wot, .5));
    await wait(200);
    face = -1; pose();
    r = top(roit, .45);
    await leap(r, 950, 85); await land(roit); await skid(22, 380);
    await wait(500);
    face = 1; pose();
    perchOffset = pos.x - top(roit, 0).x;
    perched = true;
  }

  function perchNow() {
    hero.append(wrap); pose();
    perchOffset = top(roit, .55).x - top(roit, 0).x;
    place({x: top(roit, 0).x + perchOffset, y: top(roit).y});
    perched = true;
  }
  addEventListener('resize', () => {
    if (!perched || !roit.getClientRects().length) return;   // don't yank him mid-stunt
    wrap.style.display = '';
    place({x: top(roit, 0).x + perchOffset, y: top(roit).y});
  });
  const hiddenStickers = () => !roit.getClientRects().length;  // stickers hidden on small screens

  const start = () => {
    if (hiddenStickers()) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { perchNow(); return; }
    setTimeout(show, 450);
  };
  const ready = () => (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
  document.readyState === 'complete' ? ready() : addEventListener('load', ready, {once: true});
  new ResizeObserver(() => { wrap.style.display = hiddenStickers() ? 'none' : ''; }).observe(hero);
})();
