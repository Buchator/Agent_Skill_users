// Computes every model shown in the film from one shared dataset.
// Output: tools/data.json (read by build.mjs). Deterministic: no randomness without a seed.

// ---------- seeded PRNG ----------
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------- 1. Linear regression data (x, y continuous) ----------
const regX = [0.8, 1.6, 2.3, 3.1, 3.8, 4.6, 5.3, 6.1, 6.8, 7.6, 8.4, 9.2];
const regNoise = [0.5, -0.6, 0.7, -0.3, 0.9, -0.8, 0.2, 0.8, -0.7, 0.4, -0.5, 0.3];
const reg = regX.map((x, i) => ({ x, y: +(1.3 + 0.68 * x + regNoise[i]).toFixed(2) }));
const n = reg.length, mx = reg.reduce((a, p) => a + p.x, 0) / n, my = reg.reduce((a, p) => a + p.y, 0) / n;
const b1 = reg.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / reg.reduce((a, p) => a + (p.x - mx) ** 2, 0);
const b0 = my - b1 * mx;
const sse = (c0, c1) => reg.reduce((a, p) => a + (p.y - (c0 + c1 * p.x)) ** 2, 0);
const regNewX = 7.2;
const linear = { points: reg, b0, b1, mean: my, sseStart: sse(my, 0), sseFit: sse(b0, b1), newX: regNewX, newY: b0 + b1 * regNewX };

// ---------- 2. Logistic regression (1D) ----------
const logX = [0.9, 1.7, 2.4, 3.0, 3.6, 4.3, 4.9, 5.2, 5.8, 6.5, 7.1, 7.8, 8.5, 9.2];
const logY = [0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1];
let w0 = 0, w1 = 0;
for (let it = 0; it < 20000; it++) { // gradient descent on log-loss
  let g0 = 0, g1 = 0;
  logX.forEach((x, i) => { const p = 1 / (1 + Math.exp(-(w0 + w1 * x))); g0 += p - logY[i]; g1 += (p - logY[i]) * x; });
  w0 -= 0.05 * g0 / logX.length; w1 -= 0.05 * g1 / logX.length;
}
const sig = (x) => 1 / (1 + Math.exp(-(w0 + w1 * x)));
const logNewX = 6.2;
const logistic = { points: logX.map((x, i) => ({ x, c: logY[i] })), w0, w1, newX: logNewX, p: sig(logNewX), cut: -w0 / w1 };

// ---------- 3+. 2D classification data ----------
// class 0 = A (blue), class 1 = B (copper)
const A = [[1.2,2.0],[2.1,1.1],[1.6,3.6],[2.9,2.6],[3.4,1.4],[0.9,4.8],[2.6,4.4],[3.9,3.3],[4.4,2.0],[3.2,5.6],[4.7,4.1],[5.6,2.8],[5.1,5.1]];
const B = [[8.6,8.4],[7.4,8.9],[8.9,6.9],[6.6,7.4],[7.9,6.1],[9.2,8.9],[5.9,8.6],[6.9,5.6],[8.4,4.9],[5.7,6.6],[6.2,4.7],[7.6,3.9],[4.6,7.6]];
const pts = [...A.map(([x, y]) => ({ x, y, c: 0 })), ...B.map(([x, y]) => ({ x, y, c: 1 }))];
const Q = { x: 5.7, y: 5.4 };

// --- Gini decision tree (greedy, depth-limited) ---
const gini = (s) => { if (!s.length) return 0; const p = s.filter(q => q.c === 1).length / s.length; return 1 - p * p - (1 - p) ** 2; };
function bestSplit(s, feats = ['x', 'y']) {
  let best = null;
  for (const f of feats) {
    const vals = [...new Set(s.map(p => p[f]))].sort((a, b) => a - b);
    for (let i = 0; i < vals.length - 1; i++) {
      const t = +((vals[i] + vals[i + 1]) / 2).toFixed(2);
      const L = s.filter(p => p[f] < t), R = s.filter(p => p[f] >= t);
      const g = (L.length * gini(L) + R.length * gini(R)) / s.length;
      if (!best || g < best.g - 1e-9) best = { f, t, g };
    }
  }
  return best;
}
function grow(s, depth, feats, r) {
  const ones = s.filter(p => p.c === 1).length;
  const leaf = { leaf: true, c: ones * 2 >= s.length ? 1 : 0, n: s.length, ones };
  if (depth === 0 || gini(s) === 0 || s.length < 2) return leaf;
  const fs = feats ? feats(r) : ['x', 'y'];
  const sp = bestSplit(s, fs); if (!sp) return leaf;
  const L = s.filter(p => p[sp.f] < sp.t), R = s.filter(p => p[sp.f] >= sp.t);
  if (!L.length || !R.length) return leaf;
  return { f: sp.f, t: sp.t, g: +sp.g.toFixed(3), gParent: +gini(s).toFixed(3), l: grow(L, depth - 1, feats, r), r: grow(R, depth - 1, feats, r) };
}
const predict = (node, p) => node.leaf ? node.c : predict(p[node.f] < node.t ? node.l : node.r, p);
const tree = grow(pts, 2);
// leaf rectangles for drawing
function rects(node, box = { x0: 0, x1: 10, y0: 0, y1: 10 }, out = []) {
  if (node.leaf) { out.push({ ...box, c: node.c }); return out; }
  if (node.f === 'x') { rects(node.l, { ...box, x1: node.t }, out); rects(node.r, { ...box, x0: node.t }, out); }
  else { rects(node.l, { ...box, y1: node.t }, out); rects(node.r, { ...box, y0: node.t }, out); }
  return out;
}
function splits(node, box = { x0: 0, x1: 10, y0: 0, y1: 10 }, out = []) {
  if (node.leaf) return out;
  out.push(node.f === 'x' ? { x0: node.t, x1: node.t, y0: box.y0, y1: box.y1, f: 'x', t: node.t } : { x0: box.x0, x1: box.x1, y0: node.t, y1: node.t, f: 'y', t: node.t });
  if (node.f === 'x') { splits(node.l, { ...box, x1: node.t }, out); splits(node.r, { ...box, x0: node.t }, out); }
  else { splits(node.l, { ...box, y1: node.t }, out); splits(node.r, { ...box, y0: node.t }, out); }
  return out;
}

// --- Random forest: bootstrap rows + random single feature per tree (depth 2) ---
const forest = [];
for (let k = 0; k < 3; k++) {
  const r = rng(101 + k * 7919);
  const boot = pts.map(() => pts[Math.floor(r() * pts.length)]);
  const idx = [...new Set(boot.map(p => pts.indexOf(p)))];
  const t = grow(boot, 2, (rr) => [rr() < 0.5 ? 'x' : 'y'], r);
  forest.push({ tree: t, idx, splits: splits(t), rects: rects(t), vote: predict(t, Q) });
}

// --- Gradient boosting: stumps fit to residuals (squared loss on 0/1), lr 0.6 ---
const lr = 0.6, base = 0.5;
let F = pts.map(() => base); const rounds = [];
for (let m = 0; m < 3; m++) {
  const res = pts.map((p, i) => p.c - F[i]);
  // regression stump on residuals
  let best = null;
  for (const f of ['x', 'y']) {
    const vals = [...new Set(pts.map(p => p[f]))].sort((a, b) => a - b);
    for (let i = 0; i < vals.length - 1; i++) {
      const t = (vals[i] + vals[i + 1]) / 2;
      const Li = pts.map((p, j) => j).filter(j => pts[j][f] < t), Ri = pts.map((p, j) => j).filter(j => pts[j][f] >= t);
      const mL = Li.reduce((a, j) => a + res[j], 0) / Li.length, mR = Ri.reduce((a, j) => a + res[j], 0) / Ri.length;
      const err = Li.reduce((a, j) => a + (res[j] - mL) ** 2, 0) + Ri.reduce((a, j) => a + (res[j] - mR) ** 2, 0);
      if (!best || err < best.err) best = { f, t: +t.toFixed(2), mL, mR, err };
    }
  }
  F = F.map((v, i) => v + lr * (pts[i][best.f] < best.t ? best.mL : best.mR));
  const wrong = pts.map((p, i) => ((F[i] >= 0.5 ? 1 : 0) !== p.c ? i : -1)).filter(i => i >= 0);
  rounds.push({ stump: { f: best.f, t: best.t, mL: best.mL, mR: best.mR }, wrong, loss: pts.reduce((a, p, i) => a + (p.c - F[i]) ** 2, 0) });
}
const gbPredictAt = (p, upto) => { let v = base; for (let m = 0; m <= upto; m++) { const s = rounds[m].stump; v += lr * (p[s.f] < s.t ? s.mL : s.mR); } return v; };
const gbInitialWrong = pts.map((p, i) => ((base >= 0.5 ? 1 : 0) !== p.c ? i : -1)).filter(i => i >= 0);

// --- Hard-margin linear SVM by brute force over directions ---
let svm = null;
for (let a = 0; a < 3600; a++) {
  const th = (a / 3600) * Math.PI * 2, wx = Math.cos(th), wy = Math.sin(th);
  const s = pts.map(p => ({ v: wx * p.x + wy * p.y, c: p.c }));
  const maxA = Math.max(...s.filter(q => q.c === 0).map(q => q.v)), minB = Math.min(...s.filter(q => q.c === 1).map(q => q.v));
  const margin = (minB - maxA) / 2;
  if (!svm || margin > svm.margin) svm = { wx, wy, b: -(maxA + minB) / 2, margin };
}
const svmScore = (p) => svm.wx * p.x + svm.wy * p.y + svm.b;
svm.sv = pts.map((p, i) => (Math.abs(Math.abs(svmScore(p)) - svm.margin) < 1e-6 ? i : -1)).filter(i => i >= 0);
svm.q = svmScore(Q);

// --- KNN, K = 5, euclidean ---
const K = 5;
const dists = pts.map((p, i) => ({ i, d: Math.hypot(p.x - Q.x, p.y - Q.y) })).sort((a, b) => a.d - b.d);
const knn = { K, nn: dists.slice(0, K), votesB: dists.slice(0, K).filter(o => pts[o.i].c === 1).length };
knn.radius = dists[K - 1].d; knn.c = knn.votesB * 2 > K ? 1 : 0;

// --- Gaussian Naive Bayes ---
const stats = [0, 1].map(c => {
  const s = pts.filter(p => p.c === c), m = (f) => s.reduce((a, p) => a + p[f], 0) / s.length;
  const mxx = m('x'), myy = m('y');
  const v = (f, mu) => s.reduce((a, p) => a + (p[f] - mu) ** 2, 0) / s.length;
  return { c, prior: s.length / pts.length, mx: mxx, my: myy, sx: Math.sqrt(v('x', mxx)), sy: Math.sqrt(v('y', myy)) };
});
const g = (x, mu, sd) => Math.exp(-((x - mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
const joint = stats.map(s => s.prior * g(Q.x, s.mx, s.sx) * g(Q.y, s.my, s.sy));
const nb = { stats, post: joint.map(j => j / (joint[0] + joint[1])) };

const out = {
  linear, logistic, pts, Q,
  tree: { root: tree, rects: rects(tree), splits: splits(tree), q: predict(tree, Q) },
  forest, forestVote: forest.filter(t => t.vote === 1).length,
  gb: { rounds, initialWrong: gbInitialWrong, qScores: [0, 1, 2].map(m => gbPredictAt(Q, m)) },
  svm, knn, nb,
};
const fs = await import('node:fs');
fs.writeFileSync(new URL('./data.json', import.meta.url), JSON.stringify(out, null, 1));
// summary
console.log('linear', b0.toFixed(2), b1.toFixed(2), 'SSE', linear.sseStart.toFixed(1), '->', linear.sseFit.toFixed(1), 'pred', linear.newY.toFixed(2));
console.log('logistic', w0.toFixed(2), w1.toFixed(2), 'p', logistic.p.toFixed(2), 'cut', logistic.cut.toFixed(2));
console.log('tree', JSON.stringify(out.tree.splits), 'q', out.tree.q);
console.log('forest', forest.map(t => t.vote + ' ' + JSON.stringify(t.splits.map(s => s.f + s.t))).join(' | '));
console.log('gb', rounds.map(r => r.stump.f + r.stump.t + ' wrong=' + r.wrong.length + ' loss=' + r.loss.toFixed(2)).join(' | '), 'init wrong', gbInitialWrong.length, 'q', out.gb.qScores.map(v => v.toFixed(2)));
console.log('svm', svm.wx.toFixed(3), svm.wy.toFixed(3), svm.b.toFixed(3), 'margin', svm.margin.toFixed(3), 'sv', svm.sv, 'q', svm.q.toFixed(3));
console.log('knn', JSON.stringify(knn.nn.map(o => [o.i, pts[o.i].c, +o.d.toFixed(2)])), 'votesB', knn.votesB);
console.log('nb', JSON.stringify(stats.map(s => [s.mx, s.my, s.sx, s.sy].map(v => +v.toFixed(2)))), 'post', nb.post.map(v => v.toFixed(3)));
