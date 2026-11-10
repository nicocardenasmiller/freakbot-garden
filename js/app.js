import { h } from './dom.js';
import { SPECIES, addDays, applyMilestones, buildPlants, ensureDay, layoutRooms, locationIndex, localDay, recompute, timeBand, updatePeaks } from './rules.js';
import { createStore } from './store.js';
import { renderCards } from './cards.js';
import { ROOMS, playWater, renderGarden } from './garden.js';
import { renderHerbarium } from './herbarium.js';
import { renderJournal } from './journal.js';
import { openSettings } from './settings.js';

const SYNC_MS = 30000;
const FIRST_SYNC_WAIT_MS = 4000;

const $ = (sel) => document.querySelector(sel);
const today = () => localDay();
const band = () => timeBand(new Date().getHours());

const store = createStore({ today });
const deck = { list: [], byId: new Map(), complete: false, appearance: [], chosen: {}, lore: [], milestones: [], locations: [] };

const later = (title, body) => ({
  el: h('div', { class: 'card-wrap' }, h('article', { class: 'card' }, h('h2', {}, title), h('p', {}, body))),
  action: null,
});

const ctx = {
  store,
  deck,
  today,
  band,
  todayEntry: () => store.save.days[today()],
  go,
  refresh: render,
  room: 0,
  gardenNow,
  location: () => deck.locations[locationIndex(store.save.profile.water, deck.locations.length)] ?? { id: 'orbit', art: false },
  details: (roomId) => deck.milestones.filter((m) => m.room === roomId && (store.save.profile.unlocked ?? []).includes(m.id)),
  allPlants: () => buildPlants(deck.list, deck.appearance, deck.chosen, store.save, today()),
  playWater: (card, before, done) => playWater(ctx, card, before, done),
};

function gardenNow() {
  return layoutRooms(buildPlants(deck.list, deck.appearance, deck.chosen, store.save, today()), ROOMS.length, store.save.layout ?? {});
}

const VIEWS = {
  garden: () => renderGarden(ctx),
  cards: () => renderCards(ctx),
  herbarium: () => renderHerbarium(ctx),
  journal: () => renderJournal(ctx),
};

// In the Android app, keep the home-screen widget in step with the streak.
function pushWidget() {
  const widget = window.Capacitor?.Plugins?.FreakbotWidget;
  if (!widget) return;
  const { streak, freezes, lastDay } = store.save.profile;
  const week = [6, 5, 4, 3, 2, 1, 0]
    .map((back) => {
      const entry = store.save.days[addDays(today(), -back)];
      return entry?.done ? '1' : entry?.frozen ? 'f' : '0';
    })
    .join('');
  // The widget shows the strongest plant, drooping if it is thirsty.
  const best = ctx.allPlants().reduce((top, p) => (!top || p.stage > top.stage ? p : top), null);
  const plant = best ? { plantSpecies: SPECIES.indexOf(best.species), plantColumn: best.stage + best.thirst * 5 } : {};
  widget.update({ streak, freezes, lastDay: lastDay ?? '', doneDay: ctx.todayEntry()?.done ? today() : '', week, weekEnd: today(), ...plant }).catch(() => {});
}

let tab = 'garden';

function render() {
  document.body.dataset.tab = tab;
  const { el, action } = VIEWS[tab]();
  $('#view').replaceChildren(el);
  $('#action').replaceChildren(...(action ? [action] : []));
  document.querySelectorAll('.tabs button').forEach((b) => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
}

function go(next) {
  tab = next;
  render();
}

function paintStrip() {
  const { water, streak } = store.save.profile;
  const topics = new Set(deck.list.flatMap((c) => c.topics ?? []));
  const { status } = store;
  const failing = ['missing', 'rejected', 'error'].includes(status);
  // A 360 px strip fits three items, so a sync warning takes the place of Plants.
  const third = failing
    ? h('span', { class: 'cell warn' }, 'Not syncing')
    : status === 'offline'
      ? h('span', { class: 'cell quiet' }, 'Offline')
      : h('span', { class: 'cell' }, `Plants ${topics.size}`);
  $('#stats').replaceChildren(h('span', { class: 'cell' }, `Water ${water}`), h('span', { class: 'cell' }, `Streak ${streak}`), third);
}

let shownMinute = '';
let shownDay = '';
let shownBand = '';

function tick() {
  const now = new Date();
  const minute = `${now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (minute !== shownMinute) {
    shownMinute = minute;
    $('#clock').textContent = minute;
  }

  const currentBand = band();
  const currentDay = today();
  const bandChanged = currentBand !== shownBand;
  const dayChanged = currentDay !== shownDay;
  shownBand = currentBand;
  shownDay = currentDay;
  document.documentElement.dataset.band = currentBand;

  if (dayChanged) prepareToday();
  if (dayChanged || (bandChanged && tab === 'garden')) render();
}

function prepareToday() {
  if (deck.complete) {
    store.commit((save, now) => {
      ensureDay(save, deck.list, today(), now);
      updatePeaks(save, deck.list);
      applyMilestones(save, deck.milestones);
    });
  } else {
    store.commit((save) => recompute(save, today()));
  }
}

// A filename sorts by date; a batch counts as newer than the weekly set of the same date.
const fileRank = (name) => `${name.slice(0, 10)}${name.includes('-batch') ? '1' : '0'}`;

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

const DECK_KEY = 'freakbot.deck';

function applyDeck(data) {
  deck.chosen = data.chosen;
  deck.lore = data.lore;
  deck.milestones = data.milestones;
  deck.locations = data.locations;
  const byId = new Map();
  for (const set of data.sets) {
    for (const card of set.cards) {
      if (!byId.has(card.id)) byId.set(card.id, card);
    }
  }
  deck.byId = byId;
  deck.list = [...byId.values()];
  deck.appearance = [...new Set([...data.sets].reverse().flatMap((set) => set.cards.flatMap((card) => card.topics ?? [])))];
}

// The last deck this device saw, so the garden can draw at once. Today's cards still wait for a fresh load.
function loadSavedDeck() {
  try {
    const data = JSON.parse(localStorage.getItem(DECK_KEY));
    if (Array.isArray(data?.sets)) applyDeck(data);
  } catch {
    // The network load below fills it in.
  }
}

async function loadDeck() {
  try {
    const [chosen, lore, milestones, locations, index] = await Promise.all([
      fetchJson('data/plants.json').catch(() => ({})),
      fetchJson('data/lore.json').catch(() => []),
      fetchJson('data/milestones.json').catch(() => []),
      fetchJson('data/locations.json').catch(() => []),
      fetchJson('data/cards/index.json'),
    ]);
    const ordered = [...index.files].sort((a, b) => fileRank(b).localeCompare(fileRank(a)));
    const sets = await Promise.all(ordered.map((f) => fetchJson(`data/cards/${f}`)));
    const data = { chosen, lore, milestones, locations, sets };
    applyDeck(data);
    deck.complete = true;
    try {
      localStorage.setItem(DECK_KEY, JSON.stringify(data));
    } catch {
      // Next start is just slower.
    }
  } catch {
    deck.complete = false;
  }
}

async function boot() {
  $('#strip').addEventListener('click', () => openSettings(store));
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  store.subscribe(paintStrip);
  store.subscribe(pushWidget);

  loadSavedDeck();
  tick();
  paintStrip();

  await loadDeck();
  render();
  // Pull first so a second device picks up the day the first one already started.
  await Promise.race([store.sync(), new Promise((resolve) => setTimeout(resolve, FIRST_SYNC_WAIT_MS))]);
  prepareToday();
  paintStrip();
  pushWidget();
  render();

  setInterval(tick, 1000);
  setInterval(() => {
    if (document.visibilityState === 'visible') store.sync();
  }, SYNC_MS);

  const wake = () => {
    if (document.visibilityState !== 'visible') return;
    tick();
    store.sync();
  };
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('focus', wake);
  window.addEventListener('online', wake);

  if ('serviceWorker' in navigator) {
    // On the first visit the worker takes over after the cards loaded, so load them again to cache them.
    const firstInstall = !navigator.serviceWorker.controller;
    if (firstInstall) navigator.serviceWorker.addEventListener('controllerchange', loadDeck, { once: true });
    navigator.serviceWorker.register('sw.js');
  }
}

boot();
