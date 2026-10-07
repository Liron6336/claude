'use strict';

class Building {
  constructor(type, x, y, dir) {
    this.type = type;
    this.def = BUILDINGS[type];
    this.x = x;
    this.y = y;
    this.w = this.h = this.def.size;
    this.dir = dir || 0;
    this.maxHp = this.def.hp;
    this.hp = this.maxHp;
    this.lastHit = -99;
    this.dumpIdx = 0;
    this.dumpT = 0;
    this.working = false;
    this.anim = 0;
    this.dead = false;
  }

  init(world) {}
  update(world, dt) {}

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  // Попытка принять предмет. travelDir: направление, в котором предмет движется
  accept(world, type, travelDir, source) { return false; }

  // Клетки по периметру здания и направление "наружу" к каждой из них
  neighbors() {
    if (!this._nb) {
      const list = [];
      for (let i = 0; i < this.w; i++) {
        list.push({ x: this.x + i, y: this.y - 1, dir: 3 });
        list.push({ x: this.x + i, y: this.y + this.h, dir: 1 });
      }
      for (let j = 0; j < this.h; j++) {
        list.push({ x: this.x - 1, y: this.y + j, dir: 2 });
        list.push({ x: this.x + this.w, y: this.y + j, dir: 0 });
      }
      this._nb = list;
    }
    return this._nb;
  }

  // Отдать предмет одному из соседей по кругу
  offer(world, type, filter) {
    const nb = this.neighbors(), n = nb.length;
    for (let k = 0; k < n; k++) {
      const i = (this.dumpIdx + k) % n, t = nb[i];
      const b = world.buildingAt(t.x, t.y);
      if (!b || b === this || (filter && !filter(b))) continue;
      if (b.accept(world, type, t.dir, this)) {
        this.dumpIdx = (i + 1) % n;
        return true;
      }
    }
    return false;
  }
}

class Conveyor extends Building {
  init() { this.items = []; }

  accept(world, type, travelDir) {
    if (travelDir === opposite(this.dir)) return false; // нельзя заехать навстречу ленте
    const items = this.items;
    if (items.length >= 4) return false;
    const last = items[items.length - 1];
    if (last && last.pos < ITEM_SPACING) return false;
    items.push({ type, pos: 0 });
    return true;
  }

  update(world, dt) {
    const items = this.items;
    if (!items.length) return;
    const step = CONVEYOR_SPEED * dt;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const limit = i === 0 ? 1 : items[i - 1].pos - ITEM_SPACING;
      it.pos = Math.min(it.pos + step, Math.max(limit, it.pos));
    }
    const front = items[0];
    if (front.pos >= 1) {
      const d = DIRS[this.dir];
      const b = world.buildingAt(this.x + d[0], this.y + d[1]);
      if (b && b.accept(world, front.type, this.dir, this)) items.shift();
      else front.pos = 1;
    }
  }
}

class Drill extends Building {
  init(world) {
    const o = world.countOre(this.x, this.y, this.w);
    this.oreType = o.type;
    this.oreCount = o.count;
    this.rate = DRILL_RATE * o.count;
    this.progress = 0;
    this.buffer = 0;
  }

  update(world, dt) {
    this.working = this.buffer < 10;
    if (this.working) {
      this.progress += this.rate * dt;
      if (this.progress >= 1) { this.progress -= 1; this.buffer++; }
      this.anim += dt * 5;
    }
    this.dumpT -= dt;
    if (this.buffer > 0 && this.dumpT <= 0 && this.offer(world, this.oreType)) {
      this.buffer--;
      this.dumpT = 0.1;
    }
  }
}

function defaultRecipe(btype, unlocked) {
  for (const id in RECIPES) if (RECIPES[id].building === btype && unlocked.has(id)) return id;
  return null;
}

// Плавильня и сборщик: перерабатывают входные предметы по рецепту
class Crafter extends Building {
  init(world) {
    this.recipe = defaultRecipe(this.type, world.unlocks.recipes);
    this.inputs = {};
    this.outputs = {};
    this.progress = 0;
    this.status = 'input';
  }

  setRecipe(id) {
    if (id === this.recipe) return;
    this.recipe = id;
    this.inputs = {};
    this.progress = 0;
  }

  outTotal() {
    let s = 0;
    for (const k in this.outputs) s += this.outputs[k];
    return s;
  }

  accept(world, type) {
    const r = RECIPES[this.recipe];
    const need = r && r.in[type];
    if (!need) return false;
    const have = this.inputs[type] || 0;
    if (have >= Math.max(need * 3, 4)) return false;
    this.inputs[type] = have + 1;
    return true;
  }

  update(world, dt) {
    const r = RECIPES[this.recipe];
    if (r) {
      let hasIn = true;
      for (const k in r.in) if ((this.inputs[k] || 0) < r.in[k]) { hasIn = false; break; }
      const full = this.outTotal() >= 10;
      this.working = hasIn && !full;
      this.status = full ? 'output' : hasIn ? 'work' : 'input';
      if (this.working) {
        this.progress += dt / r.time;
        this.anim += dt * 3;
        if (this.progress >= 1) {
          this.progress = 0;
          for (const k in r.in) this.inputs[k] -= r.in[k];
          for (const k in r.out) this.outputs[k] = (this.outputs[k] || 0) + r.out[k];
        }
        if (this.type === 'smelter' && Math.random() < dt * 4) world.smoke(this.x + 1.6, this.y + 0.3);
      }
    }
    this.dumpT -= dt;
    if (this.dumpT <= 0) {
      for (const k in this.outputs) {
        if (this.outputs[k] > 0 && this.offer(world, k)) {
          this.outputs[k]--;
          this.dumpT = 0.1;
          break;
        }
      }
    }
  }
}

class Splitter extends Building {
  init() { this.item = null; this.travel = 0; this.t = 0; this.rr = 0; }

  accept(world, type, travelDir) {
    if (this.item) return false;
    this.item = type;
    this.travel = travelDir;
    this.t = 0.05;
    return true;
  }

  update(world, dt) {
    if (!this.item) return;
    this.t -= dt;
    if (this.t > 0) return;
    const back = opposite(this.travel);
    for (let k = 0; k < 4; k++) {
      const d = (this.rr + k) % 4;
      if (d === back) continue;
      const b = world.buildingAt(this.x + DIRS[d][0], this.y + DIRS[d][1]);
      if (b && b.accept(world, this.item, d, this)) {
        this.item = null;
        this.rr = (d + 1) % 4;
        return;
      }
    }
  }
}

class Storage extends Building {
  init() { this.stored = {}; this.total = 0; this.cap = 40; this.rr = 0; }

  // Хранилище принимает только с конвейеров, иначе соседние здания сразу забивали бы его своей продукцией
  accept(world, type, travelDir, source) {
    if (source && source.type !== 'conveyor' && source.type !== 'splitter') return false;
    if (this.total >= this.cap) return false;
    this.stored[type] = (this.stored[type] || 0) + 1;
    this.total++;
    return true;
  }

  update(world, dt) {
    this.dumpT -= dt;
    if (this.total <= 0 || this.dumpT > 0) return;
    const keys = Object.keys(this.stored).filter(k => this.stored[k] > 0);
    for (let k = 0; k < keys.length; k++) {
      const type = keys[(this.rr + k) % keys.length];
      if (this.offer(world, type, b => b.type !== 'storage')) {
        this.stored[type]--;
        this.total--;
        this.rr++;
        this.dumpT = 0.1;
        return;
      }
    }
  }
}

class Turret extends Building {
  init() {
    this.ammo = [];
    this.shots = 0;
    this.dmg = 0;
    this.shotColor = '#fff';
    this.angle = -Math.PI / 2;
    this.cool = 0;
    this.target = null;
    this.retarget = 0;
    this.flash = 0;
  }

  accept(world, type) {
    if (!AMMO[type] || this.ammo.length >= 10) return false;
    this.ammo.push(type);
    return true;
  }

  update(world, dt) {
    this.cool -= dt;
    this.retarget -= dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.shots <= 0 && this.ammo.length) {
      const a = AMMO[this.ammo.shift()];
      this.shots = a.shots;
      this.dmg = a.dmg;
      this.shotColor = a.color;
    }
    shootAt(this, world, dt, TURRET.range, TURRET.rate, () => this.shots > 0, () => {
      this.shots--;
      return { dmg: this.dmg, color: this.shotColor };
    });
  }
}

class Core extends Building {
  init() {
    this.angle = 0;
    this.cool = 0;
    this.target = null;
    this.retarget = 0;
    this.flash = 0;
    this.pulse = 0;
  }

  accept(world, type) {
    world.stock[type] = (world.stock[type] || 0) + 1;
    world.delivered[type] = (world.delivered[type] || 0) + 1;
    this.pulse = 1;
    return true;
  }

  update(world, dt) {
    this.pulse = Math.max(0, this.pulse - dt * 2);
    this.flash = Math.max(0, this.flash - dt);
    this.cool -= dt;
    this.retarget -= dt;
    shootAt(this, world, dt, CORE_GUN.range, CORE_GUN.rate, () => true,
      () => ({ dmg: CORE_GUN.dmg, color: CORE_GUN.color }));
  }
}

// Общая логика наведения и стрельбы для турели и Ядра
function shootAt(b, world, dt, range, rate, hasAmmo, takeShot) {
  const cx = b.cx, cy = b.cy;
  let t = b.target;
  if (t && (t.dead || Math.hypot(t.x - cx, t.y - cy) > range)) t = b.target = null;
  if (!t && b.retarget <= 0) {
    t = b.target = world.findTarget(cx, cy, range);
    b.retarget = 0.25;
  }
  if (!t) return;
  const want = Math.atan2(t.y - cy, t.x - cx);
  b.angle = angleLerp(b.angle, want, Math.min(1, dt * 10));
  if (b.cool <= 0 && hasAmmo() && Math.abs(angleDiff(b.angle, want)) < 0.3) {
    const s = takeShot();
    const mx = cx + Math.cos(b.angle) * 0.5, my = cy + Math.sin(b.angle) * 0.5;
    world.fireBullet(mx, my, t, s.dmg, s.color);
    b.cool = 1 / rate;
    b.flash = 0.07;
  }
}

const BUILDING_CLASSES = {
  conveyor: Conveyor,
  drill: Drill,
  splitter: Splitter,
  smelter: Crafter,
  assembler: Crafter,
  storage: Storage,
  turret: Turret,
  core: Core,
  wall: Building,
  steel_wall: Building,
};
