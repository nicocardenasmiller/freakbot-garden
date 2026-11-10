import { h } from './dom.js';
import { SPECIES, movePlant } from './rules.js';
import { greetingFor, moveLine, pokeLine, topicName, waterLine } from './lines.js';
import { startWindow } from './windowfx.js';
import { play } from './sound.js';

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
    slots: [[62, 48], [75, 48], [62, 61], [75, 61], [62, 74], [75, 74], [1, 93], [71, 105], [17, 107], [29, 83], [24, 0], [46, 0]],
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

function renderDetail(detail, band) {
  const el = h('div', { class: 'detail' });
  el.style.left = px(detail.x);
  el.style.top = px(detail.y);
  el.style.zIndex = detail.y + 4;
  el.style.backgroundImage = `url(art/out/f_${band}_details.png)`;
  el.style.backgroundPosition = `-${detail.col * 66 * SCALE}px 0`;
  return el;
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
  const here = ctx.location();
  const roomId = ROOMS[roomIndex].id;
  const view = roomId === 'bay' && here.art && sprite(`art/out/loc_${here.id}_${band}.png`, 'room view');
  const details = ctx.details(roomId).map((d) => renderDetail(d, band));
  const scene = h('div', { class: 'scene' }, room, view, ...details, ...plantEls.values(), can, bot);
  startWindow(scene, roomId, band, here.id);
  return { scene, bot, can, band, plantEls };
}

// What he is saying survives a redraw of the scene, until its time is up or it is tapped away.
let lastSlip = null;

function showSlip(scene, text, until = Date.now() + 6000) {
  scene.querySelector('.slip')?.remove();
  lastSlip = { text, until };
  const slip = h('button', { class: 'slip', onclick: (e) => { e.stopPropagation(); lastSlip = null; slip.remove(); } }, text);
  scene.append(slip);
  setTimeout(() => slip.remove(), until - Date.now());
}

// Freakbot reacts when tapped. Every move is stepped on the art's 4 px grid.
const frameOf = (band, name) => `art/out/fr_${band}_${name}.png`;

// Now and then he looks around or yawns.
// He wanders the floor on his own, and now and then looks around or yawns. He keeps his place between redraws.
const ROAM_MIN = 16;
const ROAM_MAX = 58;
let botX = HOME_X;

function idleLife(bot, band) {
  if (band === 'night') botX = HOME_X;
  bot.style.left = px(botX);
  if (band === 'night' || reduced()) return;
  const rest = bot.querySelector('.rest');
  let wait = 20 + Math.floor(Math.random() * 30);
  let target = null;
  let wheel = 0;
  const timer = setInterval(() => {
    if (!bot.isConnected) {
      clearInterval(timer);
      return;
    }
    if (bot.classList.contains('moving') || document.visibilityState !== 'visible') return;
    if (target === null) {
      wait -= 1;
      if (wait === 12 && Math.random() < 0.5) rest.src = frameOf(band, ['fbL', 'fbR', 'fby'][Math.floor(Math.random() * 3)]);
      if (wait === 4) rest.src = bot.dataset.base;
      if (wait > 0) return;
      // Usually somewhere new, sometimes back to the middle.
      target = Math.random() < 0.3 ? HOME_X : ROAM_MIN + Math.floor(Math.random() * (ROAM_MAX - ROAM_MIN + 1));
      if (Math.abs(target - botX) < 6) target = botX < HOME_X ? ROAM_MAX : ROAM_MIN;
      bot.classList.add('roaming');
      return;
    }
    const side = target > botX ? 'R' : 'L';
    botX += target > botX ? 1 : -1;
    wheel += 1;
    bot.style.left = px(botX);
    rest.src = frameOf(band, `${wheel % 4 < 2 ? 'fb' : 'fbr'}${side}`);
    if (botX !== target) return;
    target = null;
    wait = 40 + Math.floor(Math.random() * 54);
    rest.src = bot.dataset.base;
    bot.classList.remove('roaming');
  }, TICK_MS);
}

const MOVES = {
  jump: [[0, -2], [0, -4], [0, -5], [0, -4], [0, -2], [0, 0], [0, -1], [0, 0]],
  wiggle: [[-1, 0], [1, 0], [-1, 0], [1, 0], [-1, 0], [1, 0], [0, 0]],
  cheer: [[0, -1], [0, 0], [0, -1], [0, 0], [0, -1], [0, 0], [0, -1], [0, 0]],
};
let pokes = [];
let poking = false;

function poke(scene, bot, band) {
  const now = Date.now();
  pokes = [...pokes.filter((t) => now - t < 2500), now];
  const asleep = band === 'night';
  const fed_up = pokes.length >= 4;
  showSlip(scene, pokeLine(asleep, fed_up));
  play('poke');
  if (poking || reduced()) return;
  poking = true;

  const rest = bot.querySelector('.rest');
  const idle = bot.dataset.base;
  const name = fed_up ? 'wiggle' : asleep ? 'jump' : ['jump', 'wiggle', 'cheer'][Math.floor(Math.random() * 3)];
  bot.classList.add('moving');
  rest.src = frameOf(band, name === 'cheer' ? 'fbw' : name === 'wiggle' ? 'fbx' : 'fbh');

  const sparks = name === 'cheer'
    ? [[-3, 6], [33, 3], [-1, 18], [34, 16]].map(([x, y]) => {
        const spark = h('div', { class: 'spark' });
        spark.style.left = px(x);
        spark.style.top = px(y);
        bot.append(spark);
        return spark;
      })
    : [];
  let step = 0;
  const timer = setInterval(() => {
    const [dx, dy] = MOVES[name][step];
    bot.style.transform = `translate(${dx * SCALE}px, ${dy * SCALE}px)`;
    sparks.forEach((s, i) => { s.style.visibility = (step + i) % 2 ? 'hidden' : 'visible'; });
    step += 1;
    if (step < MOVES[name].length) return;
    clearInterval(timer);
    sparks.forEach((s) => s.remove());
    bot.style.transform = '';
    rest.src = idle;
    bot.classList.remove('moving');
    poking = false;
  }, TICK_MS);
}

let greeted = false;

// Rooms change by swipe, mouse drag or the arrow keys. The room's name shows when you arrive, then fades.
const NAME_MS = 2600;
let namedRoom = null;
let namedAt = 0;
let keyMove = null;
let draggedAt = 0;

document.addEventListener('keydown', (e) => {
  if (!keyMove || !document.querySelector('.stage .scene') || document.querySelector('dialog[open]')) return;
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'ArrowLeft') keyMove(-1);
  if (e.key === 'ArrowRight') keyMove(1);
});

function roomNav(ctx, roomCount, scene, stage) {
  if (namedRoom !== ctx.room) {
    namedRoom = ctx.room;
    namedAt = Date.now();
  }
  // A redraw in the middle of the fade carries on from where it was.
  const shown = Date.now() - namedAt;
  if (shown < NAME_MS) {
    const label = h('span', { class: 'smallcaps room-label' }, ROOMS[ctx.room].label);
    label.style.animationDelay = `-${shown}ms`;
    scene.append(label);
    setTimeout(() => label.remove(), NAME_MS - shown);
  }
  keyMove = null;
  if (roomCount < 2) return;
  const move = (step) => {
    ctx.room = (ctx.room + step + roomCount) % roomCount;
    ctx.refresh();
  };
  keyMove = move;
  let startX = null;
  const end = (x, viaMouse) => {
    if (startX === null) return;
    const dx = x - startX;
    startX = null;
    if (Math.abs(dx) <= 40) return;
    if (viaMouse) draggedAt = Date.now();
    move(dx < 0 ? 1 : -1);
  };
  stage.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => end(e.changedTouches[0].clientX, false));
  stage.addEventListener('mousedown', (e) => { startX = e.clientX; });
  stage.addEventListener('mouseup', (e) => end(e.clientX, true));
}

// Tap a plant, then tap another plant or an empty spot, in any room, to move it.
let picked = null;
let say = null;

function setupMoving(ctx, scene, plantEls, plants, rooms) {
  if (picked && !rooms.flat().some((p) => p.topic === picked)) picked = null;
  const place = (slot) => {
    const topic = picked;
    picked = null;
    ctx.store.commit((save, now) => movePlant(save, rooms, topic, ctx.room, slot, now));
    say = moveLine(topic, true);
    ctx.refresh();
  };
  for (const plant of plants) {
    const hit = h('button', {
      class: `plant-hit${plant.topic === picked ? ' picked' : ''}`,
      'aria-label': `Move ${topicName(plant.topic)}`,
      onclick: (e) => {
        e.stopPropagation();
        if (picked === plant.topic) {
          picked = null;
        } else if (picked) {
          place(plant.slot);
          return;
        } else {
          picked = plant.topic;
          say = moveLine(plant.topic, false);
        }
        ctx.refresh();
      },
    });
    plantEls.get(plant.topic).append(hit);
  }
  if (!picked) return;
  const used = new Set(plants.map((p) => p.slot));
  ROOMS[ctx.room].slots.forEach(([x, y], slot) => {
    if (used.has(slot)) return;
    const spot = h('button', { class: 'spot', 'aria-label': 'Empty spot', onclick: (e) => { e.stopPropagation(); place(slot); } });
    spot.style.left = `${x * SCALE + 26}px`;
    spot.style.top = `${y * SCALE + 84}px`;
    scene.append(spot);
  });
  // A tap on empty floor cancels. Changing rooms keeps the plant in hand.
  scene.addEventListener('click', (e) => {
    if (Date.now() - draggedAt < 400) return;
    picked = null;
    ctx.refresh();
  });
}

export function renderGarden(ctx) {
  const rooms = ctx.gardenNow();
  ctx.room = Math.min(ctx.room, Math.max(0, rooms.length - 1));
  const { scene, bot, band, plantEls } = buildScene(ctx, rooms[ctx.room] ?? [], ctx.room);
  setupMoving(ctx, scene, plantEls, rooms[ctx.room] ?? [], rooms);
  bot.classList.add('pokeable');
  bot.dataset.base = bot.querySelector('.rest').src;
  idleLife(bot, band);
  bot.addEventListener('click', (e) => {
    e.stopPropagation();
    poke(scene, bot, band);
  });
  const stage = h('div', { class: 'stage' }, scene);
  roomNav(ctx, rooms.length, scene, stage);
  if (ctx.deck.complete) {
    const here = ctx.location();
    let arrived = false;
    try {
      const seen = localStorage.getItem('freakbot.place');
      localStorage.setItem('freakbot.place', here.id);
      arrived = seen !== null && seen !== here.id;
    } catch {
      // Without storage he simply never announces the trip.
    }
    if (arrived) showSlip(scene, here.line);
    else if (!greeted) showSlip(scene, greetingFor(rooms.flat()));
    greeted = true;
  }
  if (say) showSlip(scene, say);
  say = null;
  if (!scene.querySelector('.slip') && lastSlip && Date.now() < lastSlip.until) showSlip(scene, lastSlip.text, lastSlip.until);
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
  const water = frameOf(band, 'fbw');
  const awake = frameOf(band, 'fbo');
  const look = standX >= HOME_X ? 'R' : 'L';
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
  let wheel = 0;
  const after_moves = grade === 'got'
    ? [[0, -2, 'fbh'], [0, -4, 'fbh'], [0, -2, 'fbh'], [0, 0, 'fbh'], [0, -2, 'fbh'], [0, 0, 'fbh']]
    : grade === 'missed'
      ? [[-1, 0, 'fbx'], [1, 0, 'fbx'], [-1, 0, 'fbx'], [1, 0, 'fbx'], [0, 0, 'fbx'], [0, 0, 'fbx']]
      : [];
  const dropTop = cellY + 6;
  timer = setInterval(() => {
    if (phase === 'roll') {
      if (Math.abs(x - standX) > 4) {
        x += x < standX ? 4 : -4;
        bot.style.left = px(x);
        wheel += 1;
        rest.src = frameOf(band, `${wheel % 2 ? 'fbr' : 'fb'}${look}`);
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
      play(grade === 'missed' ? 'missed' : grade === 'got' ? 'got' : 'water');
    }
    if (ticks >= 9 && ticks - 9 < after_moves.length) {
      const [dx, dy, frame] = after_moves[ticks - 9];
      drops.forEach((d) => d.remove());
      bot.style.transform = `translate(${dx * SCALE}px, ${dy * SCALE}px)`;
      rest.src = frameOf(band, frame);
    }
    if (ticks >= 9 + Math.max(after_moves.length, 5)) finish();
  }, TICK_MS);
}
