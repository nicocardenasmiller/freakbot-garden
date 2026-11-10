import { h } from './dom.js';
import { STAGES, addExtraCard, pickForTopic } from './rules.js';
import { startExtra } from './cards.js';
import { topicName } from './lines.js';
import { plantCell } from './garden.js';

const LATIN = {
  limonero: 'Citrus limon',
  copihue: 'Lapageria rosea',
  araucaria: 'Araucaria araucana',
  quisco: 'Echinopsis chiloensis',
  nalca: 'Gunnera tinctoria',
  tomatera: 'Solanum lycopersicum',
  maravilla: 'Helianthus annuus',
  liuto: 'Alstroemeria',
};
const THIRST = ['Watered', 'Thirsty', 'Wilted'];

let open = null;

function specimen(plant, scale) {
  const el = plantCell(plant, 'day', scale);
  el.classList.add('specimen-art');
  return el;
}

function renderGrid(ctx, plants) {
  const sheets = plants.map((plant) =>
    h(
      'button',
      {
        class: 'sheet',
        onclick: () => {
          open = plant.topic;
          ctx.refresh();
        },
      },
      h('span', { class: 'sheet-art' }, specimen(plant, 3)),
      h('span', { class: 'sheet-name' }, topicName(plant.topic)),
      h('span', { class: `smallcaps sheet-state${plant.thirst ? ' dry' : ''}` }, plant.thirst ? THIRST[plant.thirst] : STAGES[plant.stage]),
    ),
  );
  return { el: h('div', { class: 'herbarium' }, ...sheets), action: null };
}

function renderSheet(ctx, plant) {
  const cards = ctx.deck.list.filter((c) => c.topics?.includes(plant.topic));
  const papers = [...new Set(cards.map((c) => c.citation ?? c.paper))];
  const today = ctx.today();
  const cardId = pickForTopic(ctx.deck.list, plant.topic, ctx.store.save.responses, today);
  const back = () => {
    open = null;
    ctx.refresh();
  };

  const sheet = h(
    'article',
    { class: 'card' },
    h('p', { class: 'smallcaps kicker' }, plant.species),
    h('button', { class: 'quiet back-link', onclick: back }, 'Back to herbarium'),
    h('div', { class: 'specimen' }, specimen(plant, 5)),
    h('h2', {}, topicName(plant.topic)),
    h('p', { class: 'latin' }, LATIN[plant.species]),
    h(
      'dl',
      { class: 'facts' },
      h('dt', { class: 'smallcaps' }, 'Stage'),
      h('dd', {}, STAGES[plant.stage]),
      h('dt', { class: 'smallcaps' }, 'Condition'),
      h('dd', {}, THIRST[plant.thirst]),
      h('dt', { class: 'smallcaps' }, 'Answered'),
      h('dd', {}, `${plant.answered} of ${plant.questions}`),
      h('dt', { class: 'smallcaps' }, 'Mastery'),
      h('dd', {}, plant.answered ? `${Math.round(plant.mastery * 100)}%` : 'None yet'),
    ),
    h('h3', { class: 'smallcaps' }, 'Papers cited'),
    h('ul', { class: 'papers' }, ...papers.map((p) => h('li', {}, p))),
  );

  return {
    el: h('div', { class: 'card-wrap' }, sheet),
    action: cardId
      ? h(
          'button',
          {
            class: 'primary',
            onclick: () => {
              ctx.store.commit((save, now) => addExtraCard(save, cardId, today, now));
              startExtra(cardId, today);
              open = null;
              ctx.go('cards');
            },
          },
          'Water this plant',
        )
      : h('button', { class: 'primary', disabled: true }, 'Watered for now'),
  };
}

export function renderHerbarium(ctx) {
  const plants = ctx.allPlants();
  const plant = plants.find((p) => p.topic === open);
  if (open && plant) return renderSheet(ctx, plant);
  open = null;
  return renderGrid(ctx, plants);
}
