import { h } from './dom.js';
import { SPECIES } from './rules.js';
import { greetingFor, waterLine } from './lines.js';

const SCALE = 4;
const CELL_W = 26;
const CELL_H = 34;
const POT_ROW = 8;
const TICK_MS = 150;
const HOME_X = 38;
const BOT_Y = 97;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Top-left corner of each 26 x 34 cell: small plants, then floor, then hanging.
export const ROOMS = [
  {
    id: 'bay',
    label: 'Hydroponics bay',
    art: (band) => `art/out/f_${band}_bg.png`,
    slots: [[64, 50], [76, 50], [64, 60], [76, 60], [64, 70], [76, 70], [1, 93], [71, 105], [17, 107], [29, 83], [24, 0], [46, 0]],
  },
  {
    id: 'archive',
    label: 'Archive',
    art: (band) => `art/out/f_${band}_archive_bg.png`,
    slots: [[3, 16], [15, 16], [27, 16], [43, 16], [55, 16], [67, 16], [0, 100], [72, 104], [12, 108], [58, 106], [6, 0], [66, 0]],
  },
];
const potFor = (slot) => (slot < 6 ? 0 : slot < 10 ? 1 : 2);

const px = (n) => `${n * SCALE}px`;
const sprite = (src, cls) => h('img', { src, class: `art ${cls}`, alt: '', draggable: false });

function sheetCell(band, col, row, scale) {
  const el = h('div', { class: 'cell-art' });
  el.style.width = `${CELL_W * scale}px`;
  el.style.height = `${CELL_H * scale}px`;
  el.style.backgroundImage = `url(art/out/f_${band}_plants.png)`;
  el.style.backgroundSize = `${CELL_W * 15 * scale}px ${CELL_H * 9 * scale}px`;
  el.style.backgroundPosition = `-${col * CELL_W * scale}px -${row * CELL_H * scale}px`;
  return el;
}

const plantColumn = (plant) => plant.stage + plant.thirst * 5;
export const plantCell = (plant, band, scale) => sheetCell(band, plantColumn(plant), SPECIES.indexOf(plant.species), scale);

function renderPlant(plant, band) {
  const [x, y] = ROOMS[plant.room].slots[plant.slot];
  const wrap = h('div', { class: 'plant' });
  wrap.style.left = px(x);
  wrap.style.top = px(y);
  wrap.style.zIndex = y + CELL_H;
  wrap.append(sheetCell(band, potFor(plant.slot), POT_ROW, SCALE), plantCell(plant, band, SCALE));
  if (plant.thirst) wrap.append(h('div', { class: 'thirst-drop' }));
  return wrap;
}

function buildScene(ctx, plants, roomIndex) {
  const band = ctx.band();
  const asleep = band === 'night';
  const room = sprite(ROOMS[roomIndex].art(band), 'room');
  room.alt = ROOMS[roomIndex].label;
  const open = asleep ? `art/out/fr_night_fbn.png` : `art/out/fr_${band}_fbo.png`;
  const bot = h('div', { class: 'bot' }, sprite(open, 'frame rest'), !asleep && sprite(`art/out/fr_${band}_fbb.png`, 'frame blink'));
  bot.style.zIndex = 131;
  const can = !asleep && sprite(`art/out/fr_${band}_can.png`, 'can');
  if (can) can.style.zIndex = 125;
  const plantEls = new Map(plants.map((p) => [p.topic, renderPlant(p, band)]));
  const scene = h('div', { class: 'scene' }, room, ...plantEls.values(), can, bot);
  return { scene, bot, can, band, plantEls };
}

function showSlip(scene, text) {
  scene.querySelector('.slip')?.remove();
  const slip = h('button', { class: 'slip', onclick: (e) => { e.stopPropagation(); slip.remove(); } }, text);
  scene.append(slip);
  setTimeout(() => slip.remove(), 6000);
}

let greeted = false;

function roomNav(ctx, roomCount) {
  if (roomCount < 2) return null;
  const move = (step) => {
    ctx.room = (ctx.room + step + roomCount) % roomCount;
    ctx.refresh();
  };
  return {
    move,
    el: h(
      'div',
      { class: 'room-nav' },
      h('button', { class: 'room-arrow', 'aria-label': 'Previous room', onclick: () => move(-1) }, '‹'),
      h('span', { class: 'smallcaps room-label' }, ROOMS[ctx.room].label),
      h('button', { class: 'room-arrow', 'aria-label': 'Next room', onclick: () => move(1) }, '›'),
    ),
  };
}

export function renderGarden(ctx) {
  const rooms = ctx.gardenNow();
  ctx.room = Math.min(ctx.room, Math.max(0, rooms.length - 1));
  const { scene } = buildScene(ctx, rooms[ctx.room] ?? [], ctx.room);
  const nav = roomNav(ctx, rooms.length);
  const stage = h('div', { class: 'stage' }, scene);
  if (nav) {
    scene.append(nav.el);
    let startX = null;
    stage.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) nav.move(dx < 0 ? 1 : -1);
    });
  }
  if (!greeted && ctx.deck.complete) {
    greeted = true;
    showSlip(scene, greetingFor(rooms.flat()));
  }
  const done = ctx.todayEntry()?.done;
  return {
    el: stage,
    action: h('button', { class: 'primary', onclick: () => ctx.go('cards') }, done ? 'Watered for today' : 'Water the garden'),
  };
}

// Freakbot rolls to the plant for this card and waters it. Tap to skip.
export function playWater(ctx, card, before, done) {
  const allBefore = (before ?? []).flat();
  const target = allBefore.find((p) => card.topics?.includes(p.topic));
  if (!target) {
    done();
    return;
  }
  const after = ctx.gardenNow().flat().find((p) => p.topic === target.topic) ?? target;
  ctx.room = target.room;
  const { scene, bot, can, band, plantEls } = buildScene(ctx, before[target.room], target.room);
  document.querySelector('#view').replaceChildren(h('div', { class: 'stage' }, scene));
  document.querySelector('#action').replaceChildren();

  const [cellX, cellY] = ROOMS[target.room].slots[target.slot];
  const centre = cellX + CELL_W / 2;
  const standX = Math.max(0, Math.min(65, centre < 48 ? Math.round(centre) : Math.round(centre) - 32));
  const water = band === 'night' ? 'art/out/fr_night_fbw.png' : `art/out/fr_${band}_fbw.png`;
  const awake = band === 'night' ? 'art/out/fr_night_fbo.png' : `art/out/fr_${band}_fbo.png`;
  const rest = bot.querySelector('.rest');
  bot.querySelector('.blink')?.remove();
  bot.classList.add('moving');
  rest.src = awake;
  if (can) can.remove();

  const grew = after.stage > target.stage;
  const grade = ctx.store.save.responses[card.id]?.grade;
  const refreshPlant = () => {
    const old = plantEls.get(target.topic);
    old.replaceWith(renderPlant({ ...after, room: target.room, slot: target.slot }, band));
  };
  let finished = false;
  let timer = null;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    done();
  };
  scene.addEventListener('click', finish);

  if (reduced()) {
    rest.src = water;
    refreshPlant();
    showSlip(scene, waterLine(target.topic, grade, grew));
    timer = setTimeout(finish, 1800);
    return;
  }

  let x = HOME_X;
  bot.style.left = px(x);
  const drops = [0, 1, 2, 3].map((i) => {
    const d = h('div', { class: 'water-drop' });
    d.style.left = px(cellX + 8 + i * 3);
    d.style.zIndex = 140;
    d.style.display = 'none';
    scene.append(d);
    return d;
  });
  let phase = 'roll';
  let ticks = 0;
  const dropTop = cellY + 6;
  timer = setInterval(() => {
    if (phase === 'roll') {
      if (Math.abs(x - standX) > 4) {
        x += x < standX ? 4 : -4;
        bot.style.left = px(x);
        return;
      }
      x = standX;
      bot.style.left = px(x);
      bot.style.top = px(BOT_Y);
      rest.src = water;
      phase = 'water';
      return;
    }
    ticks += 1;
    drops.forEach((d, i) => {
      d.style.display = 'block';
      d.style.top = px(dropTop + ((ticks + i * 2) % 6) * 3);
    });
    if (ticks === 5) {
      refreshPlant();
      showSlip(scene, waterLine(target.topic, grade, grew));
    }
    if (ticks >= 14) finish();
  }, TICK_MS);
}
