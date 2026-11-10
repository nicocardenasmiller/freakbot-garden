import { h } from './dom.js';

const sprite = (src, cls) => h('img', { src, class: `art ${cls}`, alt: '', draggable: false });

export function renderGarden(ctx) {
  const band = ctx.band();
  const asleep = band === 'night';
  const room = sprite(`art/out/f_${band}_bg.png`, 'room');
  room.alt = 'The conservatory';

  const bot = h(
    'div',
    { class: 'bot' },
    sprite(`art/out/fr_${band}_${asleep ? 'fbn' : 'fbo'}.png`, 'frame'),
    !asleep && sprite(`art/out/fr_${band}_fbb.png`, 'frame blink'),
  );

  const scene = h(
    'div',
    { class: 'scene' },
    room,
    h('div', { class: 'shadow' }),
    !asleep && sprite(`art/out/fr_${band}_can.png`, 'can'),
    bot,
  );

  const done = ctx.todayEntry()?.done;
  return {
    el: h('div', { class: 'stage' }, scene),
    action: h(
      'button',
      { class: 'primary', onclick: () => ctx.go('cards') },
      done ? 'Watered for today' : 'Water the garden',
    ),
  };
}
