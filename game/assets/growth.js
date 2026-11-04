// 黴菌生長演算法（純函式，產生「帶出生時間的繪圖指令」）
// 三種形態各自用不同的生成規則：
//   penicillium : 菌絲隨機分岔 + 掃帚狀分生孢子柄（不對稱分支、鏈狀孢子）
//   aspergillus : 菌絲 + 放射狀孢子頭（頂囊 + 放射鏈，角度隨機偏一邊）
//   monascus    : Eden 菌落擴張模型（格子一格一格長，邊緣皺褶）+ 閉囊殼
// 所有輸出都是 { t: 出生時間(0..1), draw(ctx) } 的陣列，場景依時間逐步畫上去。

function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// ---------- 菌絲網（所有種類共用，顏色不同） ----------
function mycelium(rng, origin, opts) {
  const { dirBias = -Math.PI / 2, spread = 1.4, steps = 70, branchP = 0.08, len = 4.5, color = 'rgba(0,0,0,.25)', width = 0.8, t0 = 0, t1 = 0.5, bounds } = opts;
  const items = [];
  let tips = [{ x: origin.x, y: origin.y, a: dirBias + (rng() - 0.5) * spread, gen: 0 }];
  for (let i = 0; i < steps && tips.length; i++) {
    const next = [];
    for (const tip of tips) {
      const a = tip.a + (rng() - 0.5) * 0.7;
      const nx = tip.x + Math.cos(a) * len * (0.7 + rng() * 0.6);
      const ny = tip.y + Math.sin(a) * len * (0.7 + rng() * 0.6);
      if (bounds && (nx < bounds.x0 || nx > bounds.x1 || ny < bounds.y0 || ny > bounds.y1)) continue;
      const t = t0 + (t1 - t0) * (i / steps);
      const x0 = tip.x, y0 = tip.y;
      items.push({ t, draw(ctx) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(nx, ny); ctx.stroke(); } });
      next.push({ x: nx, y: ny, a, gen: tip.gen });
      if (rng() < branchP && tips.length < 14) next.push({ x: nx, y: ny, a: a + (rng() < 0.5 ? 1 : -1) * (0.6 + rng() * 0.9), gen: tip.gen + 1 });
      if (rng() < 0.015) { /* 這條菌絲停了 */ next.pop(); }
    }
    tips = next;
  }
  return items;
}

// ---------- 青黴：掃帚狀分生孢子柄 ----------
function penicilliumBrush(rng, base, opts) {
  const { height = 46, t0 = 0.3, t1 = 0.7, stalk = '#5f7f73', conidia = ['#7fc3b2', '#5aa797', '#a6dccf'], lean = 0 } = opts;
  const items = [];
  // 柄：微彎、不垂直
  const a0 = -Math.PI / 2 + lean + (rng() - 0.5) * 0.3;
  const segs = 6; let x = base.x, y = base.y, a = a0;
  const pts = [[x, y]];
  for (let i = 0; i < segs; i++) { a += (rng() - 0.5) * 0.18; x += Math.cos(a) * height / segs; y += Math.sin(a) * height / segs; pts.push([x, y]); }
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    items.push({ t: t0 + (t1 - t0) * 0.4 * (i / segs), draw(ctx) { ctx.strokeStyle = stalk; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); } });
  }
  // 分支（梗基）：2–4 根，角度不對稱
  const nBranch = 2 + Math.floor(rng() * 3);
  const tipX = x, tipY = y, tipA = a;
  for (let b = 0; b < nBranch; b++) {
    const ba = tipA + (b - (nBranch - 1) / 2) * (0.45 + rng() * 0.25) + (rng() - 0.5) * 0.35;
    const bl = 7 + rng() * 7;
    const bx = tipX + Math.cos(ba) * bl, by = tipY + Math.sin(ba) * bl;
    items.push({ t: t0 + (t1 - t0) * (0.45 + rng() * 0.1), draw(ctx) { ctx.strokeStyle = stalk; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(bx, by); ctx.stroke(); } });
    // 瓶梗：每根分支 2–4 個，再接孢子鏈
    const nPh = 2 + Math.floor(rng() * 3);
    for (let p = 0; p < nPh; p++) {
      const pa = ba + (p - (nPh - 1) / 2) * 0.32 + (rng() - 0.5) * 0.2;
      const pl = 4 + rng() * 3;
      const px = bx + Math.cos(pa) * pl, py = by + Math.sin(pa) * pl;
      items.push({ t: t0 + (t1 - t0) * (0.55 + rng() * 0.1), draw(ctx) { ctx.strokeStyle = stalk; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(px, py); ctx.stroke(); } });
      // 孢子鏈：3–9 顆，越遠越小、方向微彎
      const nC = 3 + Math.floor(rng() * 7);
      let cx = px, cy = py, ca = pa;
      for (let c = 0; c < nC; c++) {
        ca += (rng() - 0.5) * 0.25;
        const r = 1.9 - c * 0.12 + rng() * 0.3;
        cx += Math.cos(ca) * (r * 1.9); cy += Math.sin(ca) * (r * 1.9);
        const col = conidia[Math.floor(rng() * conidia.length)];
        const X = cx, Y = cy;
        items.push({ t: t0 + (t1 - t0) * (0.62 + 0.38 * (c / nC) + rng() * 0.05), draw(ctx) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fill(); } });
      }
    }
  }
  return items;
}

// ---------- 麴菌：放射狀孢子頭 ----------
function aspergillusHead(rng, base, opts) {
  const { height = 54, t0 = 0.3, t1 = 0.75, stalk = '#8a8552', vesicle = '#d9c86a', conidia = ['#c9b53c', '#e5d36a', '#a99a2e'], lean = 0 } = opts;
  const items = [];
  const a0 = -Math.PI / 2 + lean + (rng() - 0.5) * 0.4;
  const segs = 7; let x = base.x, y = base.y, a = a0;
  const pts = [[x, y]];
  for (let i = 0; i < segs; i++) { a += (rng() - 0.5) * 0.12; x += Math.cos(a) * height / segs; y += Math.sin(a) * height / segs; pts.push([x, y]); }
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    items.push({ t: t0 + (t1 - t0) * 0.45 * (i / segs), draw(ctx) { ctx.strokeStyle = stalk; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); } });
  }
  const vx = x, vy = y, vr = 4.5 + rng() * 2.5;
  items.push({ t: t0 + (t1 - t0) * 0.5, draw(ctx) { ctx.fillStyle = vesicle; ctx.beginPath(); ctx.arc(vx, vy, vr, 0, Math.PI * 2); ctx.fill(); } });
  // 放射鏈：覆蓋 200–320 度，偏向柄的反方向，角度分布不均
  const arc = (200 + rng() * 120) * Math.PI / 180;
  const center = a - Math.PI / 2 + (rng() - 0.5) * 0.5 + Math.PI / 2; // 以柄方向為中心
  const nRays = 14 + Math.floor(rng() * 12);
  for (let r = 0; r < nRays; r++) {
    const ra = center - arc / 2 + arc * (r / (nRays - 1)) + (rng() - 0.5) * (arc / nRays) * 0.9;
    const nC = 4 + Math.floor(rng() * 8);
    let cx = vx + Math.cos(ra) * (vr + 1), cy = vy + Math.sin(ra) * (vr + 1), ca = ra;
    for (let c = 0; c < nC; c++) {
      ca += (rng() - 0.5) * 0.2;
      const rad = 1.5 - c * 0.07 + rng() * 0.3;
      cx += Math.cos(ca) * (rad * 2.1); cy += Math.sin(ca) * (rad * 2.1);
      const col = conidia[Math.floor(rng() * conidia.length)];
      const X = cx, Y = cy;
      items.push({ t: t0 + (t1 - t0) * (0.55 + 0.45 * (c / nC) + rng() * 0.04), draw(ctx) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X, Y, rad, 0, Math.PI * 2); ctx.fill(); } });
    }
  }
  return items;
}

// ---------- 紅麴：Eden 菌落擴張 ----------
// 在格子上從一個種子開始，每次挑一個邊界格長進去；用雜訊讓某些方向長得快，邊緣會皺。
function monascusColony(rng, center, opts) {
  const { cells = 900, cell = 3, t0 = 0.2, t1 = 0.95, palette = ['#f6c9cf', '#eea3ad', '#e07c8b', '#cc5368', '#a8364c', '#7d2238'], ascoma = '#5c1627', anisotropy = 0.6 } = opts;
  const items = [];
  const occ = new Set(); const key = (i, j) => i + ',' + j;
  const frontier = [];
  const add = (i, j, order) => {
    occ.add(key(i, j));
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!occ.has(key(i + di, j + dj))) frontier.push([i + di, j + dj]);
    const d = Math.hypot(i, j);
    const x = center.x + i * cell, y = center.y + j * cell, jx = (rng() - 0.5) * cell * 0.6, jy = (rng() - 0.5) * cell * 0.6;
    const t = t0 + (t1 - t0) * (order / cells);
    items.push({ t, d, x, y, draw(ctx) {
      const shade = Math.min(palette.length - 1, Math.floor((1 - Math.min(1, d / (Math.sqrt(cells) * 0.62))) * (palette.length - 0.01)));
      ctx.fillStyle = palette[shade]; ctx.beginPath(); ctx.arc(x + jx, y + jy, cell * 0.78, 0, Math.PI * 2); ctx.fill();
    } });
  };
  // 方向偏好：幾個隨機角度長得比較快 → 不圓
  const lobes = 2 + Math.floor(rng() * 3);
  const lobeA = Array.from({ length: lobes }, () => rng() * Math.PI * 2);
  add(0, 0, 0);
  let n = 1;
  while (n < cells && frontier.length) {
    const idx = Math.floor(rng() * frontier.length);
    const [i, j] = frontier[idx];
    frontier[idx] = frontier[frontier.length - 1]; frontier.pop();
    if (occ.has(key(i, j))) continue;
    const ang = Math.atan2(j, i);
    let bias = 0; for (const la of lobeA) bias += Math.cos(ang - la);
    const p = 0.35 + anisotropy * 0.3 * (bias / lobes) + 0.3;
    if (rng() > p) { frontier.push([i, j]); continue; }
    add(i, j, n); n++;
  }
  // 閉囊殼：深色小點，長在成熟區（中心偏內），晚一點出現
  const nAsc = 10 + Math.floor(rng() * 14);
  const grown = items.slice();
  for (let k = 0; k < nAsc; k++) {
    const pick = grown[Math.floor(rng() * grown.length * 0.6)];
    if (!pick) continue;
    const ox = (rng() - 0.5) * cell, oy = (rng() - 0.5) * cell;
    const r = 1 + rng() * 1.3;
    const X = pick.x + ox, Y = pick.y + oy;
    items.push({ t: Math.min(0.99, pick.t + 0.15 + rng() * 0.1), draw(ctx) {
      ctx.fillStyle = ascoma; ctx.beginPath(); ctx.arc(X, Y, r, 0, Math.PI * 2); ctx.fill();
    } });
  }
  return items;
}

// 用全域物件而不是 ES module：這樣直接從硬碟點開 index.html（file://）也能跑
window.Growth = { makeRng, mycelium, penicilliumBrush, aspergillusHead, monascusColony };
