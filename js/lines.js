// Freakbot's voice: lowercase, short, warm, a bit dry. No hearts, no em dashes, no real lyrics.
const IDLE = [
  'wepa. las matas siguen vivas, pana.',
  'dale, que hoy toca regar.',
  'esto aqui flota solo, cachai.',
  'bacan la vista, po.',
  'yo cuido esto. tu lee.',
];
const THIRSTY = ['{t} tiene sed, pana.', 'oye, {t} anda seca, po.', 'pucha, {t} te extraña.'];
const WILTED = ['pucha, {t} se esta muriendo de sed.', 'dale po, {t} ya no aguanta.'];
const WATERED = ['dale. {t} bebio.', 'wepa, {t} contenta.', 'listo, {t} regada.'];
const MISSED = ['casi, pana. igual {t} bebio.', 'tranqui. {t} se toma lo que hay.'];
const GREW = ['wepa! {t} esta creciendo!', 'bacan, mira {t}, po!'];

export const topicName = (topic) => topic.replaceAll('_', ' ').toLowerCase();
const pick = (lines, topic) => lines[Math.floor(Math.random() * lines.length)].replace('{t}', topic ? topicName(topic) : '');

export function greetingFor(plants) {
  const wilted = plants.find((p) => p.thirst === 2);
  if (wilted) return pick(WILTED, wilted.topic);
  const thirsty = plants.find((p) => p.thirst === 1);
  return thirsty ? pick(THIRSTY, thirsty.topic) : pick(IDLE);
}

const POKED = ['wepa!', 'oye, cosquillas.', 'dale, pana.', 'bacan.', 'pucha, con cuidado.', 'que pasa, po?', 'aqui estoy, cachai.'];

export function pokeLine(asleep, fedUp) {
  if (fedUp) return 'ya po, stop poking me.';
  if (asleep) return 'ah! no estaba durmiendo.';
  return pick(POKED);
}

export const waterLine = (topic, grade, grew) => (grew ? pick(GREW, topic) : pick(grade === 'missed' ? MISSED : WATERED, topic));
