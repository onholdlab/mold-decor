const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  let now = 0, id = 0;
  const frames = new Map(), timers = new Map(), observers = [];
  const context = new Proxy({}, { get: (_, key) => key.startsWith('create')
    ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  const canvas = spec => ({ dataset: { spec }, width: 0, height: 0,
    rect: { width: 390, height: 180 }, listeners: {},
    getContext: () => context, getBoundingClientRect() { return this.rect; },
    addEventListener(type, fn) { this.listeners[type] = fn; } });
  const scene = canvas(), day = {}, specs = ['penicillium', 'aspergillus', 'monascus'].map(canvas);
  const sandbox = { window: { devicePixelRatio: 1 }, performance: { now: () => now },
    document: { getElementById: name => name === 'scene' ? scene : day, querySelectorAll: () => specs },
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (fn, delay) => { timers.set(++id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
    ResizeObserver: class { constructor(fn) { this.fn = fn; } observe(target) { observers.push({ target, fn: this.fn }); } }
  };
  vm.createContext(sandbox);
  for (const file of ['growth.js', 'scene.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../directions/1-procedural/assets', file), 'utf8'), sandbox);
  return { frames, timers, scene, day, specs, observers,
    step(ms) { now += ms; const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(now)); },
    wait(ms) { now += ms; for (const [key, timer] of [...timers]) if (timer.at <= now) { timers.delete(key); timer.fn(); } }
  };
}

test('completed scene waits once, then runs one new growth cycle', () => {
  const s = setup();
  s.step(100); s.step(14000);
  assert.equal(s.timers.size, 1);
  assert.equal(s.frames.size, 0);
  s.wait(2500);
  assert.equal(s.timers.size, 0);
  assert.equal(s.frames.size, 1);
  s.step(1000);
  assert.equal(s.timers.size, 0);
  assert.equal(s.frames.size, 1);
});

test('click during completion pause cancels the old automatic restart', () => {
  const s = setup(); s.step(100); s.step(14000);
  s.scene.listeners.click();
  assert.equal(s.timers.size, 0);
  assert.equal(s.frames.size, 1);
  assert.equal(s.day.textContent, '第 1 天');
  s.wait(2500); s.step(100);
  assert.equal(s.frames.size, 1);
});

test('rapid specimen clicks keep one animation per canvas', () => {
  const s = setup();
  for (let i = 0; i < 20; i++) s.specs.forEach(cv => cv.listeners.click());
  assert.equal(s.frames.size, 4);
  s.step(100); s.step(6100);
  assert.equal(s.frames.size, 1);
});

test('resize rebuilds completed canvases without restarting animation', () => {
  const s = setup(); s.step(100); s.step(14000);
  for (const { target, fn } of s.observers) { target.rect = { width: 720, height: 220 }; fn(); assert.equal(target.width, 720); assert.equal(target.height, 220); }
  assert.equal(s.frames.size, 0);
  assert.equal(s.timers.size, 1);
});
