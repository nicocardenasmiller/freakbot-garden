// Small square-wave chirps. Off unless turned on in Settings.
const KEY = 'freakbot.sound';
let audio = null;

export function soundOn() {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setSound(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // The toggle just will not stick.
  }
}

const NOTES = {
  water: [[520, 0.06], [660, 0.06]],
  got: [[660, 0.07], [880, 0.1]],
  missed: [[220, 0.14]],
  poke: [[740, 0.05]],
  page: [[523, 0.08], [659, 0.08], [784, 0.14]],
};

export function play(name) {
  if (!soundOn()) return;
  audio ??= new AudioContext();
  let at = audio.currentTime;
  for (const [freq, length] of NOTES[name] ?? []) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.04;
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + length);
    at += length;
  }
}
