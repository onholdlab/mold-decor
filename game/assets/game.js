// 黴菌裝潢 B2：一個牆角，玩家放東西，黴菌自己找路長過去。
// 已被廣泛接受的科學 → 機制：濕度／溫度決定能不能長、菌絲朝養分與水分生長（趨化性）、
//   不同菌落相遇會在中間留下空白線（拮抗線）。
// 前沿研究 → 只做成標示「猜想」的圖鑑卡（菌絲電訊號）。
(function () {
  const G = window.Growth;
  const LW = 360, LH = 480, CS = 4, GW = LW / CS, GH = LH / CS; // 邏輯座標與格子
  const SEAM = LW * 0.40, BASE = LH * 0.86, SHELF = LH * 0.56, SHELF_X0 = LW * 0.56;
  const DAY_STEPS = 600;                    // 一天 = 600 個模擬步（×1 時約 20 秒）
  const TIP_CAP = 520;

  // ---------- 種類（條件為遊戲簡化） ----------
  const SPECIES = {
    pen: { name: '青黴', latin: 'Penicillium', minWet: 0.55, temp: [0.9, 1, 0.45], food: { bread: 1, rice: 0.45 },
      hypha: 'rgba(80,140,120,.34)', dot: '#6cae9d', sw: '#5aa797',
      fact: '常長在麵包和柑橘上。分生孢子柄末端分支成掃帚狀，分支層數依種而異。青黴素最早就是從青黴屬發現的。' },
    asp: { name: '麴菌', latin: 'Aspergillus oryzae', minWet: 0.72, temp: [0.15, 0.6, 1], food: { rice: 1, bread: 0.5 },
      hypha: 'rgba(140,128,64,.34)', dot: '#c9b53c', sw: '#c9b53c',
      fact: '米麴菌，醬油、味噌、清酒都靠它。柄頂端是圓形頂囊，孢子鏈從頂囊往外放射。' },
    mon: { name: '紅麴', latin: 'Monascus', minWet: 0.5, temp: [0.1, 0.5, 1], food: { rice: 1, bread: 0.2 },
      hypha: 'rgba(196,84,104,.32)', dot: '#cc5368', sw: '#cc5368',
      fact: '長在米上會產生紅色色素，紅麴米和紅糟就是它。菌落裡的深色小點是閉囊殼。' },
  };
  const PHEN = {
    tropism: { name: '菌絲找路', latin: '趨化生長', fact: '菌絲的尖端會朝養分和水分多的方向長。2024 年有研究直接觀察到構巢麴菌的菌絲朝養分與特定酸鹼度轉向。', how: '讓菌絲自己長到另一塊食物上' },
    barrage: { name: '拮抗線', latin: '菌落相遇', fact: '兩個不同的菌落長到碰在一起時，交界處常常留下一條沒有菌絲的空白線，在培養皿上很常見。', how: '讓兩種黴菌長到碰面' },
    spark: { name: '菌絲裡的電訊號', latin: '猜想', guess: true,
      fact: '有研究測到菌絲體會出現像脈衝一樣的電訊號。有人主張這些訊號的排列像一種「語言」；也有學者認為那只是生長和代謝造成的電位變化，不能稱為語言。目前沒有定論。',
      how: '讓一個菌絲網長得非常大' },
  };
  const ORDER = ['pen', 'asp', 'mon', 'tropism', 'barrage', 'spark'];
  const HUM = [{ k: '乾燥', base: 0.38 }, { k: '普通', base: 0.6 }, { k: '潮濕', base: 0.82 }];
  const TEMP = [{ k: '涼', c: 18 }, { k: '常溫', c: 25 }, { k: '暖', c: 32 }];
  const TOOLS = [
    { id: 'bread', label: '麵包' }, { id: 'rice', label: '米' }, { id: 'water', label: '水滴' }, { id: 'dry', label: '乾燥劑' },
    { id: 'spore:pen', label: '青黴孢子', sp: 'pen' }, { id: 'spore:asp', label: '麴菌孢子', sp: 'asp' }, { id: 'spore:mon', label: '紅麴孢子', sp: 'mon' },
  ];

  // ---------- 存檔（只存圖鑑；場景每次重開） ----------
  const DEX_KEY = 'mold-decor-dex-v1';
  let dex = {};
  try { dex = JSON.parse(localStorage.getItem(DEX_KEY)) || {}; } catch (e) { dex = {}; }
  const saveDex = () => { try { localStorage.setItem(DEX_KEY, JSON.stringify(dex)); } catch (e) {} };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), base = $('base'), over = $('over');
  const bctx = base.getContext('2d'), octx = over.getContext('2d');
  let R = 2;

  // ---------- 狀態 ----------
  let S;
  function fresh() {
    return {
      step: 0, hum: 2, temp: 1, speed: 1, tool: 'rice',
      food: new Float32Array(GW * GH), foodType: new Uint8Array(GW * GH), // 1 bread 2 rice
      wetAdd: new Float32Array(GW * GH), owner: new Uint8Array(GW * GH),
      patches: [], colonies: [], tips: [], pending: [], hyphaCells: 0, nextCol: 1,
    };
  }
  const SPK = ['', 'pen', 'asp', 'mon'];
  const spIndex = (sp) => SPK.indexOf(sp);
  const idx = (i, j) => j * GW + i;
  const inGrid = (i, j) => i >= 0 && j >= 0 && i < GW && j < GH;

  function wetAt(i, j) {
    let w = HUM[S.hum].base + S.wetAdd[idx(i, j)];
    const x = i * CS, y = j * CS;
    w += Math.max(0, 0.08 - Math.abs(x - SEAM) / 400);          // 牆角接縫比較潮
    if (y > BASE - 30) w += 0.05;                                 // 靠地板比較潮
    return Math.max(0, Math.min(1, w));
  }
  const tempFit = (sp) => SPECIES[sp].temp[S.temp];

  // ---------- 繪圖 ----------
  function fit() {
    const r = stage.getBoundingClientRect();
    const scale = Math.min(r.width / LW, r.height / LH);
    const w = Math.floor(LW * scale), h = Math.floor(LH * scale);
    const want = Math.min(3, Math.max(1.5, (window.devicePixelRatio || 1) * scale));
    for (const c of [base, over]) { c.style.width = w + 'px'; c.style.height = h + 'px'; }
    const hud = document.querySelector('.hud'); hud.style.left = Math.max(14, (r.width - w) / 2 + 14) + 'px'; hud.style.top = Math.max(10, (r.height - h) / 2 + 10) + 'px';
    if (Math.abs(want - R) > 0.25 || base.width === 0) { R = want; redrawAll(); }
  }
  function setupCtx(ctx, c) { c.width = Math.round(LW * R); c.height = Math.round(LH * R); ctx.setTransform(R, 0, 0, R, 0, 0); }

  function drawRoom(ctx) {
    ctx.fillStyle = '#ece6dc'; ctx.fillRect(0, 0, SEAM, LH);
    ctx.fillStyle = '#e3dccf'; ctx.fillRect(SEAM, 0, LW - SEAM, LH);
    const g = ctx.createLinearGradient(SEAM - 40, 0, SEAM + 40, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(60,50,40,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(SEAM - 40, 0, 80, LH);
    ctx.fillStyle = '#d6cdbd'; ctx.fillRect(0, BASE, LW, LH * 0.04);
    ctx.fillStyle = '#c4b59c'; ctx.fillRect(0, BASE + LH * 0.04, LW, LH);
    ctx.fillStyle = '#b9a98c'; ctx.fillRect(SHELF_X0, SHELF, LW - SHELF_X0, 6);
    ctx.fillStyle = '#a89a80'; ctx.fillRect(SHELF_X0, SHELF + 6, LW - SHELF_X0, 3);
  }
  function drawSubstrate(ctx, p) {
    if (p.type === 'bread') {
      const bx = p.x - 16, by = p.y + 10;
      ctx.fillStyle = '#e9d6b4';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 3, by - 18, bx + 5, by - 22);
      ctx.quadraticCurveTo(bx + 10, by - 28, bx + 17, by - 22); ctx.quadraticCurveTo(bx + 22, by - 28, bx + 28, by - 22);
      ctx.quadraticCurveTo(bx + 36, by - 18, bx + 32, by); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c9b08a'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      const rng = G.makeRng(p.seed);
      for (let k = 0; k < 46; k++) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 12;
        const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.7;
        ctx.fillStyle = rng() < 0.5 ? '#fbf8f1' : '#efe9dc';
        ctx.beginPath(); ctx.ellipse(x, y, 1.9, 1.1, rng() * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  function drawOverlay() {
    setupCtx(octx, over);
    octx.clearRect(0, 0, LW, LH);
    for (const p of S.patches) {
      if (p.type === 'water') {
        const g = octx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 26);
        g.addColorStop(0, 'rgba(110,140,160,.30)'); g.addColorStop(1, 'rgba(110,140,160,0)');
        octx.fillStyle = g; octx.beginPath(); octx.arc(p.x, p.y, 26, 0, Math.PI * 2); octx.fill();
        octx.fillStyle = 'rgba(150,180,200,.7)'; octx.beginPath(); octx.ellipse(p.x, p.y, 3, 4, 0, 0, Math.PI * 2); octx.fill();
      } else if (p.type === 'dry') {
        const g = octx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 30);
        g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        octx.fillStyle = g; octx.beginPath(); octx.arc(p.x, p.y, 30, 0, Math.PI * 2); octx.fill();
        octx.fillStyle = '#f7f5ef'; octx.fillRect(p.x - 7, p.y - 5, 14, 10);
        octx.fillStyle = '#c9c2b4'; octx.fillRect(p.x - 4, p.y - 1, 8, 2);
      }
    }
  }
  // 所有畫在底圖上的東西都記成「指令」，縮放時可以重畫
  let log = [];
  function paint(fn) { log.push(fn); fn(bctx); }
  function redrawAll() {
    setupCtx(bctx, base);
    drawRoom(bctx);
    for (const fn of log) fn(bctx);
    drawOverlay();
  }

  // ---------- 放東西 ----------
  function addFood(type, x, y) {
    const p = { type, x, y, seed: (Math.random() * 1e9) | 0 };
    S.patches.push(p);
    const ci = Math.floor(x / CS), cj = Math.floor(y / CS), rad = 4;
    for (let j = cj - rad; j <= cj + rad; j++) for (let i = ci - rad; i <= ci + rad; i++) {
      if (!inGrid(i, j) || Math.hypot(i - ci, j - cj) > rad) continue;
      const k = idx(i, j); S.food[k] = 1; S.foodType[k] = type === 'bread' ? 1 : 2;
    }
    paint((ctx) => drawSubstrate(ctx, p));
  }
  function addWet(type, x, y) {
    const p = { type, x, y }; S.patches.push(p);
    const ci = Math.floor(x / CS), cj = Math.floor(y / CS), rad = type === 'water' ? 7 : 8, amt = type === 'water' ? 0.35 : -0.55;
    for (let j = cj - rad; j <= cj + rad; j++) for (let i = ci - rad; i <= ci + rad; i++) {
      if (!inGrid(i, j)) continue;
      const d = Math.hypot(i - ci, j - cj); if (d > rad) continue;
      S.wetAdd[idx(i, j)] += amt * (1 - d / (rad + 1));
    }
    drawOverlay();
  }
  function addColony(sp, x, y, natural) {
    const c = { id: S.nextCol++, sp, x, y, eaten: 0, nextSpore: 1.2, home: null, reached: false, cells: 0 };
    const ci = Math.floor(x / CS), cj = Math.floor(y / CS);
    if (inGrid(ci, cj) && S.food[idx(ci, cj)] > 0) c.home = S.patches.find((p) => (p.type === 'bread' || p.type === 'rice') && Math.hypot(p.x - x, p.y - y) < 20) || null;
    S.colonies.push(c);
    if (inGrid(ci, cj) && !S.owner[idx(ci, cj)]) S.owner[idx(ci, cj)] = spIndex(sp);
    for (let k = 0; k < 4; k++) S.tips.push({ x: ci + 0.5, y: cj + 0.5, a: Math.random() * Math.PI * 2, c, life: 40, energy: 0 });
    paint((ctx) => { ctx.fillStyle = SPECIES[sp].dot; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
    if (!dex[sp]) {
      dex[sp] = { day: day(), how: condText(sp, x, y, natural) }; saveDex(); renderTools(); renderDexCount();
      say(`發現新種類：${SPECIES[sp].name}。${natural ? '孢子是自己從空氣裡落下來的。' : ''}打開圖鑑看看。`, 4200);
    }
    return c;
  }
  function condText(sp, x, y) {
    const ci = Math.floor(x / CS), cj = Math.floor(y / CS), t = S.foodType[idx(ci, cj)];
    return `${t === 2 ? '米' : t === 1 ? '麵包' : '牆面'} · ${HUM[S.hum].k} · ${TEMP[S.temp].k}`;
  }
  function unlockPhen(k) {
    if (dex[k]) return; dex[k] = { day: day() }; saveDex(); renderDexCount();
    say(k === 'spark' ? '菌絲網長得好大……圖鑑多了一張「猜想」卡。' : `圖鑑新增：${PHEN[k].name}。`, 4200);
  }

  // ---------- 模擬 ----------
  const day = () => 1 + Math.floor(S.step / DAY_STEPS);
  function blocked(i, j, sp) {
    const me = spIndex(sp);
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const ii = i + di, jj = j + dj; if (!inGrid(ii, jj)) continue;
      const o = S.owner[idx(ii, jj)]; if (o && o !== me) return true;
    }
    return false;
  }
  function attract(i, j, sp) {
    if (!inGrid(i, j)) return -9;
    const k = idx(i, j), fp = SPECIES[sp].food;
    const f = S.food[k] > 0 ? (S.foodType[k] === 1 ? fp.bread : fp.rice) * S.food[k] : 0;
    return f * 3 + wetAt(i, j) * 1.2;
  }
  // 往前看 6 格的梯度：菌絲尖端朝養分、水分多的方向轉
  function look(t, a, sp) {
    let s = 0;
    for (const d of [2, 4, 6]) s += attract(Math.floor(t.x + Math.cos(a) * d), Math.floor(t.y + Math.sin(a) * d), sp) / d;
    return s;
  }
  function stepSim() {
    S.step++;
    const next = [];
    for (const t of S.tips) {
      const sp = t.c.sp, P = SPECIES[sp];
      const ci = Math.floor(t.x), cj = Math.floor(t.y);
      const w = wetAt(ci, cj), tf = tempFit(sp);
      if (w < P.minWet || tf < 0.2) { if (Math.random() < 0.004) continue; next.push(t); continue; } // 太乾或太冷：休眠
      if (Math.random() > 0.32 * tf * (0.55 + (w - P.minWet) * 2)) { next.push(t); continue; }
      // 選方向：左、直、右，依吸引力加權
      const cands = [t.a - 0.55, t.a, t.a + 0.55].map((a) => ({ a, s: Math.max(0.01, look(t, a, sp) + Math.random() * 0.6) }));
      let tot = cands.reduce((m, c) => m + c.s * c.s, 0), r = Math.random() * tot, pick = cands[1];
      for (const c of cands) { r -= c.s * c.s; if (r <= 0) { pick = c; break; } }
      const a = pick.a + (Math.random() - 0.5) * 0.3;
      const nx = t.x + Math.cos(a), ny = t.y + Math.sin(a);
      const ni = Math.floor(nx), nj = Math.floor(ny);
      if (!inGrid(ni, nj)) continue;
      if (blocked(ni, nj, sp)) { if (S.colonies.some((c) => c.sp !== sp)) unlockPhen('barrage'); continue; }
      if (wetAt(ni, nj) < P.minWet - 0.05) { t.a = a + Math.PI * (0.5 + Math.random() * 0.5); t.life -= 3; next.push(t); continue; }
      const x0 = t.x * CS, y0 = t.y * CS, x1 = nx * CS, y1 = ny * CS, col = P.hypha;
      const k = idx(ni, nj);
      if (!S.owner[k]) { // 只在新佔的格子畫線，舊路不重畫，網才不會糊成一片
        S.owner[k] = spIndex(sp); S.hyphaCells++; t.c.cells++;
        paint((ctx) => { ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); });
      }
      t.x = nx; t.y = ny; t.a = a; t.life -= S.food[k] > 0 ? 1 : 1.6;
      if (S.food[k] > 0) {
        const fp = S.foodType[k] === 1 ? P.food.bread : P.food.rice;
        S.food[k] = Math.max(0, S.food[k] - 0.04); t.energy += 0.25 * fp; t.c.eaten += 0.04 * fp; t.life = Math.max(t.life, 55);
        if (!t.c.reached) {
          const p = S.patches.find((q) => (q.type === 'bread' || q.type === 'rice') && Math.hypot(q.x - x1, q.y - y1) < 18);
          if (p && p !== t.c.home) { t.c.reached = true; unlockPhen('tropism'); say(`${P.name}的菌絲自己找到你放的${p.type === 'rice' ? '米' : '麵包'}了。`, 3200); }
        }
        if (t.c.eaten >= t.c.nextSpore) { t.c.nextSpore += 2; sporulate(t.c, x1, y1); }
      }
      if (t.life <= 0) continue;
      next.push(t);
      const branchP = t.energy >= 1 ? 1 : (t.life > 30 ? 0.006 : 0);
      if (S.tips.length + next.length < TIP_CAP * 2 && next.length < TIP_CAP && Math.random() < branchP) {
        if (t.energy >= 1) t.energy -= 1;
        next.push({ x: t.x, y: t.y, a: a + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.8), c: t.c, life: Math.min(t.life, 40), energy: 0 });
      }
    }
    S.tips = next;
    if (S.hyphaCells > 1700) unlockPhen('spark');
    if (S.step % 90 === 0) naturalArrival();
  }
  // 成熟：長出孢子構造（用第 2 輪方向 1 的形態演算法）
  function sporulate(c, x, y) {
    c.marks = c.marks || [];
    if (c.marks.length >= 6 || S.colonies.some((o) => (o.marks || []).some((m) => Math.hypot(m.x - x, m.y - y) < 16))) return;
    c.marks.push({ x, y });
    const rng = G.makeRng((Math.random() * 1e9) | 0), now = S.step, dur = 240;
    let items;
    if (c.sp === 'pen') items = G.penicilliumBrush(rng, { x, y }, { height: 12 + rng() * 14, t0: 0, t1: 1, lean: (rng() - 0.5) * 1.2 });
    else if (c.sp === 'asp') items = G.aspergillusHead(rng, { x, y }, { height: 14 + rng() * 16, t0: 0, t1: 1, lean: (rng() - 0.5) * 1.2 });
    else items = G.monascusColony(rng, { x, y }, { cells: 70 + Math.floor(rng() * 90), cell: 2, t0: 0, t1: 1, anisotropy: 0.9 });
    for (const it of items) S.pending.push({ at: now + it.t * dur, draw: it.draw });
    S.pending.sort((a, b) => a.at - b.at);
  }
  // 孢子本來就在空氣裡：條件對了，它們會自己落在食物上長出來
  function naturalArrival() {
    for (const p of S.patches) {
      if (p.type !== 'bread' && p.type !== 'rice') continue;
      const ci = Math.floor(p.x / CS), cj = Math.floor(p.y / CS);
      if (S.owner[idx(ci, cj)] || S.food[idx(ci, cj)] < 0.3) continue;
      if (S.colonies.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 24)) continue;
      const w = wetAt(ci, cj);
      const options = Object.keys(SPECIES).map((sp) => {
        const P = SPECIES[sp]; const fit = w >= P.minWet ? tempFit(sp) * P.food[p.type] : 0;
        return { sp, fit };
      }).filter((o) => o.fit > 0.55).sort((a, b) => b.fit - a.fit);
      if (options.length && Math.random() < 0.35) { addColony(options[0].sp, p.x, p.y - 2, true); return; }
    }
  }

  // ---------- UI ----------
  let msgT = 0;
  function say(text, ms = 2600) { const m = $('msg'); m.textContent = text; m.classList.add('on'); clearTimeout(msgT); msgT = setTimeout(() => m.classList.remove('on'), ms); }
  function chip(parent, label, on, onClick, sw) {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on ? 'true' : 'false');
    if (sw) { const s = document.createElement('span'); s.className = 'sw'; s.style.background = sw; b.appendChild(s); }
    b.appendChild(document.createTextNode(label)); b.addEventListener('click', onClick); parent.appendChild(b);
  }
  function renderTools() {
    const el = $('tools'); el.innerHTML = '';
    for (const t of TOOLS) {
      if (t.sp && !dex[t.sp]) continue;
      chip(el, t.label, S.tool === t.id, () => { S.tool = t.id; renderTools(); }, t.sp ? SPECIES[t.sp].sw : null);
    }
  }
  function renderEnv() {
    const h = $('hum'), tp = $('temp'); h.innerHTML = ''; tp.innerHTML = '';
    HUM.forEach((v, i) => chip(h, v.k, S.hum === i, () => { S.hum = i; renderEnv(); say(i === 0 ? '除濕機開了。太乾的地方黴菌會停下來。' : i === 2 ? '颱風天，整個房間都很潮。' : '濕度普通。'); }));
    TEMP.forEach((v, i) => chip(tp, v.k, S.temp === i, () => { S.temp = i; renderEnv(); }));
    $('env').textContent = `${HUM[S.hum].k} · ${TEMP[S.temp].c}°C`;
  }
  function renderDexCount() { $('dexCount').textContent = `${ORDER.filter((k) => dex[k]).length}/${ORDER.length}`; }
  function openDex() {
    const el = $('cards'); el.innerHTML = '';
    for (const k of ORDER) {
      const isSp = !!SPECIES[k], d = isSp ? SPECIES[k] : PHEN[k], got = dex[k];
      const card = document.createElement('article');
      card.className = 'card' + (got ? '' : ' locked') + (d.guess && got ? ' guess' : '');
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; card.appendChild(cv);
      const body = document.createElement('div');
      if (got) {
        const tag = d.guess ? '<span class="tag">猜想</span>' : (isSp ? '' : '<span class="tag fact">已知現象</span>');
        body.innerHTML = `<h3>${d.name} <i>${d.latin}</i>${tag}</h3><p>${d.fact}</p>` +
          (isSp ? `<p class="how">第 ${got.day} 天在「${got.how}」發現 · <a href="../directions/2-plate/index.html">看科學圖版</a></p>` : '');
        drawIcon(cv, k);
      } else {
        body.innerHTML = `<h3>？？？</h3><p>${isSp ? '還沒發現。試試不同的食物、濕度和溫度。' : '提示：' + d.how}</p>`;
      }
      card.appendChild(body); el.appendChild(card);
    }
    $('sheetBg').hidden = $('dex').hidden = false;
  }
  function closeDex() { $('sheetBg').hidden = $('dex').hidden = true; }
  function drawIcon(cv, k) {
    const ctx = cv.getContext('2d'); ctx.setTransform(2, 0, 0, 2, 0, 0);
    const rng = G.makeRng(k.length * 977 + 13); let items = [];
    if (k === 'pen') { items = G.mycelium(rng, { x: 10, y: 58 }, { dirBias: 0, spread: 1, steps: 20, len: 3, color: 'rgba(80,140,120,.4)', t0: 0, t1: 1 }); items.push(...G.penicilliumBrush(rng, { x: 30, y: 62 }, { height: 20, t0: 0, t1: 1 })); }
    else if (k === 'asp') items = G.aspergillusHead(rng, { x: 32, y: 60 }, { height: 30, t0: 0, t1: 1 });
    else if (k === 'mon') items = G.monascusColony(rng, { x: 32, y: 32 }, { cells: 260, cell: 2, t0: 0, t1: 1, anisotropy: 0.9 });
    else if (k === 'tropism') { items = G.mycelium(rng, { x: 8, y: 56 }, { dirBias: -0.7, spread: 0.6, steps: 30, len: 2.4, branchP: 0.1, color: 'rgba(80,140,120,.55)', t0: 0, t1: 1 }); ctx.fillStyle = '#efe9dc'; ctx.beginPath(); ctx.arc(52, 14, 7, 0, 7); ctx.fill(); }
    else if (k === 'barrage') { items = G.monascusColony(rng, { x: 18, y: 32 }, { cells: 120, cell: 2, t0: 0, t1: 1, palette: ['#d8ece4', '#b6dbd0', '#8fc6b6', '#6cae9d', '#4f9486', '#3c7a6e'], ascoma: 'rgba(0,0,0,0)' }); items.push(...G.monascusColony(rng, { x: 47, y: 32 }, { cells: 120, cell: 2, t0: 0, t1: 1 })); }
    else { items = G.mycelium(rng, { x: 32, y: 32 }, { spread: 7, steps: 30, len: 2.4, branchP: 0.2, color: 'rgba(91,74,115,.5)', t0: 0, t1: 1 }); ctx.fillStyle = '#5b4a73'; for (let i = 0; i < 5; i++) { ctx.fillRect(8 + i * 11, 6, 2, 6 + (i % 3) * 3); } }
    items.sort((a, b) => a.t - b.t).forEach((it) => it.draw(ctx));
  }

  // 點牆面放東西
  base.parentElement.addEventListener('pointerdown', (e) => {
    if (e.target !== over && e.target !== base) return;
    const r = over.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * LW, y = (e.clientY - r.top) / r.height * LH;
    if (x < 0 || y < 0 || x > LW || y > LH) return;
    const t = S.tool;
    if (t === 'bread' || t === 'rice') { addFood(t, x, y); say(t === 'rice' ? '放了一小撮米。' : '放了一塊麵包。', 1400); }
    else if (t === 'water' || t === 'dry') { addWet(t, x, y); say(t === 'water' ? '滴了水，這附近變潮了。' : '放了乾燥劑，菌絲會繞開這裡。', 1800); }
    else {
      const sp = t.split(':')[1], ci = Math.floor(x / CS), cj = Math.floor(y / CS);
      const w = wetAt(ci, cj);
      addColony(sp, x, y, false);
      if (w < SPECIES[sp].minWet) say(`這裡對${SPECIES[sp].name}太乾了，孢子會先休眠。`, 2400);
      else if (tempFit(sp) < 0.3) say(`${SPECIES[sp].name}覺得太冷了，長得很慢。`, 2400);
    }
  });
  $('dexBtn').addEventListener('click', openDex);
  $('dexClose').addEventListener('click', closeDex);
  $('sheetBg').addEventListener('click', closeDex);
  $('speed').addEventListener('click', () => { S.speed = S.speed === 1 ? 4 : 1; $('speed').textContent = `速度 ×${S.speed}`; });
  let armT = 0;
  $('reset').addEventListener('click', (e) => {
    const b = e.currentTarget;
    if (!b.classList.contains('armed')) { b.classList.add('armed'); b.textContent = '再按一次重來'; clearTimeout(armT); armT = setTimeout(() => { b.classList.remove('armed'); b.textContent = '重來'; }, 3000); return; }
    clearTimeout(armT); b.classList.remove('armed'); b.textContent = '重來'; start(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('dex').hidden) closeDex(); });

  // ---------- 開場：層板上有一塊吐司，青黴已經開始長 ----------
  function start(first) {
    S = fresh(); log = []; redrawAll();
    addFood('bread', SHELF_X0 + 60, SHELF - 12);
    const keepDex = dex.pen; addColony('pen', SHELF_X0 + 60, SHELF - 14, true); if (!keepDex && first) { /* 第一次開：青黴算自然發現 */ }
    renderTools(); renderEnv(); renderDexCount();
    for (let i = 0; i < 180; i++) stepSim(); flushPending();
    say('點牆面放米、麵包、水滴或乾燥劑。黴菌會自己找過去。', 4200);
  }
  function flushPending() { while (S.pending.length && S.pending[0].at <= S.step) { const it = S.pending.shift(); paint(it.draw); } }

  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000) * 30 * S.speed; last = now;
    let n = 0; while (acc >= 1 && n < 16) { stepSim(); acc -= 1; n++; }
    flushPending();
    if (log.length > 60000) { const snap = document.createElement('canvas'); snap.width = base.width; snap.height = base.height; snap.getContext('2d').drawImage(base, 0, 0); log = [(ctx) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(snap, 0, 0, Math.round(LW * R), Math.round(LH * R)); ctx.restore(); }]; }
    $('day').textContent = `第 ${day()} 天`;
    requestAnimationFrame(frame);
  }
  new ResizeObserver(fit).observe(stage);
  start(true); fit();
  requestAnimationFrame(frame);
  window.__mold = { get S() { return S; }, stepSim, addFood, addWet, addColony, openDex, dex: () => dex };
})();
