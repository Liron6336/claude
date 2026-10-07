'use strict';

class World {
  constructor(levelIndex) {
    const L = LEVELS[levelIndex];
    this.levelIndex = levelIndex;
    this.level = L;
    this.W = L.w;
    this.H = L.h;
    const n = this.W * this.H;
    this.rock = new Uint8Array(n);
    this.ore = new Array(n).fill(null);
    this.shade = new Float32Array(n);
    this.grid = new Array(n).fill(null);
    this.flow = new Float32Array(n);
    this.buildings = [];
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.spawns = [];
    this.events = [];
    this.spawnQueue = [];
    this.spawnT = 0;
    this.stock = Object.assign({}, L.start);
    this.delivered = {};
    this.kills = {};
    this.time = 0;
    this.state = 'playing';
    this.unlocks = unlocksFor(levelIndex);
    this.flowDirty = true;
    this.flowTimer = 0;
    this.winT = 0;

    generateMap(this, L);
    this.core = this.place('core', this.coreX, this.coreY, 0);
    this.computeFlow();
    this.wave = L.waves ? { index: 0, timer: L.waves.first } : null;
  }

  // ---------- Сетка ----------
  idx(x, y) { return y * this.W + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  buildingAt(x, y) { return this.inBounds(x, y) ? this.grid[y * this.W + x] : null; }
  blocked(x, y) {
    if (!this.inBounds(x, y)) return true;
    const i = y * this.W + x;
    return this.rock[i] === 1 || this.grid[i] !== null;
  }

  countOre(x, y, s) {
    const tally = {};
    let type = null, count = 0;
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
      if (!this.inBounds(x + i, y + j)) continue;
      const o = this.ore[this.idx(x + i, y + j)];
      if (o) tally[o] = (tally[o] || 0) + 1;
    }
    for (const k in tally) if (tally[k] > count) { count = tally[k]; type = k; }
    return { type, count };
  }

  // ---------- Ресурсы ----------
  canAfford(cost) {
    for (const k in cost) if ((this.stock[k] || 0) < cost[k]) return false;
    return true;
  }
  pay(cost) { for (const k in cost) this.stock[k] -= cost[k]; }

  // ---------- Строительство ----------
  checkPlace(type, x, y) {
    const s = BUILDINGS[type].size;
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
      const tx = x + i, ty = y + j;
      if (!this.inBounds(tx, ty)) return 'За пределами карты';
      if (this.rock[this.idx(tx, ty)]) return 'Здесь скала';
      if (this.grid[this.idx(tx, ty)]) return 'Место занято';
    }
    for (const sp of this.spawns) {
      const px = clamp(sp.x + 0.5, x, x + s), py = clamp(sp.y + 0.5, y, y + s);
      if (Math.hypot(px - sp.x - 0.5, py - sp.y - 0.5) < SPAWN_RADIUS) return 'Слишком близко к логову врагов';
    }
    for (const e of this.enemies) {
      const r = e.def.size;
      if (e.x + r > x && e.x - r < x + s && e.y + r > y && e.y - r < y + s) return 'Мешают враги';
    }
    if (type === 'drill' && this.countOre(x, y, s).count === 0) return 'Бур нужно ставить на залежь';
    return null;
  }

  tryBuild(type, x, y, dir) {
    const err = this.checkPlace(type, x, y);
    if (err) return err;
    const cost = BUILDINGS[type].cost;
    if (!this.canAfford(cost)) return 'Недостаточно ресурсов';
    this.pay(cost);
    const b = this.place(type, x, y, dir);
    this.burst(b.cx, b.cy, '#9fe8ff', 6, 1);
    return null;
  }

  place(type, x, y, dir) {
    const Cls = BUILDING_CLASSES[type] || Building;
    const b = new Cls(type, x, y, dir);
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) this.grid[this.idx(x + i, y + j)] = b;
    this.buildings.push(b);
    b.init(this);
    this.flowDirty = true;
    return b;
  }

  remove(b) {
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) {
      const k = this.idx(b.x + i, b.y + j);
      if (this.grid[k] === b) this.grid[k] = null;
    }
    const i = this.buildings.indexOf(b);
    if (i >= 0) this.buildings.splice(i, 1);
    b.dead = true;
    this.flowDirty = true;
  }

  deconstruct(b) {
    if (!b || b === this.core) return false;
    const cost = b.def.cost;
    for (const k in cost) this.stock[k] = (this.stock[k] || 0) + Math.ceil(cost[k] * REFUND);
    this.remove(b);
    this.burst(b.cx, b.cy, '#8b98a5', 8, 1);
    return true;
  }

  damageBuilding(b, dmg) {
    if (b.dead) return;
    b.hp -= dmg;
    b.lastHit = this.time;
    if (b.hp > 0) return;
    this.burst(b.cx, b.cy, '#ff9a3c', 14 * b.w, 3);
    this.burst(b.cx, b.cy, '#555', 8 * b.w, 2, 'smoke');
    if (b === this.core) {
      b.hp = 0;
      b.dead = true;
      this.state = 'lost';
      this.events.push({ type: 'lost' });
    } else {
      this.remove(b);
      this.events.push({ type: 'destroyed', name: b.def.name });
    }
  }

  // ---------- Враги ----------
  addEnemy(type, x, y) {
    const e = new Enemy(type, x, y);
    this.enemies.push(e);
    return e;
  }

  findTarget(x, y, range) {
    let best = null, bd = range;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= bd) { bd = d; best = e; }
    }
    return best;
  }

  fireBullet(x, y, target, dmg, color) {
    this.bullets.push(new Bullet(x, y, target, dmg, color));
  }

  hitEnemy(e, dmg) {
    if (e.dead) return;
    e.hp -= Math.max(1, dmg - e.def.armor);
    e.hitFlash = 0.08;
    if (e.hp <= 0) {
      e.dead = true;
      this.kills[e.type] = (this.kills[e.type] || 0) + 1;
      this.burst(e.x, e.y, e.def.color, e.type === 'boss' ? 60 : 12, e.type === 'boss' ? 4 : 2);
      this.burst(e.x, e.y, e.def.dark, e.type === 'boss' ? 30 : 6, 1.5, 'goo');
      if (e.type === 'boss') this.events.push({ type: 'boss_dead' });
    }
  }

  waveComposition(i) {
    const groups = this.level.waves.groups;
    if (i < groups.length) return groups[i];
    const extra = i - groups.length + 1;
    const last = groups[groups.length - 1].filter(g => g[0] !== 'boss');
    return last.map(([t, n]) => [t, Math.ceil(n * (1 + 0.3 * extra))]);
  }

  launchWave() {
    const comp = this.waveComposition(this.wave.index);
    let k = Math.floor(Math.random() * this.spawns.length);
    for (const [type, n] of comp) {
      for (let i = 0; i < n; i++) this.spawnQueue.push({ type, spawn: this.spawns[k++ % this.spawns.length] });
    }
    this.wave.index++;
    this.wave.timer = this.level.waves.interval;
    this.events.push({ type: 'wave', index: this.wave.index, boss: comp.some(g => g[0] === 'boss') });
  }

  // Карта расстояний до Ядра. Здания проходимы, но "дороги": враги их ломают
  computeFlow() {
    const W = this.W, H = this.H, flow = this.flow;
    flow.fill(Infinity);
    const heap = new MinHeap();
    const c = this.core;
    for (let j = 0; j < c.h; j++) for (let i = 0; i < c.w; i++) {
      const k = this.idx(c.x + i, c.y + j);
      flow[k] = 0;
      heap.push(0, k);
    }
    while (heap.size) {
      const k = heap.pop();
      const d = heap.topKey;
      if (d > flow[k]) continue;
      const x = k % W, y = (k - x) / W;
      for (let dir = 0; dir < 4; dir++) {
        const nx = x + DIRS[dir][0], ny = y + DIRS[dir][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nk = ny * W + nx;
        if (this.rock[nk]) continue;
        const b = this.grid[nk];
        const cost = 1 + (b && b !== c ? b.maxHp / 15 : 0);
        const nd = d + cost;
        if (nd < flow[nk]) { flow[nk] = nd; heap.push(nd, nk); }
      }
    }
  }

  // ---------- Эффекты ----------
  burst(x, y, color, n, power, kind) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (0.5 + Math.random()) * power;
      const life = kind === 'smoke' ? 0.8 + Math.random() * 0.8 : 0.3 + Math.random() * 0.4;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life, max: life, color, size: kind === 'smoke' ? 0.15 + Math.random() * 0.15 : 0.05 + Math.random() * 0.07,
        kind: kind || 'spark',
      });
    }
  }

  smoke(x, y) {
    this.particles.push({
      x, y, vx: (Math.random() - 0.5) * 0.2, vy: -0.4 - Math.random() * 0.3,
      life: 1.6, max: 1.6, color: '#6b6560', size: 0.1, kind: 'smoke',
    });
  }

  // ---------- Цели ----------
  goalProgress(g) {
    const v = g.type === 'deliver' ? this.delivered[g.item] || 0 : this.kills[g.enemy] || 0;
    return Math.min(g.amount, v);
  }

  // ---------- Шаг симуляции ----------
  update(dt) {
    this.updateParticles(dt);
    if (this.state !== 'playing') return;
    this.time += dt;

    this.flowTimer -= dt;
    if (this.flowDirty && this.flowTimer <= 0) {
      this.computeFlow();
      this.flowDirty = false;
      this.flowTimer = 0.2;
    }

    for (let i = 0; i < this.buildings.length; i++) {
      const b = this.buildings[i];
      b.update(this, dt);
      if (b.hp < b.maxHp && this.time - b.lastHit > 6) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.03 * dt);
    }

    if (this.wave) {
      this.wave.timer -= dt;
      if (this.wave.timer <= 0) this.launchWave();
    }
    if (this.spawnQueue.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        const s = this.spawnQueue.shift();
        this.addEnemy(s.type, s.spawn.x + 0.3 + Math.random() * 0.4, s.spawn.y + 0.3 + Math.random() * 0.4);
        this.burst(s.spawn.x + 0.5, s.spawn.y + 0.5, '#ff4d6d', 8, 2);
        this.spawnT = 0.7;
      }
    }

    for (let i = 0; i < this.enemies.length; i++) {
      if (this.state !== 'playing') break;
      const e = this.enemies[i];
      if (!e.dead) e.update(this, dt);
    }
    this.separateEnemies(dt);
    this.enemies = this.enemies.filter(e => !e.dead);

    for (const b of this.bullets) b.update(this, dt);
    this.bullets = this.bullets.filter(b => !b.dead);

    this.winT -= dt;
    if (this.winT <= 0 && this.state === 'playing') {
      this.winT = 0.25;
      if (this.level.goals.every(g => this.goalProgress(g) >= g.amount)) {
        this.state = 'won';
        this.events.push({ type: 'won' });
      }
    }
  }

  separateEnemies(dt) {
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) {
      const a = es[i];
      for (let j = i + 1; j < es.length; j++) {
        const b = es[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const min = (a.def.size + b.def.size) * 0.8;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 < 1e-8) continue;
        const d = Math.sqrt(d2);
        const p = (min - d) * 0.5 * Math.min(1, dt * 10);
        const ux = dx / d, uy = dy / d;
        const wa = b.def.size / (a.def.size + b.def.size);
        this.nudge(a, -ux * p * wa * 2, -uy * p * wa * 2);
        this.nudge(b, ux * p * (1 - wa) * 2, uy * p * (1 - wa) * 2);
      }
    }
  }

  nudge(e, dx, dy) {
    const nx = e.x + dx, ny = e.y + dy;
    if (!this.blocked(Math.floor(nx), Math.floor(ny))) { e.x = nx; e.y = ny; }
  }

  updateParticles(dt) {
    const ps = this.particles;
    for (const p of ps) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = p.kind === 'smoke' ? 0.98 : 0.9;
      p.vx *= drag;
      p.vy *= drag;
      p.life -= dt;
    }
    if (ps.length > 600) ps.splice(0, ps.length - 600);
    this.particles = ps.filter(p => p.life > 0);
  }
}

// ---------- Генерация карты ----------
function generateMap(w, L) {
  const rng = mulberry32(L.seed);
  const W = w.W, H = w.H;
  const cx = Math.floor(W / 2) - 1, cy = Math.floor(H / 2) - 1;
  w.coreX = cx;
  w.coreY = cy;
  const ccx = cx + 1.5, ccy = cy + 1.5;

  const spots = [
    [W - 2, Math.floor(H / 2)], [1, Math.floor(H / 2)],
    [Math.floor(W / 2), 1], [Math.floor(W / 2), H - 2],
  ];
  for (let i = 0; i < L.spawns; i++) {
    const s = spots[i].slice();
    if (i < 2) s[1] = clamp(s[1] + Math.round((rng() - 0.5) * H * 0.5), 3, H - 4);
    else s[0] = clamp(s[0] + Math.round((rng() - 0.5) * W * 0.5), 3, W - 4);
    w.spawns.push({ x: s[0], y: s[1] });
  }
  const nearSpawn = (x, y, r) => w.spawns.some(sp => Math.hypot(x - sp.x, y - sp.y) < r);

  const big = makeNoise(rng, W, H, 6), small = makeNoise(rng, W, H, 3), shadeN = makeNoise(rng, W, H, 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const v = big(x, y) * 0.75 + small(x, y) * 0.25;
    const d = Math.hypot(x + 0.5 - ccx, y + 0.5 - ccy);
    w.rock[i] = v > L.rock && d > 6 && !nearSpawn(x, y, 4) ? 1 : 0;
    w.shade[i] = shadeN(x, y) * 0.7 + rng() * 0.3;
  }

  const oreNear = (x, y, r) => {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      if (w.inBounds(x + i, y + j) && w.ore[(y + j) * W + x + i]) return true;
    }
    return false;
  };
  for (const spec of L.ores) {
    for (let k = 0; k < spec.n; k++) {
      const r = spec.r[0] + rng() * (spec.r[1] - spec.r[0]);
      let px = 0, py = 0;
      for (let tries = 0; tries < 60; tries++) {
        const a = rng() * Math.PI * 2, d = spec.d[0] + rng() * (spec.d[1] - spec.d[0]);
        px = Math.round(ccx + Math.cos(a) * d);
        py = Math.round(ccy + Math.sin(a) * d);
        const inside = px > r + 1 && py > r + 1 && px < W - r - 2 && py < H - r - 2;
        if (inside && !nearSpawn(px, py, 7) && !oreNear(px, py, Math.ceil(r) + 2)) break;
      }
      const R = Math.ceil(r) + 1;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const tx = px + dx, ty = py + dy;
        if (!w.inBounds(tx, ty)) continue;
        const dd = Math.hypot(dx, dy) + (small((tx * 3.1 + k * 7) % W, (ty * 3.1) % H) - 0.5) * 2.6;
        if (dd > r) continue;
        if (tx >= cx - 1 && tx <= cx + 3 && ty >= cy - 1 && ty <= cy + 3) continue;
        if (nearSpawn(tx, ty, SPAWN_RADIUS + 1)) continue;
        w.ore[ty * W + tx] = spec.type;
        w.rock[ty * W + tx] = 0;
      }
    }
  }

  // Гарантируем, что от каждого логова есть проход к Ядру
  const seen = new Uint8Array(W * H);
  const queue = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const k = (cy + j) * W + cx + i; seen[k] = 1; queue.push(k); }
  while (queue.length) {
    const k = queue.pop();
    const x = k % W, y = (k - x) / W;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!w.inBounds(nx, ny)) continue;
      const nk = ny * W + nx;
      if (seen[nk] || w.rock[nk]) continue;
      seen[nk] = 1;
      queue.push(nk);
    }
  }
  for (const sp of w.spawns) {
    if (seen[sp.y * W + sp.x]) continue;
    const steps = Math.ceil(Math.hypot(ccx - sp.x, ccy - sp.y) * 2);
    for (let s = 0; s <= steps; s++) {
      const x = Math.floor(lerp(sp.x + 0.5, ccx, s / steps)), y = Math.floor(lerp(sp.y + 0.5, ccy, s / steps));
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if (w.inBounds(x + i, y + j)) w.rock[(y + j) * W + x + i] = 0;
    }
  }
}
