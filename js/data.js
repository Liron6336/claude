'use strict';

const TILE = 32;
// Направления: 0 вправо, 1 вниз, 2 влево, 3 вверх
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const opposite = d => (d + 2) % 4;

const CONVEYOR_SPEED = 2.4;   // клеток в секунду
const ITEM_SPACING = 0.3;     // минимальное расстояние между предметами на ленте
const DRILL_RATE = 0.22;      // предметов в секунду на одну клетку залежи
const SPAWN_RADIUS = 3;       // радиус логова, где нельзя строить
const REFUND = 0.75;          // доля ресурсов, возвращаемая при сносе

const ITEMS = {
  iron_ore:     { name: 'Железная руда',     color: '#a08a7a', shape: 'ore' },
  copper_ore:   { name: 'Медная руда',       color: '#d8803e', shape: 'ore' },
  coal:         { name: 'Уголь',             color: '#2a2b31', shape: 'ore' },
  stone:        { name: 'Камень',            color: '#b3afa5', shape: 'ore' },
  iron_plate:   { name: 'Железная пластина', color: '#c9d2da', shape: 'plate' },
  copper_plate: { name: 'Медная пластина',   color: '#ec9550', shape: 'plate' },
  brick:        { name: 'Кирпич',            color: '#b9563c', shape: 'brick' },
  steel:        { name: 'Сталь',             color: '#86a3bf', shape: 'ingot' },
  gear:         { name: 'Шестерня',          color: '#b8c2cc', shape: 'gear' },
  wire:         { name: 'Провод',            color: '#f0a838', shape: 'wire' },
  circuit:      { name: 'Микросхема',        color: '#2fae66', shape: 'circuit' },
  ammo:         { name: 'Патроны',           color: '#e2c044', shape: 'ammo' },
  motor:        { name: 'Мотор',             color: '#5b7fd0', shape: 'motor' },
};
const ITEM_ORDER = Object.keys(ITEMS);

const RECIPES = {
  iron_plate:   { building: 'smelter',   in: { iron_ore: 1 },                     out: { iron_plate: 1 },   time: 1.0 },
  copper_plate: { building: 'smelter',   in: { copper_ore: 1 },                   out: { copper_plate: 1 }, time: 1.0 },
  brick:        { building: 'smelter',   in: { stone: 2 },                        out: { brick: 1 },        time: 1.2 },
  steel:        { building: 'smelter',   in: { iron_plate: 2, coal: 1 },          out: { steel: 1 },        time: 2.0 },
  gear:         { building: 'assembler', in: { iron_plate: 2 },                   out: { gear: 1 },         time: 1.0 },
  wire:         { building: 'assembler', in: { copper_plate: 1 },                 out: { wire: 2 },         time: 0.8 },
  ammo:         { building: 'assembler', in: { iron_plate: 1, coal: 1 },          out: { ammo: 3 },         time: 1.0 },
  circuit:      { building: 'assembler', in: { wire: 3, iron_plate: 1 },          out: { circuit: 1 },      time: 1.5 },
  motor:        { building: 'assembler', in: { gear: 2, circuit: 1, steel: 1 },   out: { motor: 1 },        time: 2.5 },
};

function recipeOutput(id) {
  return Object.keys(RECIPES[id].out)[0];
}

const BUILDINGS = {
  conveyor: {
    name: 'Конвейер', size: 1, hp: 30, cost: { iron_plate: 1 }, rotate: true,
    desc: 'Перевозит предметы. Зажми ЛКМ и веди мышью, чтобы проложить линию. R поворачивает.',
  },
  drill: {
    name: 'Бур', size: 2, hp: 80, cost: { iron_plate: 10 },
    desc: 'Ставится на залежь (2×2). Добывает ресурс и отдаёт его в соседние конвейеры и здания. Чем больше залежи под буром, тем быстрее.',
  },
  splitter: {
    name: 'Разветвитель', size: 1, hp: 40, cost: { iron_plate: 3 },
    desc: 'Принимает предмет и по очереди раздаёт его в остальные три стороны.',
  },
  smelter: {
    name: 'Плавильня', size: 2, hp: 150, cost: { iron_plate: 15, stone: 10 },
    desc: 'Плавит руду в пластины, камень в кирпичи, железо с углём в сталь. Нажми на здание, чтобы выбрать рецепт.',
  },
  assembler: {
    name: 'Сборщик', size: 2, hp: 150, cost: { iron_plate: 20, copper_plate: 10 },
    desc: 'Собирает детали: шестерни, провода, патроны, микросхемы и моторы. Нажми на здание, чтобы выбрать рецепт.',
  },
  storage: {
    name: 'Хранилище', size: 1, hp: 120, cost: { iron_plate: 15, brick: 5 },
    desc: 'Принимает предметы с конвейеров, хранит до 40 штук и раздаёт их соседним зданиям и конвейерам. Удобный буфер.',
  },
  turret: {
    name: 'Турель', size: 1, hp: 160, cost: { iron_plate: 12, brick: 6 },
    desc: 'Стреляет по врагам в радиусе 6 клеток. Заряжается через конвейер железными пластинами (слабо) или патронами (сильно).',
  },
  wall: {
    name: 'Стена', size: 1, hp: 300, cost: { brick: 2 },
    desc: 'Прочная преграда. Враги обходят её или тратят время на разрушение.',
  },
  steel_wall: {
    name: 'Стальная стена', size: 1, hp: 800, cost: { steel: 2 },
    desc: 'Очень прочная стена из стали.',
  },
  core: {
    name: 'Ядро', size: 3, hp: 2000, cost: {},
    desc: 'Сердце завода. Принимает любые предметы, из них строятся новые здания. Защищается встроенной энергопушкой.',
  },
};
const BUILD_ORDER = ['conveyor', 'drill', 'splitter', 'smelter', 'assembler', 'storage', 'turret', 'wall', 'steel_wall'];

const AMMO = {
  iron_plate: { shots: 3, dmg: 9, color: '#dfe7ee' },
  ammo:       { shots: 6, dmg: 16, color: '#ffd24a' },
};
const TURRET = { range: 6, rate: 2.5 };
const CORE_GUN = { range: 5, rate: 1.2, dmg: 5, color: '#5ff0dc' };

const ENEMIES = {
  beetle: { name: 'Жук',    hp: 35,   speed: 1.1,  dmg: 8,  rate: 1.0, armor: 0, size: 0.3,
            color: '#c2473c', dark: '#5a1c18', eye: '#ffe08a', legs: 3 },
  runner: { name: 'Бегун',  hp: 20,   speed: 2.2,  dmg: 4,  rate: 0.6, armor: 0, size: 0.25,
            color: '#e39a2c', dark: '#6a3f0c', eye: '#fff4c2', legs: 2 },
  tank:   { name: 'Танк',   hp: 160,  speed: 0.55, dmg: 22, rate: 1.4, armor: 3, size: 0.42,
            color: '#7d4cad', dark: '#33184f', eye: '#ff7ad9', legs: 3 },
  boss:   { name: 'Матка',  hp: 1400, speed: 0.35, dmg: 60, rate: 1.6, armor: 4, size: 0.9,
            color: '#b1243c', dark: '#4a0b18', eye: '#ffef5a', legs: 4,
            spawns: { type: 'beetle', every: 9, n: 2 } },
};

const LEVELS = [
  {
    name: 'Первые шаги', seed: 1011, w: 40, h: 30,
    intro: 'Добро пожаловать на завод! Ядро в центре карты принимает всё, что в него доставлено, а из этих ресурсов строятся новые здания. Поставь бур на залежь железной руды и протяни от него конвейер к Ядру. Врагов здесь нет, осваивайся спокойно.',
    start: { iron_plate: 60 },
    goals: [{ type: 'deliver', item: 'iron_ore', amount: 40 }],
    newBuildings: ['conveyor', 'drill'], newRecipes: [],
    ores: [
      { type: 'iron_ore', n: 3, r: [1.8, 2.6], d: [5, 10] },
      { type: 'stone', n: 1, r: [1.6, 2.2], d: [8, 13] },
    ],
    rock: 0.66, spawns: 0, waves: null, tutorial: true,
  },
  {
    name: 'Плавка', seed: 2027, w: 46, h: 34,
    intro: 'Руда сама по себе мало чего стоит. Построй Плавильню, подай в неё железную руду, а готовые пластины отправь конвейером в Ядро. Здания отдают продукцию в соседние конвейеры, которые не направлены в само здание. Изредка с края карты будут приползать жуки. Ядро умеет отстреливаться, а турели можно заряжать пластинами.',
    start: { iron_plate: 80, stone: 40 },
    goals: [{ type: 'deliver', item: 'iron_plate', amount: 30 }],
    newBuildings: ['smelter', 'splitter', 'turret', 'wall'], newRecipes: ['iron_plate', 'brick'],
    ores: [
      { type: 'iron_ore', n: 3, r: [2, 2.8], d: [5, 12] },
      { type: 'stone', n: 2, r: [1.8, 2.4], d: [6, 14] },
      { type: 'coal', n: 1, r: [1.6, 2.2], d: [9, 15] },
    ],
    rock: 0.65, spawns: 1,
    waves: { first: 150, interval: 120, groups: [
      [['beetle', 2]], [['beetle', 3]], [['beetle', 4]], [['beetle', 5]],
    ] },
  },
  {
    name: 'Медь', seed: 3301, w: 52, h: 38,
    intro: 'Пора осваивать медь. Сборщик превращает пластины в шестерни и провода. Нажми на построенное здание, чтобы выбрать рецепт. Сборщик умеет делать патроны из железа и угля: турели с патронами бьют гораздо сильнее.',
    start: { iron_plate: 120, stone: 40, copper_plate: 30 },
    goals: [
      { type: 'deliver', item: 'gear', amount: 30 },
      { type: 'deliver', item: 'wire', amount: 40 },
    ],
    newBuildings: ['assembler', 'storage'], newRecipes: ['copper_plate', 'gear', 'wire', 'ammo'],
    ores: [
      { type: 'iron_ore', n: 3, r: [2, 3], d: [5, 13] },
      { type: 'copper_ore', n: 3, r: [2, 3], d: [6, 14] },
      { type: 'stone', n: 2, r: [1.8, 2.4], d: [7, 15] },
      { type: 'coal', n: 2, r: [1.8, 2.4], d: [8, 16] },
    ],
    rock: 0.65, spawns: 2,
    waves: { first: 180, interval: 110, groups: [
      [['beetle', 3]], [['beetle', 2], ['runner', 2]], [['beetle', 4], ['runner', 2]], [['beetle', 4], ['runner', 4]],
    ] },
  },
  {
    name: 'Электроника', seed: 4409, w: 58, h: 42,
    intro: 'Микросхемы собираются из проводов и железных пластин. Построй цепочку из нескольких сборщиков: один делает провода, другой микросхемы. Здания можно ставить вплотную, тогда они передают продукцию друг другу напрямую. Появляются бронированные танки, против них нужны патроны и стальные стены.',
    start: { iron_plate: 150, stone: 60, copper_plate: 60, brick: 20 },
    goals: [{ type: 'deliver', item: 'circuit', amount: 25 }],
    newBuildings: ['steel_wall'], newRecipes: ['steel', 'circuit'],
    ores: [
      { type: 'iron_ore', n: 4, r: [2, 3], d: [5, 15] },
      { type: 'copper_ore', n: 3, r: [2, 3], d: [6, 16] },
      { type: 'stone', n: 2, r: [1.8, 2.4], d: [7, 16] },
      { type: 'coal', n: 3, r: [1.8, 2.6], d: [7, 17] },
    ],
    rock: 0.64, spawns: 2,
    waves: { first: 180, interval: 100, groups: [
      [['beetle', 4]], [['runner', 4], ['beetle', 2]], [['tank', 1], ['beetle', 3]],
      [['tank', 2], ['runner', 3]], [['tank', 2], ['beetle', 5], ['runner', 3]],
    ] },
  },
  {
    name: 'Сердце машины', seed: 5521, w: 64, h: 46,
    intro: 'Финальное испытание: собери моторы из шестерён, микросхем и стали. Разведка сообщает, что к заводу ползёт Матка, огромное существо, которое порождает жуков. Подготовь оборону с патронами и уничтожь её.',
    start: { iron_plate: 200, stone: 80, copper_plate: 100, brick: 30, steel: 10 },
    goals: [
      { type: 'deliver', item: 'motor', amount: 15 },
      { type: 'kill', enemy: 'boss', amount: 1 },
    ],
    newBuildings: [], newRecipes: ['motor'],
    ores: [
      { type: 'iron_ore', n: 4, r: [2, 3], d: [5, 17] },
      { type: 'copper_ore', n: 4, r: [2, 3], d: [6, 18] },
      { type: 'stone', n: 2, r: [1.8, 2.4], d: [8, 18] },
      { type: 'coal', n: 3, r: [1.8, 2.6], d: [7, 18] },
    ],
    rock: 0.64, spawns: 3,
    waves: { first: 200, interval: 100, groups: [
      [['beetle', 4]], [['runner', 4], ['beetle', 3]], [['tank', 1], ['beetle', 4]],
      [['tank', 2], ['runner', 4]], [['tank', 2], ['beetle', 6]],
      [['boss', 1], ['beetle', 4], ['runner', 2]], [['tank', 3], ['runner', 5]],
    ] },
  },
];

// Подсказки обучения на первом уровне
const TUTORIAL = [
  { text: 'Выбери <b>Бур</b> (клавиша <kbd>2</kbd>) и поставь его на залежь <b>железной руды</b> рядом с Ядром.',
    done: w => w.buildings.some(b => b.type === 'drill') },
  { text: 'Выбери <b>Конвейер</b> (клавиша <kbd>1</kbd>), зажми ЛКМ у бура и веди мышью к Ядру. Направление ленты задаётся движением мыши.',
    done: w => (w.delivered.iron_ore || 0) > 0 },
  { text: 'Руда пошла в Ядро! Поставь ещё буры, чтобы набрать 40 руды быстрее. ПКМ сносит постройку, колесо мыши меняет масштаб.',
    done: () => false },
];

function unlocksFor(levelIndex) {
  const b = new Set(), r = new Set();
  for (let i = 0; i <= levelIndex; i++) {
    LEVELS[i].newBuildings.forEach(x => b.add(x));
    LEVELS[i].newRecipes.forEach(x => r.add(x));
  }
  return { buildings: BUILD_ORDER.filter(x => b.has(x)), recipes: r };
}
