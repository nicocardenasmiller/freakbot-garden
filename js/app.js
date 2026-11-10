import { h } from './dom.js';
import { ensureDay, localDay, recompute, timeBand } from './rules.js';
import { createStore } from './store.js';
import { renderCards } from './cards.js';
import { renderGarden } from './garden.js';
import { openSettings } from './settings.js';

const SYNC_MS = 30000;
const FIRST_SYNC_WAIT_MS = 4000;

const $ = (sel) => document.querySelector(sel);
const today = () => localDay();
const band = () => timeBand(new Date().getHours());

const store = createStore({ today });
const deck = { list: [], byId: new Map(), complete: false };

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
};

const VIEWS = {
  garden: () => renderGarden(ctx),
  cards: () => renderCards(ctx),
  herbarium: () => later('Herbarium', 'The plant sheets arrive with the garden.'),
  journal: () => later('Journal', 'The first pages are still being written.'),
};

let tab = 'garden';

function render() {
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
    store.commit((save, now) => ensureDay(save, deck.list, today(), now));
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

async function loadDeck() {
  try {
    const { files } = await fetchJson('data/cards/index.json');
    const ordered = [...files].sort((a, b) => fileRank(b).localeCompare(fileRank(a)));
    const sets = await Promise.all(ordered.map((f) => fetchJson(`data/cards/${f}`)));
    const byId = new Map();
    for (const set of sets) {
      for (const card of set.cards) {
        if (!byId.has(card.id)) byId.set(card.id, card);
      }
    }
    deck.byId = byId;
    deck.list = [...byId.values()];
    deck.complete = true;
  } catch {
    deck.complete = false;
  }
}

async function boot() {
  $('#strip').addEventListener('click', () => openSettings(store));
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  store.subscribe(paintStrip);

  tick();
  paintStrip();

  await loadDeck();
  // Pull first so a second device picks up the day the first one already started.
  await Promise.race([store.sync(), new Promise((resolve) => setTimeout(resolve, FIRST_SYNC_WAIT_MS))]);
  prepareToday();
  paintStrip();
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
