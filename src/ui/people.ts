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

function hairBack(style: string, c: string): string {
  if (style === 'long') return `<path d="M25 32 Q22 66 32 70 L68 70 Q78 66 75 32 Z" fill="${c}"/>`;
  if (style === 'pigtails') return `<circle cx="23" cy="34" r="9" fill="${c}"/><circle cx="77" cy="34" r="9" fill="${c}"/><circle cx="27" cy="30" r="3" fill="#ff8fb8"/><circle cx="73" cy="30" r="3" fill="#ff8fb8"/>`;
  if (style === 'bun') return `<circle cx="50" cy="10" r="10" fill="${c}"/>`;
  if (style === 'ponytail') return `<ellipse cx="76" cy="44" rx="7" ry="17" fill="${c}"/><circle cx="72" cy="28" r="4" fill="#4cc38a"/>`;
  return '';
}

function hairFront(style: string, c: string): string {
  if (style === 'tuft') return `<path d="M47 15 Q49 5 57 9 Q52 9 52 15" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
  if (style === 'curly') return [[29, 30], [33, 21], [41, 15], [50, 13], [59, 15], [67, 21], [71, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="${c}"/>`).join('');
  if (style === 'dad') return `<path d="M28 32 Q27 13 50 13 Q73 13 72 32 Q67 21 50 21 Q33 21 28 32Z" fill="${c}"/>`;
  return `<path d="M27 36 Q25 12 50 12 Q75 12 73 36 Q70 24 60 22 Q50 28 40 22 Q30 24 27 36 Z" fill="${c}"/>`;
}

function face(skin: string, sleeping: boolean, dummy: boolean): string {
  const eyes = sleeping
    ? `<path d="M38 38 Q42 41 46 38 M54 38 Q58 41 62 38" fill="none" stroke="#3a2a2a" stroke-width="2" stroke-linecap="round"/>`
    : `<circle cx="42" cy="38" r="2.8" fill="#3a2a2a"/><circle cx="58" cy="38" r="2.8" fill="#3a2a2a"/><circle cx="43" cy="37" r="0.9" fill="#fff"/><circle cx="59" cy="37" r="0.9" fill="#fff"/>`;
  return `<circle cx="28" cy="39" r="5" fill="${skin}"/><circle cx="72" cy="39" r="5" fill="${skin}"/>
    <circle cx="50" cy="36" r="22" fill="${skin}"/>${eyes}
    <circle cx="36" cy="45" r="3.6" fill="#ff9eb0" opacity=".55"/><circle cx="64" cy="45" r="3.6" fill="#ff9eb0" opacity=".55"/>
    ${dummy ? '' : `<path d="M45 46 Q50 51 55 46" fill="none" stroke="#c0526b" stroke-width="1.9" stroke-linecap="round"/>`}`;
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

function legs(it: Item, skin: string, g: Geo, defs: string[]): string {
  const f = paint(it, defs);
  const { ly, ll } = g;
  const skinLegs = `<rect x="36" y="${ly}" width="10" height="${ll}" rx="4" fill="${skin}"/><rect x="54" y="${ly}" width="10" height="${ll}" rx="4" fill="${skin}"/>`;
  switch (it.kind) {
    case 'skirt': return skinLegs + `<path d="M31 ${ly - 6} L69 ${ly - 6} L77 ${ly + 15} Q50 ${ly + 21} 23 ${ly + 15} Z" fill="${f}"/>`;
    case 'tutu': return skinLegs + `<path d="M31 ${ly - 6} L69 ${ly - 6} L69 ${ly}" fill="${it.c}"/>` + [24, 34, 44, 56, 66, 76].map((x) => `<circle cx="${x}" cy="${ly + 6}" r="7" fill="${it.c}" opacity=".85"/>`).join('') + `<rect x="30" y="${ly - 6}" width="40" height="9" rx="4" fill="${shade(it.c, 0.9)}"/>`;
    case 'shorts': return skinLegs + `<rect x="31" y="${ly - 6}" width="38" height="18" rx="5" fill="${f}"/><rect x="49" y="${ly + 2}" width="2" height="10" fill="${shade(it.c, 0.75)}"/>`;
    default: return `<rect x="33" y="${ly - 4}" width="15" height="${ll + 4}" rx="5" fill="${f}"/><rect x="52" y="${ly - 4}" width="15" height="${ll + 4}" rx="5" fill="${f}"/><rect x="31" y="${ly - 6}" width="38" height="10" rx="4" fill="${f}"/>`;
  }
}

function shoes(it: Item, g: Geo): string {
  const y = g.ly + g.ll + 2;
  const fill = it.pat === 'rainbow' ? 'url(#g-rainbow)' : it.c;
  const edge = shade(it.c === '#ffffff' ? '#dddddd' : it.c, 0.8);
  let s = '';
  for (const x of [40, 60]) {
    if (it.kind === 'wellies') s += `<rect x="${x - 8}" y="${y - 15}" width="16" height="19" rx="4" fill="${fill}"/><rect x="${x - 9}" y="${y + 1}" width="18" height="5" rx="2.5" fill="${edge}"/>`;
    else if (it.kind === 'slippers') s += `<ellipse cx="${x}" cy="${y}" rx="12" ry="7" fill="${fill}" stroke="#e8e8e8"/><ellipse cx="${x - 4}" cy="${y - 9}" rx="2.5" ry="6" fill="${it.c2}"/><ellipse cx="${x + 4}" cy="${y - 9}" rx="2.5" ry="6" fill="${it.c2}"/><circle cx="${x}" cy="${y - 1}" r="1.5" fill="#333"/>`;
    else s += `<ellipse cx="${x}" cy="${y}" rx="10.5" ry="6" fill="${fill}" stroke="${edge}" stroke-width="1"/>`;
    if (it.pat === 'sparkle') s += star(x - 3, y - 1, 2.6, it.c2!) + star(x + 4, y + 1, 2, it.c2!);
    if (it.pat === 'lights') s += [-6, 0, 6].map((d, i) => `<circle cx="${x + d}" cy="${y + 4}" r="1.6" fill="${['#ff6b6b', '#ffe066', '#69db7c'][i]}"/>`).join('');
  }
  return s;
}

function top(it: Item, skin: string, g: Geo, defs: string[]): string {
  const f = paint(it, defs);
  const { by, bh, ay, ah } = g;
  let s = `<rect x="19" y="${ay}" width="12" height="${ah}" rx="6" fill="${f}"/><rect x="69" y="${ay}" width="12" height="${ah}" rx="6" fill="${f}"/>
    <circle cx="25" cy="${ay + ah + 2}" r="5.5" fill="${skin}"/><circle cx="75" cy="${ay + ah + 2}" r="5.5" fill="${skin}"/>
    <rect x="29" y="${by}" width="42" height="${bh}" rx="12" fill="${f}" stroke="${shade(it.c, 0.85)}" stroke-width="0.8"/>`;
  const cy = by + bh / 2;
  if (it.kind === 'star') s += star(50, cy, 8, it.c2!);
  if (it.kind === 'heart') s += heart(50, cy - 1, 1.1, it.c2!);
  if (it.kind === 'dino') s += `<path d="M36 ${cy + 6} Q42 ${cy - 8} 56 ${cy - 4} L62 ${cy - 10} L64 ${cy - 2} Q66 ${cy + 6} 56 ${cy + 6} Z" fill="${it.c2}"/><circle cx="60" cy="${cy - 5}" r="1.2" fill="#fff"/>`;
  return s;
}

export type Person = Look & { age: number | 'adult'; sleeping?: boolean; badge?: string };

/** SVG for a person. Adults use a taller body and a smaller head. */
export function person(p: Person): string {
  const g = p.age === 'adult' || p.age >= 10 ? ADULT : KID;
  const defs: string[] = [`<linearGradient id="g-rainbow">${RAINBOW.map((c, i) => `<stop offset="${(i / 5).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>`];
  const it = (k: keyof Look['outfit']) => ITEM[p.outfit[k]];
  const head = (inner: string) => `<g transform="translate(50 ${g.hy}) scale(${(g.hr / 22).toFixed(3)}) translate(-50 -36)">${inner}</g>`;
  const dm = showsDummy(p.age) && it('dummy').kind !== 'none' ? it('dummy') : null;
  const body = [
    head(hairBack(p.hair, p.hairColor)),
    legs(it('bottoms'), p.skin, g, defs),
    shoes(it('shoes'), g),
    `<rect x="45" y="${g.by - 6}" width="10" height="9" fill="${p.skin}"/>`,
    top(it('top'), p.skin, g, defs),
    p.badge ? `<rect x="${60 - (4 + p.badge.length * 3.3) / 2}" y="${g.by + 10}" width="${4 + p.badge.length * 3.3}" height="8" rx="2" fill="#fff" stroke="#4cc38a"/><text x="60" y="${g.by + 16.2}" font-size="5.5" text-anchor="middle" fill="#2f8a5d" font-family="sans-serif" font-weight="700">${p.badge}</text>` : '',
    head(face(p.skin, !!p.sleeping, !!dm) + hairFront(p.hair, p.hairColor) + headband(it('headband')) + hat(it('hat')) + (dm ? dummy(dm, defs) : '')),
  ];
  return `<svg viewBox="0 -16 100 156" class="person" aria-hidden="true"><defs>${defs.join('')}</defs>${body.join('')}</svg>`;
}

/** Drawn width in room pixels: babies small, adults tall. */
export const personWidth = (age: number | 'adult') => (age === 'adult' || age >= 16 ? 122 : age <= 4 ? 60 + age * 7 : 88 + (age - 4) * 2.8);
