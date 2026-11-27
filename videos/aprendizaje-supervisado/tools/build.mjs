// Builds index.html and compositions/*.html from tools/data.json.
// Run: node tools/models.mjs && node tools/build.mjs
import fs from 'node:fs';
const D = JSON.parse(fs.readFileSync(new URL('./data.json', import.meta.url)));
const OUT = new URL('../', import.meta.url);

// ---------- geometry: one plane, same place in every scene ----------
const S = 80, PX0 = 150, PY0 = 940;
const X = (x) => +(PX0 + S * x).toFixed(1);
const Y = (y) => +(PY0 - S * y).toFixed(1);
const f2 = (v) => v.toFixed(2);

// ---------- timing ----------
const INTRO = 3.5, SCENE = 6.5, OUTRO = 3.5; // the choreography is authored on these lengths...
// ...then mapped onto the narration: the voice is the clock.
const VSJ = JSON.parse(fs.readFileSync(new URL('./voice_sections.json', import.meta.url)));
const VS = VSJ.sections;
const VOICE_LEN = VSJ.total, LEAD = 0.4, TAIL = 2.2;
const KEYS = ['intro', 'lineal', 'logistica', 'arbol', 'bosque', 'boosting', 'svm', 'knn', 'bayes', 'cierre'];
const PKEY = { in: 'intro', s1: 'lineal', s2: 'logistica', s3: 'arbol', s4: 'bosque', s5: 'boosting', s6: 'svm', s7: 'knn', s8: 'bayes', fin: 'cierre' };
const START = {}, DUR = {};
KEYS.forEach((k, i) => { START[k] = i === 0 ? 0 : +(VS[i].start - LEAD).toFixed(2); });
KEYS.forEach((k, i) => { const next = i < KEYS.length - 1 ? START[KEYS[i + 1]] : VOICE_LEN + TAIL; DUR[k] = +(next - START[k]).toFixed(2); });
const norm = (w) => w.toLowerCase().replace(/[.,:;¿?¡!]/g, '');
function wordAt(key, word, after = 0) {
  const i = KEYS.indexOf(key);
  for (const [w, t] of VS[i].words) { const lt = t - START[key]; if (norm(w) === norm(word) && lt >= after) return lt; }
  throw new Error(`word "${word}" not found in ${key}`);
}
// [authored time, the narrated word it lands on]
const ANCHOR_WORDS = {
  intro: [[0.6, 'casos'], [0.9, 'respuesta'], [1.15, 'eso'], [1.3, 'veamos']],
  lineal: [[0.9, 'traza'], [1.9, 'cerca'], [3.9, 'número'], [4.95, 'cuánto']],
  logistica: [[1.0, 'probabilidad'], [2.3, 'pague'], [3.1, 'dice'], [4.4, 'ochenta']],
  arbol: [[1.1, 'preguntas'], [2.4, 'cuestionario'], [3.9, 'grupos'], [4.3, 'nuestro']],
  bosque: [[0.7, 'entrena'], [3.0, 'votan'], [4.3, 'aquí']],
  boosting: [[1.25, 'uno'], [2.2, 'errores'], [3.15, 'corrige'], [4.5, 'así']],
  svm: [[1.0, 'calle'], [1.5, 'ancha'], [3.1, 'borde'], [3.9, 'nuevo'], [4.4, 'clasifica']],
  knn: [[0.9, 'busca'], [2.0, 'cinco'], [2.5, 'mira'], [4.2, 'tres']],
  bayes: [[0.9, 'calcula'], [1.5, 'separado'], [2.7, 'probabilidad'], [4.2, 'ochenta']],
  cierre: [[1.0, 'aprenden'], [1.6, 'eso']],
};
const ANCH = {};
for (const k of KEYS) {
  const old = k === 'intro' ? INTRO : k === 'cierre' ? OUTRO : SCENE;
  const a = [[0, 0]]; let last = 0;
  for (const [o, w] of ANCHOR_WORDS[k]) { const wt = wordAt(k, w, last); const nt = Math.max(wt - 0.15, a[a.length - 1][1] + 0.2); a.push([o, +nt.toFixed(2)]); last = wt; }
  a.push([old - 0.22, +(DUR[k] - 0.22).toFixed(2)]); a.push([old, DUR[k]]);
  ANCH[k] = a;
}
const mapT = (k, t) => { const a = ANCH[k]; for (let i = 1; i < a.length; i++) if (t <= a[i][0]) { const [o0, n0] = a[i - 1], [o1, n1] = a[i]; return +(n0 + (t - o0) * (n1 - n0) / (o1 - o0)).toFixed(3); } return t; };

// ---------- shared CSS (identical in every scene file) ----------
const CSS = `
#root{position:absolute;inset:0;background:var(--color-ground);overflow:hidden}
.plane{position:absolute;left:0;top:0;width:1920px;height:1080px}
.grid line{stroke:#D3DAE2;stroke-width:1}
.axis{stroke:var(--color-ink);stroke-width:2.5}
.tick{font:400 28px Lato;fill:#556677}
.axt{font:italic 400 38px 'EB Garamond';fill:var(--color-ink)}
.ptA{fill:var(--color-a);stroke:#fff;stroke-width:2}
.ptB{fill:var(--color-b);stroke:#fff;stroke-width:2}
.mdl{stroke:var(--color-ink);stroke-width:3;fill:none}
.dash{stroke:var(--color-ink);stroke-width:2;stroke-dasharray:8 7;fill:none}
.acc{stroke:var(--color-accent);stroke-width:3;fill:none}
.accd{stroke:var(--color-accent);stroke-width:2.5;stroke-dasharray:8 7;fill:none}
.regA{fill:var(--color-a);opacity:0}
.regB{fill:var(--color-b);opacity:0}
.lbl{font:400 28px Lato;fill:var(--color-ink)}
.lblacc{font:700 30px Lato;fill:var(--color-accent)}
.q-ring{fill:var(--color-ground);stroke:var(--color-ink);stroke-width:3}
.q-txt{font:700 24px Lato;fill:var(--color-ink)}
.panel{position:absolute;left:1060px;top:150px;width:740px;color:var(--color-ink)}
.pn-name{font:700 56px Montserrat;letter-spacing:-0.01em;line-height:1.1}
.pn-name span,.pn-line span{display:inline-block}
.pn-aka{font:400 30px Lato;color:#556677;margin-top:12px}
.pn-line{font:400 36px Lato;line-height:1.32;margin-top:30px}
.pn-math{font:italic 400 42px 'EB Garamond';margin-top:26px}
.out{position:absolute;left:1060px;top:640px;width:740px;height:300px;color:var(--color-ink);font:400 30px Lato}
.dec{font:700 36px Montserrat;color:var(--color-accent)}
.row{display:flex;align-items:center;gap:18px;height:46px}
.sw{display:inline-block;width:18px;height:18px}
.swA{background:var(--color-a);border-radius:50%}
.swB{background:var(--color-b)}
.bar{height:22px;background:var(--color-ink)}
.mut{color:#556677}
`;

// ---------- building blocks ----------
function grid(p, { draw = false } = {}) {
  let g = `<g class="grid" id="${p}-grid">`;
  for (let i = 0; i <= 10; i++) {
    g += `<line class="${p}-gl" x1="${X(0)}" y1="${Y(i)}" x2="${X(10)}" y2="${Y(i)}"/>`;
    g += `<line class="${p}-gl" x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(10)}"/>`;
  }
  return g + '</g>';
}
function axes(p, { xt = 'ingresos', yt = 'historial de pagos', yTicks = null } = {}) {
  let s = `<line class="axis" id="${p}-ax" x1="${X(0)}" y1="${Y(0)}" x2="${X(10)}" y2="${Y(0)}"/>`;
  s += `<line class="axis" id="${p}-ay" x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(10)}"/>`;
  for (let i = 0; i <= 10; i += 2) s += `<text class="tick" x="${X(i)}" y="${Y(0) + 40}" text-anchor="middle">${i}</text>`;
  const yt2 = yTicks || [0, 2, 4, 6, 8, 10].map((v) => [v, String(v)]);
  for (const [v, t] of yt2) s += `<text class="tick" x="${X(0) - 16}" y="${Y(v) + 10}" text-anchor="end">${t}</text>`;
  s += `<text class="axt" id="${p}-xt" x="${X(10) + 24}" y="${Y(0) + 12}">${xt}</text>`;
  s += `<text class="axt" id="${p}-yt" x="${X(0) - 40}" y="${Y(10) - 26}">${yt}</text>`;
  return s;
}
function mark(id, cls, x, y, c, extra = '') {
  return c === 0
    ? `<circle id="${id}" class="${cls} ptA" cx="${X(x)}" cy="${Y(y)}" r="11" ${extra}/>`
    : `<rect id="${id}" class="${cls} ptB" x="${X(x) - 10}" y="${Y(y) - 10}" width="20" height="20" ${extra}/>`;
}
const legend = (p) => `<g id="${p}-leg"><circle cx="${X(10) - 250}" cy="${Y(10) - 36}" r="11" class="ptA"/><text class="lbl" x="${X(10) - 232}" y="${Y(10) - 26}">no pagó</text>`
  + `<rect x="${X(10) - 100}" y="${Y(10) - 46}" width="20" height="20" class="ptB"/><text class="lbl" x="${X(10) - 70}" y="${Y(10) - 26}">pagó</text></g>`;
const pts2d = (p) => legend(p) + D.pts.map((q, i) => mark(`${p}-p${i}`, `${p}-pt`, q.x, q.y, q.c)).join('');
function qMark(p, x, y, label = '') {
  return `<g id="${p}-q"><circle id="${p}-qfill" cx="${X(x)}" cy="${Y(y)}" r="17" class="q-ring"/>`
    + `<text id="${p}-qt" class="q-txt" x="${X(x)}" y="${Y(y) + 8}" text-anchor="middle">?</text>`
    + `<text id="${p}-ql" class="lbl" x="${X(x) + 28}" y="${Y(y) - 22}">${label}</text></g>`;
}
const words = (p, cls, text) => text.split(' ').map((w) => `<span class="${p}-${cls}">${w}</span>`).join(' ');
function panel(p, { name, aka = '', line, math = '' }) {
  return `<div class="panel" id="${p}-panel">`
    + `<div class="pn-name" id="${p}-name">${words(p, 'nw', name)}</div>`
    + (aka ? `<div class="pn-aka" id="${p}-aka">${aka}</div>` : '')
    + `<div class="pn-line" id="${p}-line">${words(p, 'lw', line)}</div>`
    + (math ? `<div class="pn-math" id="${p}-math">${math}</div>` : '')
    + `</div>`;
}
// timeline helpers emitted into each scene
const HELPERS = (p, dur, { keepPlane = true } = {}) => `
const _tl = gsap.timeline({ paused: true });
const _A = ${JSON.stringify(ANCH[PKEY[p]])};
const M = (t) => { for (let i = 1; i < _A.length; i++) if (t <= _A[i][0]) { const a = _A[i - 1], b = _A[i]; return a[1] + (t - a[0]) * (b[1] - a[1]) / (b[0] - a[0]); } return t; };
const P = (t) => (typeof t === 'number' ? M(t) : t);
const tl = { to: (a, b, t) => _tl.to(a, b, P(t)), fromTo: (a, b, c, t) => _tl.fromTo(a, b, c, P(t)), set: (a, b, t) => _tl.set(a, b, P(t)) };
const ink = getComputedStyle(document.documentElement).getPropertyValue('--color-ink').trim() || '#16232F';
function panelIn(t0){
  tl.fromTo('.${p}-nw',{opacity:0,filter:'blur(6px)'},{opacity:1,filter:'blur(0px)',duration:0.13,stagger:0.067,ease:'power4.out'},t0);
  if(document.getElementById('${p}-aka')) tl.fromTo('#${p}-aka',{opacity:0},{opacity:1,duration:0.3,ease:'power2.out'},t0+0.25);
  tl.fromTo('.${p}-lw',{color:'#B4BFCA'},{color:ink,duration:0.2,stagger:0.08,ease:'none'},t0+0.35);
  if(document.getElementById('${p}-math')) tl.fromTo('#${p}-math',{opacity:0,filter:'blur(8px)'},{opacity:1,filter:'blur(0px)',duration:0.18,ease:'power4.out'},t0+0.9);
}
function out(sel,t){ tl.to(sel,{opacity:0,filter:'blur(8px)',duration:0.2,ease:'power3.in'},t); }
function inn(sel,t,d=0.25){ tl.fromTo(sel,{opacity:0},{opacity:1,duration:d,ease:'power2.out'},t); }
function blurIn(sel,t){ tl.fromTo(sel,{opacity:0,filter:'blur(8px)'},{opacity:1,filter:'blur(0px)',duration:0.18,ease:'power4.out'},t); }
function drawLine(sel,t,x1,y1,x2,y2,d=0.5,ease='power2.inOut'){ tl.fromTo(sel,{attr:{x1,y1,x2:x1,y2:y1},opacity:1},{attr:{x2,y2},duration:d,ease},t); }
function popQ(t, cls){ // the new data point receives the model's answer
  tl.to('#${p}-qfill',{attr:{r:19},fill:cls===1?'#B8642A':'#2B5D8C',stroke:'#0F7B6C',strokeWidth:5,duration:0.35,ease:'expo.out'},t);
  tl.to('#${p}-qt',{opacity:0,duration:0.1},t);
}
`;
const END = (key) => `window.__timelines["${key}"] = _tl;`;

function sceneFile(key, dur, svg, html, script) {
  return `<template>
  <style>${CSS}</style>
  <div id="root" data-composition-id="${key}" data-width="1920" data-height="1080">
    <svg class="plane" viewBox="0 0 1920 1080" width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="${key}-clip"><rect x="${X(0)}" y="${Y(10)}" width="${10 * S}" height="${10 * S}"/></clipPath></defs>
${svg}
    </svg>
${html}
  </div>
  <script>
${script}
${END(key)}
  </script>
</template>
`;
}

const scenes = [];

// ================= INTRO =================
{
  const p = 'in', Q = D.Q;
  const svg = grid(p) + axes(p, { xt: '', yt: '' }) + pts2d(p) + qMark(p, Q.x, Q.y, 'caso nuevo');
  const html = panel(p, { name: 'Aprendizaje supervisado', line: '¿Cómo decide una IA si aprueba un crédito?' });
  const js = HELPERS(p, INTRO) + `
tl.fromTo('.${p}-nw',{opacity:1},{opacity:1,duration:0.01},0); // title is on screen from frame 0 (thumbnail)
tl.fromTo('.${p}-gl',{opacity:0},{opacity:1,duration:0.4,stagger:0.12,ease:'power2.out'},0.05);
tl.fromTo('.${p}-lw',{color:'#B4BFCA'},{color:ink,duration:0.2,stagger:0.08,ease:'none'},1.15);
// past cases arrive without an answer, then their known outcome colours them
tl.fromTo('.${p}-pt',{opacity:0,scale:0.3,transformOrigin:'50% 50%',fill:'#9AA7B4'},{opacity:1,scale:1,duration:0.4,stagger:0.03,ease:'expo.out'},0.6);
tl.fromTo('.${p}-pt.ptA',{fill:'#9AA7B4'},{fill:'#2B5D8C',duration:0.4,stagger:0.02,ease:'power2.inOut'},0.9);
tl.fromTo('.${p}-pt.ptB',{fill:'#9AA7B4'},{fill:'#B8642A',duration:0.4,stagger:0.02,ease:'power2.inOut'},0.95);
inn('#${p}-leg',0.95,0.3);
tl.fromTo('#${p}-q',{opacity:0,scale:0.4,svgOrigin:'${X(Q.x)} ${Y(Q.y)}'},{opacity:1,scale:1,svgOrigin:'${X(Q.x)} ${Y(Q.y)}',duration:0.6,ease:'expo.out'},1.3);
out(['#${p}-panel','#${p}-q','.${p}-pt','#${p}-leg'], ${INTRO - 0.22});
`;
  scenes.push({ key: 'intro', dur: DUR['intro'], file: sceneFile('intro', INTRO, svg, html, js), decision: null });
}

// ================= 1. LINEAR REGRESSION =================
{
  const p = 's1', L = D.linear;
  const yAt = (c0, c1, x) => c0 + c1 * x;
  let svg = grid(p) + axes(p, { xt: 'ingresos', yt: 'cuota' });
  svg += `<g clip-path="url(#s1-clip)">`;
  L.points.forEach((q, i) => { svg += `<line id="${p}-r${i}" class="dash" x1="${X(q.x)}" y1="${Y(q.y)}" x2="${X(q.x)}" y2="${Y(L.mean)}" opacity="0"/>`; });
  svg += `<line id="${p}-fit" class="mdl" x1="${X(0)}" y1="${Y(L.mean)}" x2="${X(0)}" y2="${Y(L.mean)}"/></g>`;
  L.points.forEach((q, i) => { svg += `<circle id="${p}-p${i}" class="${p}-pt ptA" cx="${X(q.x)}" cy="${Y(q.y)}" r="11"/>`; });
  // prediction for a new x
  svg += `<line id="${p}-vx" class="accd" x1="${X(L.newX)}" y1="${Y(0)}" x2="${X(L.newX)}" y2="${Y(0)}"/>`;
  svg += `<line id="${p}-hy" class="accd" x1="${X(L.newX)}" y1="${Y(L.newY)}" x2="${X(L.newX)}" y2="${Y(L.newY)}"/>`;
  svg += `<text id="${p}-xl" class="lblacc" x="${X(L.newX)}" y="${Y(0) - 18}" text-anchor="middle" opacity="0">x = ${L.newX}</text>`;
  svg += `<circle id="${p}-yp" cx="${X(L.newX)}" cy="${Y(L.newY)}" r="13" fill="var(--color-accent)" stroke="#fff" stroke-width="3" opacity="0"/>`;
  svg += `<text id="${p}-yl" class="lblacc" x="${X(0) + 14}" y="${Y(L.newY) - 14}" opacity="0">ŷ = ${f2(L.newY)}</text>`;
  const html = panel(p, { name: 'Regresión lineal', aka: 'Mínimos cuadrados ordinarios', line: 'Ajusta la recta que minimiza el error al cuadrado', math: 'ŷ = β₀ + β₁x₁ + … + βₙxₙ' })
    + `<div class="out" id="${p}-out">
      <div class="row" id="${p}-sse0"><span>Σ (y − ŷ)² =</span><b>${L.sseStart.toFixed(1)}</b><span class="mut">recta inicial</span></div>
      <div class="row" id="${p}-sse1"><span>Σ (y − ŷ)² =</span><b>${L.sseFit.toFixed(1)}</b><span class="mut">mínimo: ŷ = ${f2(L.b0)} + ${f2(L.b1)}x</span></div>
      <div class="dec" id="${p}-dec" style="margin-top:34px">Predice la cuota: ŷ = ${f2(L.newY)}</div></div>`;
  let js = HELPERS(p, SCENE) + `panelIn(0.05);\n`;
  js += `tl.fromTo('.${p}-pt',{opacity:0,scale:0.3,transformOrigin:'50% 50%'},{opacity:1,scale:1,duration:0.4,stagger:0.04,ease:'expo.out'},0.1);\n`;
  js += `drawLine('#${p}-fit',0.9,${X(0)},${Y(L.mean)},${X(10)},${Y(L.mean)},0.5);\n`;
  js += `tl.fromTo('[id^="${p}-r"]',{opacity:0},{opacity:1,duration:0.3,stagger:0.03},1.3);\n`;
  js += `inn('#${p}-sse0',1.4);\n`;
  // rotate to the OLS fit; residual ends follow the same ease, so they stay on the line
  js += `tl.to('#${p}-fit',{attr:{y1:${Y(L.b0)},y2:${Y(yAt(L.b0, L.b1, 10))}},duration:1.4,ease:'power2.inOut'},1.9);\n`;
  L.points.forEach((q, i) => { js += `tl.to('#${p}-r${i}',{attr:{y2:${Y(yAt(L.b0, L.b1, q.x))}},duration:1.4,ease:'power2.inOut'},1.9);\n`; });
  js += `blurIn('#${p}-sse1',3.3);\n`;
  js += `tl.to('[id^="${p}-r"]',{opacity:0.35,duration:0.3},3.5);\n`;
  js += `inn('#${p}-xl',3.9,0.2);\n`;
  js += `drawLine('#${p}-vx',4.0,${X(L.newX)},${Y(0)},${X(L.newX)},${Y(L.newY)},0.5);\n`;
  js += `tl.fromTo('#${p}-yp',{opacity:0,attr:{r:4}},{opacity:1,attr:{r:13},duration:0.4,ease:'expo.out'},4.5);\n`;
  js += `drawLine('#${p}-hy',4.6,${X(L.newX)},${Y(L.newY)},${X(0)},${Y(L.newY)},0.45);\n`;
  js += `inn('#${p}-yl',4.95,0.2);\nblurIn('#${p}-dec',4.95);\n`;
  js += `out(['#${p}-panel','#${p}-out','#${p}-fit','[id^="${p}-r"]','.${p}-pt','#${p}-vx','#${p}-hy','#${p}-yp','#${p}-yl','#${p}-xl','#${p}-xt','#${p}-yt'],${SCENE - 0.22});\n`;
  scenes.push({ key: 'lineal', dur: DUR['lineal'], file: sceneFile('lineal', SCENE, svg, html, js), decision: mapT('lineal', 4.95) });
}

// ================= 2. LOGISTIC REGRESSION =================
{
  const p = 's2', G = D.logistic;
  const pY = (pr) => 1 + 8 * pr; // probability 0..1 -> plane y 1..9
  const sig = (x) => 1 / (1 + Math.exp(-(G.w0 + G.w1 * x)));
  let svg = grid(p) + axes(p, { xt: 'historial', yt: 'P(paga)', yTicks: [[1, '0'], [5, '0.5'], [9, '1']] });
  let d = '';
  for (let i = 0; i <= 100; i++) { const x = i / 10; d += (i ? 'L' : 'M') + X(x) + ' ' + Y(pY(sig(x))) + ' '; }
  svg += `<line id="${p}-thr" class="dash" x1="${X(0)}" y1="${Y(5)}" x2="${X(0)}" y2="${Y(5)}"/>`;
  svg += `<text id="${p}-thl" class="lbl" x="${X(10)}" y="${Y(5) - 14}" text-anchor="end" opacity="0">umbral 0.5</text>`;
  svg += `<path id="${p}-sig" class="mdl" d="${d}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`;
  G.points.forEach((q, i) => { svg += mark(`${p}-p${i}`, `${p}-pt`, q.x, q.c ? 9 : 1, q.c); });
  svg += `<line id="${p}-vx" class="accd" x1="${X(G.newX)}" y1="${Y(0)}" x2="${X(G.newX)}" y2="${Y(0)}"/>`;
  svg += `<line id="${p}-hy" class="accd" x1="${X(G.newX)}" y1="${Y(pY(G.p))}" x2="${X(G.newX)}" y2="${Y(pY(G.p))}"/>`;
  svg += `<text id="${p}-xl" class="lblacc" x="${X(G.newX)}" y="${Y(0) - 18}" text-anchor="middle" opacity="0">x = ${G.newX}</text>`;
  svg += `<circle id="${p}-pp" cx="${X(G.newX)}" cy="${Y(pY(G.p))}" r="13" fill="var(--color-b)" stroke="var(--color-accent)" stroke-width="5" opacity="0"/>`;
  svg += `<text id="${p}-pl" class="lblacc" x="${X(0) + 14}" y="${Y(pY(G.p)) - 14}" opacity="0">p = ${f2(G.p)}</text>`;
  const html = panel(p, { name: 'Regresión logística', aka: 'Ajuste por máxima verosimilitud (log-loss)', line: 'Convierte una suma lineal en probabilidad con la sigmoide', math: 'p = 1 / (1 + e<sup>−(β₀ + β₁x)</sup>)' })
    + `<div class="out" id="${p}-out">
      <div class="row" id="${p}-r0"><span class="sw swA"></span><span>no pagó → p = 0</span><span class="sw swB" style="margin-left:24px"></span><span>pagó → p = 1</span></div>
      <div class="dec" id="${p}-dec" style="margin-top:40px">p = ${f2(G.p)} &gt; 0.5 → Paga</div></div>`;
  let js = HELPERS(p, SCENE) + `panelIn(0.05);\n`;
  js += `tl.fromTo('.${p}-pt',{opacity:0,scale:0.3,transformOrigin:'50% 50%'},{opacity:1,scale:1,duration:0.4,stagger:0.04,ease:'expo.out'},0.1);\n`;
  js += `inn('#${p}-r0',0.8);\n`;
  js += `tl.fromTo('#${p}-sig',{strokeDashoffset:1},{strokeDashoffset:0,duration:2.0,ease:'power2.inOut'},1.0);\n`;
  js += `drawLine('#${p}-thr',2.3,${X(0)},${Y(5)},${X(10)},${Y(5)},0.5);\ninn('#${p}-thl',2.6,0.2);\n`;
  js += `inn('#${p}-xl',3.1,0.2);\n`;
  js += `drawLine('#${p}-vx',3.2,${X(G.newX)},${Y(0)},${X(G.newX)},${Y(pY(G.p))},0.55);\n`;
  js += `tl.fromTo('#${p}-pp',{opacity:0,attr:{r:4}},{opacity:1,attr:{r:13},duration:0.4,ease:'expo.out'},3.75);\n`;
  js += `drawLine('#${p}-hy',3.85,${X(G.newX)},${Y(pY(G.p))},${X(0)},${Y(pY(G.p))},0.45);\n`;
  js += `inn('#${p}-pl',4.2,0.2);\nblurIn('#${p}-dec',4.4);\n`;
  js += `out(['#${p}-panel','#${p}-out','#${p}-sig','#${p}-thr','#${p}-thl','.${p}-pt','#${p}-vx','#${p}-hy','#${p}-pp','#${p}-pl','#${p}-xl','#${p}-xt','#${p}-yt'],${SCENE - 0.22});\n`;
  scenes.push({ key: 'logistica', dur: DUR['logistica'], file: sceneFile('logistica', SCENE, svg, html, js), decision: mapT('logistica', 4.4) });
}

// ---------- region helpers ----------
const rectsSvg = (id, rs, cls = '') => `<g id="${id}" class="${cls}">` + rs.map((r) => `<rect class="${r.c ? 'regB' : 'regA'}" x="${X(r.x0)}" y="${Y(r.y1)}" width="${(r.x1 - r.x0) * S}" height="${(r.y1 - r.y0) * S}"/>`).join('') + '</g>';
const splitSvg = (id, s, cls = 'mdl') => `<line id="${id}" class="${cls}" x1="${X(s.x0)}" y1="${Y(s.y1)}" x2="${X(s.x0)}" y2="${Y(s.y1)}" data-x2="${X(s.x1)}" data-y2="${Y(s.y0)}"/>`;
const drawSplit = (p, id, s, t, d = 0.55) => `drawLine('#${id}',${t},${X(s.x0)},${Y(s.y1)},${X(s.x1)},${Y(s.y0)},${d});\n`;

// ================= 3. DECISION TREE =================
{
  const p = 's3', T = D.tree, Q = D.Q;
  let svg = grid(p) + axes(p);
  // leaf regions revealed after each split: right leaf after split 1; left leaves after split 2
  const [s1, s2] = T.splits;
  const right = T.rects.filter((r) => r.x0 >= s1.t - 1e-9), left = T.rects.filter((r) => r.x1 <= s1.t + 1e-9);
  svg += rectsSvg(`${p}-reg1`, right) + rectsSvg(`${p}-reg2`, left);
  svg += splitSvg(`${p}-sp1`, s1) + splitSvg(`${p}-sp2`, s2);
  svg += `<text id="${p}-sl1" class="lbl" x="${X(s1.t) + 10}" y="${Y(10) + 34}" opacity="0">ingresos = ${s1.t}</text>`;
  svg += `<text id="${p}-sl2" class="lbl" x="${X(0) + 12}" y="${Y(s2.t) - 12}" opacity="0">historial = ${s2.t}</text>`;
  svg += pts2d(p) + qMark(p, Q.x, Q.y, 'caso nuevo');
  // small tree diagram in the panel
  const node = (id, x, y, text, w = 270) => `<g id="${id}"><rect x="${x - w / 2}" y="${y - 26}" width="${w}" height="52" rx="4" fill="var(--color-ground)" stroke="var(--color-ink)" stroke-width="2"/><text x="${x}" y="${y + 10}" text-anchor="middle" class="lbl">${text}</text></g>`;
  const leaf = (id, x, y, c) => `<g id="${id}">${c ? `<rect x="${x - 18}" y="${y - 18}" width="36" height="36" fill="var(--color-b)"/>` : `<circle cx="${x}" cy="${y}" r="19" fill="var(--color-a)"/>`}<text x="${x + 30}" y="${y + 10}" class="lbl">${c ? 'Paga' : 'No paga'}</text></g>`;
  const edge = (id, x1, y1, x2, y2, t, tx, ty) => `<line id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--color-ink)" stroke-width="2"/><text id="${id}t" x="${tx}" y="${ty}" class="lbl" fill="#556677">${t}</text>`;
  const tree = `<svg id="${p}-tree" width="740" height="300" viewBox="0 0 740 300" style="position:absolute;left:0;top:0">
    ${edge(`${p}-e1`, 330, 52, 190, 128, 'sí', 225, 84)}${edge(`${p}-e2`, 370, 52, 560, 132, 'no', 480, 84)}
    ${edge(`${p}-e3`, 160, 180, 90, 238, 'sí', 90, 206)}${edge(`${p}-e4`, 220, 180, 300, 238, 'no', 272, 206)}
    ${node(`${p}-n0`, 350, 30, `ingresos &lt; ${s1.t}`)}${node(`${p}-n1`, 190, 154, `historial &lt; ${s2.t}`)}
    ${leaf(`${p}-l1`, 560, 154, T.root.r.c)}${leaf(`${p}-l2`, 90, 262, T.root.l.l.c)}${leaf(`${p}-l3`, 300, 262, T.root.l.r.c)}
  </svg>`;
  const html = panel(p, { name: 'Árbol de decisión', line: 'Corta el plano donde los grupos quedan más puros', math: 'Gini = 1 − Σ p<sub>k</sub>²' })
    + `<div class="out" id="${p}-out" style="top:560px">${tree}
      <div class="row" id="${p}-gini" style="position:absolute;left:420px;top:236px;white-space:nowrap"><span class="mut">Gini</span><b id="${p}-g0">${f2(T.root.gParent)}</b><span id="${p}-g1">→ ${f2(T.root.g)}</span><span id="${p}-g2">→ 0.00</span></div>
      <div class="dec" id="${p}-dec" style="position:absolute;left:0;top:318px">ingresos ${Q.x} ≥ ${s1.t} → Paga</div></div>`;
  let js = HELPERS(p, SCENE) + `panelIn(0.05);\n`;
  js += `tl.fromTo('.${p}-pt',{opacity:0,scale:0.3,transformOrigin:'50% 50%'},{opacity:1,scale:1,duration:0.4,stagger:0.025,ease:'expo.out'},0.1);\n`;
  js += `tl.fromTo('#${p}-q',{opacity:0,scale:0.4,svgOrigin:'${X(Q.x)} ${Y(Q.y)}'},{opacity:1,scale:1,svgOrigin:'${X(Q.x)} ${Y(Q.y)}',duration:0.5,ease:'expo.out'},0.7);\n`;
  js += `tl.to('#${p}-ql',{opacity:0,duration:0.2,ease:'power3.in'},1.05);\n`;
  js += `inn('#${p}-n0',1.1);inn(['#${p}-gini','#${p}-g0'],1.2);\n`;
  js += drawSplit(p, `${p}-sp1`, s1, 1.1, 0.6) + `inn('#${p}-sl1',1.6,0.2);\n`;
  js += `tl.to('#${p}-reg1 rect',{opacity:0.16,duration:0.35},1.75);inn(['#${p}-e2','#${p}-e2t','#${p}-l1'],1.75);inn('#${p}-g1',1.75);\n`;
  js += drawSplit(p, `${p}-sp2`, s2, 2.4, 0.55) + `inn('#${p}-sl2',2.85,0.2);\n`;
  js += `inn(['#${p}-e1','#${p}-e1t','#${p}-n1'],2.4);\n`;
  js += `tl.to('#${p}-reg2 rect',{opacity:0.16,duration:0.35},3.0);inn(['#${p}-e3','#${p}-e3t','#${p}-e4','#${p}-e4t','#${p}-l2','#${p}-l3'],3.0);inn('#${p}-g2',3.1);\n`;
  // the new point walks the tree: root -> "no" -> leaf B
  js += `tl.to(['#${p}-n0 rect','#${p}-l1 rect'],{stroke:'#0F7B6C',strokeWidth:4,duration:0.2},3.9);tl.to('#${p}-e2',{stroke:'#0F7B6C',strokeWidth:4,duration:0.2},4.0);\n`;
  js += `popQ(4.3,1);blurIn('#${p}-dec',4.3);\n`;
  js += `\n`;
  js += `out(['#${p}-panel','#${p}-out','#${p}-reg1','#${p}-reg2','#${p}-sp1','#${p}-sp2','#${p}-sl1','#${p}-sl2','#${p}-q'],${SCENE - 0.22});\n`;
  scenes.push({ key: 'arbol', dur: DUR['arbol'], file: sceneFile('arbol', SCENE, svg, html, js), decision: mapT('arbol', 4.3) });
}

// ================= 4. RANDOM FOREST =================
{
  const p = 's4', Q = D.Q, F = D.forest;
  let svg = grid(p) + axes(p);
  F.forEach((t, k) => { svg += rectsSvg(`${p}-reg${k}`, t.rects); });
  F.forEach((t, k) => t.splits.forEach((s, j) => { svg += splitSvg(`${p}-t${k}s${j}`, s); }));
  svg += pts2d(p) + qMark(p, Q.x, Q.y);
  const votes = F.map((t) => t.vote);
  const nB = votes.filter((v) => v === 1).length;
  const html = panel(p, { name: 'Random Forest', aka: 'Bagging: muestras y variables al azar', line: 'Muchos árboles con datos al azar; decide la mayoría', math: 'ŷ = moda { h₁(x), h₂(x), h₃(x) }' })
    + `<div class="out" id="${p}-out">`
    + F.map((t, k) => `<div class="row" id="${p}-v${k}"><span>Árbol ${k + 1}</span><span class="mut">· ${t.idx.length} de ${D.pts.length} datos ·</span><span class="sw ${t.vote ? 'swB' : 'swA'}"></span><b>${t.vote ? 'Paga' : 'No paga'}</b></div>`).join('')
    + `<div class="dec" id="${p}-dec" style="margin-top:28px">Votos: Paga ${nB} · No paga ${3 - nB} → ${nB >= 2 ? 'Paga' : 'No paga'}</div></div>`;
  let js = HELPERS(p, SCENE) + `panelIn(0.05);\n`;
  const notIn = (t) => D.pts.map((_, i) => i).filter((i) => !t.idx.includes(i));
  F.forEach((t, k) => {
    const t0 = +(0.7 + 1.15 * k).toFixed(2);
    const dim = notIn(t).map((i) => `'#${p}-p${i}'`).join(',');
    if (dim) js += `tl.fromTo([${dim}],{opacity:1},{opacity:0.22,duration:0.25,ease:'power2.out'},${t0});\n`;
    js += `tl.fromTo('#${p}-reg${k} rect',{opacity:0},{opacity:0.16,duration:0.3},${t0 + 0.2});\n`;
    t.splits.forEach((s, j) => { js += drawSplit(p, `${p}-t${k}s${j}`, s, +(t0 + 0.15 + 0.25 * j).toFixed(2), 0.4); });
    js += `inn('#${p}-v${k}',${(t0 + 0.75).toFixed(2)});\n`;
    js += `tl.to('#${p}-reg${k} rect',{opacity:0,duration:0.15},${(t0 + 1.0).toFixed(2)});\n`;
    js += `tl.to([${t.splits.map((_, j) => `'#${p}-t${k}s${j}'`).join(',')}],{opacity:0.28,duration:0.15},${(t0 + 1.0).toFixed(2)});\n`;
    if (dim) js += `tl.to([${dim}],{opacity:1,duration:0.15},${(t0 + 1.0).toFixed(2)});\n`;
  });
  js += `\n`;
  js += `popQ(4.3,${nB >= 2 ? 1 : 0});blurIn('#${p}-dec',4.3);\n`;
  js += `out(['#${p}-panel','#${p}-out','[id^="${p}-t"]','#${p}-q'],${SCENE - 0.22});\n`;
  scenes.push({ key: 'bosque', dur: DUR['bosque'], file: sceneFile('bosque', SCENE, svg, html, js), decision: mapT('bosque', 4.3) });
}

// ================= 5. GRADIENT BOOSTING =================
{
  const p = 's5', Q = D.Q, G = D.gb;
  const lr = 0.6, base = 0.5;
  const score = (x, y, upto) => { let v = base; for (let m = 0; m <= upto; m++) { const s = G.rounds[m].stump; const pv = s.f === 'x' ? x : y; v += lr * (pv < s.t ? s.mL : s.mR); } return v; };
  let svg = grid(p) + axes(p);
  G.rounds.forEach((r, m) => {
    const xs = [0, 10, ...G.rounds.slice(0, m + 1).filter((q) => q.stump.f === 'x').map((q) => q.stump.t)].sort((a, b) => a - b);
    const ys = [0, 10, ...G.rounds.slice(0, m + 1).filter((q) => q.stump.f === 'y').map((q) => q.stump.t)].sort((a, b) => a - b);
    const cells = [];
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      cells.push({ x0: xs[i], x1: xs[i + 1], y0: ys[j], y1: ys[j + 1], c: score(cx, cy, m) >= 0.5 ? 1 : 0 });
    }
    svg += rectsSvg(`${p}-reg${m}`, cells);
  });
  G.rounds.forEach((r, m) => {
    const s = r.stump, seg = s.f === 'x' ? { x0: s.t, x1: s.t, y0: 0, y1: 10 } : { x0: 0, x1: 10, y0: s.t, y1: s.t };
    svg += splitSvg(`${p}-st${m}`, seg);
  });
  svg += pts2d(p);
  G.rounds.forEach((r, m) => r.wrong.forEach((i) => { const q = D.pts[i]; svg += `<circle id="${p}-w${m}" cx="${X(q.x)}" cy="${Y(q.y)}" r="22" fill="none" stroke="var(--color-ink)" stroke-width="2" stroke-dasharray="5 5" opacity="0"/>`; }));
  svg += qMark(p, Q.x, Q.y);
  const L0 = D.pts.length * 0.25;
  const losses = [L0, ...G.rounds.map((r) => r.loss)];
  const bw = (v) => Math.round((v / L0) * 300);
  const html = panel(p, { name: 'Gradient Boosting', aka: 'XGBoost · LightGBM · CatBoost', line: 'Cada árbol nuevo corrige el error que dejó el anterior', math: 'F<sub>m</sub>(x) = F<sub>m−1</sub>(x) + η · h<sub>m</sub>(x)' })
    + `<div class="out" id="${p}-out">`
    + losses.map((v, m) => `<div class="row" id="${p}-l${m}"><span style="width:150px">${m === 0 ? 'Inicio' : 'Árbol ' + m}</span><span class="bar" id="${p}-b${m}" style="width:${bw(v)}px"></span><span>pérdida ${f2(v)}</span></div>`).join('')
    + `<div class="dec" id="${p}-dec" style="margin-top:22px">F(x) = ${f2(G.qScores[2])} ≥ 0.5 → Paga</div></div>`;
  let js = HELPERS(p, SCENE) + `panelIn(0.05);\n`;
  js += `\n`;
  js += `inn('#${p}-l0',0.8);tl.fromTo('#${p}-b0',{scaleX:0,transformOrigin:'0 50%'},{scaleX:1,duration:0.4,ease:'expo.out'},0.8);\n`;
  G.rounds.forEach((r, m) => {
    const t0 = +(1.25 + 0.95 * m).toFixed(2);
    const s = r.stump, seg = s.f === 'x' ? { x0: s.t, x1: s.t, y0: 0, y1: 10 } : { x0: 0, x1: 10, y0: s.t, y1: s.t };
    if (m > 0) js += `tl.to('#${p}-st${m - 1}',{opacity:0.28,duration:0.2},${t0});tl.to('#${p}-reg${m - 1} rect',{opacity:0,duration:0.25},${t0 + 0.3});tl.to('#${p}-w${m - 1}',{opacity:0,duration:0.2},${t0});\n`;
    js += drawSplit(p, `${p}-st${m}`, seg, t0, 0.45);
    js += `tl.fromTo('#${p}-reg${m} rect',{opacity:0},{opacity:0.16,duration:0.3},${(t0 + 0.3).toFixed(2)});\n`;
    js += `tl.fromTo('#${p}-w${m}',{opacity:0},{opacity:1,duration:0.2},${(t0 + 0.45).toFixed(2)});\n`;
    js += `inn('#${p}-l${m + 1}',${(t0 + 0.45).toFixed(2)});tl.fromTo('#${p}-b${m + 1}',{scaleX:0,transformOrigin:'0 50%'},{scaleX:1,duration:0.4,ease:'expo.out'},${(t0 + 0.45).toFixed(2)});\n`;
  });
  js += `popQ(4.5,1);blurIn('#${p}-dec',4.5);\n`;
  js += `out(['#${p}-panel','#${p}-out','[id^="${p}-reg"]','[id^="${p}-st"]','[id^="${p}-w"]','#${p}-q'],${SCENE - 0.22});\n`;
  scenes.push({ key: 'boosting', dur: DUR['boosting'], file: sceneFile('boosting', SCENE, svg, html, js), decision: mapT('boosting', 4.5) });
}

// ================= 6. SVM =================
{
  const p = 's6', Q = D.Q, V = D.svm;
  // a line w·p = c clipped to the plane box
  function seg(wx, wy, c) {
    const out = [];
    const tryP = (x, y) => { if (x >= -1e-9 && x <= 10 + 1e-9 && y >= -1e-9 && y <= 10 + 1e-9) out.push([x, y]); };
    if (Math.abs(wy) > 1e-9) { tryP(0, c / wy); tryP(10, (c - 10 * wx) / wy); }
    if (Math.abs(wx) > 1e-9) { tryP(c / wx, 0); tryP((c - 10 * wy) / wx, 10); }
    out.sort((a, b) => a[0] - b[0]);
    return [out[0], out[out.length - 1]];
  }
  function stateAt(theta) {
    const wx = Math.cos(theta), wy = Math.sin(theta);
    const v = D.pts.map((q) => ({ v: wx * q.x + wy * q.y, c: q.c }));
    const maxA = Math.max(...v.filter((q) => q.c === 0).map((q) => q.v)), minB = Math.min(...v.filter((q) => q.c === 1).map((q) => q.v));
    const mid = (maxA + minB) / 2, m = (minB - maxA) / 2;
    return { wx, wy, mid, m, h: seg(wx, wy, mid), lo: seg(wx, wy, mid - m), hi: seg(wx, wy, mid + m) };
  }
  const th = Math.atan2(V.wy, V.wx);
  let d0 = 0.5; while (stateAt(th + d0).m < 0.12) d0 -= 0.02;
  const A0 = stateAt(th + d0), A1 = stateAt(th);
  const L = (id, s, cls) => `<line id="${id}" class="${cls}" x1="${X(s[0][0])}" y1="${Y(s[0][1])}" x2="${X(s[1][0])}" y2="${Y(s[1][1])}" opacity="0"/>`;
  let svg = grid(p) + axes(p) + `<g clip-path="url(#${p}-clipx)">` + L(`${p}-lo`, A0.lo, 'dash') + L(`${p}-hi`, A0.hi, 'dash') + L(`${p}-h`, A0.h, 'mdl') + '</g>';
  svg = svg.replace(`url(#${p}-clipx)`, 'url(#svm-clip)');
  svg += pts2d(p);
  V.sv.forEach((i, k) => { const q = D.pts[i]; svg += `<circle id="${p}-sv${k}" cx="${X(q.x)}" cy="${Y(q.y)}" r="21" fill="none" stroke="var(--color-ink)" stroke-width="2.5" opacity="0"/>`; });
  // perpendicular from the new point to the hyperplane
  const sQ = V.wx * Q.x + V.wy * Q.y + V.b; // signed distance (|w| = 1)
  const foot = [Q.x - sQ * V.wx, Q.y - sQ * V.wy];
  svg += `<line id="${p}-perp" class="accd" x1="${X(Q.x)}" y1="${Y(Q.y)}" x2="${X(Q.x)}" y2="${Y(Q.y)}"/>`;
  const top = [...A1.hi].sort((a, b) => b[1] - a[1])[0];
  svg += `<text id="${p}-ml" class="lbl" x="${X(top[0]) + 14}" y="${Y(top[1]) + 30}" opacity="0">margen</text>`;
  svg += qMark(p, Q.x, Q.y);
  const html = panel(p, { name: 'Máquinas de Vectores de Soporte', aka: 'SVM · optimización cuadrática', line: 'Traza la frontera con el margen más amplio posible', math: 'f(x) = signo(w · x + b)' })
    + `<div class="out" id="${p}-out" style="top:680px">
      <div class="row" id="${p}-r0"><span class="sw" style="border:2.5px solid var(--color-ink);border-radius:50%;width:22px;height:22px"></span><span>vectores de soporte: los puntos que fijan el margen</span></div>
      <div class="dec" id="${p}-dec" style="margin-top:30px">w · x + b = +${f2(sQ)} &gt; 0 → Paga</div></div>`;
  let js = HELPERS(p, SCENE) + `panelIn(0.05);\n`;
  js += `\n`;
  js += `tl.fromTo(['#${p}-h','#${p}-lo','#${p}-hi'],{opacity:0},{opacity:1,duration:0.35,ease:'power2.out'},1.0);\n`;
  const tw = (id, s) => `tl.to('#${id}',{attr:{x1:${X(s[0][0])},y1:${Y(s[0][1])},x2:${X(s[1][0])},y2:${Y(s[1][1])}},duration:1.5,ease:'power2.inOut'},1.5);\n`;
  js += tw(`${p}-h`, A1.h) + tw(`${p}-lo`, A1.lo) + tw(`${p}-hi`, A1.hi);
  js += `inn('#${p}-ml',3.0,0.2);\n`;
  js += `tl.fromTo('[id^="${p}-sv"]',{opacity:0,attr:{r:34}},{opacity:1,attr:{r:21},duration:0.4,stagger:0.1,ease:'expo.out'},3.1);inn('#${p}-r0',3.15);\n`;
  js += `drawLine('#${p}-perp',3.9,${X(Q.x)},${Y(Q.y)},${X(foot[0])},${Y(foot[1])},0.4);\n`;
  js += `popQ(4.4,${sQ > 0 ? 1 : 0});blurIn('#${p}-dec',4.4);\n`;
  js += `out(['#${p}-panel','#${p}-out','#${p}-h','#${p}-lo','#${p}-hi','[id^="${p}-sv"]','#${p}-perp','#${p}-ml','#${p}-q'],${SCENE - 0.22});\n`;
  let file = sceneFile('svm', SCENE, svg, html, js);
  scenes.push({ key: 'svm', dur: DUR['svm'], file: file, decision: mapT('svm', 4.4) });
}

// ================= 7. K-NN =================
{
  const p = 's7', Q = D.Q, K = D.knn;
  const nn = K.nn.map((o) => o.i);
  let svg = grid(p) + axes(p);
  D.pts.forEach((q, i) => { svg += `<line id="${p}-d${i}" class="${p}-dl" x1="${X(Q.x)}" y1="${Y(Q.y)}" x2="${X(Q.x)}" y2="${Y(Q.y)}" stroke="#7D8C9B" stroke-width="1.2"/>`; });
  svg += `<circle id="${p}-circ" cx="${X(Q.x)}" cy="${Y(Q.y)}" r="0" class="dash" stroke-width="2.5"/>`;
  svg += pts2d(p) + qMark(p, Q.x, Q.y);
  const html = panel(p, { name: 'K-Vecinos más cercanos', aka: 'K-NN · K = 5 · distancia euclidiana', line: 'Busca los K datos más cercanos y vota', math: 'd(p, q) = √Σ (p<sub>i</sub> − q<sub>i</sub>)²' })
    + `<div class="out" id="${p}-out"><div class="row" style="gap:26px;flex-wrap:wrap;height:auto">`
    + K.nn.map((o, k) => `<span id="${p}-k${k}" style="display:inline-flex;align-items:center;gap:10px"><span class="sw ${D.pts[o.i].c ? 'swB' : 'swA'}"></span>${f2(o.d)}</span>`).join('')
    + `</div><div class="dec" id="${p}-dec" style="margin-top:40px">Paga ${K.votesB} · No paga ${K.K - K.votesB} → Paga</div></div>`;
  let js = HELPERS(p, SCENE) + `panelIn(0.05);\n`;
  js += `\n`;
  // distance to every stored record
  D.pts.forEach((q, i) => { js += `tl.fromTo('#${p}-d${i}',{attr:{x2:${X(Q.x)},y2:${Y(Q.y)}},opacity:0.7},{attr:{x2:${X(q.x)},y2:${Y(q.y)}},duration:0.35,ease:'power2.out'},${(0.9 + 0.025 * i).toFixed(3)});\n`; });
  const far = D.pts.map((_, i) => i).filter((i) => !nn.includes(i));
  js += `tl.to([${far.map((i) => `'#${p}-d${i}'`).join(',')}],{opacity:0,duration:0.3},2.0);\n`;
  js += `tl.to([${far.map((i) => `'#${p}-p${i}'`).join(',')}],{opacity:0.25,duration:0.3},2.0);\n`;
  js += `tl.to([${nn.map((i) => `'#${p}-d${i}'`).join(',')}],{opacity:1,attr:{'stroke-width':3},stroke:'#16232F',duration:0.3},2.0);\n`;
  js += `tl.fromTo('#${p}-circ',{attr:{r:0}},{attr:{r:${(K.radius * S + 14).toFixed(1)}},duration:0.6,ease:'expo.out'},2.1);\n`;
  js += `tl.fromTo('[id^="${p}-k"]',{opacity:0},{opacity:1,duration:0.2,stagger:0.15},2.5);\n`;
  js += `popQ(4.2,${K.c});blurIn('#${p}-dec',4.2);\n`;
  js += `out(['#${p}-panel','#${p}-out','.${p}-dl','#${p}-circ','#${p}-q'],${SCENE - 0.22});\n`;
  js += `tl.to([${far.map((i) => `'#${p}-p${i}'`).join(',')}],{opacity:1,duration:0.2,ease:'power3.in'},${SCENE - 0.22});\n`;
  scenes.push({ key: 'knn', dur: DUR['knn'], file: sceneFile('knn', SCENE, svg, html, js), decision: mapT('knn', 4.2) });
}

// ================= 8. NAIVE BAYES =================
{
  const p = 's8', Q = D.Q, N = D.nb;
  let svg = grid(p) + axes(p) + '<g clip-path="url(#bayes-clip)">';
  N.stats.forEach((s) => {
    const col = s.c ? 'var(--color-b)' : 'var(--color-a)';
    [2, 1].forEach((k) => { svg += `<ellipse id="${p}-e${s.c}${k}" cx="${X(s.mx)}" cy="${Y(s.my)}" rx="${(k * s.sx * S).toFixed(1)}" ry="${(k * s.sy * S).toFixed(1)}" fill="${col}" fill-opacity="${k === 1 ? 0.14 : 0.07}" stroke="${col}" stroke-width="2.5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`; });
    svg += `<g id="${p}-c${s.c}" opacity="0"><line x1="${X(s.mx) - 12}" y1="${Y(s.my)}" x2="${X(s.mx) + 12}" y2="${Y(s.my)}" stroke="${col}" stroke-width="3"/><line x1="${X(s.mx)}" y1="${Y(s.my) - 12}" x2="${X(s.mx)}" y2="${Y(s.my) + 12}" stroke="${col}" stroke-width="3"/></g>`;
  });
  svg += '</g>' + pts2d(p) + qMark(p, Q.x, Q.y);
  const [pa, pb] = N.post;
  const html = panel(p, { name: 'Naive Bayes', aka: 'Supone variables independientes: elipses alineadas a los ejes', line: 'Aplica el teorema de Bayes; gana la clase más probable', math: 'P(C | x) ∝ P(C) · ∏ P(x<sub>i</sub> | C)' })
    + `<div class="out" id="${p}-out">
      <div class="row" id="${p}-ra"><span style="width:260px">P(no paga | x)</span><span class="bar" id="${p}-ba" style="width:${Math.round(pa * 360)}px;background:var(--color-a)"></span><b>${f2(pa)}</b></div>
      <div class="row" id="${p}-rb"><span style="width:260px">P(paga | x)</span><span class="bar" id="${p}-bb" style="width:${Math.round(pb * 360)}px;background:var(--color-b)"></span><b>${f2(pb)}</b></div>
      <div class="dec" id="${p}-dec" style="margin-top:34px">${f2(pb)} &gt; ${f2(pa)} → Paga</div></div>`;
  let js = HELPERS(p, SCENE) + `panelIn(0.05);\n`;
  js += `\n`;
  js += `tl.fromTo(['#${p}-e01','#${p}-e02'],{strokeDashoffset:1},{strokeDashoffset:0,duration:0.8,stagger:0.15,ease:'power2.inOut'},0.9);inn('#${p}-c0',1.3);\n`;
  js += `tl.fromTo(['#${p}-e11','#${p}-e12'],{strokeDashoffset:1},{strokeDashoffset:0,duration:0.8,stagger:0.15,ease:'power2.inOut'},1.5);inn('#${p}-c1',1.9);\n`;
  js += `inn('#${p}-ra',2.7);tl.fromTo('#${p}-ba',{scaleX:0,transformOrigin:'0 50%'},{scaleX:1,duration:0.6,ease:'expo.out'},2.7);\n`;
  js += `inn('#${p}-rb',3.0);tl.fromTo('#${p}-bb',{scaleX:0,transformOrigin:'0 50%'},{scaleX:1,duration:0.6,ease:'expo.out'},3.0);\n`;
  js += `popQ(4.2,${pb > pa ? 1 : 0});blurIn('#${p}-dec',4.2);\n`;
  js += `out(['#${p}-panel','#${p}-out','[id^="${p}-e"]','#${p}-c0','#${p}-c1'],${SCENE - 0.22});\n`;
  scenes.push({ key: 'bayes', dur: DUR['bayes'], file: sceneFile('bayes', SCENE, svg, html, js), decision: mapT('bayes', 4.2) });
}

// ================= OUTRO =================
{
  const p = 'fin', Q = D.Q;
  const svg = grid(p) + axes(p) + pts2d(p) + qMark(p, Q.x, Q.y, '');
  const html = panel(p, { name: 'Ocho modelos, ocho maneras de decidir', line: 'La calidad de la decisión depende de los datos' });
  let js = HELPERS(p, OUTRO) + `panelIn(0.1);\n`;
  js += `popQ(0.3,1);\n`;
  // "todos aprenden de los datos": the data the models learned from lights up, case by case
  js += `tl.fromTo('.${p}-pt',{opacity:0.25},{opacity:1,duration:0.3,stagger:0.04,ease:'power2.out'},1.0);\n`;
  js += `tl.fromTo('.${p}-lw',{color:'#B4BFCA'},{color:'#0F7B6C',duration:0.25,stagger:0.1,ease:'none'},1.6);\n`;
  scenes.push({ key: 'cierre', dur: DUR['cierre'], file: sceneFile('cierre', OUTRO, svg, html, js), decision: null });
}

// ---------- write scenes ----------
fs.mkdirSync(new URL('compositions/', OUT), { recursive: true });
for (const s of scenes) {
  let f = s.file;
  // per-scene clip ids are referenced by fixed names in two scenes
  f = f.replaceAll('url(#svm-clip)', `url(#${s.key}-clip)`).replaceAll('url(#bayes-clip)', `url(#${s.key}-clip)`).replaceAll('url(#s1-clip)', `url(#${s.key}-clip)`);
  fs.writeFileSync(new URL(`compositions/${s.key}.html`, OUT), f);
}

// ---------- root ----------
let t = 0, hosts = '', audio = '', track = 1;
const whooshes = ['whoosh-short', 'whoosh'], pops = ['pop', 'click-soft'];
const PEAK = { 'whoosh-short': 0.162, whoosh: 0.162, pop: 0.12, 'click-soft': 0.073 };
let ai = 0;
scenes.forEach((s, k) => {
  hosts += `      <div id="${s.key}" data-composition-id="${s.key}" data-composition-src="compositions/${s.key}.html" data-start="${t}" data-duration="${s.dur}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>\n`;
  if (k > 0) { const w = whooshes[k % 2]; audio += `      <audio id="sfx-cut-${k}" class="clip" src="assets/sfx/${w}.mp3" data-start="${+(t - PEAK[w] + 0.033).toFixed(3)}" data-duration="0.57" data-track-index="2" data-volume="0.18"></audio>\n`; }
  if (s.decision != null) { const pp = pops[ai++ % 2]; audio += `      <audio id="sfx-dec-${k}" class="clip" src="assets/sfx/${pp}.mp3" data-start="${+(t + s.decision - PEAK[pp] + 0.033).toFixed(3)}" data-duration="0.37" data-track-index="3" data-volume="0.3"></audio>\n`; }
  t = +(t + s.dur).toFixed(2);
});
const root = `<!doctype html>
<html lang="es" data-composition-variables='[
  {"id":"color-ground","type":"color","label":"Fondo","default":"#EEF1F4"},
  {"id":"color-ink","type":"color","label":"Tinta","default":"#16232F"},
  {"id":"color-a","type":"color","label":"No pagó","default":"#2B5D8C"},
  {"id":"color-b","type":"color","label":"Pagó","default":"#B8642A"},
  {"id":"color-accent","type":"color","label":"Decisión","default":"#0F7B6C"}
]'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      :root { --color-ground:#EEF1F4; --color-ink:#16232F; --color-a:#2B5D8C; --color-b:#B8642A; --color-accent:#0F7B6C; }
      * { margin:0; padding:0; box-sizing:border-box; }
      html, body { margin:0; width:1920px; height:1080px; overflow:hidden; background:var(--color-ground); }
      #root { width:100%; height:100%; position:relative; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${t}" data-width="1920" data-height="1080">
${hosts}      <audio id="voz" class="clip" src="assets/voice/narracion.wav" data-start="0" data-duration="${VOICE_LEN}" data-track-index="4" data-volume="0.7"></audio>
${audio}    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
fs.writeFileSync(new URL('index.html', OUT), root);
console.log('total', t, 's;', scenes.length, 'scenes');
