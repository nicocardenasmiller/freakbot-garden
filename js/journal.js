import { h } from './dom.js';
import { chaptersUnlocked, weeklyResults } from './rules.js';

const weekLabel = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export function renderJournal(ctx) {
  const { save } = ctx.store;
  const lore = ctx.deck.lore;
  const open = chaptersUnlocked(save.profile.daysDone, lore.length);

  const pages = [];
  for (let i = open; i >= 1; i -= 1) {
    pages.push(
      h('article', { class: 'page' }, h('p', { class: 'smallcaps page-number' }, `Chapter ${i} of ${lore.length}`), h('p', { class: 'page-text' }, lore[i - 1])),
    );
  }
  if (!open) pages.push(h('article', { class: 'page' }, h('p', { class: 'page-text' }, 'nothing written yet, pana. finish a day of cards.')));

  const results = weeklyResults(save).map((w) =>
    h(
      'div',
      { class: 'week-row' },
      h('span', { class: 'smallcaps' }, `Week of ${weekLabel(w.week)}`),
      h('span', { class: 'week-stats' }, `${w.daysDone} days · ${w.water} water · ${w.got} knew it · ${w.partial} partly · ${w.missed} not yet`),
    ),
  );

  return {
    el: h(
      'div',
      { class: 'journal' },
      ...pages,
      results.length ? h('section', { class: 'weeks' }, h('h3', { class: 'smallcaps' }, 'Weekly results'), ...results) : null,
    ),
    action: null,
  };
}
