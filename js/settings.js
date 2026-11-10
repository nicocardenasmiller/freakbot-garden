import { h } from './dom.js';
import { setSound, soundOn } from './sound.js';
import { resetLayout } from './rules.js';

export const STATUS_TEXT = {
  missing: 'Not syncing: no token on this device.',
  rejected: 'Not syncing: GitHub rejected this token.',
  error: 'Not syncing: something went wrong. It will try again.',
  offline: 'Offline. Progress is saved here and will sync later.',
  pending: 'Checking…',
  ok: 'Synced.',
};

const soundLabel = () => `Sound: ${soundOn() ? 'on' : 'off'}`;

export function openSettings(store) {
  const dialog = h('dialog', { class: 'settings' });
  const status = h('p', { class: 'status', role: 'status' });
  const paint = () => {
    status.textContent = STATUS_TEXT[store.status];
  };
  paint();
  store.subscribe(paint);

  const input = h('input', {
    type: 'password',
    autocomplete: 'off',
    spellcheck: false,
    placeholder: store.hasToken ? 'token saved on this device' : 'paste token',
  });

  const close = () => dialog.close();
  const save = () => {
    if (input.value.trim()) store.setToken(input.value);
    input.value = '';
    input.placeholder = 'token saved on this device';
  };
  const remove = () => {
    store.setToken('');
    input.placeholder = 'paste token';
  };

  dialog.append(
    h('h2', {}, 'Settings'),
    h('label', { class: 'smallcaps' }, 'Sync token', input),
    h(
      'button',
      {
        class: 'quiet sound-toggle',
        onclick: (e) => {
          setSound(!soundOn());
          e.currentTarget.textContent = soundLabel();
        },
      },
      soundLabel(),
    ),
    h(
      'button',
      {
        class: 'quiet sound-toggle',
        onclick: (e) => {
          store.commit((save, now) => resetLayout(save, now));
          e.currentTarget.textContent = 'Plants auto-arranged';
        },
      },
      'Auto-arrange plants',
    ),
    h('p', { class: 'hint' }, 'A fine-grained GitHub token with Contents read and write on freakbot-garden-save only. It stays on this device.'),
    status,
    h(
      'div',
      { class: 'row' },
      h('button', { class: 'primary', onclick: save }, 'Save'),
      h('button', { class: 'quiet', onclick: remove }, 'Remove'),
      h('button', { class: 'quiet', onclick: close }, 'Close'),
    ),
  );
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}
