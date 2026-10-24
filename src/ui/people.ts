// People drawn in code as SVG: one body, a head drawn in its own space, and clothes layered on top.
import { ITEM, Item } from '../game/catalog';
import { Look, showsDummy } from '../game/world';

const RAINBOW = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#b197fc'];

export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
}

const star = (cx: number, cy: number, r: number, fill: string) => {
  const p = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  });
  return `<polygon points="${p.join(' ')}" fill="${fill}"/>`;
};
const heart = (cx: number, cy: number, s: number, fill: string) =>
  `<path transform="translate(${cx} ${cy}) scale(${s})" d="M0 6 C-8 0 -7 -8 0 -5 C7 -8 8 0 0 6Z" fill="${fill}"/>`;

/** Fill for an item: plain colour, or a pattern defined once per item id. */
function paint(it: Item, defs: string[]): string {
  if (!it.pat || it.pat === 'sparkle' || it.pat === 'lights') return it.c;
  const id = `p-${it.id}`;
  if (it.pat === 'stripes') defs.push(`<pattern id="${id}" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="${it.c}"/><rect width="8" height="4" fill="${it.c2}"/></pattern>`);
  if (it.pat === 'dots') defs.push(`<pattern id="${id}" patternUnits="userSpaceOnUse" width="9" height="9"><rect width="9" height="9" fill="${it.c}"/><circle cx="4.5" cy="4.5" r="1.8" fill="${it.c2}"/></pattern>`);
  if (it.pat === 'stars') defs.push(`<pattern id="${id}" patternUnits="userSpaceOnUse" width="10" height="10"><rect width="10" height="10" fill="${it.c}"/>${star(5, 5, 3, it.c2!)}</pattern>`);
  if (it.pat === 'rainbow') defs.push(`<pattern id="${id}" patternUnits="userSpaceOnUse" width="18" height="18">${RAINBOW.map((c, i) => `<rect y="${i * 3}" width="18" height="3" fill="${c}"/>`).join('')}</pattern>`);
  return `url(#${id})`;
}

// --- head space: a 22-radius head centred at (50, 36) ---

/** Soft shading made once per colour: skin lit from the top left, cloth lighter at the top, hair with a sheen. */
function skinFill(c: string, defs: string[]) {
  const id = `sk-${c.slice(1)}`;
  defs.push(`<radialGradient id="${id}" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="${shade(c, 1.07)}"/><stop offset=".7" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, 0.88)}"/></radialGradient>`);
  return `url(#${id})`;
}
function clothFill(c: string, defs: string[]) {
  const id = `cl-${c.slice(1)}`;
  defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${shade(c, 1.06)}"/><stop offset="1" stop-color="${shade(c, 0.84)}"/></linearGradient>`);
  return `url(#${id})`;
}
function hairFill(c: string, defs: string[]) {
  const id = `hr-${c.slice(1)}`;
  defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c, 1.3)}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, 0.78)}"/></linearGradient>`);
  return `url(#${id})`;
}

function hairBack(style: string, c: string, f: string): string {
  if (style === 'long') return `<path d="M25 32 Q20 68 31 72 Q50 76 69 72 Q80 68 75 32 Z" fill="${f}"/><path d="M30 50 Q31 62 34 70 M70 50 Q69 62 66 70" stroke="${shade(c, 0.7)}" stroke-width="1" fill="none" opacity=".6"/>`;
  if (style === 'pigtails') return `<ellipse cx="22" cy="38" rx="8" ry="11" fill="${f}"/><ellipse cx="78" cy="38" rx="8" ry="11" fill="${f}"/><circle cx="27" cy="29" r="3" fill="#ff8fb8"/><circle cx="73" cy="29" r="3" fill="#ff8fb8"/>`;
  if (style === 'bun') return `<circle cx="50" cy="10" r="10" fill="${f}"/><path d="M43 8 Q50 3 57 8" stroke="${shade(c, 0.7)}" fill="none" stroke-width="1"/>`;
  if (style === 'ponytail') return `<path d="M70 30 Q86 40 80 64 Q74 54 70 44 Z" fill="${f}"/><circle cx="72" cy="29" r="4" fill="#4cc38a"/>`;
  return '';
}

function hairFront(style: string, c: string, f: string): string {
  const strand = shade(c, 0.68);
  const sheen = `<path d="M34 21 Q42 14 54 14" stroke="#fff" stroke-opacity=".28" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  if (style === 'tuft') return `<path d="M47 15 Q48 4 57 8 Q52 9 52 15" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
  if (style === 'curly') return [[29, 31], [32, 21], [40, 15], [50, 12], [60, 15], [68, 21], [71, 31]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8.5" fill="${f}"/><path d="M${x - 4} ${y} Q${x} ${y - 4} ${x + 4} ${y}" stroke="${strand}" stroke-width="1" fill="none"/>`).join('');
  if (style === 'dad') return `<path d="M28 33 Q26 12 50 12 Q74 12 72 33 Q68 21 56 20 Q50 23 44 20 Q32 21 28 33Z" fill="${f}"/><path d="M40 20 Q44 15 50 14 M60 20 Q57 15 53 14" stroke="${strand}" stroke-width="1" fill="none"/>${sheen}`;
  return `<path d="M27 37 Q24 11 50 11 Q76 11 73 37 Q71 24 61 21 Q52 28 41 21 Q30 24 27 37 Z" fill="${f}"/><path d="M41 21 Q45 16 52 14 M61 21 Q58 16 54 13 M33 28 Q34 20 40 16" stroke="${strand}" stroke-width="1" fill="none" opacity=".8"/>${sheen}`;
}

export type FaceMood = 'happy' | 'laugh' | 'want' | 'cry' | 'asleep';

const eyeColour = (hair: string) => (['#e8c170', '#f2dc9b'].includes(hair) ? '#4a86c8' : ['#c96a3b', '#a0522d'].includes(hair) ? '#5f8f4e' : '#5a3a22');

function face(skin: string, sf: string, hairColor: string, mood: FaceMood, dummy: boolean): string {
  const ink = '#3a2a2a';
  const brow = shade(hairColor === '#f2dc9b' ? '#c9a66b' : hairColor, 0.85);
  const sad = mood === 'cry' || mood === 'want';
  const brows = sad
    ? `<path d="M37 29.5 Q42 30 46.5 27 M53.5 27 Q58 30 63 29.5" stroke="${brow}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`
    : `<path d="M37 30 Q42 27 46.5 29.3 M53.5 29.3 Q58 27 63 30" stroke="${brow}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`;
  const eye = (x: number) => {
    if (mood === 'asleep') return `<path d="M${x - 4} 38 Q${x} 41.5 ${x + 4} 38" stroke="${ink}" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M${x - 3} 40 l-1 1.6 M${x} 41 l0 1.8 M${x + 3} 40 l1 1.6" stroke="${ink}" stroke-width=".8"/>`;
    if (mood === 'laugh') return `<path d="M${x - 4} 39 Q${x} 34 ${x + 4} 39" stroke="${ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    if (mood === 'cry') return `<path d="M${x - 4} 37 Q${x} 40 ${x + 4} 37" stroke="${ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/><path class="tear" d="M${x - 1} 41 Q${x - 3} 46 ${x - 1} 49 Q${x + 1} 46 ${x - 1} 41Z" fill="#8fd3ff"/>`;
    return `<ellipse cx="${x}" cy="37.6" rx="3.9" ry="4.5" fill="#fff"/><circle cx="${x + 0.3}" cy="38.2" r="3" fill="${eyeColour(hairColor)}"/><circle cx="${x + 0.3}" cy="38.2" r="1.5" fill="#1b1b1b"/><circle cx="${x + 1.4}" cy="36.8" r="1.05" fill="#fff"/><path d="M${x - 4.2} 35.6 Q${x} 32.4 ${x + 4.2} 35.6" stroke="${ink}" stroke-width="1.1" fill="none"/>`;
  };
  const mouth = dummy ? '' : {
    happy: `<path d="M44.5 46 Q50 50.8 55.5 46" stroke="#b8475f" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    laugh: `<path d="M44 45.4 Q50 54 56 45.4 Z" fill="#9b3049"/><ellipse cx="50" cy="50" rx="3.2" ry="1.7" fill="#ff8fa3"/>`,
    want: `<path d="M46 48.2 Q50 46.6 54 48.2" stroke="#b8475f" stroke-width="1.7" fill="none" stroke-linecap="round"/>`,
    cry: `<path d="M44.5 50 Q50 43.5 55.5 50 Q50 52.2 44.5 50Z" fill="#9b3049"/>`,
    asleep: `<ellipse cx="50" cy="47.5" rx="1.6" ry="1.3" fill="#b8475f"/>`,
  }[mood];
  return `<circle cx="28" cy="39" r="5.2" fill="${sf}"/><circle cx="72" cy="39" r="5.2" fill="${sf}"/>
    <path d="M27 37 Q29 39 27.5 41.5 M73 37 Q71 39 72.5 41.5" stroke="${shade(skin, 0.8)}" stroke-width="1" fill="none"/>
    <circle cx="50" cy="36" r="22" fill="${sf}"/>${brows}${eye(42)}${eye(58)}
    <path d="M48.6 41.6 Q50 43.3 51.4 41.6" stroke="${shade(skin, 0.75)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <ellipse cx="35.5" cy="45" rx="4.2" ry="2.7" fill="#ff8fa3" opacity="${mood === 'laugh' ? 0.7 : 0.42}"/><ellipse cx="64.5" cy="45" rx="4.2" ry="2.7" fill="#ff8fa3" opacity="${mood === 'laugh' ? 0.7 : 0.42}"/>${mouth}`;
}

function headband(it: Item): string {
  const band = (c: string) => `<path d="M28 28 Q50 7 72 28" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
  switch (it.kind) {
    case 'bow': return band(it.c) + `<path d="M64 17 L55 10 L55 24 Z M64 17 L73 10 L73 24 Z" fill="${it.c}"/><circle cx="64" cy="17" r="3" fill="${shade(it.c, 0.85)}"/>`;
    case 'flower': return band('#6fbf73') + [0, 72, 144, 216, 288].map((a) => `<circle cx="${(64 + 5 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(15 + 5 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="4" fill="${it.c2}"/>`).join('') + `<circle cx="64" cy="15" r="3.2" fill="${it.c}"/>`;
    case 'star': return band(it.c2!) + star(64, 14, 8, it.c);
    case 'unicorn': return band(it.c2!) + `<path d="M44 15 L50 -9 L56 15 Z" fill="${it.c}"/><path d="M46 8 L54 5 M47 1 L53 -1" stroke="${it.c2}" stroke-width="1.6"/>`;
    case 'cat': return band(it.c) + `<path d="M30 23 L31 4 L45 14 Z M70 23 L69 4 L55 14 Z" fill="${it.c}"/><path d="M33 18 L34 9 L41 14 Z M67 18 L66 9 L59 14 Z" fill="${it.c2}"/>`;
    case 'bunnyears': return band(it.c) + `<ellipse cx="40" cy="0" rx="6" ry="16" fill="${it.c}"/><ellipse cx="60" cy="0" rx="6" ry="16" fill="${it.c}"/><ellipse cx="40" cy="1" rx="3" ry="11" fill="${it.c2}"/><ellipse cx="60" cy="1" rx="3" ry="11" fill="${it.c2}"/>`;
    case 'rainbow': return RAINBOW.slice(0, 4).map((c, i) => `<path d="M${28 + i * 1.5} ${28 - i * 0.5} Q50 ${7 - i * 3} ${72 - i * 1.5} ${28 - i * 0.5}" fill="none" stroke="${c}" stroke-width="2.6"/>`).join('');
    case 'heart': return band(it.c2!) + heart(64, 14, 1.2, it.c);
    case 'sparkle': return band(it.c) + star(36, 18, 5, it.c2!) + star(50, 11, 6, it.c2!) + star(64, 18, 5, it.c2!);
    case 'butterfly': return band('#6fbf73') + `<ellipse cx="59" cy="12" rx="6" ry="5" fill="${it.c}"/><ellipse cx="69" cy="12" rx="6" ry="5" fill="${it.c}"/><ellipse cx="60" cy="19" rx="4" ry="3.5" fill="${it.c2}"/><ellipse cx="68" cy="19" rx="4" ry="3.5" fill="${it.c2}"/><rect x="63" y="9" width="2" height="13" rx="1" fill="#555"/>`;
    case 'plain': return band(it.c);
    default: return '';
  }
}

function hat(it: Item): string {
  const c = it.c;
  const dark = shade(c, 0.82);
  switch (it.kind) {
    case 'beanie': return `<path d="M26 31 Q26 5 50 5 Q74 5 74 31 Z" fill="${c}"/><rect x="24" y="26" width="52" height="9" rx="4.5" fill="${dark}"/><circle cx="50" cy="5" r="5.5" fill="#fff"/>`;
    case 'sunhat': return `<ellipse cx="50" cy="24" rx="37" ry="8" fill="${c}"/><path d="M32 24 Q32 3 50 3 Q68 3 68 24 Z" fill="${c}"/><rect x="32" y="18" width="36" height="5" fill="#ff8fb8"/>`;
    case 'cap': return `<path d="M28 27 Q28 6 50 6 Q72 6 72 27 Z" fill="${c}"/><path d="M60 24 Q85 21 88 28 Q74 31 60 29Z" fill="${dark}"/><circle cx="50" cy="7" r="2.5" fill="${dark}"/>`;
    case 'bonnet': return `<path d="M23 44 Q19 6 50 6 Q81 6 77 44 Q72 21 50 19 Q28 21 23 44Z" fill="${c}" stroke="${it.c2}" stroke-width="2"/><path d="M26 44 L36 56 M74 44 L64 56" stroke="${it.c2}" stroke-width="2.5"/>`;
    case 'party': return `<path d="M37 19 L50 -15 L63 19 Z" fill="${c}"/><path d="M41 9 L59 9 M45 -1 L55 -1" stroke="${it.c2}" stroke-width="3"/><circle cx="50" cy="-15" r="4.5" fill="${it.c2}"/>`;
    case 'crown': return `<path d="M31 20 L31 1 L40 10 L50 -4 L60 10 L69 1 L69 20 Z" fill="${c}" stroke="${dark}" stroke-width="1.2"/><circle cx="40" cy="15" r="2.5" fill="#e94f4f"/><circle cx="50" cy="13" r="2.8" fill="#4cc3ff"/><circle cx="60" cy="15" r="2.5" fill="#6fd39b"/>`;
    case 'bunny': return `<ellipse cx="39" cy="-6" rx="6.5" ry="15" fill="${c}"/><ellipse cx="61" cy="-6" rx="6.5" ry="15" fill="${c}"/><ellipse cx="39" cy="-5" rx="3" ry="10" fill="${it.c2}"/><ellipse cx="61" cy="-5" rx="3" ry="10" fill="${it.c2}"/><path d="M26 31 Q26 6 50 6 Q74 6 74 31 Z" fill="${c}"/>`;
    case 'cowboy': return `<path d="M34 22 Q32 -1 44 2 Q50 6 56 2 Q68 -1 66 22Z" fill="${dark}"/><rect x="34" y="15" width="32" height="4" fill="${shade(c, 0.6)}"/><ellipse cx="50" cy="22" rx="38" ry="6.5" fill="${c}"/>`;
    case 'flowers': return `<path d="M27 25 Q50 6 73 25" fill="none" stroke="#6fbf73" stroke-width="3"/>` + [[30, 22], [39, 15], [50, 12], [61, 15], [70, 22]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="5.5" fill="${i % 2 ? it.c2 : c}"/><circle cx="${x}" cy="${y}" r="2" fill="#fff6c2"/>`).join('');
    case 'wizard': return `<path d="M30 22 Q45 4 56 -18 Q59 3 70 22 Z" fill="${c}"/><ellipse cx="50" cy="22" rx="28" ry="5.5" fill="${dark}"/>${star(53, 6, 5, it.c2!)}`;
    default: return '';
  }
}

function dummy(it: Item, defs: string[]): string {
  const fill = it.pat === 'rainbow' ? paint(it, defs) : it.c;
  let s = `<circle cx="50" cy="53" r="3.4" fill="none" stroke="${shade(it.c, 0.8)}" stroke-width="1.6"/><ellipse cx="50" cy="47" rx="8" ry="4.8" fill="${fill}" stroke="${shade(it.c, 0.8)}" stroke-width="0.8"/>`;
  if (it.kind === 'star') s += star(50, 47, 3.2, it.c2!);
  else if (it.kind === 'heart') s += heart(50, 46.5, 0.45, it.c2!);
  else if (it.kind === 'panda') s += `<circle cx="44" cy="44" r="2.2" fill="${it.c2}"/><circle cx="56" cy="44" r="2.2" fill="${it.c2}"/><circle cx="50" cy="47.5" r="1.4" fill="${it.c2}"/>`;
  else s += `<circle cx="50" cy="47" r="2" fill="#fff" opacity=".8"/>`;
  return s;
}

// --- body space ---

type Geo = { hy: number; hr: number; by: number; bh: number; ay: number; ah: number; ly: number; ll: number };
const KID: Geo = { hy: 36, hr: 22, by: 56, bh: 36, ay: 60, ah: 26, ly: 88, ll: 32 };
const ADULT: Geo = { hy: 25, hr: 16, by: 40, bh: 50, ay: 44, ah: 40, ly: 88, ll: 40 };

/** Sitting: short legs pointing at you, everything above drops down so the feet stay on the floor. */
function sitting(g: Geo): Geo {
  const d = g.ll - 12;
  return { hy: g.hy + d, hr: g.hr, by: g.by + d, bh: g.bh, ay: g.ay + d, ah: g.ah, ly: g.ly + d, ll: 12 };
}

/** Each leg is its own group so walking can swing them. */
function legs(it: Item, shoes: Item, sf: string, g: Geo, defs: string[], sit: boolean): string {
  const f = it.pat ? paint(it, defs) : clothFill(it.c, defs);
  const { ly, ll } = g;
  const one = (x: number) => {
    if (it.kind === 'skirt' || it.kind === 'tutu') return `<rect x="${x - 5}" y="${ly}" width="10" height="${ll}" rx="4" fill="${sf}"/>`;
    if (it.kind === 'shorts') return `<rect x="${x - 5.5}" y="${ly + 8}" width="11" height="${Math.max(4, ll - 8)}" rx="4" fill="${sf}"/><rect x="${x - 8}" y="${ly - 3}" width="16" height="${sit ? 10 : 14}" rx="5" fill="${f}"/>`;
    return `<rect x="${x - 7.5}" y="${ly - 4}" width="15" height="${ll + 4}" rx="5" fill="${f}"/><rect x="${x - 7.5}" y="${ly + ll - 4}" width="15" height="3" rx="1.5" fill="${shade(it.c, 0.8)}" opacity=".7"/>`;
  };
  const top = {
    skirt: `<path d="M31 ${ly - 6} L69 ${ly - 6} L77 ${ly + 15} Q50 ${ly + 22} 23 ${ly + 15} Z" fill="${f}"/><path d="M40 ${ly - 4} L36 ${ly + 16} M60 ${ly - 4} L64 ${ly + 16}" stroke="${shade(it.c, 0.82)}" stroke-width="1" opacity=".7"/>`,
    tutu: `<rect x="30" y="${ly - 6}" width="40" height="9" rx="4" fill="${shade(it.c, 0.9)}"/>` + [24, 34, 44, 56, 66, 76].map((x) => `<circle cx="${x}" cy="${ly + 6}" r="7.5" fill="${it.c}" opacity=".85"/>`).join(''),
    shorts: `<rect x="31" y="${ly - 6}" width="38" height="12" rx="5" fill="${f}"/><rect x="49.2" y="${ly}" width="1.6" height="8" fill="${shade(it.c, 0.75)}"/>`,
  }[it.kind] ?? `<rect x="31" y="${ly - 6}" width="38" height="10" rx="4" fill="${f}"/>`;
  return [40, 60].map((x, i) => `<g class="leg ${i ? 'r' : 'l'}">${one(x)}${shoe(shoes, x, g, sit)}</g>`).join('') + top;
}

function shoe(it: Item, x: number, g: Geo, sit: boolean): string {
  const y = g.ly + g.ll + 2;
  const fill = it.pat === 'rainbow' ? 'url(#g-rainbow)' : it.c;
  const edge = shade(it.c === '#ffffff' ? '#dddddd' : it.c, 0.78);
  let s = '';
  if (it.kind === 'wellies' && !sit) s += `<rect x="${x - 8}" y="${y - 15}" width="16" height="19" rx="4" fill="${fill}"/><rect x="${x - 9}" y="${y + 1}" width="18" height="5" rx="2.5" fill="${edge}"/>`;
  else if (it.kind === 'slippers') s += `<ellipse cx="${x}" cy="${y}" rx="12" ry="7" fill="${fill}" stroke="#e8e8e8"/><ellipse cx="${x - 4}" cy="${y - 9}" rx="2.5" ry="6" fill="${it.c2}"/><ellipse cx="${x + 4}" cy="${y - 9}" rx="2.5" ry="6" fill="${it.c2}"/><circle cx="${x}" cy="${y - 1}" r="1.5" fill="#333"/>`;
  else s += `<ellipse cx="${x}" cy="${y}" rx="${sit ? 9 : 10.5}" ry="${sit ? 8 : 6}" fill="${fill}"/><path d="M${x - 10} ${y + 2} Q${x} ${y + 7} ${x + 10} ${y + 2}" stroke="${edge}" stroke-width="2" fill="none"/><ellipse cx="${x - 3}" cy="${y - 2}" rx="3.5" ry="1.6" fill="#fff" opacity=".45"/>`;
  if (it.pat === 'sparkle') s += star(x - 3, y - 1, 2.6, it.c2!) + star(x + 4, y + 1, 2, it.c2!);
  if (it.pat === 'lights') s += [-6, 0, 6].map((d, i) => `<circle cx="${x + d}" cy="${y + 4}" r="1.6" fill="${['#ff6b6b', '#ffe066', '#69db7c'][i]}"/>`).join('');
  return s;
}

function top(it: Item, sf: string, g: Geo, defs: string[], mood: FaceMood): string {
  const f = it.pat ? paint(it, defs) : clothFill(it.c, defs);
  const { by, bh, ay, ah } = g;
  const cuff = shade(it.c, 0.8);
  // Crying children rub their eyes: arms up.
  const up = mood === 'cry';
  const arm = (x: number, side: number) => up
    ? `<rect x="${x}" y="${ay - 2}" width="12" height="${ah * 0.75}" rx="6" fill="${f}" transform="rotate(${side * 150} ${x + 6} ${ay + 2})"/><circle cx="${x + 6 - side * 4}" cy="${ay - ah * 0.6}" r="5.5" fill="${sf}"/>`
    : `<rect x="${x}" y="${ay}" width="12" height="${ah}" rx="6" fill="${f}"/><rect x="${x}" y="${ay + ah - 4}" width="12" height="4" rx="2" fill="${cuff}"/><circle cx="${x + 6}" cy="${ay + ah + 2}" r="5.5" fill="${sf}"/>`;
  let s = `${arm(19, 1)}${arm(69, -1)}
    <rect x="29" y="${by}" width="42" height="${bh}" rx="12" fill="${f}"/>
    <path d="M42 ${by} Q50 ${by + 7} 58 ${by}" fill="${sf}" stroke="${cuff}" stroke-width="1.4"/>
    <path d="M33 ${by + bh - 3} Q50 ${by + bh + 1} 67 ${by + bh - 3}" stroke="${cuff}" stroke-width="1.4" fill="none" opacity=".6"/>`;
  const cy = by + bh / 2 + 2;
  if (it.kind === 'star') s += star(50, cy, 8, it.c2!);
  if (it.kind === 'heart') s += heart(50, cy - 1, 1.1, it.c2!);
  if (it.kind === 'dino') s += `<path d="M36 ${cy + 6} Q42 ${cy - 8} 56 ${cy - 4} L62 ${cy - 10} L64 ${cy - 2} Q66 ${cy + 6} 56 ${cy + 6} Z" fill="${it.c2}"/><circle cx="60" cy="${cy - 5}" r="1.2" fill="#fff"/>`;
  return s;
}

export type Person = Look & { age: number | 'adult'; mood?: FaceMood; pose?: 'stand' | 'sit'; badge?: string };

/** SVG for a person. Adults (and children from 10) use a taller body and a smaller head. */
export function person(p: Person): string {
  const mood = p.mood ?? 'happy';
  const sit = p.pose === 'sit';
  const base = p.age === 'adult' || p.age >= 10 ? ADULT : KID;
  const g = sit ? sitting(base) : base;
  const defs: string[] = [`<linearGradient id="g-rainbow">${RAINBOW.map((c, i) => `<stop offset="${(i / 5).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>`];
  const it = (k: keyof Look['outfit']) => ITEM[p.outfit[k]];
  const head = (inner: string) => `<g transform="translate(50 ${g.hy}) scale(${(g.hr / 22).toFixed(3)}) translate(-50 -36)">${inner}</g>`;
  const dm = showsDummy(p.age) && it('dummy').kind !== 'none' ? it('dummy') : null;
  const sf = skinFill(p.skin, defs);
  const hf = hairFill(p.hairColor, defs);
  const body = [
    `<ellipse cx="50" cy="${g.ly + g.ll + 7}" rx="${sit ? 26 : 22}" ry="4.5" fill="#000" opacity=".13"/>`,
    head(hairBack(p.hair, p.hairColor, hf)),
    legs(it('bottoms'), it('shoes'), sf, g, defs, sit),
    `<rect x="45" y="${g.by - 6}" width="10" height="9" fill="${shade(p.skin, 0.9)}"/>`,
    top(it('top'), sf, g, defs, mood),
    p.badge ? `<rect x="${60 - (4 + p.badge.length * 3.3) / 2}" y="${g.by + 10}" width="${4 + p.badge.length * 3.3}" height="8" rx="2" fill="#fff" stroke="#4cc38a"/><text x="60" y="${g.by + 16.2}" font-size="5.5" text-anchor="middle" fill="#2f8a5d" font-family="sans-serif" font-weight="700">${p.badge}</text>` : '',
    head(face(p.skin, sf, p.hairColor, mood, !!dm) + hairFront(p.hair, p.hairColor, hf) + headband(it('headband')) + hat(it('hat')) + (dm ? dummy(dm, defs) : '')),
  ];
  return `<svg viewBox="0 -16 100 156" class="person" aria-hidden="true"><defs>${[...new Set(defs)].join('')}</defs>${body.join('')}</svg>`;
}

/** Drawn width in room pixels: babies small, adults tall. */
export const personWidth = (age: number | 'adult') => (age === 'adult' || age >= 16 ? 122 : age <= 4 ? 60 + age * 7 : 88 + (age - 4) * 2.8);
