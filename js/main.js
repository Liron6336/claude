'use strict';

// Прогресс хранится в браузере. Если хранилище недоступно, игра всё равно работает
const Progress = {
  key: 'factory_progress_v1',
  data: { best: {} },
  load() {
    try {
      const s = localStorage.getItem(this.key);
      if (s) Object.assign(this.data, JSON.parse(s));
    } catch (e) { /* без сохранений */ }
  },
  save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* без сохранений */ }
  },
  complete(i, time) {
    const b = this.data.best[i];
    if (!b || time < b) this.data.best[i] = time;
    this.save();
  },
  reset() {
    this.data = { best: {} };
    this.save();
  },
};

const PAN_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

const Game = {
  world: null,
  cam: { x: 0, y: 0, zoom: 1 },
  tool: null,
  rot: 0,
  speed: 1,
  lastSpeed: 1,
  acc: 0,
  uiT: 0,
  realTime: 0,
  mouse: { sx: 0, sy: 0, inside: false },
  keys: {},
  drag: null,

  init() {
    this.canvas = $('#game');
    this.renderer = new Renderer(this.canvas);
    Progress.load();
    UI.init(this);
    this.bindInput();
    window.addEventListener('resize', () => this.renderer.resize());
    this.last = performance.now();
    requestAnimationFrame(t => this.frame(t));
    UI.showScreen('menu');
  },

  get paused() { return this.speed === 0 || UI.modalOpen; },

  // ---------- Уровни ----------
  startLevel(i) {
    UI.hideModal();
    this.world = new World(i);
    this.renderer.buildTerrain(this.world);
    const c = this.world.core;
    this.cam.x = c.cx * TILE;
    this.cam.y = c.cy * TILE;
    this.cam.zoom = window.innerWidth < 700 ? 0.8 : 1.1;
    this.tool = null;
    this.rot = 0;
    this.speed = this.lastSpeed = 1;
    this.acc = 0;
    this.drag = null;
    UI.setupLevel(this.world);
    UI.showScreen(null);
    this.showIntro();
  },

  showIntro() {
    const w = this.world, L = w.level;
    const goals = L.goals.map(g => g.type === 'deliver'
      ? `<li><img src="${Icons.item(g.item, 22)}" alt="">Доставить в Ядро: <b>${ITEMS[g.item].name}</b> × ${g.amount}</li>`
      : `<li><img src="${Icons.enemy(g.enemy, 22)}" alt="">Уничтожить: <b>${ENEMIES[g.enemy].name}</b></li>`).join('');
    const nb = L.newBuildings.map(b => `<span class="chip"><img src="${Icons.building(b, 26)}" alt="">${BUILDINGS[b].name}</span>`);
    const nr = L.newRecipes.map(r => `<span class="chip"><img src="${Icons.item(recipeOutput(r), 22)}" alt="">${ITEMS[recipeOutput(r)].name}</span>`);
    const unlocks = nb.concat(nr).join('');
    UI.showModal({
      title: `Уровень ${w.levelIndex + 1}. ${L.name}`,
      cls: 'intro',
      body: `<p>${L.intro}</p>
        <div class="label">Цели</div><ul class="goal-list">${goals}</ul>
        ${unlocks ? `<div class="label">Открыто</div><div class="chips">${unlocks}</div>` : ''}`,
      buttons: [{ label: 'Начать', cls: 'primary', action: () => UI.hideModal() }],
    });
  },

  quitToLevels() {
    UI.hideModal();
    this.world = null;
    UI.showLevels();
  },

  openPauseMenu() {
    if (!this.world || UI.modalOpen) return;
    UI.showModal({
      title: 'Пауза',
      body: `<p>Уровень ${this.world.levelIndex + 1}. ${this.world.level.name}</p><p class="muted">Время на уровне: ${fmtTime(this.world.time)}</p>`,
      buttons: [
        { label: 'В меню уровней', action: () => this.quitToLevels() },
        { label: 'Заново', action: () => this.startLevel(this.world.levelIndex) },
        { label: 'Продолжить', cls: 'primary', action: () => UI.hideModal() },
      ],
    });
  },

  onWin() {
    const w = this.world;
    Progress.complete(w.levelIndex, w.time);
    const last = w.levelIndex === LEVELS.length - 1;
    const made = Object.keys(w.delivered).filter(k => w.delivered[k] > 0).map(k =>
      `<span class="chip"><img src="${Icons.item(k, 20)}" alt="">${w.delivered[k]}</span>`).join('');
    const killed = Object.values(w.kills).reduce((a, b) => a + b, 0);
    const buttons = [{ label: 'К уровням', action: () => this.quitToLevels() }];
    if (!last) buttons.push({ label: 'Следующий уровень', cls: 'primary', action: () => this.startLevel(w.levelIndex + 1) });
    UI.showModal({
      title: last ? 'Завод построен!' : 'Уровень пройден!',
      cls: 'win',
      body: `${last ? '<p>Матка повержена, моторы собраны. Ты прошёл все уровни игры!</p>' : ''}
        <p>Время: <b>${fmtTime(w.time)}</b>${killed ? ` · Врагов уничтожено: <b>${killed}</b>` : ''}</p>
        <div class="label">Доставлено в Ядро</div><div class="chips">${made}</div>`,
      buttons,
    });
  },

  onLose() {
    const w = this.world;
    UI.showModal({
      title: 'Ядро уничтожено',
      cls: 'lose',
      body: `<p>Враги прорвались к сердцу завода. Попробуй поставить больше турелей и стен на пути из логова.</p><p class="muted">Продержался: ${fmtTime(w.time)}</p>`,
      buttons: [
        { label: 'К уровням', action: () => this.quitToLevels() },
        { label: 'Попробовать снова', cls: 'primary', action: () => this.startLevel(w.levelIndex) },
      ],
    });
  },

  // ---------- Действия ----------
  setSpeed(s) {
    if (s > 0) this.lastSpeed = s;
    this.speed = s;
    if (this.world) UI.updateTools(this.world);
  },

  selectTool(id) {
    this.tool = this.tool === id ? null : id;
    if (this.tool) UI.select(null);
    UI.updateTools(this.world);
  },

  callWave() {
    const w = this.world;
    if (w && w.wave && w.state === 'playing') w.wave.timer = 0;
  },

  demolish(b) {
    if (this.world.deconstruct(b)) {
      if (UI.selected === b) UI.select(null);
    }
  },

  ghostPos(wx, wy) {
    const s = BUILDINGS[this.tool] ? BUILDINGS[this.tool].size : 1;
    return { x: Math.floor(wx / TILE - s / 2 + 0.5), y: Math.floor(wy / TILE - s / 2 + 0.5) };
  },

  buildAt(gx, gy, loud) {
    const err = this.world.tryBuild(this.tool, gx, gy, this.rot);
    if (err && loud) UI.toast(err, 'bad');
    return !err;
  },

  placeConveyor(x, y, dir, loud) {
    const w = this.world;
    const ex = w.buildingAt(x, y);
    if (ex && ex.type === 'conveyor') {
      ex.dir = dir;
      this.drag.touched.add(ex);
      return;
    }
    const err = w.tryBuild('conveyor', x, y, dir);
    if (err) {
      if (loud || err === 'Недостаточно ресурсов') UI.toast(err, 'bad');
    } else {
      this.drag.touched.add(w.buildingAt(x, y));
    }
  },

  // Протягивание конвейера: каждая новая клетка задаёт направление предыдущей
  conveyorDrag(tx, ty) {
    const d = this.drag;
    let last = d.last;
    let guard = 0;
    while ((last.x !== tx || last.y !== ty) && guard++ < 300) {
      const dx = tx - last.x, dy = ty - last.y;
      const dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
      const prev = this.world.buildingAt(last.x, last.y);
      if (prev && prev.type === 'conveyor' && d.touched.has(prev)) prev.dir = dir;
      const nx = last.x + DIRS[dir][0], ny = last.y + DIRS[dir][1];
      this.rot = dir;
      this.placeConveyor(nx, ny, dir, false);
      last = { x: nx, y: ny };
    }
    d.last = last;
  },

  // ---------- Ввод ----------
  bindInput() {
    const cv = this.canvas;
    cv.addEventListener('contextmenu', e => e.preventDefault());

    cv.addEventListener('pointerdown', e => {
      if (!this.world || UI.modalOpen) return;
      cv.setPointerCapture(e.pointerId);
      this.updateMouse(e);
      const { tx, ty } = this.hoverTile();
      if (e.button === 1) {
        this.drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, cx: this.cam.x, cy: this.cam.y, moved: true };
      } else if (e.button === 2 || (e.button === 0 && this.tool === 'demolish')) {
        this.drag = { mode: 'delete' };
        this.deleteAt(tx, ty);
      } else if (e.button === 0 && this.tool) {
        const g = this.ghostPos(this.mouse.wx, this.mouse.wy);
        this.drag = { mode: 'build', touched: new Set(), last: { x: tx, y: ty }, lastG: g };
        if (this.tool === 'conveyor') this.placeConveyor(tx, ty, this.rot, true);
        else this.buildAt(g.x, g.y, true);
      } else if (e.button === 0) {
        this.drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, cx: this.cam.x, cy: this.cam.y, moved: false, tx, ty };
      }
    });

    cv.addEventListener('pointermove', e => {
      this.updateMouse(e);
      const d = this.drag;
      if (!d || !this.world) return;
      const { tx, ty } = this.hoverTile();
      if (d.mode === 'pan') {
        const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
        if (!d.moved && Math.hypot(dx, dy) > 5) d.moved = true;
        if (d.moved) {
          this.cam.x = d.cx - dx / this.cam.zoom;
          this.cam.y = d.cy - dy / this.cam.zoom;
          this.clampCam();
        }
      } else if (d.mode === 'delete') {
        this.deleteAt(tx, ty);
      } else if (d.mode === 'build') {
        if (this.tool === 'conveyor') {
          this.conveyorDrag(tx, ty);
        } else if (BUILDINGS[this.tool].size === 1) {
          const g = this.ghostPos(this.mouse.wx, this.mouse.wy);
          if (g.x !== d.lastG.x || g.y !== d.lastG.y) {
            d.lastG = g;
            this.buildAt(g.x, g.y, false);
          }
        }
      }
    });

    const up = e => {
      const d = this.drag;
      this.drag = null;
      if (!d || !this.world) return;
      if (d.mode === 'pan' && !d.moved && e.button === 0) {
        UI.select(this.world.buildingAt(d.tx, d.ty));
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', () => (this.drag = null));
    cv.addEventListener('pointerleave', () => (this.mouse.inside = false));
    cv.addEventListener('pointerenter', () => (this.mouse.inside = true));

    cv.addEventListener('wheel', e => {
      e.preventDefault();
      if (!this.world) return;
      const before = this.renderer.screenToWorld(this.cam, e.clientX, e.clientY);
      const k = Math.exp(-e.deltaY * 0.0015);
      this.cam.zoom = clamp(this.cam.zoom * k, 0.4, 2.5);
      const after = this.renderer.screenToWorld(this.cam, e.clientX, e.clientY);
      this.cam.x += before.x - after.x;
      this.cam.y += before.y - after.y;
      this.clampCam();
    }, { passive: false });

    window.addEventListener('keydown', e => this.onKey(e));
    window.addEventListener('keyup', e => (this.keys[e.code] = false));
    window.addEventListener('blur', () => (this.keys = {}));
  },

  onKey(e) {
    if (!this.world || !$('#screen-menu').classList.contains('hidden')) return;
    const code = e.code;
    if (UI.modalOpen) {
      if (code === 'Escape' && $('#modal-box h2').textContent === 'Пауза') UI.hideModal();
      return;
    }
    this.keys[code] = true;
    if (code === 'Space') {
      e.preventDefault();
      if (document.activeElement) document.activeElement.blur();
      this.setSpeed(this.speed === 0 ? this.lastSpeed : 0);
      return;
    }
    if (code === 'Escape') {
      if (this.tool) this.selectTool(null);
      else if (UI.selected) UI.select(null);
      else this.openPauseMenu();
      return;
    }
    if (code === 'KeyQ') { this.tool = null; UI.updateTools(this.world); return; }
    if (code === 'KeyX') { this.selectTool('demolish'); return; }
    if (code === 'KeyR') {
      const dir = e.shiftKey ? 3 : 1;
      if (!this.tool) {
        const { tx, ty } = this.hoverTile();
        const b = this.world.buildingAt(tx, ty);
        if (b && b.type === 'conveyor') b.dir = (b.dir + dir) % 4;
      } else {
        this.rot = (this.rot + dir) % 4;
      }
      return;
    }
    if (code === 'Equal' || code === 'NumpadAdd') this.cam.zoom = clamp(this.cam.zoom * 1.15, 0.4, 2.5);
    if (code === 'Minus' || code === 'NumpadSubtract') this.cam.zoom = clamp(this.cam.zoom / 1.15, 0.4, 2.5);
    const m = /^Digit([1-9])$/.exec(code);
    if (m) {
      const id = this.world.unlocks.buildings[+m[1] - 1];
      if (id) this.selectTool(id);
    }
  },

  deleteAt(tx, ty) {
    const b = this.world.buildingAt(tx, ty);
    if (b && b !== this.world.core) this.demolish(b);
  },

  updateMouse(e) {
    this.mouse.sx = e.clientX;
    this.mouse.sy = e.clientY;
    this.mouse.inside = true;
    const p = this.renderer.screenToWorld(this.cam, e.clientX, e.clientY);
    this.mouse.wx = p.x;
    this.mouse.wy = p.y;
  },

  hoverTile() {
    const p = this.renderer.screenToWorld(this.cam, this.mouse.sx, this.mouse.sy);
    this.mouse.wx = p.x;
    this.mouse.wy = p.y;
    return { tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE) };
  },

  clampCam() {
    const w = this.world;
    this.cam.x = clamp(this.cam.x, 0, w.W * TILE);
    this.cam.y = clamp(this.cam.y, 0, w.H * TILE);
  },

  // ---------- Главный цикл ----------
  frame(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.realTime += dt;
    const w = this.world;
    if (w) {
      let px = 0, py = 0;
      for (const k in PAN_KEYS) if (this.keys[k]) { px += PAN_KEYS[k][0]; py += PAN_KEYS[k][1]; }
      if (px || py) {
        this.cam.x += px * 700 * dt / this.cam.zoom;
        this.cam.y += py * 700 * dt / this.cam.zoom;
        this.clampCam();
      }

      if (!this.paused) {
        this.acc += dt * this.speed;
        const step = 1 / 60;
        let n = 0;
        while (this.acc >= step && n < 20) {
          w.update(step);
          this.acc -= step;
          n++;
        }
        if (n >= 20) this.acc = 0;
      }
      this.handleEvents(w);

      const h = this.mouse.inside ? this.hoverTile() : null;
      this.renderer.draw(w, this.cam, {
        tool: this.tool, rot: this.rot, realTime: this.realTime, selected: UI.selected,
        hover: h, ghost: h && this.tool ? this.ghostPos(this.mouse.wx, this.mouse.wy) : null,
      });
      this.uiT -= dt;
      if (this.uiT <= 0 && this.world === w) {
        UI.update(w);
        this.uiT = 0.15;
      }
    }
    requestAnimationFrame(t => this.frame(t));
  },

  handleEvents(w) {
    while (w.events.length) {
      const ev = w.events.shift();
      switch (ev.type) {
        case 'wave':
          UI.toast(ev.boss ? `Волна ${ev.index}: приближается <b>Матка</b>!` : `Волна ${ev.index} идёт на завод!`, 'bad');
          break;
        case 'destroyed':
          UI.toast(`Разрушено: ${ev.name}`, 'warn');
          break;
        case 'boss_dead':
          UI.toast('Матка уничтожена!', 'good');
          break;
        case 'won':
          setTimeout(() => { if (this.world === w) this.onWin(); }, 900);
          break;
        case 'lost':
          setTimeout(() => { if (this.world === w) this.onLose(); }, 1200);
          break;
      }
    }
  },
};

if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => Game.init());
else Game.init();
