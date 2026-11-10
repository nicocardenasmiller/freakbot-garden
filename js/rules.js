// Game rules from DESIGN.md section 5 and the merge from 6.5. No DOM, no storage.

export const WATER = { got: 10, partial: 6, missed: 3 };
const REVIEW_WEIGHT = { missed: 6, partial: 4, got: 1 };
const DAILY = 3;
const MAX_FREEZES = 2;
const WATER_PER_TRIP = 200;

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

// Open-ended cards are graded by how many key points were remembered.
export function gradeFromPoints(hit, total) {
  if (hit <= 0) return 'missed';
  return hit >= total ? 'got' : 'partial';
}

export const emptySave = () => ({
  v: 1,
  responses: {},
  days: {},
  peaks: {},
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
  if (!entry || !(entry.cards.includes(cardId) || entry.extra?.includes(cardId))) return;
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
    const extra = [...new Set([...(x?.extra ?? []), ...(y?.extra ?? [])])];
    if (extra.length) entry.extra = extra;
    const earned = [...entry.cards, ...extra]
      .filter((id) => out.responses[id]?.day === d)
      .reduce((sum, id) => sum + WATER[out.responses[id].grade], 0);
    entry.water = Math.max(entry.water, earned);
    entry.done = entry.done || (entry.cards.length > 0 && allGraded(out, d, entry.cards));
    out.days[d] = entry;
  }

  for (const peaks of [a.peaks ?? {}, b.peaks ?? {}]) {
    for (const [topic, peak] of Object.entries(peaks)) out.peaks[topic] = Math.max(out.peaks[topic] ?? 0, peak);
  }

  out.profile.unlocked = [...new Set([...(a.profile?.unlocked ?? []), ...(b.profile?.unlocked ?? [])])];
  return recompute(out, today);
}

// ---- Plants (DESIGN.md 5.1 to 5.3 and 5.7) ----

export const STAGES = ['seed', 'sprout', 'sapling', 'bloom', 'fruit'];
export const SPECIES = ['limonero', 'copihue', 'araucaria', 'quisco', 'nalca', 'tomatera', 'maravilla', 'liuto'];
export const ROOM_SIZE = 12;
const SAPLING = 2;
const RACK_SLOTS = [0, 1, 2, 3, 4, 5];
const BIG_SLOTS = [6, 7, 8, 9, 10, 11];

export function topicStats(cards, responses) {
  const stats = new Map();
  for (const card of cards) {
    for (const topic of card.topics ?? []) {
      if (!stats.has(topic)) stats.set(topic, { questions: 0, answered: 0, got: 0, partial: 0, lastDay: null });
      const s = stats.get(topic);
      s.questions += 1;
      const r = responses[card.id];
      if (!r) continue;
      s.answered += 1;
      if (r.grade === 'got') s.got += 1;
      if (r.grade === 'partial') s.partial += 1;
      if (!s.lastDay || r.day > s.lastDay) s.lastDay = r.day;
    }
  }
  return stats;
}

export const masteryOf = (s) => (s.answered ? (s.got + 0.5 * s.partial) / s.answered : 0);

export function stageFor(s, peak = 0) {
  const m = masteryOf(s);
  let stage = 0;
  if (s.answered >= 1) stage = 1;
  if (s.answered >= 5 && m >= 0.4) stage = 2;
  if (s.answered >= 10 && m >= 0.6) stage = 3;
  if (s.answered >= 15 && m >= 0.8) stage = 4;
  // A plant can lose its fruit, but never shrinks below sapling once it got there.
  return peak >= SAPLING ? Math.max(stage, SAPLING) : stage;
}

export function updatePeaks(save, cards) {
  save.peaks ??= {};
  for (const [topic, s] of topicStats(cards, save.responses)) {
    const stage = stageFor(s, save.peaks[topic] ?? 0);
    if (stage > (save.peaks[topic] ?? 0)) save.peaks[topic] = stage;
  }
}

const isDue = (card, responses, day) => {
  const r = responses[card.id];
  return !r || !(r.grade === 'got' && dayDiff(r.day, day) < 3);
};

// 0 fine, 1 thirsty, 2 wilted. A plant nobody has answered yet is a seed waiting, not neglected.
export function thirstFor(s, topicCards, responses, day) {
  if (!s.lastDay || !topicCards.some((c) => isDue(c, responses, day))) return 0;
  const since = dayDiff(s.lastDay, day);
  if (since >= 21) return 2;
  return since >= 7 ? 1 : 0;
}

// `appearance` lists topics oldest first. Topics missing from `chosen` cycle through the species.
export function buildPlants(cards, appearance, chosen, save, day) {
  const stats = topicStats(cards, save.responses);
  return appearance
    .filter((topic) => stats.has(topic))
    .map((topic, i) => {
      const s = stats.get(topic);
      const topicCards = cards.filter((c) => c.topics?.includes(topic));
      return {
        topic,
        species: chosen[topic] ?? SPECIES[i % SPECIES.length],
        stage: stageFor(s, save.peaks?.[topic] ?? 0),
        thirst: thirstFor(s, topicCards, save.responses, day),
        mastery: masteryOf(s),
        answered: s.answered,
        questions: s.questions,
      };
    });
}

// Young plants go on the rack, grown ones on the floor and in the hanging baskets, spilling over when full.
export function layoutRooms(plants, roomCount) {
  const rooms = [];
  for (let i = 0; i < roomCount && i * ROOM_SIZE < plants.length; i += 1) {
    const free = { rack: [...RACK_SLOTS], big: [...BIG_SLOTS] };
    rooms.push(
      plants.slice(i * ROOM_SIZE, (i + 1) * ROOM_SIZE).map((plant) => {
        const [first, second] = plant.stage <= SAPLING ? ['rack', 'big'] : ['big', 'rack'];
        const slot = free[first].length ? free[first].shift() : free[second].shift();
        return { ...plant, room: i, slot };
      }),
    );
  }
  return rooms;
}

// The most overdue card of a topic that has not been answered today, for "Water this plant".
export function pickForTopic(cards, topic, responses, day) {
  const weight = (card) => {
    const r = responses[card.id];
    return r ? REVIEW_WEIGHT[r.grade] * Math.min(4, 1 + dayDiff(r.day, day) / 3) : 100;
  };
  const options = cards.filter((c) => c.topics?.includes(topic) && responses[c.id]?.day !== day && isDue(c, responses, day));
  return options.sort((a, b) => weight(b) - weight(a))[0]?.id ?? null;
}

export function addExtraCard(save, cardId, day, now) {
  const entry = (save.days[day] ??= { cards: [], done: false, frozen: false, water: 0, at: now });
  entry.extra = [...new Set([...(entry.extra ?? []), cardId])];
  entry.at = now;
}

// ---- Journal, milestones, travel (DESIGN.md 5.5 to 5.7) ----

export const chaptersUnlocked = (daysDone, total) => Math.min(daysDone, total);
export const locationIndex = (water, count) => (count ? Math.floor(water / WATER_PER_TRIP) % count : 0);
export const reachedMilestones = (best, milestones) => milestones.filter((m) => best >= m.days);

export function applyMilestones(save, milestones) {
  const reached = reachedMilestones(save.profile.best, milestones).map((m) => m.id);
  save.profile.unlocked = [...new Set([...(save.profile.unlocked ?? []), ...reached])];
}

export function weekStart(day) {
  const weekday = (new Date(toUTC(day)).getUTCDay() + 6) % 7;
  return addDays(day, -weekday);
}

export function weeklyResults(save) {
  const weeks = new Map();
  const week = (day) => {
    const key = weekStart(day);
    if (!weeks.has(key)) weeks.set(key, { week: key, daysDone: 0, water: 0, got: 0, partial: 0, missed: 0 });
    return weeks.get(key);
  };
  for (const [day, entry] of Object.entries(save.days)) {
    const w = week(day);
    w.water += entry.water;
    if (entry.done) w.daysDone += 1;
  }
  for (const r of Object.values(save.responses)) week(r.day)[r.grade] += 1;
  return [...weeks.values()].sort((x, y) => (x.week < y.week ? 1 : -1));
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
