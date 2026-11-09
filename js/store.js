// localStorage first, then the private save repo (DESIGN.md 6.5). The token is never logged.
import { emptySave, mergeSaves, recompute, stable } from './rules.js';

const SAVE_KEY = 'freakbot.save';
const TOKEN_KEY = 'freakbot.token';
const API = 'https://api.github.com/repos/nicocardenasmiller/freakbot-garden-save/contents/save.json';

class HttpError extends Error {
  constructor(res) {
    super(`GitHub responded ${res.status}`);
    this.status = res.status;
    this.rateLimited = res.headers.get('x-ratelimit-remaining') === '0';
  }
}

function encode(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decode(b64) {
  const binary = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function createStore({ storage = localStorage, fetchFn = fetch.bind(globalThis), today, now = () => new Date().toISOString() }) {
  const readLocal = () => {
    try {
      const parsed = JSON.parse(storage.getItem(SAVE_KEY));
      if (parsed?.v === 1) return parsed;
    } catch {
      // Falls through to an empty save.
    }
    return emptySave();
  };

  let save = readLocal();
  let token = storage.getItem(TOKEN_KEY) ?? '';
  let status = token ? 'pending' : 'missing';
  const listeners = new Set();

  const notify = () => listeners.forEach((fn) => fn());
  const setStatus = (next) => {
    if (next === status) return;
    status = next;
    notify();
  };
  const persist = () => storage.setItem(SAVE_KEY, JSON.stringify(save));
  const headers = () => ({
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  });

  async function getRemote() {
    const res = await fetchFn(API, { headers: headers(), cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new HttpError(res);
    const body = await res.json();
    const parsed = JSON.parse(decode(body.content));
    if (parsed?.v !== 1) throw new Error('Unrecognized save file');
    return { sha: body.sha, save: parsed };
  }

  async function putRemote(sha) {
    const body = { message: `save ${today()}`, content: encode(JSON.stringify(save, null, 1)) };
    if (sha) body.sha = sha;
    return fetchFn(API, { method: 'PUT', headers: headers(), body: JSON.stringify(body), cache: 'no-store' });
  }

  function absorb(remote) {
    const merged = remote ? mergeSaves(save, remote.save, today()) : recompute(save, today());
    if (stable(merged) !== stable(readLocal())) {
      save = merged;
      persist();
      notify();
    } else {
      save = merged;
    }
    return !remote || stable(merged) !== stable(remote.save);
  }

  async function syncOnce() {
    if (!token) {
      setStatus('missing');
      return;
    }
    try {
      let remote = await getRemote();
      if (absorb(remote)) {
        let res = await putRemote(remote?.sha);
        if (res.status === 409 || res.status === 422) {
          remote = await getRemote();
          if (absorb(remote)) res = await putRemote(remote?.sha);
        }
        // A token that cannot see the repo gets a 404 on write.
        if (res.status === 404) throw Object.assign(new Error('No access'), { status: 401 });
        if (!res.ok) throw new HttpError(res);
      }
      setStatus('ok');
    } catch (err) {
      if (err instanceof TypeError) setStatus('offline');
      else if ((err.status === 401 || err.status === 403) && !err.rateLimited) setStatus('rejected');
      else setStatus('error');
    }
  }

  let running = null;
  let again = false;
  function sync() {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      do {
        again = false;
        await syncOnce();
      } while (again);
    })().finally(() => {
      running = null;
    });
    return running;
  }

  return {
    get save() {
      return save;
    },
    get status() {
      return status;
    },
    get hasToken() {
      return Boolean(token);
    },
    subscribe(fn) {
      listeners.add(fn);
    },
    // Runs a mutation, saves locally, then syncs if anything changed.
    commit(mutate) {
      const before = stable(save);
      mutate(save, now());
      if (stable(save) === before) return;
      persist();
      notify();
      sync();
    },
    sync,
    setToken(value) {
      token = value.trim();
      if (token) storage.setItem(TOKEN_KEY, token);
      else storage.removeItem(TOKEN_KEY);
      status = token ? 'pending' : 'missing';
      notify();
      return sync();
    },
  };
}
