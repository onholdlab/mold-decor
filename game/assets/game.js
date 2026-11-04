// 黴菌裝潢 B2：一個牆角，玩家放東西，黴菌自己找路長過去。
// 已被廣泛接受的科學 → 機制：濕度／溫度決定能不能長、菌絲朝養分與水分生長（趨化性）、
//   不同菌落相遇會在中間留下空白線（拮抗）、先來的快速菌退場後換別種（演替）、孢子能休眠。
// 前沿研究 → 只做成標示「猜想」的圖鑑卡，並在畫面上有對應的呈現。
// 各種類的濕度門檻與溫度偏好是遊戲簡化，不是精確數值。
(function () {
  const G = window.Growth;
  const LW = 360, LH = 480, CS = 4, GW = LW / CS, GH = LH / CS;
  const SEAM = LW * 0.40, BASE = LH * 0.86, SHELF = LH * 0.56, SHELF_X0 = LW * 0.56;
  const DAY_STEPS = 600, TIP_CAP = 520;

  const FT = ['', 'bread', 'rice', 'orange', 'wood'];
  const FOOD_NAME = { bread: '麵包', rice: '米', orange: '橘子', wood: '木片', wall: '潮濕牆面' };

  // form: brush 掃帚狀 / head 放射頭 / eden 菌落 / sporangium 孢子囊
  const SPECIES = {
    pen: { name: '青黴', latin: 'Penicillium', minWet: 0.55, temp: [0.9, 1, 0.45], food: { bread: 1, rice: 0.45, orange: 0.75, wood: 0.1 },
      hypha: 'rgba(80,140,120,.34)', sw: '#5aa797', form: 'brush', hint: ['麵包', '常溫', '潮濕'],
      fact: '常長在麵包和柑橘上。分生孢子柄末端分支成掃帚狀，分支層數依種而異。青黴素最早就是從青黴屬發現的。' },
    asp: { name: '麴菌', latin: 'Aspergillus oryzae', minWet: 0.72, temp: [0.15, 0.6, 1], food: { rice: 1, bread: 0.5, orange: 0.2 },
      hypha: 'rgba(140,128,64,.34)', sw: '#c9b53c', form: 'head', hint: ['米', '暖', '潮濕'],
      fact: '米麴菌，醬油、味噌、清酒都靠它。柄頂端是圓形頂囊，孢子鏈從頂囊往外放射。' },
    mon: { name: '紅麴', latin: 'Monascus', minWet: 0.5, temp: [0.1, 0.5, 1], food: { rice: 1, bread: 0.2 },
      hypha: 'rgba(196,84,104,.32)', sw: '#cc5368', form: 'eden', hint: ['米', '暖', '普通濕度（太潮會被麴菌搶先）'],
      fact: '長在米上會產生紅色色素，紅麴米和紅糟就是它。菌落裡的深色小點是閉囊殼。' },
    rhi: { name: '根黴', latin: 'Rhizopus stolonifer', minWet: 0.7, temp: [0.4, 1, 0.8], food: { bread: 1, orange: 0.6, rice: 0.3 }, pioneer: true, fast: 1.6,
      hypha: 'rgba(70,70,74,.30)', sw: '#3d3d42', form: 'sporangium', head: '#2e2e33', hint: ['麵包', '常溫', '潮濕'],
      fact: '俗稱黑麵包黴。長得非常快，常是麵包上最先出現的黴；細長的柄頂端是黑色圓形孢子囊，底部有像根一樣的假根。' },
    muc: { name: '毛黴', latin: 'Mucor', minWet: 0.7, temp: [1, 0.7, 0.3], food: { bread: 0.8, orange: 0.8, rice: 0.3 }, pioneer: true, fast: 1.4,
      hypha: 'rgba(150,150,140,.32)', sw: '#a9a79d', form: 'sporangium', head: '#9b988c', hint: ['橘子或麵包', '涼', '潮濕'],
      fact: '長得快、像一層灰白色的毛。孢子囊是圓的，和根黴是近親，但沒有明顯的假根，比較耐涼。' },
    nig: { name: '黑麴菌', latin: 'Aspergillus niger', minWet: 0.6, temp: [0.1, 0.6, 1], food: { orange: 1, bread: 0.6, rice: 0.4 },
      hypha: 'rgba(60,60,60,.30)', sw: '#2b2b2b', form: 'head', headCol: ['#1f1f22', '#3a3a3f', '#55555c'], vesicle: '#4a4a50', hint: ['橘子', '暖', '普通濕度以上'],
      fact: '和麴菌同屬，但孢子頭是黑色的。常見於洋蔥和水果，工業上用來生產檸檬酸。' },
    cla: { name: '枝孢', latin: 'Cladosporium', minWet: 0.62, temp: [1, 0.8, 0.4], food: { wall: 1, wood: 0.6, bread: 0.3 }, wall: true,
      hypha: 'rgba(90,96,70,.32)', sw: '#5c6348', form: 'brush', stalk: '#4b5038', conidia: ['#5c6348', '#717857', '#3f4430'], hint: ['不用食物：潮濕的牆面（滴水）', '涼', '潮濕'],
      fact: '室內最常見的黴之一，常長在窗框、浴室牆面這些會結露的地方，不太需要食物。孢子鏈一節一節分岔，像小樹枝。' },
    bot: { name: '灰黴', latin: 'Botrytis cinerea', minWet: 0.76, temp: [1, 0.5, 0.1], food: { orange: 0.9, bread: 0.2 },
      hypha: 'rgba(130,130,130,.32)', sw: '#8c8c8c', form: 'brush', stalk: '#6e6e6e', conidia: ['#b4b4b0', '#9c9c98', '#cfcfca'], hint: ['橘子', '涼', '潮濕'],
      fact: '讓草莓、葡萄長出灰色絨毛的就是它。喜歡涼爽又潮濕；孢子成串長在分支頂端，像一小串葡萄。' },
    tri: { name: '木黴', latin: 'Trichoderma', minWet: 0.6, temp: [0.3, 1, 0.8], food: { wood: 1, bread: 0.3 },
      hypha: 'rgba(70,130,70,.32)', sw: '#4f8f4f', form: 'eden', palette: ['#e2f0d9', '#c4e2b4', '#9fd08b', '#78b965', '#559a47', '#3f7d35'], hint: ['木片', '常溫', '普通濕度以上'],
      fact: '常長在木頭和土壤裡，菌落是鮮綠色，常出現一圈一圈的環。有些種類被拿來對付植物病原菌。' },
  };
  const PHEN = {
    tropism: { name: '菌絲找路', latin: '趨化生長', fact: '菌絲的尖端會朝養分和水分多的方向長。2024 年有研究直接觀察到構巢麴菌的菌絲朝養分與特定酸鹼度轉向。', how: '讓菌絲自己長到另一塊食物上' },
    barrage: { name: '拮抗線', latin: '菌落相遇', fact: '兩個不同的菌落長到碰在一起時，交界處常常留下一條沒有菌絲的空白線，在培養皿上很常見。', how: '讓兩種黴菌長到碰面' },
    succession: { name: '演替', latin: '先來後到', fact: '同一塊食物上，長得快的根黴、毛黴常常先佔滿，退場後換青黴、麴菌這些比較慢的種類接手。', how: '讓一塊麵包放久一點，看誰先來、誰後到' },
    dormancy: { name: '休眠的孢子', latin: '等待時機', fact: '孢子可以在乾燥的地方撐很久，等到變潮濕才發芽。', how: '把孢子放在太乾的地方，再讓那裡變潮' },
    spark: { name: '菌絲裡的電訊號', latin: 'electrical spiking', guess: true, see: '遊戲裡：解鎖後，菌絲上會有紫色光點沿著菌絲跑，這是把「電訊號」畫出來的樣子。現實中肉眼看不到，是研究者把電極插進菌絲體量到的電位脈衝。',
      fact: '有研究量到菌絲體會出現一陣一陣的電位脈衝，主張這些脈衝的排列像一種「語言」；也有學者認為那只是生長和代謝造成的電位變化，不能稱為語言。目前沒有定論。',
      how: '讓一個菌絲網長得非常大' },
    network: { name: '菌絲網分享養分', latin: 'Wood Wide Web', guess: true, see: '遊戲裡：解鎖後，連到多塊食物的菌落，菌絲上會有綠色光點從食物往外流，代表「分享養分」。',
      fact: '「樹聯網」的說法是森林裡的菌根真菌把樹根連起來，讓樹木互相分享養分、傳遞訊息。2023 年有研究回顧指出，很多說法被過度解讀，證據不足。這是關於森林的菌根真菌，不是黴菌；遊戲只是借用這個畫面。',
      how: '讓一個菌落連到 3 塊不同的食物' },
  };
  const ORDER = ['pen', 'rhi', 'muc', 'asp', 'mon', 'nig', 'bot', 'cla', 'tri', 'tropism', 'barrage', 'succession', 'dormancy', 'spark', 'network'];
  const HUM = [{ k: '乾燥', base: 0.38 }, { k: '普通', base: 0.6 }, { k: '潮濕', base: 0.82 }];
  const TEMP = [{ k: '涼', c: 18 }, { k: '常溫', c: 25 }, { k: '暖', c: 32 }];
  const TOOLS = [{ id: 'bread', label: '麵包' }, { id: 'rice', label: '米' }, { id: 'orange', label: '橘子' }, { id: 'wood', label: '木片' },
    { id: 'water', label: '水滴' }, { id: 'dry', label: '乾燥劑' }, { id: 'spore', label: '孢子' }];

  const DEX_KEY = 'mold-decor-dex-v1';
  let dex = {};
  try { dex = JSON.parse(localStorage.getItem(DEX_KEY)) || {}; } catch (e) { dex = {}; }
  const saveDex = () => { try { localStorage.setItem(DEX_KEY, JSON.stringify(dex)); } catch (e) {} };

  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), base = $('base'), over = $('over'), fx = $('fx');
  const bctx = base.getContext('2d'), octx = over.getContext('2d'), fctx = fx.getContext('2d');
  let R = 2;

  let S;
  function fresh() {
    return { step: 0, hum: 2, temp: 1, speed: 1, tool: 'rice', spore: 'pen', lastFind: 0,
      food: new Float32Array(GW * GH), foodType: new Uint8Array(GW * GH), wetAdd: new Float32Array(GW * GH), owner: new Uint8Array(GW * GH),
      patches: [], colonies: [], tips: [], pending: [], pulses: [], hyphaCells: 0, nextCol: 1 };
  }
  const SPK = [''].concat(Object.keys(SPECIES));
  const spIndex = (sp) => SPK.indexOf(sp);
  const idx = (i, j) => j * GW + i;
  const inGrid = (i, j) => i >= 0 && j >= 0 && i < GW && j < GH;
  const day = () => 1 + Math.floor(S.step / DAY_STEPS);
  const isFood = (p) => FOOD_NAME[p.type] && p.type !== 'wall';

  function wetAt(i, j) {
    let w = HUM[S.hum].base + S.wetAdd[idx(i, j)];
    const x = i * CS, y = j * CS;
    w += Math.max(0, 0.08 - Math.abs(x - SEAM) / 400);
    if (y > BASE - 30) w += 0.05;
    return Math.max(0, Math.min(1, w));
  }
  const tempFit = (sp) => SPECIES[sp].temp[S.temp];
  const foodPref = (sp, k) => (S.food[k] > 0 ? (SPECIES[sp].food[FT[S.foodType[k]]] || 0) : 0);

  // ---------- 繪圖 ----------
  function fit() {
    const r = stage.getBoundingClientRect();
    const scale = Math.min(r.width / LW, r.height / LH);
    const w = Math.floor(LW * scale), h = Math.floor(LH * scale);
    const want = Math.min(3, Math.max(1.5, (window.devicePixelRatio || 1) * scale));
    for (const c of [base, over, fx]) { c.style.width = w + 'px'; c.style.height = h + 'px'; }
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
    const rng = G.makeRng(p.seed);
    if (p.type === 'bread') {
      const bx = p.x - 16, by = p.y + 10;
      ctx.fillStyle = '#e9d6b4';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 3, by - 18, bx + 5, by - 22);
      ctx.quadraticCurveTo(bx + 10, by - 28, bx + 17, by - 22); ctx.quadraticCurveTo(bx + 22, by - 28, bx + 28, by - 22);
      ctx.quadraticCurveTo(bx + 36, by - 18, bx + 32, by); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c9b08a'; ctx.lineWidth = 1.5; ctx.stroke();
    } else if (p.type === 'rice') {
      for (let k = 0; k < 46; k++) {
        const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 12;
        ctx.fillStyle = rng() < 0.5 ? '#fbf8f1' : '#efe9dc';
        ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.7, 1.9, 1.1, rng() * 3, 0, Math.PI * 2); ctx.fill();
      }
    } else if (p.type === 'orange') {
      ctx.fillStyle = '#eba04b'; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(p.x - 4, p.y - 4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6d8a3e'; ctx.beginPath(); ctx.ellipse(p.x + 3, p.y - 11, 3.5, 1.6, -0.5, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'wood') {
      ctx.fillStyle = '#b98d5f'; ctx.fillRect(p.x - 16, p.y - 5, 32, 10);
      ctx.strokeStyle = 'rgba(90,60,30,.35)'; ctx.lineWidth = 0.8;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(p.x - 15, p.y - 3 + k * 3); ctx.quadraticCurveTo(p.x, p.y - 4 + k * 3 + rng() * 2, p.x + 15, p.y - 3 + k * 3); ctx.stroke(); }
    }
  }
  function drawOverlay() {
    setupCtx(octx, over); octx.clearRect(0, 0, LW, LH);
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
  let log = [];
  function paint(fn) { log.push(fn); fn(bctx); }
  function redrawAll() { setupCtx(bctx, base); setupCtx(fctx, fx); drawRoom(bctx); for (const fn of log) fn(bctx); drawOverlay(); }

  // 孢子囊（根黴、毛黴）：細長柄＋圓形孢子囊；根黴底部有假根
  function sporangium(rng, b, o) {
    const items = [], n = 1 + Math.floor(rng() * 3);
    if (o.rhizoid) for (let k = 0; k < 5; k++) {
      const a = Math.PI / 2 + (rng() - 0.5) * 1.6, l = 3 + rng() * 4, x1 = b.x + Math.cos(a) * l, y1 = b.y + Math.sin(a) * l;
      items.push({ t: 0.05, draw(ctx) { ctx.strokeStyle = o.stalk; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x1, y1); ctx.stroke(); } });
    }
    for (let s = 0; s < n; s++) {
      const a = -Math.PI / 2 + (s - (n - 1) / 2) * 0.35 + (rng() - 0.5) * 0.3, h = o.height * (0.7 + rng() * 0.5);
      const x1 = b.x + Math.cos(a) * h, y1 = b.y + Math.sin(a) * h, r = 2.6 + rng() * 1.6;
      items.push({ t: 0.1 + s * 0.1, draw(ctx) { ctx.strokeStyle = o.stalk; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x1, y1); ctx.stroke(); } });
      items.push({ t: 0.6 + s * 0.1, draw(ctx) { ctx.fillStyle = o.head; ctx.beginPath(); ctx.arc(x1, y1, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(x1 - r * 0.35, y1 - r * 0.35, r * 0.35, 0, Math.PI * 2); ctx.fill(); } });
    }
    return items;
  }

  // ---------- 放東西 ----------
  function addFood(type, x, y) {
    const p = { type, x, y, seed: (Math.random() * 1e9) | 0, born: S.step, visitors: [] };
    S.patches.push(p);
    const ci = Math.floor(x / CS), cj = Math.floor(y / CS), rad = 4;
    for (let j = cj - rad; j <= cj + rad; j++) for (let i = ci - rad; i <= ci + rad; i++) {
      if (!inGrid(i, j) || Math.hypot(i - ci, j - cj) > rad) continue;
      const k = idx(i, j); S.food[k] = 1; S.foodType[k] = FT.indexOf(type);
    }
    paint((ctx) => drawSubstrate(ctx, p));
    return p;
  }
  function addWet(type, x, y) {
    const p = { type, x, y, born: S.step, visitors: [] }; S.patches.push(p);
    const ci = Math.floor(x / CS), cj = Math.floor(y / CS), rad = type === 'water' ? 7 : 8, amt = type === 'water' ? 0.35 : -0.55;
    for (let j = cj - rad; j <= cj + rad; j++) for (let i = ci - rad; i <= ci + rad; i++) {
      if (!inGrid(i, j)) continue;
      const d = Math.hypot(i - ci, j - cj); if (d > rad) continue;
      S.wetAdd[idx(i, j)] += amt * (1 - d / (rad + 1));
    }
    drawOverlay();
  }
  function patchNear(x, y, r = 18) { return S.patches.find((p) => isFood(p) && Math.hypot(p.x - x, p.y - y) < r) || null; }
  function addColony(sp, x, y, natural, where) {
    const c = { id: S.nextCol++, sp, x, y, eaten: 0, nextSpore: 1.2, born: S.step, reached: new Set(), cellList: [], paths: [], marks: [], slept: false, dead: false };
    const ci = Math.floor(x / CS), cj = Math.floor(y / CS);
    const home = patchNear(x, y, 20); if (home) { c.reached.add(home); home.visitors.push(c); }
    if (where && !home) where.visitors.push(c);
    S.colonies.push(c);
    if (inGrid(ci, cj) && !S.owner[idx(ci, cj)]) { S.owner[idx(ci, cj)] = spIndex(sp); c.cellList.push(idx(ci, cj)); }
    for (let k = 0; k < 4; k++) S.tips.push(newTip(ci + 0.5, cj + 0.5, Math.random() * Math.PI * 2, c, 40));
    const col = SPECIES[sp].sw;
    paint((ctx) => { ctx.fillStyle = col; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
    if (!dex[sp]) {
      const t = home ? home.type : (where ? where.type === 'water' ? 'wall' : where.type : 'wall');
      dex[sp] = { day: day(), how: `${FOOD_NAME[t] || '牆面'} · ${HUM[S.hum].k} · ${TEMP[S.temp].k}` }; saveDex(); S.lastFind = S.step;
      renderTools(); renderDexCount();
      say(`發現新種類：${SPECIES[sp].name}。${natural ? '孢子是自己從空氣裡落下來的。' : ''}`, 4200);
    }
    return c;
  }
  const newTip = (x, y, a, c, life) => ({ x, y, a, c, life, energy: 0, path: [[x * CS, y * CS]] });
  function unlock(k) {
    if (dex[k]) return; dex[k] = { day: day() }; saveDex(); S.lastFind = S.step; renderDexCount();
    if (PHEN[k].guess) { say(k === 'spark' ? '圖鑑多了一張「猜想」卡：看菌絲上跑的紫色光點。' : '圖鑑多了一張「猜想」卡：看綠色光點從食物往外流。', 5200); burst(k); }
    else say(`圖鑑新增：${PHEN[k].name}。`, 3600);
  }

  // ---------- 模擬 ----------
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
    const k = idx(i, j);
    return foodPref(sp, k) * S.food[k] * 3 + wetAt(i, j) * 1.2;
  }
  function look(t, a, sp) { let s = 0; for (const d of [2, 4, 6]) s += attract(Math.floor(t.x + Math.cos(a) * d), Math.floor(t.y + Math.sin(a) * d), sp) / d; return s; }
  function retire(t) { if (t.path.length >= 6) { t.c.paths.push(t.path); if (t.c.paths.length > 60) t.c.paths.shift(); } }
  function stepSim() {
    S.step++;
    const next = [];
    for (const t of S.tips) {
      const c = t.c, sp = c.sp, P = SPECIES[sp];
      if (c.dead) { retire(t); continue; }
      const ci = Math.floor(t.x), cj = Math.floor(t.y);
      const w = wetAt(ci, cj), tf = tempFit(sp);
      if (w < P.minWet || tf < 0.2) { c.slept = true; if (Math.random() < 0.002) { retire(t); continue; } next.push(t); continue; }
      if (c.slept && c.cells < 3) { c.slept = false; unlock('dormancy'); }
      if (Math.random() > 0.32 * tf * (P.fast || 1) * (0.55 + (w - P.minWet) * 2)) { next.push(t); continue; }
      const cands = [t.a - 0.55, t.a, t.a + 0.55].map((a) => ({ a, s: Math.max(0.01, look(t, a, sp) + Math.random() * 0.6) }));
      let tot = cands.reduce((m, q) => m + q.s * q.s, 0), r = Math.random() * tot, pick = cands[1];
      for (const q of cands) { r -= q.s * q.s; if (r <= 0) { pick = q; break; } }
      const a = pick.a + (Math.random() - 0.5) * 0.3;
      const nx = t.x + Math.cos(a), ny = t.y + Math.sin(a), ni = Math.floor(nx), nj = Math.floor(ny);
      if (!inGrid(ni, nj)) { retire(t); continue; }
      if (blocked(ni, nj, sp)) { if (S.colonies.some((o) => !o.dead && o.sp !== sp)) unlock('barrage'); retire(t); continue; }
      if (wetAt(ni, nj) < P.minWet - 0.05) { t.a = a + Math.PI * (0.5 + Math.random() * 0.5); t.life -= 3; next.push(t); continue; }
      const x0 = t.x * CS, y0 = t.y * CS, x1 = nx * CS, y1 = ny * CS, col = P.hypha, k = idx(ni, nj);
      if (!S.owner[k]) {
        S.owner[k] = spIndex(sp); S.hyphaCells++; c.cells = (c.cells || 0) + 1; c.cellList.push(k);
        paint((ctx) => { ctx.strokeStyle = col; ctx.lineWidth = 0.8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); });
        t.path.push([x1, y1]); if (t.path.length > 50) { retire(t); t.path = [[x1, y1]]; }
      }
      t.x = nx; t.y = ny; t.a = a; t.life -= S.food[k] > 0 ? 1 : 1.6;
      const fp = foodPref(sp, k);
      if (fp > 0) {
        S.food[k] = Math.max(0, S.food[k] - 0.04); t.energy += 0.25 * fp; c.eaten += 0.04 * fp; t.life = Math.max(t.life, 55);
        const p = patchNear(x1, y1);
        if (p && !c.reached.has(p)) {
          c.reached.add(p); p.visitors.push(c);
          if (c.reached.size >= 2) { unlock('tropism'); say(`${P.name}的菌絲自己找到你放的${FOOD_NAME[p.type]}了。`, 3200); }
          if (c.reached.size >= 3) unlock('network');
        }
        if (c.eaten >= c.nextSpore) { c.nextSpore += 2; sporulate(c, x1, y1); }
      }
      if (t.life <= 0) { retire(t); continue; }
      next.push(t);
      const branchP = t.energy >= 1 ? 1 : (t.life > 30 ? 0.006 : 0);
      if (next.length < TIP_CAP && Math.random() < branchP) {
        if (t.energy >= 1) t.energy -= 1;
        next.push(newTip(t.x, t.y, a + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.8), c, Math.min(t.life, 40)));
      }
    }
    S.tips = next;
    if (S.hyphaCells > 1700) unlock('spark');
    // 先驅種（根黴、毛黴）長得快、退得也快：孢子囊長出來兩天後退場，空出位置給別種
    for (const c of S.colonies) if (!c.dead && SPECIES[c.sp].pioneer && c.marks.length && S.step - c.born > 2 * DAY_STEPS) {
      c.dead = true; for (const k of c.cellList) if (S.owner[k] === spIndex(c.sp)) S.owner[k] = 0;
    }
    if (S.step % 90 === 0) naturalArrival();
  }
  function sporulate(c, x, y) {
    if (c.marks.length >= 6 || S.colonies.some((o) => o.marks.some((m) => Math.hypot(m.x - x, m.y - y) < 16))) return;
    c.marks.push({ x, y });
    const P = SPECIES[c.sp], rng = G.makeRng((Math.random() * 1e9) | 0), now = S.step, dur = 240, lean = (rng() - 0.5) * 1.2;
    let items;
    if (P.form === 'brush') items = G.penicilliumBrush(rng, { x, y }, Object.assign({ height: 12 + rng() * 14, t0: 0, t1: 1, lean }, P.stalk ? { stalk: P.stalk, conidia: P.conidia } : {}));
    else if (P.form === 'head') items = G.aspergillusHead(rng, { x, y }, Object.assign({ height: 14 + rng() * 16, t0: 0, t1: 1, lean }, P.headCol ? { conidia: P.headCol, vesicle: P.vesicle, stalk: '#3d3d40' } : {}));
    else if (P.form === 'eden') items = G.monascusColony(rng, { x, y }, Object.assign({ cells: 70 + Math.floor(rng() * 90), cell: 2, t0: 0, t1: 1, anisotropy: 0.9 }, P.palette ? { palette: P.palette, ascoma: 'rgba(0,0,0,0)' } : {}));
    else items = sporangium(rng, { x, y }, { height: 12 + rng() * 12, stalk: P.head, head: P.head, rhizoid: c.sp === 'rhi' });
    for (const it of items) S.pending.push({ at: now + it.t * dur, draw: it.draw });
    S.pending.sort((a, b) => a.at - b.at);
  }
  // 孢子本來就在空氣裡：條件對了會自己落下來。同樣條件下不只一種能長，誰先到有運氣成分。
  const WALL_SPOTS = [{ type: 'wall', x: SEAM + 2, y: 64, visitors: [] }];
  function naturalArrival() {
    const spots = S.patches.filter((p) => isFood(p) || p.type === 'water').concat(WALL_SPOTS);
    for (const p of spots) {
      const ci = Math.floor(p.x / CS), cj = Math.floor(p.y / CS);
      if (!inGrid(ci, cj) || S.owner[idx(ci, cj)]) continue;
      if (isFood(p) && S.food[idx(ci, cj)] < 0.3) continue;
      if (S.colonies.some((c) => !c.dead && Math.hypot(c.x - p.x, c.y - p.y) < 24)) continue;
      const w = wetAt(ci, cj), type = isFood(p) ? p.type : 'wall';
      const opts = Object.keys(SPECIES).map((sp) => {
        const P = SPECIES[sp]; let f = w >= P.minWet ? tempFit(sp) * (P.food[type] || 0) : 0;
        if (P.pioneer && S.step - (p.born || 0) > 1.5 * DAY_STEPS) f *= 0.3; // 先驅種只搶新鮮的食物
        return { sp, f: f * (P.fast || 1) };
      }).filter((o) => o.f > 0.55);
      if (!opts.length || Math.random() > 0.35) continue;
      let tot = opts.reduce((m, o) => m + o.f ** 3, 0), r = Math.random() * tot, pick = opts[0];
      for (const o of opts) { r -= o.f ** 3; if (r <= 0) { pick = o; break; } }
      const prev = p.visitors.filter((c) => c.dead && SPECIES[c.sp].pioneer);
      addColony(pick.sp, p.x, p.y - 2, true, p);
      if (prev.length && !SPECIES[pick.sp].pioneer) unlock('succession');
      return;
    }
  }

  // ---------- 猜想的畫面呈現：沿著菌絲跑的光點 ----------
  function burst(kind) { for (let i = 0; i < 8; i++) spawnPulse(kind); }
  function spawnPulse(kind) {
    let pool;
    if (kind === 'network') pool = S.colonies.filter((c) => c.reached.size >= 2 && c.paths.length);
    else pool = S.colonies.filter((c) => c.paths.length);
    if (!pool.length) return;
    const c = pool[Math.floor(Math.random() * pool.length)], path = c.paths[Math.floor(Math.random() * c.paths.length)];
    S.pulses.push({ path, i: 0, kind, rev: kind === 'network' ? false : Math.random() < 0.5 });
  }
  function drawPulses(dt) {
    fctx.clearRect(0, 0, LW, LH);
    if (dex.spark && Math.random() < dt * 1.6) spawnPulse('spark');
    if (dex.network && Math.random() < dt * 1.0) spawnPulse('network');
    const keep = [];
    for (const p of S.pulses) {
      p.i += dt * 22;
      const n = p.path.length, at = Math.floor(p.i); if (at >= n - 1) continue;
      const pt = (q) => p.path[p.rev ? n - 1 - q : q];
      const col = p.kind === 'network' ? '120,190,110' : '150,110,220';
      for (let k = 0; k < 6; k++) {
        const q = at - k; if (q < 0) break;
        const [x, y] = pt(q);
        fctx.fillStyle = `rgba(${col},${(0.9 - k * 0.15).toFixed(2)})`;
        fctx.beginPath(); fctx.arc(x, y, k === 0 ? 3 : 2 - k * 0.2, 0, Math.PI * 2); fctx.fill();
      }
      if (p.kind !== 'network') { const [x, y] = pt(at); const g = fctx.createRadialGradient(x, y, 0, x, y, 13); g.addColorStop(0, `rgba(${col},.35)`); g.addColorStop(1, `rgba(${col},0)`); fctx.fillStyle = g; fctx.beginPath(); fctx.arc(x, y, 13, 0, Math.PI * 2); fctx.fill(); }
      keep.push(p);
    }
    S.pulses = keep.slice(-40);
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
    for (const t of TOOLS) chip(el, t.label, S.tool === t.id, () => { S.tool = t.id; renderTools(); });
    const sp = $('spores'); sp.innerHTML = ''; sp.hidden = S.tool !== 'spore';
    for (const k of Object.keys(SPECIES)) if (dex[k]) chip(sp, SPECIES[k].name, S.spore === k, () => { S.spore = k; renderTools(); }, SPECIES[k].sw);
  }
  function renderEnv() {
    const h = $('hum'), tp = $('temp'); h.innerHTML = ''; tp.innerHTML = '';
    HUM.forEach((v, i) => chip(h, v.k, S.hum === i, () => { S.hum = i; renderEnv(); say(i === 0 ? '除濕機開了。太乾的地方黴菌會停下來。' : i === 2 ? '颱風天，整個房間都很潮。' : '濕度普通。'); }));
    TEMP.forEach((v, i) => chip(tp, v.k, S.temp === i, () => { S.temp = i; renderEnv(); }));
    $('env').textContent = `${HUM[S.hum].k} · ${TEMP[S.temp].c}°C`;
  }
  function renderDexCount() { $('dexCount').textContent = `${ORDER.filter((k) => dex[k]).length}/${ORDER.length}`; }
  // 提示會隨「多久沒有新發現」越給越多：每 2 天多一條
  function hintFor(k) {
    const n = Math.min(3, 1 + Math.floor((S.step - S.lastFind) / (2 * DAY_STEPS)));
    return SPECIES[k].hint.slice(0, n).join(' · ') + (n < 3 ? ' · …' : '');
  }
  function openDex() {
    const el = $('cards'); el.innerHTML = '';
    const sec = (t) => { const h = document.createElement('h3'); h.className = 'sec'; h.textContent = t; el.appendChild(h); };
    ORDER.forEach((k, n) => {
      if (n === 0) sec('黴菌'); if (k === 'tropism') sec('現象'); if (k === 'spark') sec('猜想（前沿研究，還沒有定論）');
      const isSp = !!SPECIES[k], d = isSp ? SPECIES[k] : PHEN[k], got = dex[k];
      const card = document.createElement('article');
      card.className = 'card' + (got ? '' : ' locked') + (d.guess ? ' guess' : '');
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; card.appendChild(cv);
      const body = document.createElement('div');
      if (got) {
        const tag = d.guess ? '<span class="tag">猜想</span>' : (isSp ? '' : '<span class="tag fact">已知現象</span>');
        body.innerHTML = `<h3>${d.name} <i>${d.latin}</i>${tag}</h3>` + (d.see ? `<p class="see">${d.see}</p>` : '') + `<p>${d.fact}</p>` +
          (isSp ? `<p class="how">第 ${got.day} 天在「${got.how}」發現${k === 'pen' || k === 'asp' || k === 'mon' ? ' · <a href="../directions/2-plate/index.html">看科學圖版</a>' : ''}</p>` : '');
        drawIcon(cv, k);
      } else body.innerHTML = `<h3>？？？</h3><p>提示：${isSp ? hintFor(k) : d.how}</p>`;
      card.appendChild(body); el.appendChild(card);
    });
    $('sheetBg').hidden = $('dex').hidden = false;
  }
  function closeDex() { $('sheetBg').hidden = $('dex').hidden = true; }
  function drawIcon(cv, k) {
    const ctx = cv.getContext('2d'); ctx.setTransform(2, 0, 0, 2, 0, 0);
    const rng = G.makeRng(k.length * 977 + 13); let items = [];
    const P = SPECIES[k];
    if (P) {
      if (P.form === 'brush') items = G.penicilliumBrush(rng, { x: 30, y: 62 }, Object.assign({ height: 20, t0: 0, t1: 1 }, P.stalk ? { stalk: P.stalk, conidia: P.conidia } : {}));
      else if (P.form === 'head') items = G.aspergillusHead(rng, { x: 32, y: 62 }, Object.assign({ height: 26, t0: 0, t1: 1 }, P.headCol ? { conidia: P.headCol, vesicle: P.vesicle, stalk: '#3d3d40' } : {}));
      else if (P.form === 'eden') items = G.monascusColony(rng, { x: 32, y: 32 }, Object.assign({ cells: 260, cell: 2, t0: 0, t1: 1, anisotropy: 0.9 }, P.palette ? { palette: P.palette, ascoma: 'rgba(0,0,0,0)' } : {}));
      else items = sporangium(rng, { x: 32, y: 56 }, { height: 32, stalk: P.head, head: P.head, rhizoid: k === 'rhi' });
    } else if (k === 'tropism') { items = G.mycelium(rng, { x: 8, y: 56 }, { dirBias: -0.7, spread: 0.6, steps: 30, len: 2.4, branchP: 0.1, color: 'rgba(80,140,120,.55)', t0: 0, t1: 1 }); ctx.fillStyle = '#efe9dc'; ctx.beginPath(); ctx.arc(52, 14, 7, 0, 7); ctx.fill(); }
    else if (k === 'barrage') { items = G.monascusColony(rng, { x: 18, y: 32 }, { cells: 120, cell: 2, t0: 0, t1: 1, palette: ['#d8ece4', '#b6dbd0', '#8fc6b6', '#6cae9d', '#4f9486', '#3c7a6e'], ascoma: 'rgba(0,0,0,0)' }); items.push(...G.monascusColony(rng, { x: 47, y: 32 }, { cells: 120, cell: 2, t0: 0, t1: 1 })); }
    else if (k === 'succession') { items = sporangium(rng, { x: 18, y: 56 }, { height: 26, stalk: '#2e2e33', head: '#2e2e33', rhizoid: true }); items.push(...G.penicilliumBrush(rng, { x: 44, y: 60 }, { height: 20, t0: 0, t1: 1 })); ctx.fillStyle = '#b3aa98'; ctx.font = '9px sans-serif'; ctx.fillText('→', 27, 40); }
    else if (k === 'dormancy') { for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 3 ? '#9c9686' : '#5aa797'; ctx.beginPath(); ctx.arc(16 + (i % 3) * 14 + rng() * 4, 20 + Math.floor(i / 3) * 14 + rng() * 4, 2.4, 0, 7); ctx.fill(); } }
    else if (k === 'spark') {
      ctx.strokeStyle = 'rgba(91,74,115,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, 18); ctx.bezierCurveTo(20, 10, 40, 26, 60, 16); ctx.stroke();
      ctx.fillStyle = '#9670dc'; ctx.beginPath(); ctx.arc(36, 18.5, 2.6, 0, 7); ctx.fill();
      ctx.strokeStyle = '#5b4a73'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4, 46);
      for (let x = 4; x <= 60; x += 2) { const spike = (x === 18 || x === 34 || x === 40 || x === 52) ? -14 : 0; ctx.lineTo(x, 46 + spike + (rng() - 0.5) * 2); }
      ctx.stroke(); ctx.fillStyle = '#5b4a73'; ctx.font = '7px sans-serif'; ctx.fillText('電位', 4, 60);
    } else if (k === 'network') {
      ctx.fillStyle = '#efe9dc'; [[12, 14], [52, 18], [32, 54]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill(); });
      ctx.strokeStyle = 'rgba(80,140,120,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(12, 14); ctx.quadraticCurveTo(32, 30, 52, 18); ctx.moveTo(32, 26); ctx.lineTo(32, 54); ctx.stroke();
      ctx.fillStyle = '#78be6e'; [[22, 20], [42, 21], [32, 40]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); });
    }
    items.sort((a, b) => a.t - b.t).forEach((it) => it.draw(ctx));
  }

  base.parentElement.addEventListener('pointerdown', (e) => {
    if (![over, base, fx].includes(e.target)) return;
    const r = over.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * LW, y = (e.clientY - r.top) / r.height * LH;
    if (x < 0 || y < 0 || x > LW || y > LH) return;
    const t = S.tool;
    if (FT.includes(t) && t) { addFood(t, x, y); say(`放了${FOOD_NAME[t]}。`, 1400); }
    else if (t === 'water' || t === 'dry') { addWet(t, x, y); say(t === 'water' ? '滴了水，這附近變潮了。' : '放了乾燥劑，菌絲會繞開這裡。', 1800); }
    else if (t === 'spore') {
      const sp = S.spore, w = wetAt(Math.floor(x / CS), Math.floor(y / CS));
      addColony(sp, x, y, false, null);
      if (w < SPECIES[sp].minWet) say(`這裡對${SPECIES[sp].name}太乾了，孢子會先休眠。`, 2400);
      else if (tempFit(sp) < 0.3) say(`${SPECIES[sp].name}覺得太冷或太熱，長得很慢。`, 2400);
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
    clearTimeout(armT); b.classList.remove('armed'); b.textContent = '重來'; start();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('dex').hidden) closeDex(); });

  function start() {
    S = fresh(); log = []; redrawAll();
    addFood('bread', SHELF_X0 + 60, SHELF - 12);
    addColony('pen', SHELF_X0 + 60, SHELF - 14, true);
    renderTools(); renderEnv(); renderDexCount();
    for (let i = 0; i < 180; i++) stepSim(); flushPending();
    say('點牆面放食物、水滴或乾燥劑。黴菌會自己找過去。', 4200);
  }
  function flushPending() { while (S.pending.length && S.pending[0].at <= S.step) paint(S.pending.shift().draw); }

  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    acc += dt * 30 * S.speed;
    let n = 0; while (acc >= 1 && n < 16) { stepSim(); acc -= 1; n++; }
    flushPending(); drawPulses(dt);
    if (log.length > 60000) { const snap = document.createElement('canvas'); snap.width = base.width; snap.height = base.height; snap.getContext('2d').drawImage(base, 0, 0); log = [(ctx) => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(snap, 0, 0, Math.round(LW * R), Math.round(LH * R)); ctx.restore(); }]; }
    $('day').textContent = `第 ${day()} 天`;
    requestAnimationFrame(frame);
  }
  new ResizeObserver(fit).observe(stage);
  start(); fit();
  requestAnimationFrame(frame);
  window.__mold = { get S() { return S; }, stepSim, addFood, addWet, addColony, openDex, dex: () => dex, setEnv(h, t) { S.hum = h; S.temp = t; renderEnv(); } };
})();
