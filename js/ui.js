'use strict';

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function costHtml(cost, world) {
  return Object.keys(cost).map(k => {
    const have = world ? world.stock[k] || 0 : Infinity;
    const cls = have < cost[k] ? ' class="lack"' : '';
    return `<span${cls}><img src="${Icons.item(k, 16)}" alt="">${cost[k]}</span>`;
  }).join(' ');
}

function recipeHtml(id) {
  const r = RECIPES[id];
  const side = obj => Object.keys(obj).map(k =>
    `<span class="ri" title="${ITEMS[k].name}"><img src="${Icons.item(k, 18)}" alt="">${obj[k] > 1 ? '×' + obj[k] : ''}</span>`).join('+');
  return `${side(r.in)}<span class="arrow">→</span>${side(r.out)}<span class="rtime">${r.time}с</span>`;
}

const UI = {
  init(game) {
    this.game = game;
    this.modalOpen = false;
    this.el = {
      hud: $('#hud'), stock: $('#stock'), title: $('#level-title'), goals: $('#goals'),
      wave: $('#wave-panel'), info: $('#info-panel'), build: $('#buildbar'), tooltip: $('#tooltip'),
      toasts: $('#toasts'), hint: $('#hint'), modal: $('#modal'), modalBox: $('#modal-box'),
    };

    $('#btn-play').onclick = () => this.showLevels();
    $('#btn-howto').onclick = () => this.showScreen('howto');
    $$('[data-back]').forEach(b => (b.onclick = () => this.showScreen('menu')));
    $('#btn-reset').onclick = () => this.confirmReset();
    $$('#controls [data-speed]').forEach(b => (b.onclick = () => game.setSpeed(+b.dataset.speed)));
    $('#btn-menu').onclick = () => game.openPauseMenu();

    // Панели перестраиваются несколько раз в секунду, поэтому ловим нажатия делегированием
    this.el.info.addEventListener('pointerdown', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !this.selected) return;
      if (btn.dataset.action === 'recipe') {
        this.selected.setRecipe(btn.dataset.id);
        this.renderInfo(game.world, true);
      } else if (btn.dataset.action === 'demolish') {
        game.demolish(this.selected);
      }
    });
    this.el.wave.addEventListener('pointerdown', e => {
      if (e.target.closest('[data-action="call-wave"]')) game.callWave();
    });
  },

  // ---------- Экраны ----------
  showScreen(name) {
    for (const s of ['menu', 'levels', 'howto']) $('#screen-' + s).classList.toggle('hidden', s !== name);
    this.el.hud.classList.toggle('hidden', !!name);
  },

  showLevels() {
    const p = Progress.data;
    const box = $('#level-list');
    box.innerHTML = LEVELS.map((L, i) => {
      const best = p.best[i];
      const goals = L.goals.map(g => g.type === 'deliver'
        ? `<span><img src="${Icons.item(g.item, 18)}" alt="">${g.amount}</span>`
        : `<span><img src="${Icons.enemy(g.enemy, 18)}" alt="">×${g.amount}</span>`).join('');
      return `<button class="level-card${best ? ' done' : ''}" data-level="${i}">
        <div class="lc-num">${i + 1}</div>
        <div class="lc-body">
          <div class="lc-name">${L.name}</div>
          <div class="lc-goals">${goals}</div>
          <div class="lc-meta">${best ? 'Пройден за ' + fmtTime(best) : L.waves ? 'Есть враги' : 'Без врагов'}</div>
        </div>
      </button>`;
    }).join('');
    box.querySelectorAll('[data-level]').forEach(b => (b.onclick = () => this.game.startLevel(+b.dataset.level)));
    this.showScreen('levels');
  },

  confirmReset() {
    this.showModal({
      title: 'Сбросить прогресс?',
      body: '<p>Отметки о пройденных уровнях и лучшее время будут удалены.</p>',
      buttons: [
        { label: 'Отмена', action: () => this.hideModal() },
        { label: 'Сбросить', cls: 'danger', action: () => { Progress.reset(); this.hideModal(); } },
      ],
    });
  },

  // ---------- Модальные окна ----------
  showModal({ title, body, buttons, cls }) {
    this.modalOpen = true;
    const box = this.el.modalBox;
    box.className = 'modal-box' + (cls ? ' ' + cls : '');
    box.innerHTML = `<h2>${title}</h2><div class="modal-body">${body || ''}</div><div class="modal-buttons"></div>`;
    const bar = box.querySelector('.modal-buttons');
    for (const b of buttons || []) {
      const el = document.createElement('button');
      el.className = 'btn' + (b.cls ? ' ' + b.cls : '');
      el.textContent = b.label;
      el.onclick = b.action;
      bar.appendChild(el);
    }
    this.el.modal.classList.remove('hidden');
    const first = bar.querySelector('.primary') || bar.lastChild;
    if (first) first.focus();
  },

  hideModal() {
    this.modalOpen = false;
    this.el.modal.classList.add('hidden');
  },

  // ---------- Уровень ----------
  setupLevel(world) {
    const L = world.level;
    this.selected = null;
    this.tutorialStep = L.tutorial ? 0 : -1;
    this.el.title.innerHTML = `<span class="lvl-num">${world.levelIndex + 1}</span>${L.name}`;

    // какие ресурсы показывать в верхней панели
    const rel = new Set(Object.keys(L.start));
    for (const b of world.unlocks.buildings) Object.keys(BUILDINGS[b].cost).forEach(k => rel.add(k));
    for (const id of world.unlocks.recipes) {
      Object.keys(RECIPES[id].in).forEach(k => rel.add(k));
      Object.keys(RECIPES[id].out).forEach(k => rel.add(k));
    }
    for (const g of L.goals) if (g.item) rel.add(g.item);
    this.stockItems = ITEM_ORDER.filter(k => rel.has(k));
    this.el.stock.innerHTML = this.stockItems.map(k =>
      `<div class="res" data-item="${k}" title="${ITEMS[k].name}"><img src="${Icons.item(k, 20)}" alt=""><span>0</span></div>`).join('');
    this.stockEls = {};
    this.el.stock.querySelectorAll('.res').forEach(el => (this.stockEls[el.dataset.item] = el));

    // панель строительства
    const tools = world.unlocks.buildings.map((t, i) => ({ id: t, key: i + 1, name: BUILDINGS[t].name, icon: Icons.building(t, 40) }));
    tools.push({ id: 'demolish', key: 'X', name: 'Снос', icon: Icons.demolish(40) });
    this.el.build.innerHTML = tools.map(t =>
      `<button class="bb" data-tool="${t.id}"><img src="${t.icon}" alt=""><span class="key">${t.key}</span><span class="nm">${t.name}</span></button>`).join('');
    this.el.build.querySelectorAll('.bb').forEach(btn => {
      btn.onclick = () => this.game.selectTool(btn.dataset.tool);
      btn.onmouseenter = () => this.showTooltip(btn);
      btn.onmouseleave = () => this.el.tooltip.classList.add('hidden');
    });

    // цели
    this.el.goals.innerHTML = L.goals.map((g, i) => {
      const icon = g.type === 'deliver' ? Icons.item(g.item, 22) : Icons.enemy(g.enemy, 22);
      const name = g.type === 'deliver' ? ITEMS[g.item].name : 'Убить: ' + ENEMIES[g.enemy].name;
      return `<div class="goal" data-goal="${i}"><img src="${icon}" alt=""><div class="g-body">
        <div class="g-top"><span>${name}</span><span class="g-val">0/${g.amount}</span></div>
        <div class="bar"><div class="fill"></div></div></div></div>`;
    }).join('');

    this.el.info.classList.add('hidden');
    this.el.toasts.innerHTML = '';
    this._waveHtml = this._hintHtml = this._infoHtml = null;
    this.updateTools(world);
    this.update(world);
  },

  showTooltip(btn) {
    const id = btn.dataset.tool, world = this.game.world;
    let html;
    if (id === 'demolish') {
      html = `<b>Снос</b><p>Разбирает постройку и возвращает ${Math.round(REFUND * 100)}% ресурсов. То же делает ПКМ.</p>`;
    } else {
      const def = BUILDINGS[id];
      html = `<b>${def.name}</b> <span class="muted">${def.size}×${def.size}</span><p>${def.desc}</p><div class="cost">${costHtml(def.cost, world)}</div>`;
    }
    const tip = this.el.tooltip;
    tip.innerHTML = html;
    tip.classList.remove('hidden');
    const r = btn.getBoundingClientRect();
    const tw = tip.offsetWidth;
    tip.style.left = clamp(r.left + r.width / 2 - tw / 2, 8, window.innerWidth - tw - 8) + 'px';
    tip.style.top = (r.top - tip.offsetHeight - 10) + 'px';
  },

  updateTools(world) {
    const g = this.game;
    this.el.build.querySelectorAll('.bb').forEach(btn => {
      const id = btn.dataset.tool;
      btn.classList.toggle('active', g.tool === id);
      btn.classList.toggle('poor', id !== 'demolish' && !world.canAfford(BUILDINGS[id].cost));
    });
    $$('#controls [data-speed]').forEach(b => b.classList.toggle('active', +b.dataset.speed === g.speed));
  },

  update(world) {
    for (const k of this.stockItems) {
      const el = this.stockEls[k];
      const v = Math.floor(world.stock[k] || 0);
      const span = el.lastChild;
      if (span.textContent !== String(v)) span.textContent = v;
      el.classList.toggle('zero', v === 0);
    }
    this.updateTools(world);

    world.level.goals.forEach((g, i) => {
      const el = this.el.goals.querySelector(`[data-goal="${i}"]`);
      const v = world.goalProgress(g);
      el.querySelector('.g-val').textContent = `${v}/${g.amount}`;
      el.querySelector('.fill').style.width = (v / g.amount * 100) + '%';
      el.classList.toggle('done', v >= g.amount);
    });

    this.renderWave(world);
    this.renderInfo(world, false);
    this.updateHint(world);
  },

  renderWave(world) {
    const el = this.el.wave;
    let html;
    if (!world.wave) {
      html = '<div class="calm">Врагов на этом уровне нет.<br>Строй спокойно.</div>';
    } else {
      const comp = world.waveComposition(world.wave.index);
      const parts = comp.map(([t, n]) => `<span class="wc" title="${ENEMIES[t].name}"><img src="${Icons.enemy(t, 20)}" alt="">${n}</span>`).join('');
      const alive = world.enemies.length + world.spawnQueue.length;
      const soon = world.wave.timer < 15;
      html = `<div class="w-top"><span>Волна ${world.wave.index + 1}</span><span class="w-time${soon ? ' soon' : ''}">${fmtTime(world.wave.timer)}</span></div>
        <div class="w-comp">${parts}</div>
        ${alive ? `<div class="w-alive">Врагов на карте: <b>${alive}</b></div>` : ''}
        <button class="btn small" data-action="call-wave">Вызвать сейчас</button>`;
    }
    if (this._waveHtml !== html) { el.innerHTML = html; this._waveHtml = html; }
  },

  select(b) {
    this.selected = b;
    this.renderInfo(this.game.world, true);
  },

  renderInfo(world, force) {
    const el = this.el.info;
    const b = this.selected;
    if (!b || b.dead) {
      if (this.selected) this.selected = null;
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    let body = '';
    switch (b.type) {
      case 'conveyor':
        body = `<p>Предметов на ленте: <b>${b.items.length}</b></p><p class="muted">R над лентой поворачивает её.</p>`;
        break;
      case 'drill':
        body = `<div class="row"><img src="${Icons.item(b.oreType, 20)}" alt="">Добывает: <b>${ITEMS[b.oreType].name}</b></div>
          <p>Залежи под буром: <b>${b.oreCount}</b> из 4</p>
          <p>Скорость: <b>${b.rate.toFixed(2)}</b> шт/с</p>
          <p>В буфере: <b>${b.buffer}</b>/10${b.buffer >= 10 ? ' <span class="warn">(некуда отдавать)</span>' : ''}</p>`;
        break;
      case 'smelter':
      case 'assembler': {
        const list = Object.keys(RECIPES).filter(id => RECIPES[id].building === b.type && world.unlocks.recipes.has(id));
        const r = RECIPES[b.recipe];
        const st = { work: '<span class="ok">Работает</span>', input: '<span class="warn">Ждёт сырьё</span>', output: '<span class="bad">Выход переполнен</span>' }[b.status];
        const ins = Object.keys(r.in).map(k =>
          `<span class="ri"><img src="${Icons.item(k, 18)}" alt="">${b.inputs[k] || 0}/${r.in[k]}</span>`).join(' ');
        const outs = Object.keys(b.outputs).filter(k => b.outputs[k] > 0).map(k =>
          `<span class="ri"><img src="${Icons.item(k, 18)}" alt="">${b.outputs[k]}</span>`).join(' ') || '<span class="muted">пусто</span>';
        body = `<div class="label">Рецепт</div>
          <div class="recipes">${list.map(id =>
            `<button class="recipe${id === b.recipe ? ' active' : ''}" data-action="recipe" data-id="${id}" title="${ITEMS[recipeOutput(id)].name}"><img src="${Icons.item(recipeOutput(id), 24)}" alt=""></button>`).join('')}</div>
          <div class="formula">${recipeHtml(b.recipe)}</div>
          <p>Состояние: ${st}</p>
          <div class="bar"><div class="fill" style="width:${Math.round(b.progress * 100)}%"></div></div>
          <p>Вход: ${ins}</p><p>Выход: ${outs}</p>`;
        break;
      }
      case 'splitter':
        body = `<p>Раздаёт предметы по очереди в три стороны, кроме той, откуда предмет пришёл.</p>`;
        break;
      case 'storage': {
        const items = Object.keys(b.stored).filter(k => b.stored[k] > 0).map(k =>
          `<span class="ri"><img src="${Icons.item(k, 18)}" alt="">${b.stored[k]}</span>`).join(' ') || '<span class="muted">пусто</span>';
        body = `<p>Заполнено: <b>${b.total}</b>/${b.cap}</p><p>${items}</p>`;
        break;
      }
      case 'turret': {
        const n = b.ammo.length;
        body = `<p>Боезапас: <b>${n}</b>/10 предметов, в обойме <b>${b.shots}</b></p>
          <p class="muted">Принимает железные пластины (урон ${AMMO.iron_plate.dmg}) и патроны (урон ${AMMO.ammo.dmg}).</p>
          ${n === 0 && b.shots === 0 ? '<p class="bad">Нет боеприпасов!</p>' : ''}`;
        break;
      }
      case 'core':
        body = `<p>Принимает любые предметы. Встроенная пушка: урон ${CORE_GUN.dmg}, радиус ${CORE_GUN.range}.</p>`;
        break;
      default:
        body = `<p>${b.def.desc}</p>`;
    }
    const hpFrac = Math.max(0, b.hp / b.maxHp);
    const html = `<div class="info-head"><img src="${Icons.building(b.type, 34)}" alt=""><div><b>${b.def.name}</b>
        <div class="hp"><div class="bar"><div class="fill hpfill" style="width:${hpFrac * 100}%"></div></div><span>${Math.ceil(b.hp)}/${b.maxHp}</span></div></div></div>
      ${body}
      ${b.type !== 'core' ? '<button class="btn small danger" data-action="demolish">Снести</button>' : ''}`;
    if (force || this._infoHtml !== html) {
      el.innerHTML = html;
      this._infoHtml = html;
    }
  },

  updateHint(world) {
    const el = this.el.hint;
    if (this.tutorialStep < 0 || this.tutorialStep >= TUTORIAL.length) {
      el.classList.add('hidden');
      return;
    }
    while (this.tutorialStep < TUTORIAL.length - 1 && TUTORIAL[this.tutorialStep].done(world)) this.tutorialStep++;
    const html = `<span class="hint-step">${this.tutorialStep + 1}/${TUTORIAL.length}</span>${TUTORIAL[this.tutorialStep].text}`;
    if (this._hintHtml !== html) { el.innerHTML = html; this._hintHtml = html; }
    el.classList.remove('hidden');
  },

  toast(text, kind) {
    const box = this.el.toasts;
    const now = performance.now();
    if (this._lastToast === text && now - this._lastToastT < 800) return;
    this._lastToast = text;
    this._lastToastT = now;
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.innerHTML = text;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  },
};
