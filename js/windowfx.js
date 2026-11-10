// The view outside moves on its own small canvas, in the same stepped pixels as the art.
const W = 97;
const H = 140;
const TICK_MS = 400;

const inBayGlass = (x, y) => {
  const [L, T, R, B, c] = [26, 27, 70, 79, 10];
  if (x < L || x > R || y < T || y > B || x === 48) return false;
  if (x - L + (y - T) < c || R - x + (y - T) < c || x - L + (B - y) < c || R - x + (B - y) < c) return false;
  if (x <= 36 && y >= 37 && y <= 53) return false; // the sign hangs in front
  return !(x >= 65 && y >= 64); // and so does the rack
};
const onPlanet = (x, y, margin = 2) => Math.hypot(x - 62, y - 104) < 50 - margin;
const inArchiveGlass = (x, y) => Math.hypot(x - 48, y - 23) <= 10;

const BAY_STARS = [[30, 44], [36, 32], [41, 36], [44, 30], [52, 33], [58, 41], [63, 31], [67, 37], [39, 48], [55, 47]];
const ARCHIVE_STARS = [[43, 17], [53, 15], [47, 13], [55, 22], [41, 25]];
const CITY = [[40, 72], [46, 66], [52, 62], [58, 70], [63, 58], [67, 62], [44, 76], [55, 76], [61, 66], [50, 70]];
const CLOUDS = { morning: '#E6F2F8', day: '#E6F2F8', golden: '#F0C080' };

export function startWindow(scene, roomId, band) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.className = 'window-fx';
  scene.append(canvas);
  const g = canvas.getContext('2d');
  const glass = roomId === 'archive' ? inArchiveGlass : inBayGlass;
  const dot = (x, y, color) => {
    if (!glass(x, y)) return;
    g.fillStyle = color;
    g.fillRect(x, y, 1, 1);
  };

  const twinkle = (stars, t) => stars.forEach(([x, y], i) => {
    const phase = (t + i * 3) % 9;
    if (phase < 2 || onPlanet(x, y, -1)) return;
    dot(x, y, phase < 5 ? '#FFFFFF' : '#9FB4D8');
  });

  function drawBay(t) {
    twinkle(BAY_STARS, t);
    const clouds = CLOUDS[band];
    if (clouds) {
      [[62, 3, 20, 5, 0], [68, 2, 16, 8, 19], [74, 3, 24, 6, 37]].forEach(([y, h, width, speed, start]) => {
        const x0 = 18 + ((start + Math.floor(t / speed)) % 64);
        for (let yy = y; yy < y + h; yy += 1) {
          for (let x = x0; x < x0 + width; x += 1) if (onPlanet(x, yy)) dot(x, yy, clouds);
        }
      });
    } else {
      CITY.forEach(([x, y], i) => { if ((t + i * 2) % 6 > 1 && onPlanet(x, y)) dot(x, y, '#E0A92E'); });
    }
    // a distant ship crossing, with one blinking light
    const sx = 26 + (Math.floor(t / 7) % 46);
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [2, -1], [2, 1]].forEach(([dx, dy]) => dot(sx + dx, 38 + dy, '#3A4A78'));
    if (t % 4 < 2) dot(sx + 5, 38, '#E0604A');
    // now and then a shooting star
    const streak = t % 71;
    if (streak < 5) for (let k = 0; k < 4; k += 1) dot(34 + streak * 5 - k * 2, 29 + streak * 2 - k, k ? '#9FB4D8' : '#FFFFFF');
  }

  const drawArchive = (t) => twinkle(ARCHIVE_STARS, t);
  const draw = roomId === 'archive' ? drawArchive : drawBay;
  let t = 0;
  const frame = () => {
    g.clearRect(0, 0, W, H);
    draw(t);
    t += 1;
  };
  frame();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const timer = setInterval(() => {
    if (!canvas.isConnected) clearInterval(timer);
    else if (document.visibilityState === 'visible') frame();
  }, TICK_MS);
}
