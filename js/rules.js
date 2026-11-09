// Game rules from DESIGN.md section 5 and the merge from 6.5. No DOM, no storage.

export const WATER = { got: 10, partial: 6, missed: 3 };
const REVIEW_WEIGHT = { missed: 6, partial: 4, got: 1 };
const DAILY = 3;
const MAX_FREEZES = 2;

const pad = (n) => String(n).padStart(2, '0');

export function localDay(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const toUTC = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export const dayDiff = (from, to) => Math.round((toUTC(to) - toUTC(from)) / 86400000);

export function addDays(day, n) {
  const d = new Date(toUTC(day) + n * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function timeBand(hour) {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'golden';
  return 'night';
}

// Day has no art until Phase 3.
export const artBand = (band) => (band === 'day' ? 'morning' : band);

export const emptySave = () => ({
  v: 1,
  responses: {},
  days: {},
  profile: { streak: 0, best: 0, freezes: 0, water: 0, daysDone: 0, lastDay: null, unlocked: [] },
});

function rngFor(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// `cards` must already be in file order: newest file first, file order within it.
export function pickDaily(cards, responses, day, n = DAILY) {
  const rng = rngFor(day);
  let pool = [];
  for (const card of cards) {
    const r = responses[card.id];
    if (!r) continue;
    const since = dayDiff(r.day, day);
    if (r.grade === 'got' && since < 3) continue;
    pool.push({ card, weight: REVIEW_WEIGHT[r.grade] * Math.min(4, 1 + since / 3) });
  }

  const unanswered = cards.filter((card) => !responses[card.id]);
  // One slot stays open for a new card, or reviews would crowd new cards out for good.
  const reviewSlots = unanswered.length ? n - 1 : n;

  const picked = [];
  const papers = new Set();
  while (picked.length < reviewSlots && pool.length) {
    const otherPapers = pool.filter((p) => !papers.has(p.card.paper));
    const from = otherPapers.length ? otherPapers : pool;
    let roll = rng() * from.reduce((sum, p) => sum + p.weight, 0);
    let choice = from[from.length - 1];
    for (const p of from) {
      roll -= p.weight;
      if (roll <= 0) {
        choice = p;
        break;
      }
    }
    picked.push(choice.card.id);
    papers.add(choice.card.paper);
    pool = pool.filter((p) => p !== choice);
  }

  return [...picked, ...unanswered.slice(0, n - picked.length).map((card) => card.id)];
}

const allGraded = (save, day, ids) => ids.every((id) => save.responses[id]?.day === day);

// Creates today's entry once, or repairs it if a picked card no longer exists.
export function ensureDay(save, cards, day, now) {
  const known = new Set(cards.map((c) => c.id));
  const entry = save.days[day];
  if (!entry || (entry.frozen && !entry.done && !entry.cards.length)) {
    const ids = pickDaily(cards, save.responses, day);
    save.days[day] = { cards: ids, done: ids.length === 0, frozen: false, water: 0, at: now };
  } else if (entry.cards.some((id) => !known.has(id))) {
    entry.cards = entry.cards.filter((id) => known.has(id));
    entry.done = allGraded(save, day, entry.cards);
    entry.at = now;
  }
  recompute(save, day);
}

export function gradeCard(save, cardId, day, answer, now) {
  const entry = save.days[day];
  if (!entry || !entry.cards.includes(cardId)) return;
  if (save.responses[cardId]?.day === day) return;
  save.responses[cardId] = { ...answer, at: now, day };
  entry.water += WATER[answer.grade];
  entry.done = allGraded(save, day, entry.cards);
  entry.at = now;
  recompute(save, day);
}

// Rebuilds the profile from `days`. Frozen days are always derived, never trusted.
export function recompute(save, today) {
  const { days } = save;
  for (const d of Object.keys(days)) {
    if (!days[d].frozen) continue;
    if (!days[d].cards.length && !days[d].done) delete days[d];
    else days[d].frozen = false;
  }

  const p = {
    streak: 0,
    best: 0,
    freezes: 0,
    water: 0,
    daysDone: 0,
    lastDay: null,
    unlocked: save.profile?.unlocked ?? [],
  };

  const missUntil = (end) => {
    if (!p.lastDay) return;
    for (let d = addDays(p.lastDay, 1); d < end && p.streak > 0; d = addDays(d, 1)) {
      if (p.freezes > 0) {
        p.freezes -= 1;
        if (days[d]) days[d].frozen = true;
        else days[d] = { cards: [], done: false, frozen: true, water: 0, at: `${d}T00:00:00.000Z` };
      } else {
        p.streak = 0;
      }
    }
  };

  for (const d of Object.keys(days).sort()) {
    p.water += days[d].water;
    if (!days[d].done) continue;
    missUntil(d);
    p.streak += 1;
    p.best = Math.max(p.best, p.streak);
    p.daysDone += 1;
    p.lastDay = d;
    if (p.streak % 7 === 0) p.freezes = Math.min(MAX_FREEZES, p.freezes + 1);
  }
  missUntil(today);
  save.profile = p;
  return save;
}

const newer = (x, y) => ((x.at ?? '') >= (y.at ?? '') ? x : y);
const pickDay = (x, y) => (x.done !== y.done ? (x.done ? x : y) : newer(x, y));

export function mergeSaves(a, b, today) {
  const out = emptySave();

  for (const id of new Set([...Object.keys(a.responses), ...Object.keys(b.responses)])) {
    const [x, y] = [a.responses[id], b.responses[id]];
    out.responses[id] = x && y ? newer(x, y) : x ?? y;
  }

  for (const d of new Set([...Object.keys(a.days), ...Object.keys(b.days)])) {
    const [x, y] = [a.days[d], b.days[d]];
    const entry = { ...(x && y ? pickDay(x, y) : x ?? y) };
    // Two devices can each grade different cards of one day. Neither entry alone has all the water.
    const earned = entry.cards
      .filter((id) => out.responses[id]?.day === d)
      .reduce((sum, id) => sum + WATER[out.responses[id].grade], 0);
    entry.water = Math.max(entry.water, earned);
    entry.done = entry.done || (entry.cards.length > 0 && allGraded(out, d, entry.cards));
    out.days[d] = entry;
  }

  out.profile.unlocked = [...new Set([...(a.profile?.unlocked ?? []), ...(b.profile?.unlocked ?? [])])];
  return recompute(out, today);
}

// Key order differs between devices, so compare with sorted keys.
export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
