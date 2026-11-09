const $=()=>({});
/* ================= colors ================= */
const C = { K:'#5F5E5A', L:'#85B7EB', l:'#B5D4F4', S:'#085041', E:'#9FE1CB', W:'#E1F5EE', B:'#ED93B1', R:'#D85A30',
  P:'#F5C4B3', Y:'#FAC775', y:'#BA7517', G:'#888780', g:'#444441', r:'#E24B4A', b:'#185FA5', v:'#3B6D11', w:'#FFFFFF' };
const PAL = {
  bare:   { M:'#D3D1C7', N:'#B4B2A9', H:'#F1EFE8' },
  mint:   { M:'#9FE1CB', N:'#5DCAA5', H:'#E1F5EE' },
  cerro:  { M:'#FAC775', N:'#EF9F27', H:'#FAEEDA' },
  coral:  { M:'#F0997B', N:'#D85A30', H:'#FAECE7' },
  harbor: { M:'#85B7EB', N:'#378ADD', H:'#E6F1FB' },
  glow:   { M:'#AFA9EC', N:'#7F77DD', H:'#EEEDFE' },
  valpo:  { M:'#D3D1C7', N:'#B4B2A9', H:'#F1EFE8', patch:['#F0997B','#FAC775','#85B7EB','#9FE1CB','#AFA9EC','#ED93B1'] }
};
let pal = PAL.bare;
const col = c => c[0] === '#' ? c : (pal[c] || C[c] || '#000');
const rects = l => l.map(([x, y, c]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${col(c)}"/>`).join('');
const px = (g, l) => { $(g).innerHTML = rects(l); };
const h = (y, a, b, f, e) => { const o = []; for (let x = a; x <= b; x++) o.push([x, y, (x === a || x === b) ? e : f]); return o; };
function shell(sp) {
  const o = [];
  for (const y in sp) {
    const Y = +y, [a, b] = sp[y], up = sp[Y - 1], dn = sp[Y + 1];
    for (let x = a; x <= b; x++) {
      const edge = x === a || x === b || !up || !dn || x < up[0] || x > up[1] || x < dn[0] || x > dn[1];
      o.push([x, Y, edge ? 'K' : x === a + 1 ? 'H' : x >= b - 2 ? 'N' : 'M']);
    }
  }
  return o;
}
const span = (o, y0, y1, a, b) => { for (let y = y0; y <= y1; y++) o[y] = typeof a === 'function' ? a(y) : [a, b]; return o; };
const mir = l => l.map(([x, y, c]) => [17 - x, y, c]);
const rel = (x0, y0, l) => l.map(([x, y, c]) => [x0 + x, y0 + y, c]);

/* ================= parts ================= */
let tick = 0, moving = false, fast = false, music = false;

const SH = {
  can: { anch:[1,16], px: () => { const s = shell(span(span(span({},4,4,3,14),5,16,2,15),17,17,3,14));
    s.forEach(p => { if (p[2] !== 'K' && p[1] >= 11 && p[1] <= 13) p[2] = (p[1] === 12 && p[0] % 2) ? 'l' : 'L'; });
    return [...s, [13,15,'R'], [5,15,'R']]; } },
  jar: { anch:[1,16], px: () => { const s = shell(span(span(span(span(span({},4,5,3,14),6,6,4,13),7,7,3,14),8,16,2,15),17,17,3,14));
    s.forEach(p => { if (p[2] !== 'K' && p[1] >= 7) p[2] = p[2] === 'H' ? 'W' : 'l'; }); return s; },
    anim: f => { const a = f >> 2 & 1, g = (cx, cy) => a
      ? [[cx,cy-1,'y'],[cx-1,cy,'y'],[cx+1,cy,'y'],[cx,cy+1,'y'],[cx,cy,'Y']]
      : [[cx-1,cy-1,'y'],[cx+1,cy-1,'y'],[cx-1,cy+1,'y'],[cx+1,cy+1,'y'],[cx,cy,'Y']];
      return [...g(6,13), ...g(11,14)]; } },
  bucket: { anch:[1,16], px: () => { const x0 = y => 1 + Math.floor((y - 4) / 5); const s = shell(span({},4,17,y => [x0(y), 17 - x0(y)]));
    return [...s, [1,3,'K'],[2,2,'K'],[3,1,'K'], ...h(0,4,13,'K','K'), [14,1,'K'],[15,2,'K'],[16,3,'K'],
      [3,5,'L'],[3,6,'L'],[3,7,'L'],[3,8,'L'],[7,5,'L'],[10,5,'L'],[14,5,'L'],[14,6,'L'],[14,7,'L']]; } },
  lunch: { anch:[-1,18], px: () => { const s = shell(span(span({},4,5,1,16),6,17,0,17));
    return [...s, [6,3,'K'],[6,2,'K'],[7,1,'K'],[8,1,'K'],[9,1,'K'],[10,1,'K'],[11,2,'K'],[11,3,'K'],
      [8,13,'Y'],[9,13,'Y'],[8,14,'y'],[9,14,'y'],[14,13,'E'],[13,14,'E'],[14,14,'W'],[15,14,'E'],[14,15,'E']]; } }
};

const TOP = {
  prop: f => { const fr = [[...h(1,4,13,'Y','Y'),[8,1,'y'],[9,1,'y']],[...h(1,6,11,'Y','Y'),[8,1,'y'],[9,1,'y']],
      [[7,1,'Y'],[8,1,'y'],[9,1,'y'],[10,1,'Y'],[8,0,'Y'],[9,0,'Y']]][[0,1,2,1][(fast ? f : f >> 1) % 4]];
    return [[8,2,'K'],[9,2,'K'],[7,3,'K'],[8,3,'Y'],[9,3,'Y'],[10,3,'K'], ...fr]; },
  colander: () => [...h(3,1,16,'K','K'),[0,3,'G'],[-1,3,'G'],[17,3,'G'],[18,3,'G'],...h(2,2,15,'G','K'),...h(1,3,14,'G','K'),
    ...h(0,4,13,'G','K'),...h(-1,6,11,'K','K'),[5,0,'W'],[4,1,'W'],[7,0,'g'],[10,0,'g'],[6,1,'g'],[9,1,'g'],[12,1,'g'],
    [5,2,'g'],[8,2,'g'],[11,2,'g'],[14,2,'g']],
  cone: () => [...h(3,4,13,'K','K'),...h(2,5,12,'R','K'),...h(1,6,11,'W','K'),...h(0,6,11,'R','K'),...h(-1,7,10,'R','K'),
    ...h(-2,7,10,'W','K'),...h(-3,8,9,'R','R'),[8,-4,'R'],[9,-4,'R']],
  lamp: () => [...[2,4,6,8,10,12,14].map(x => [x,3,'y']),...h(2,2,15,'P','K'),...h(1,3,14,'P','K'),...h(0,4,13,'P','K'),
    ...h(-1,5,12,'P','K'),...h(-2,5,12,'K','K'),[6,1,'R'],[9,0,'R'],[12,1,'R'],[7,-1,'R'],[10,-1,'R']],
  dish: f => [[8,2,'K'],[8,3,'K'],[9,3,'K'],...h(1,6,10,'G','K'),...h(0,4,12,'W','K'),...h(-1,3,13,'K','K'),
    [8,-2,'K'],[8,-3,'K'],[8,-4,(f >> 2) % 2 ? 'Y' : 'R']],
  crown: f => [...h(3,4,13,'y','y'),...h(2,4,13,'Y','y'),[4,1,'Y'],[6,1,'Y'],[8,1,'Y'],[9,1,'Y'],[11,1,'Y'],[13,1,'Y'],
    [4,0,'Y'],[8,0,'Y'],[9,0,'Y'],[13,0,'Y'],[6,2,'E'],[9,2,(f >> 2) % 2 ? 'W' : 'B'],[11,2,'E']],
  headphones: f => { const o = [[1,4,'K'],[16,4,'K'],[2,3,'K'],[15,3,'K'],[3,2,'K'],[14,2,'K'],...h(1,4,13,'g','K')];
    for (let y = 5; y <= 8; y++) { const inner = (y === 5 || y === 8) ? 'K' : (music && (f >> 1) % 2 ? 'Y' : 'r');
      o.push([0,y,'K'],[1,y,inner],[17,y,'K'],[16,y,inner]); } return o; },
  disco: f => { const o = [[8,2,'K'],[9,2,'K'],[8,3,'K'],[9,3,'K']];
    const rowsp = {'-4':[7,10],'-3':[6,11],'-2':[6,11],'-1':[6,11],'0':[6,11],'1':[7,10]};
    for (const yy in rowsp) { const y = +yy, [a, b] = rowsp[yy]; for (let x = a; x <= b; x++)
      o.push([x, y, ((x + y + (f >> 1)) % 4 === 0) ? 'w' : ((x + y) % 2 ? 'G' : 'l')]); }
    return o; },
  chupalla: () => [...h(3,-1,18,'Y','y'),...[0,2,4,6,8,10,12,14,16].map(x => [x,3,'y']),...h(2,5,12,'g','g'),
    ...h(1,5,12,'Y','y'),...h(0,6,11,'Y','y'),[7,1,'y'],[10,1,'y'],[8,0,'y']]
};

const ARM = {
  spring: { d:[[0,0,'K'],[1,1,'N'],[0,2,'K'],[1,3,'N'],[1,4,'h']], u:[[0,0,'K'],[1,-1,'N'],[0,-2,'K'],[1,-3,'N'],[1,-4,'h']] },
  pipe:   { d:[[0,0,'g'],[1,0,'G'],[2,1,'G'],[2,2,'G'],[2,3,'G'],[2,4,'G'],[2,5,'G'],[2,6,'G'],[1,7,'K'],[3,7,'K'],[1,8,'K'],[3,8,'K']],
            u:[[0,0,'g'],[1,-1,'G'],[2,-2,'G'],[2,-3,'G'],[2,-4,'G'],[2,-5,'G'],[1,-6,'K'],[3,-6,'K'],[1,-7,'K'],[3,-7,'K']] },
  gloves: { d:[[0,0,'K'],[1,1,'K'],[1,2,'Y'],[2,2,'Y'],[3,2,'Y'],[4,2,'Y'],[1,3,'Y'],[2,3,'Y'],[3,3,'Y'],[1,4,'y'],[2,4,'y'],[3,4,'y']],
            u:[[0,0,'K'],[1,-1,'K'],[1,-2,'y'],[2,-2,'y'],[3,-2,'y'],[1,-3,'Y'],[2,-3,'Y'],[3,-3,'Y'],[4,-3,'Y'],[1,-4,'Y'],[2,-4,'Y'],[3,-4,'Y']] },
  straws: { d:[[0,0,'B'],[1,0,'W'],[2,1,'B'],[2,2,'W'],[2,3,'B'],[2,4,'W'],[2,5,'B'],[2,6,'W']],
            u:[[0,0,'B'],[1,-1,'W'],[2,-2,'B'],[2,-3,'W'],[2,-4,'B'],[2,-5,'W'],[2,-6,'B']] }
};

const ring = (cx, f, rc, fc, hc) => [[cx-1,19],[cx,19],[cx+1,19],[cx+2,19],[cx-2,20],[cx+3,20],[cx-2,21],[cx+3,21],[cx-1,22],[cx,22],[cx+1,22],[cx+2,22]]
  .map(([x, y]) => [x, y, rc]).concat([[cx-1,20],[cx,20],[cx+1,20],[cx+2,20],[cx-1,21],[cx,21],[cx+1,21],[cx+2,21]].map(([x, y]) => [x, y, fc]))
  .concat(f % 2 ? [[cx,20,hc],[cx+1,21,hc]] : [[cx+1,20,hc],[cx,21,hc]]);
const BASE = {
  wheel: f => [[8,18,'K'],[9,18,'K'], ...ring(8, moving ? f : 0, 'K', 'G', 'g')],
  treads: f => { const m = moving ? f : 0, o = [[8,18,'K'],[9,18,'K']];
    for (let x = 2; x <= 15; x++) { o.push([x,19,(x + m) % 2 ? 'K' : 'G']); o.push([x,23,(x + m) % 2 ? 'G' : 'K']); }
    for (let y = 20; y <= 22; y++) { o.push([1,y,'K'],[16,y,'K']); for (let x = 2; x <= 15; x++) o.push([x,y,'g']); }
    [4,7,10,13].forEach(x => o.push([x,21,'G'],[x+1,21,'G'],[x,20,'G'],[x+1,20,'G'])); return o; },
  legs: f => { const s = moving ? (f >> 1) % 2 : 0, o = [...h(18,4,13,'K','K')];
    const leg = (x, lift) => { const d = lift ? -1 : 0; o.push([x,19+d,'G'],[x,20+d,'G'],[x,21+d,'G'],[x-1,22+d,'y'],[x,22+d,'y'],[x+1,22+d,'y'],
      [x-1,23+d,'y'],[x,23+d,'y'],[x+1,23+d,'y'],[x+2,23+d,'y']); };
    leg(5, s); leg(12, !s && moving); return o; },
  pogo: () => [[8,18,'K'],[9,18,'K'],...h(19,7,10,'G','G'),...h(20,7,10,'K','K'),...h(21,7,10,'G','G'),...h(22,7,10,'K','K'),...h(23,5,12,'K','K')],
  skate: f => { const m = moving ? f % 2 : 0; return [[8,18,'K'],[9,18,'K'],[8,19,'K'],[9,19,'K'],[0,19,'K'],[17,19,'K'],...h(20,0,17,'y','K'),
    [3,21,'K'],[4,21,m ? 'G' : 'K'],[13,21,'K'],[14,21,m ? 'K' : 'G']]; }
};

const wingL = s => shell(s ? {7:[-1,1],8:[-3,1],9:[-3,1],10:[-2,1],11:[-1,1]} : {6:[-1,1],7:[-3,1],8:[-5,1],9:[-5,1],10:[-4,1],11:[-2,1]});
const BACK = {
  wings: f => { const l = wingL((f >> 2) % 2); return [...l, ...mir(l)]; },
  pack: () => { const o = []; for (let y = 7; y <= 14; y++) for (let x = -3; x <= 1; x++) o.push([x,y,(y === 7 || y === 14 || x === -3) ? 'K' : 'L']);
    o.push([-2,10,'g'],[-1,10,'g'],[0,10,'g'],[-1,11,'Y'],[-2,8,'l']); return o; },
  volantin: f => { const d = (f >> 3) % 2 ? -1 : 0;
    const k = [[-3,-4,'r'],[-4,-3,'r'],[-3,-3,'r'],[-2,-3,'Y'],[-5,-2,'r'],[-4,-2,'r'],[-3,-2,'K'],[-2,-2,'Y'],[-1,-2,'Y'],[-4,-1,'b'],[-3,-1,'b'],[-2,-1,'Y'],[-3,0,'b']]
      .map(([x, y, c]) => [x, y + d, c]);
    return [...k, [-3,1+d,'K'],[-3,3,'K'],[-2,5,'K'],[-2,7,'K'],[-1,9,'K'],[0,11,'K']]; },
  bocina: f => { const o = []; for (let y = 9; y <= 16; y++) for (let x = -4; x <= 0; x++) o.push([x,y,(x === -4 || x === 0 || y === 9 || y === 16) ? 'K' : 'g']);
    const beat = music && (f >> 1) % 2;
    [11,14].forEach(cy => o.push([-3,cy,'G'],[-1,cy,'G'],[-2,cy-1,'G'],[-2,cy+1,'G'],[-2,cy,beat ? 'W' : 'K']));
    return o; },
  guiro: () => { const sp = {7:[-3,-2],16:[-3,-2]}; for (let y = 8; y <= 15; y++) sp[y] = [-4,-1];
    const o = shell(sp).map(([x, y, c]) => [x, y, c === 'K' ? 'K' : (y % 2 ? 'g' : 'y')]); o.push([-5,9,'G'],[-6,8,'G']); return o; }
};

const PATCH = {
  copihue: () => [[12,11,'v'],[13,11,'v'],[11,12,'r'],[12,12,'r'],[13,12,'r'],[11,13,'r'],[12,13,'r'],[13,13,'r'],[10,14,'r'],[11,14,'r'],[12,14,'w'],[13,14,'r'],[14,14,'r']],
  chain: () => { const o = []; for (let x = 4; x <= 13; x++) o.push([x,11,x % 2 ? 'y' : 'Y']); o.push([8,12,'Y'],[9,12,'Y'],[8,13,'y'],[9,13,'y'],[8,12,'W']); return o; },
  gbolt: () => [[8,12,'Y'],[9,12,'Y'],[7,13,'y'],[8,13,'Y'],[9,13,'Y'],[10,13,'y'],[8,14,'y'],[9,14,'y'],[8,13,'W']],
  flagcl: () => { const o = []; for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 6; dx++) o.push([9+dx,12+dy, dy < 2 ? (dx < 2 ? 'b' : 'w') : 'r']); o.push([9,12,'w']); return o; },
  flagpr: () => { const o = []; for (let dy = 0; dy < 5; dy++) for (let dx = 0; dx < 6; dx++) o.push([9+dx,12+dy, dx <= Math.min(dy, 4 - dy) ? 'b' : (dy % 2 ? 'w' : 'r')]); o.push([9,14,'w']); return o; }
};

const HELD = {
  empanada: (lx) => rel(lx - 4, 15, [[1,0,'y'],[2,0,'y'],[0,1,'Y'],[1,1,'Y'],[2,1,'Y'],[3,1,'Y'],[0,2,'y'],[1,2,'Y'],[2,2,'y'],[3,2,'Y']]),
  completo: (lx) => rel(lx - 5, 15, [[0,0,'w'],[1,0,'v'],[2,0,'r'],[3,0,'v'],[4,0,'w'],[0,1,'R'],[1,1,'R'],[2,1,'R'],[3,1,'R'],[4,1,'R'],[0,2,'Y'],[1,2,'Y'],[2,2,'Y'],[3,2,'Y'],[4,2,'Y']])
};

/* item catalog: slot, display name, rarity and seasonal rules */
const ITEMS = [
  {id:'can',slot:'shell',name:'tin can'},{id:'jar',slot:'shell',name:'glass jar'},{id:'bucket',slot:'shell',name:'paint bucket'},{id:'lunch',slot:'shell',name:'old lunchbox'},
  {id:'bare',slot:'paint',name:'bare metal'},{id:'mint',slot:'paint',name:'mint paint'},{id:'cerro',slot:'paint',name:'cerro yellow paint'},
  {id:'coral',slot:'paint',name:'coral paint'},{id:'harbor',slot:'paint',name:'harbor blue paint'},
  {id:'glow',slot:'paint',name:'glow-in-the-dark paint',rare:1},{id:'valpo',slot:'paint',name:'Valparaíso patchwork paint',rare:1},
  {id:'prop',slot:'top',name:'bottlecap propeller'},{id:'colander',slot:'top',name:'colander'},{id:'cone',slot:'top',name:'traffic cone'},
  {id:'lamp',slot:'top',name:'lampshade'},{id:'dish',slot:'top',name:'satellite dish'},{id:'headphones',slot:'top',name:'old headphones',plural:1},
  {id:'disco',slot:'top',name:'tiny disco ball'},{id:'crown',slot:'top',name:'bottlecap crown',rare:1},
  {id:'chupalla',slot:'top',name:'chupalla',season:'sept'},
  {id:'spring',slot:'arms',name:'spring arms',plural:1},{id:'pipe',slot:'arms',name:'pipe arms',plural:1},{id:'gloves',slot:'arms',name:'rubber gloves',plural:1},{id:'straws',slot:'arms',name:'bendy straws',plural:1},
  {id:'wheel',slot:'base',name:'old wheel'},{id:'treads',slot:'base',name:'tank treads',plural:1},{id:'legs',slot:'base',name:'boots',plural:1},
  {id:'pogo',slot:'base',name:'pogo spring'},{id:'skate',slot:'base',name:'skateboard'},
  {id:'wings',slot:'back',name:'tin wings',plural:1},{id:'pack',slot:'back',name:'backpack'},{id:'volantin',slot:'back',name:'volantín'},
  {id:'bocina',slot:'back',name:'little bocina'},{id:'guiro',slot:'back',name:'güiro',season:'navidad'},
  {id:'copihue',slot:'patch',name:'copihue sticker'},{id:'chain',slot:'patch',name:'bottlecap chain'},{id:'gbolt',slot:'patch',name:'golden bolt',rare:1},
  {id:'flagcl',slot:'patch',name:'Chile flag patch',flag:1},{id:'flagpr',slot:'patch',name:'Puerto Rico flag patch',flag:1},
  {id:'empanada',slot:'held',name:'empanada',found:'encontré una empanada. me la guardo pa\' la once.',eaten:'me comí la empanada en la once. brutal.'},
  {id:'completo',slot:'held',name:'completo',found:'encontré un completo. lo guardo pa\' la once.',eaten:'me comí el completo. con harta palta, obvio.'}
];
const ITEM = Object.assign(Object.create(null), Object.fromEntries(ITEMS.map(i => [i.id, i])));
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
const SLOT_NAME = {shell:'body',paint:'paint',top:'hat',arms:'arms',base:'base',back:'back',patch:'patch',held:'holding'};
let rU = 0, lU = 0, eyeK = 'open', eyeDx = 0, cueca = false, dancing = false, topDx = 0, topDy = 0;
function armPx() {
  const a = ARM[S.eq.arms], [lx, rx] = SH[S.eq.shell].anch;
  const side = (list, isR) => list.map(([dx, dy, c]) => [isR ? rx + dx : lx - dx, 11 + dy, c === 'h' ? (isR ? 'P' : 'K') : c]);
  const o = [...side(lU ? a.u : a.d, false), ...side(rU ? a.u : a.d, true)];
  if (cueca && rU) { const f = (tick >> 1) % 2; o.push(...(f ? [[rx+2,6,'w'],[rx+3,5,'w'],[rx+3,6,'w'],[rx+4,5,'w']] : [[rx+2,6,'w'],[rx+2,5,'w'],[rx+3,4,'w'],[rx+3,5,'w']])); }
  return o;
}
function eyesPx() {
  const k = eyeK, dx = eyeDx; let e;
  if (k === 'happy') e = [[5,8,'E'],[6,7,'E'],[7,8,'E'],[9,8,'E'],[10,7,'E'],[11,8,'E'],[8,9,'E']];
  else if (k === 'blink') e = [[6,8,'E'],[7,8,'E'],[9,8,'E'],[10,8,'E'],[8,9,'E']];
  else if (k === 'o') e = [[6,7,'W'],[7,7,'E'],[6,8,'E'],[7,8,'E'],[9,7,'W'],[10,7,'E'],[9,8,'E'],[10,8,'E'],[8,9,'W']];
  else if (k === 'wink') e = [[6,7,'W'],[7,7,'E'],[6,8,'E'],[7,8,'E'],[9,8,'E'],[10,8,'E'],[8,9,'E']];
  else if (k === 'yawn') e = [[6,7,'E'],[7,7,'E'],[9,7,'E'],[10,7,'E'],[7,8,'E'],[8,8,'E'],[9,8,'E'],[7,9,'E'],[9,9,'E']];
  else if (k === 'grr') e = [[6,7,'E'],[7,8,'E'],[10,7,'E'],[9,8,'E'],[7,9,'E'],[8,9,'E'],[9,9,'E']];
  else if (k === 'sleep') e = [[5,8,'E'],[6,8,'E'],[7,8,'E'],[9,8,'E'],[10,8,'E'],[11,8,'E']];
  else e = [[6+dx,7,'W'],[7+dx,7,'E'],[6+dx,8,'E'],[7+dx,8,'E'],[9+dx,7,'W'],[10+dx,7,'E'],[9+dx,8,'E'],[10+dx,8,'E'],[8,9,'E']];
  const lens = [...h(6,5,11,'K','K'),...h(10,5,11,'K','K'),[4,7,'K'],[4,8,'K'],[4,9,'K'],[12,7,'K'],[12,8,'K'],[12,9,'K']];
  for (let y = 7; y <= 9; y++) for (let x = 5; x <= 11; x++) lens.push([x, y, 'S']);
  return [...lens, ...e, [4,10,'B'], [12,10,'B']];
}
let S={eq:{},held:null};
function sprite(eq,face,ru){ rU=ru?1:0; S.eq=Object.assign({shell:'can',paint:'bare',top:'prop',arms:'spring',base:'wheel',back:null,patch:null},eq); pal=PAL[S.eq.paint]; eyeK=face||'open';
 let body=SH[S.eq.shell].px(); const out=[];
 const add=l=>l.forEach(([x,y,c])=>out.push([x,y,col(c)]));
 if(S.eq.back) add(BACK[S.eq.back](0)); add(body); if(SH[S.eq.shell].anim) add(SH[S.eq.shell].anim(0)); if(S.eq.patch) add(PATCH[S.eq.patch]());
 add(TOP[S.eq.top](0)); add(eyesPx()); add(armPx()); add(BASE[S.eq.base](0));
 // dedupe last wins
 const m=new Map(); out.forEach(p=>m.set(p[0]+','+p[1],p)); return [...m.values()];
}
const res={
 a: sprite({paint:'bare',top:'prop',back:'pack'},'happy'),
 b: sprite({paint:'cerro',top:'colander',patch:'copihue',back:'volantin'},'open'),
 c: sprite({shell:'jar',paint:'mint',top:'headphones',base:'treads',back:'bocina'},'wink'),
 d: sprite({paint:'mint',top:'prop',back:'pack',patch:'copihue'},'happy'),
 n: sprite({paint:'mint',top:'prop',back:'pack',patch:'copihue'},'sleep'),
 fb: sprite({paint:'bare',top:'prop'},'happy'),
 fbo: sprite({paint:'bare',top:'prop'},'open'),
 fbn: sprite({paint:'bare',top:'prop'},'sleep'),
 fbb: sprite({paint:'bare',top:'prop'},'blink'),
 fbw: sprite({paint:'bare',top:'prop'},'happy',1),
 fbl: sprite({paint:'bare',top:'prop'},'open'),
 pig: (function(){const PIG = { a: ["....GG......", ".........rr.", "...GLG...DD.", ".GLLGGGGTDWk", "GLLLLLLLTDDO", ".GGLLLLLLG..", "...GGGGGG...", "....O..O...."],
  b: ["............", ".........rr.", ".........DD.", ".GGGGGGGTDWk", "GLLLLLLLTDDO", ".GLLGLLLLG..", "..GLLGGGG...", "...O..O....."] };
const PIGC = { G: '#888780', L: '#B4B2A9', D: '#5F5E5A', T: '#5DCAA5', W: '#FFFFFF', k: '#2C2C2A', O: '#F0997B', r: '#E24B4A' };
const strPx = (rows, pal) => { const o = []; rows.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '.') o.push([x, y, pal[c]]); })); return o; }; return strPx(PIG.a,PIGC);})()
};
require('fs').writeFileSync('sprites.json',JSON.stringify(res));
console.log(Object.entries(res).map(([k,v])=>k+':'+v.length).join(' '));
