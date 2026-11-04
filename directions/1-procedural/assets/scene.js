// 場景：一面牆的正視圖（不是等角），牆角接縫在畫面左側偏中。
// 黴菌從接縫、層板上的吐司、踢腳板三個地方隨時間長出來。
(function () {
  const G = window.Growth;
  const DPR = Math.min(2, window.devicePixelRatio || 1);

  // 逐步繪圖器：items 依 t 排序，時間往前走就把新出生的畫上去（不重畫舊的）
  function Grower(canvas, build) {
    const ctx = canvas.getContext('2d');
    let items = [], cursor = 0, W = 0, H = 0, seed = 1, bg = null, progress = 0;
    function size() {
      const r = canvas.getBoundingClientRect();
      W = Math.round(r.width); H = Math.round(r.height);
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    function reset(newSeed) {
      size(); seed = newSeed; cursor = 0; progress = 0;
      const rng = G.makeRng(seed);
      const out = build(rng, W, H, ctx);
      items = out.items.sort((a, b) => a.t - b.t); bg = out.bg;
      ctx.clearRect(0, 0, W, H); if (bg) bg(ctx, W, H);
    }
    function advance(t) {
      progress = t;
      while (cursor < items.length && items[cursor].t <= t) { items[cursor].draw(ctx); cursor++; }
    }
    // Rebuild at the new CSS size, preserving the seed and growth progress.
    new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      if (Math.round(r.width) === W && Math.round(r.height) === H) return;
      const previousProgress = progress;
      reset(seed);
      advance(previousProgress);
    }).observe(canvas);
    return { reset, advance, get done() { return cursor >= items.length; } };
  }

  // ---------- 主場景 ----------
  const scene = document.getElementById('scene');
  const dayEl = document.getElementById('day');
  const DAYS = 7, DURATION = 14000; // 7 天在 14 秒內長完
  let frameId = null, restartTimer = null;
  let t = 0, last = 0, seed = (Date.now() % 100000) | 0;

  const sceneGrower = Grower(scene, (rng, W, H) => {
    const seamX = W * 0.40, baseY = H * 0.86, shelfY = H * 0.56, shelfX0 = W * 0.56;
    const items = [];
    const bg = (ctx) => {
      // 兩面牆：顏色差一點點就好，靠接縫和光影區分
      ctx.fillStyle = '#ece6dc'; ctx.fillRect(0, 0, seamX, H);
      ctx.fillStyle = '#e3dccf'; ctx.fillRect(seamX, 0, W - seamX, H);
      // 牆角陰影
      const g = ctx.createLinearGradient(seamX - 40, 0, seamX + 40, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(60,50,40,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(seamX - 40, 0, 80, H);
      // 踢腳板 + 地板
      ctx.fillStyle = '#d6cdbd'; ctx.fillRect(0, baseY, W, H * 0.04);
      ctx.fillStyle = '#c4b59c'; ctx.fillRect(0, baseY + H * 0.04, W, H);
      // 濕痕：接縫上方一片淡淡的水漬
      const wg = ctx.createRadialGradient(seamX, H * 0.18, 4, seamX, H * 0.18, W * 0.22);
      wg.addColorStop(0, 'rgba(120,110,90,.22)'); wg.addColorStop(1, 'rgba(120,110,90,0)');
      ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H * 0.5);
      // 層板 + 吐司
      ctx.fillStyle = '#b9a98c'; ctx.fillRect(shelfX0, shelfY, W - shelfX0, 6);
      ctx.fillStyle = '#a89a80'; ctx.fillRect(shelfX0, shelfY + 6, W - shelfX0, 3);
      const bx = shelfX0 + 28, by = shelfY;
      ctx.fillStyle = '#e9d6b4';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 6, by - 36, bx + 10, by - 44);
      ctx.quadraticCurveTo(bx + 20, by - 56, bx + 34, by - 44); ctx.quadraticCurveTo(bx + 44, by - 56, bx + 56, by - 44);
      ctx.quadraticCurveTo(bx + 72, by - 36, bx + 64, by); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c9b08a'; ctx.lineWidth = 2; ctx.stroke();
    };

    // 1) 麴菌：從接縫上方的水漬長出來，菌絲往兩邊爬，孢子頭往外長
    const aOrigin = { x: seamX + 2, y: H * 0.16 };
    const myA = G.mycelium(rng, aOrigin, { dirBias: Math.PI / 2, spread: 3, steps: 90, branchP: 0.12, len: 4, color: 'rgba(120,110,70,.35)', width: 0.9, t0: 0.05, t1: 0.6, bounds: { x0: seamX - W * 0.2, x1: seamX + W * 0.22, y0: H * 0.06, y1: H * 0.42 } });
    items.push(...myA);
    const nodesA = myA.filter((_, i) => i % 23 === 7).slice(0, 7);
    nodesA.forEach((n, i) => {
      const base = { x: aOrigin.x + (rng() - 0.5) * W * 0.3, y: aOrigin.y + rng() * H * 0.22 };
      const lean = (base.x < seamX ? 1 : -1) * (0.2 + rng() * 0.6); // 從牆角往外伸
      items.push(...G.aspergillusHead(rng, base, { height: 30 + rng() * 26, t0: 0.25 + i * 0.07, t1: 0.6 + i * 0.05, lean }));
    });

    // 2) 青黴：長在吐司上
    const bx = shelfX0 + 28, by = shelfY;
    const pOrigin = { x: bx + 36, y: by - 30 };
    items.push(...G.mycelium(rng, pOrigin, { dirBias: 0, spread: 6, steps: 50, branchP: 0.15, len: 3, color: 'rgba(90,150,130,.35)', width: 0.8, t0: 0.15, t1: 0.55, bounds: { x0: bx + 2, x1: bx + 62, y0: by - 50, y1: by - 2 } }));
    const nP = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < nP; i++) {
      const base = { x: bx + 8 + rng() * 52, y: by - 6 - rng() * 34 };
      items.push(...G.penicilliumBrush(rng, base, { height: 18 + rng() * 22, t0: 0.35 + rng() * 0.3, t1: 0.75 + rng() * 0.2, lean: (rng() - 0.5) * 0.8 }));
    }
    // 吐司上的青綠色斑：用小 Eden 菌落當底
    items.push(...G.monascusColony(rng, { x: bx + 30, y: by - 22 }, { cells: 160, cell: 2.4, t0: 0.3, t1: 0.7, palette: ['#d8ece4', '#b6dbd0', '#8fc6b6', '#6cae9d', '#4f9486', '#3c7a6e'], ascoma: 'rgba(0,0,0,0)', anisotropy: 0.9 }));

    // 3) 紅麴：踢腳板上方、接縫左側的紅色菌落（兩三團）
    const nM = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < nM; i++) {
      const c = { x: seamX - 10 - rng() * W * 0.28, y: baseY - 6 - rng() * H * 0.1 };
      items.push(...G.monascusColony(rng, c, { cells: 350 + Math.floor(rng() * 500), cell: 2.6, t0: 0.1 + i * 0.2, t1: 0.7 + i * 0.1, anisotropy: 0.8 }));
    }
    return { items, bg };
  });

  function restart() {
    cancelAnimationFrame(frameId);
    clearTimeout(restartTimer);
    restartTimer = null;
    seed = (seed * 1103515245 + 12345) % 2147483647;
    sceneGrower.reset(seed); t = 0; last = performance.now();
    dayEl.textContent = '第 1 天';
    frameId = requestAnimationFrame(frame);
  }
  function frame(now) {
    if (!last) last = now;
    t = Math.min(1, t + (now - last) / DURATION); last = now;
    sceneGrower.advance(t);
    dayEl.textContent = '第 ' + Math.max(1, Math.ceil(t * DAYS)) + ' 天';
    if (t >= 1) { frameId = null; restartTimer = setTimeout(restart, 2500); return; }
    frameId = requestAnimationFrame(frame);
  }
  scene.addEventListener('click', restart);
  restart();

  // ---------- 三個標本條 ----------
  const specs = {
    penicillium: (rng, W, H) => {
      const items = []; const base = { x: W * 0.18, y: H * 0.92 };
      items.push(...G.mycelium(rng, base, { dirBias: -0.2, spread: 1.6, steps: 60, branchP: 0.14, len: 6, color: 'rgba(80,120,105,.35)', width: 1, t0: 0, t1: 0.4, bounds: { x0: 0, x1: W, y0: H * 0.5, y1: H } }));
      for (let i = 0; i < 4; i++) items.push(...G.penicilliumBrush(rng, { x: W * (0.12 + i * 0.2 + rng() * 0.1), y: H * (0.8 + rng() * 0.15) }, { height: H * (0.35 + rng() * 0.25), t0: 0.2 + i * 0.12, t1: 0.6 + i * 0.1, lean: (rng() - 0.5) * 0.9 }));
      return { items, bg: (ctx) => { ctx.fillStyle = '#f2eee6'; ctx.fillRect(0, 0, W, H); } };
    },
    aspergillus: (rng, W, H) => {
      const items = []; const base = { x: W * 0.5, y: H * 0.95 };
      items.push(...G.mycelium(rng, base, { dirBias: Math.PI, spread: 6, steps: 60, branchP: 0.14, len: 6, color: 'rgba(120,110,70,.35)', width: 1, t0: 0, t1: 0.4, bounds: { x0: 0, x1: W, y0: H * 0.55, y1: H } }));
      for (let i = 0; i < 3; i++) items.push(...G.aspergillusHead(rng, { x: W * (0.2 + i * 0.28 + rng() * 0.1), y: H * (0.85 + rng() * 0.1) }, { height: H * (0.35 + rng() * 0.25), t0: 0.15 + i * 0.15, t1: 0.6 + i * 0.12, lean: (rng() - 0.5) * 0.8 }));
      return { items, bg: (ctx) => { ctx.fillStyle = '#f2eee6'; ctx.fillRect(0, 0, W, H); } };
    },
    monascus: (rng, W, H) => {
      const items = [];
      items.push(...G.monascusColony(rng, { x: W * 0.32, y: H * 0.5 }, { cells: 1400, cell: 3, t0: 0, t1: 0.9, anisotropy: 0.9 }));
      items.push(...G.monascusColony(rng, { x: W * 0.72, y: H * 0.62 }, { cells: 500, cell: 3, t0: 0.3, t1: 0.95, anisotropy: 0.9 }));
      return { items, bg: (ctx) => { ctx.fillStyle = '#f2eee6'; ctx.fillRect(0, 0, W, H); } };
    }
  };
  document.querySelectorAll('canvas[data-spec]').forEach((cv, k) => {
    const g = Grower(cv, specs[cv.dataset.spec]);
    let s = 11 + k * 97, st = 0, l = 0, frameId = null;
    const tick = (now) => {
      st = Math.min(1, st + (now - l) / 6000); l = now;
      g.advance(st);
      frameId = st < 1 ? requestAnimationFrame(tick) : null;
    };
    const run = () => {
      cancelAnimationFrame(frameId);
      s = (s * 48271) % 2147483647;
      g.reset(s); st = 0; l = performance.now();
      frameId = requestAnimationFrame(tick);
    };
    cv.addEventListener('click', run); run();
  });
})();
