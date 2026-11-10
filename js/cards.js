import { h } from './dom.js';
import { WATER, gradeCard, gradeFromPoints, updatePeaks } from './rules.js';

const GRADE_LABEL = { got: 'Knew it', partial: 'Partly', missed: 'Not yet' };

let session = { day: null, viewing: null, side: 'front', draft: '', hits: new Set(), extra: null, before: null };

const reset = (day) => {
  session = { day, viewing: null, side: 'front', draft: '', hits: new Set(), extra: null, before: null };
};

const kicker = (ctx, ids, id, card) =>
  h('p', { class: 'smallcaps kicker' }, `Card ${ids.indexOf(id) + 1} of ${ids.length} · ${card.paper}`);

const message = (title, body) =>
  h('div', { class: 'card-wrap' }, h('article', { class: 'card' }, h('h2', {}, title), h('p', {}, body)));

function renderDone(ctx, entry) {
  const { profile } = ctx.store.save;
  const empty = entry.cards.length === 0;
  const body = h(
    'article',
    { class: 'card' },
    h('h2', {}, empty ? 'Nothing due today' : 'Watered for today'),
    h('p', {}, empty ? 'The day still counts.' : `${entry.water} water from ${entry.cards.length} cards.`),
    h('p', { class: 'smallcaps tally' }, `Streak ${profile.streak} · Freezes ${profile.freezes}`),
  );
  return {
    el: h('div', { class: 'card-wrap' }, body),
    action: h('button', { class: 'primary', onclick: () => ctx.go('garden') }, 'Back to the garden'),
  };
}

// "Water this plant" asks one extra card for that plant's topic.
export function startExtra(cardId, day) {
  reset(day);
  session.extra = cardId;
}

function answer(ctx, card, payload) {
  session.before = ctx.gardenNow();
  ctx.store.commit((save, now) => {
    gradeCard(save, card.id, ctx.today(), payload, now);
    updatePeaks(save, ctx.deck.list);
  });
}

function renderShortFront(ctx, ids, card) {
  const input = h('textarea', {
    class: 'written',
    rows: 5,
    placeholder: 'write what you remember',
    value: session.draft,
    oninput: (e) => {
      session.draft = e.target.value;
    },
  });
  return {
    body: [kicker(ctx, ids, card.id, card), h('p', { class: 'prompt' }, card.prompt), input],
    action: h(
      'button',
      {
        class: 'primary',
        onclick: () => {
          session.viewing = card.id;
          session.side = 'back';
          ctx.refresh();
        },
      },
      'Turn over',
    ),
  };
}

function renderChoiceFront(ctx, ids, card) {
  const options = card.options.map((text, i) =>
    h(
      'button',
      {
        class: 'option',
        onclick: () => {
          answer(ctx, card, { grade: i === card.correct ? 'got' : 'missed', choice: i });
          session.viewing = card.id;
          session.side = 'back';
          ctx.refresh();
        },
      },
      text,
    ),
  );
  return {
    body: [kicker(ctx, ids, card.id, card), h('p', { class: 'prompt' }, card.prompt), h('div', { class: 'options' }, ...options)],
    action: null,
  };
}

function renderBack(ctx, ids, card) {
  const response = ctx.store.save.responses[card.id];
  const graded = response?.day === ctx.today();
  const isChoice = card.format === 'mc';
  const next = () => {
    const { before, extra } = session;
    reset(ctx.today());
    ctx.playWater(card, before, () => (extra ? ctx.go('herbarium') : ctx.refresh()));
  };

  const verdict =
    isChoice &&
    graded &&
    h(
      'p',
      { class: `verdict ${response.grade === 'got' ? 'right' : 'wrong'}` },
      response.grade === 'got' ? 'Correct' : `You chose: ${card.options[response.choice]}`,
    );

  const checklist = !isChoice && card.points?.length > 0;
  const gradeNow = () => gradeFromPoints(session.hits.size, card.points.length);
  const gradeLabel = () => `${GRADE_LABEL[gradeNow()]} · +${WATER[gradeNow()]}`;
  const submit =
    checklist &&
    h(
      'button',
      {
        class: 'primary',
        onclick: () => {
          const payload = { grade: gradeNow(), points: [...session.hits].sort((a, b) => a - b) };
          if (session.draft.trim()) payload.text = session.draft;
          answer(ctx, card, payload);
          next();
        },
      },
      gradeLabel(),
    );
  const pointButtons =
    checklist &&
    card.points.map((text, i) =>
      h(
        'button',
        {
          class: 'point',
          'aria-pressed': 'false',
          onclick: (e) => {
            const on = !session.hits.has(i);
            if (on) session.hits.add(i);
            else session.hits.delete(i);
            e.currentTarget.classList.toggle('hit', on);
            e.currentTarget.setAttribute('aria-pressed', String(on));
            submit.textContent = gradeLabel();
          },
        },
        text,
      ),
    );

  const body = [
    kicker(ctx, ids, card.id, card),
    h('p', { class: 'prompt small' }, card.prompt),
    session.draft.trim() && h('p', { class: 'written-back' }, session.draft),
    verdict,
    h('h3', { class: 'smallcaps' }, checklist ? 'Tap what you remembered' : 'Answer'),
    checklist ? h('div', { class: 'points' }, ...pointButtons) : h('p', {}, card.answer),
    checklist && h('details', { class: 'full-answer' }, h('summary', { class: 'smallcaps' }, 'Full answer'), h('p', {}, card.answer)),
    card.explanation && h('p', { class: 'explanation' }, card.explanation),
    h('p', { class: 'source' }, card.source),
  ];

  if (isChoice) {
    const last = ids[ids.length - 1] === card.id;
    return { body, action: h('button', { class: 'primary', onclick: next }, last ? 'Finish' : 'Next card') };
  }

  if (checklist) return { body, action: submit };

  const gradeButton = (label, grade) =>
    h(
      'button',
      {
        class: 'grade',
        onclick: () => {
          const payload = { grade };
          if (session.draft.trim()) payload.text = session.draft;
          answer(ctx, card, payload);
          next();
        },
      },
      h('span', {}, label),
      h('small', {}, `+${WATER[grade]}`),
    );

  return {
    body,
    action: h(
      'div',
      { class: 'grades' },
      gradeButton('knew it', 'got'),
      gradeButton('partly', 'partial'),
      gradeButton('not yet', 'missed'),
    ),
  };
}

export function renderCards(ctx) {
  const today = ctx.today();
  if (session.day !== today) reset(today);

  const entry = ctx.todayEntry();
  if (!entry) {
    return {
      el: message('The cards are not here yet', 'They could not be loaded. Connect once and open this tab again.'),
      action: null,
    };
  }

  const { responses } = ctx.store.save;
  const ids = session.extra ? [session.extra] : entry.cards;
  const id = session.viewing ?? session.extra ?? entry.cards.find((c) => responses[c]?.day !== today);
  const card = id && ctx.deck.byId.get(id);
  if (!card) return renderDone(ctx, entry);

  const view =
    session.side === 'back'
      ? renderBack(ctx, ids, card)
      : card.format === 'mc'
        ? renderChoiceFront(ctx, ids, card)
        : renderShortFront(ctx, ids, card);

  return {
    el: h('div', { class: 'card-wrap' }, h('article', { class: `card ${session.side}` }, ...view.body.filter(Boolean))),
    action: view.action,
  };
}
