// The two floors: where everything stands, and how each thing is drawn.
import { Act, FURNITURE, Floor, FurnId } from '../game/catalog';

export const ROOM_W = 1060;
export const ROOM_H = 690;
export const WALL = 400;

export type Station = {
  id: string; floor: Floor; x: number; y: number; w: number; h: number; label: string; art: string;
  act?: Act; kind?: 'desk' | 'stairs' | 'wardrobe' | 'furn'; minAge?: number;
  /** Where a child stands for it. */
  kx: number; ky: number;
};

const svg = (w: number, h: number, body: string) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${body}</svg>`;
const WOOD = '#f1d9b8';
const WOOD_D = '#d9b48a';

export const narwhal = (s = 1) => svg(120 * s, 80 * s, `<g transform="scale(${s})">
  <path d="M84 30 L118 6 L88 38 Z" fill="#fff4c2" stroke="#e8cf7a" stroke-width="1.5"/>
  <path d="M10 52 Q4 40 14 34 Q8 26 16 22 Q22 34 26 40 Q50 18 80 30 Q96 38 92 54 Q86 70 58 70 Q30 70 22 58 Z" fill="#8ec5f0"/>
  <path d="M34 62 Q58 70 82 56 Q74 66 56 68 Q40 68 34 62Z" fill="#cfe8fb"/>
  <circle cx="74" cy="44" r="3.5" fill="#2b3a55"/><circle cx="75" cy="43" r="1.1" fill="#fff"/>
  <circle cx="80" cy="52" r="4" fill="#ff9eb0" opacity=".6"/><path d="M70 54 Q74 57 78 54" fill="none" stroke="#2b3a55" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M46 60 Q52 74 60 66" fill="#6fb0e6"/></g>`);

const ART = {
  frontDoor: svg(90, 210, `<rect x="4" y="4" width="82" height="206" rx="8" fill="#ffffff"/><rect x="10" y="10" width="70" height="200" rx="6" fill="#ff9eb0"/>
    <rect x="22" y="24" width="46" height="46" rx="23" fill="#d9f1ff" stroke="#fff" stroke-width="4"/><circle cx="68" cy="120" r="5" fill="#f5c542"/>
    <rect x="18" y="96" width="54" height="10" rx="5" fill="#ffffff" opacity=".5"/>`),
  desk: svg(180, 105, `<rect x="0" y="0" width="180" height="16" rx="6" fill="${WOOD_D}"/><rect x="6" y="14" width="168" height="91" rx="8" fill="#ffffff"/>
    <rect x="14" y="24" width="152" height="70" rx="6" fill="#bfe3ff"/><text x="90" y="56" text-anchor="middle" font-size="18" font-weight="800" fill="#3d5a99" font-family="inherit">Welcome!</text>
    <text x="90" y="80" text-anchor="middle" font-size="16">🐳 💖 🧸</text><circle cx="150" cy="-4" r="8" fill="#f5c542"/><rect x="146" y="2" width="8" height="4" fill="#d9a425"/>`),
  kitchen: svg(150, 160, `<rect x="10" y="0" width="130" height="44" rx="6" fill="#ffffff"/><rect x="16" y="6" width="56" height="32" rx="4" fill="#c9f0dc"/><rect x="78" y="6" width="56" height="32" rx="4" fill="#c9f0dc"/>
    <rect x="0" y="80" width="150" height="12" rx="5" fill="${WOOD_D}"/><rect x="6" y="92" width="138" height="68" rx="6" fill="#ffffff"/>
    <rect x="12" y="98" width="62" height="56" rx="5" fill="#c9f0dc"/><rect x="76" y="98" width="62" height="56" rx="5" fill="#c9f0dc"/>
    <circle cx="68" cy="126" r="3" fill="#8a5a2b"/><circle cx="82" cy="126" r="3" fill="#8a5a2b"/>
    <text x="40" y="78" font-size="26" text-anchor="middle">🍎</text><text x="76" y="78" font-size="26" text-anchor="middle">🍪</text><text x="112" y="78" font-size="26" text-anchor="middle">🥛</text>`),
  easel: svg(90, 160, `<path d="M20 160 L42 10 M70 160 L48 10 M45 20 L45 160" stroke="${WOOD_D}" stroke-width="6" stroke-linecap="round"/>
    <rect x="8" y="20" width="74" height="80" rx="4" fill="#ffffff" stroke="${WOOD_D}" stroke-width="3"/>
    <circle cx="30" cy="48" r="12" fill="#ff6b6b" opacity=".8"/><circle cx="56" cy="44" r="10" fill="#4dabf7" opacity=".8"/><path d="M18 84 Q45 58 72 84" fill="none" stroke="#69db7c" stroke-width="7"/>
    <rect x="6" y="100" width="78" height="8" rx="3" fill="${WOOD_D}"/>`),
  books: svg(110, 180, `<rect x="0" y="0" width="110" height="180" rx="6" fill="${WOOD}"/><rect x="6" y="6" width="98" height="168" rx="4" fill="#fff6ea"/>
    ${[0, 1, 2].map((r) => `<rect x="6" y="${58 + r * 56}" width="98" height="6" fill="${WOOD_D}"/>` + ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#b197fc', '#ffa94d'].map((c, i) => `<rect x="${12 + i * 15}" y="${18 + r * 56 + (i % 2) * 4}" width="12" height="${40 - (i % 2) * 4}" rx="2" fill="${c}"/>`).join('')).join('')}`),
  piano: svg(120, 115, `<rect x="0" y="0" width="120" height="70" rx="10" fill="#ff8fb8"/><rect x="8" y="40" width="104" height="26" rx="3" fill="#ffffff"/>
    ${Array.from({ length: 8 }, (_, i) => `<rect x="${8 + i * 13}" y="40" width="1.5" height="26" fill="#ddd"/>`).join('')}
    ${[1, 2, 4, 5, 6].map((i) => `<rect x="${5 + i * 13}" y="40" width="7" height="15" rx="1" fill="#333"/>`).join('')}
    <rect x="12" y="70" width="10" height="45" rx="3" fill="#e5729b"/><rect x="98" y="70" width="10" height="45" rx="3" fill="#e5729b"/>
    <text x="60" y="30" font-size="20" text-anchor="middle">🎵</text>`),
  potty: svg(84, 185, `<rect x="0" y="0" width="84" height="185" rx="8" fill="#ffffff"/><rect x="6" y="6" width="72" height="179" rx="6" fill="#bfe3ff"/>
    <circle cx="42" cy="44" r="22" fill="#ffffff"/><text x="42" y="54" font-size="26" text-anchor="middle">🚽</text><circle cx="64" cy="110" r="5" fill="#f5c542"/>`),
  garden: svg(116, 210, `<rect x="0" y="0" width="116" height="210" rx="8" fill="#ffffff"/><rect x="8" y="8" width="100" height="202" rx="4" fill="#bfe9ff"/>
    <path d="M8 150 Q40 128 64 146 Q88 130 108 142 L108 210 L8 210Z" fill="#7fd08c"/>
    <circle cx="36" cy="112" r="20" fill="#4cb36a"/><rect x="33" y="120" width="6" height="34" fill="#9a6a3b"/><circle cx="86" cy="40" r="12" fill="#ffd84d"/>
    <rect x="56" y="8" width="5" height="202" fill="#ffffff"/><rect x="8" y="100" width="100" height="5" fill="#ffffff"/>`),
  toys: svg(110, 75, `<rect x="0" y="16" width="110" height="59" rx="8" fill="#6fb6ff"/><rect x="0" y="10" width="110" height="14" rx="6" fill="#4d97e0"/>
    <rect x="12" y="-2" width="20" height="18" rx="2" fill="#ff6b6b"/><rect x="36" y="2" width="18" height="16" rx="2" fill="#ffd43b"/><rect x="58" y="-6" width="20" height="22" rx="2" fill="#69db7c"/>
    <text x="55" y="58" font-size="22" text-anchor="middle">🧸</text>`),
  dress: svg(115, 80, `<path d="M8 22 Q57 -8 107 22" fill="none" stroke="#ff8fb8" stroke-width="10" stroke-linecap="round"/>
    <rect x="0" y="22" width="115" height="58" rx="8" fill="#b48cf0"/><rect x="0" y="22" width="115" height="14" rx="6" fill="#9a6fe0"/>
    <text x="34" y="20" font-size="22" text-anchor="middle">👑</text><rect x="50" y="44" width="16" height="12" rx="3" fill="#f5c542"/><text x="90" y="70" font-size="18" text-anchor="middle">✨</text>`),
  stairsUp: svg(150, 150, `${[0, 1, 2, 3, 4].map((i) => `<rect x="${i * 24}" y="${150 - (i + 1) * 28}" width="${150 - i * 24}" height="28" fill="${i % 2 ? '#f1d9b8' : '#e8c79e'}"/>`).join('')}
    <path d="M6 130 L126 10" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>`),
  stairsDown: svg(150, 150, `${[0, 1, 2, 3, 4].map((i) => `<rect x="0" y="${i * 28 + 10}" width="${30 + i * 30}" height="28" fill="${i % 2 ? '#d9cff5' : '#c7bcef'}"/>`).join('')}
    <path d="M10 20 L140 140" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>`),
  cot: (blanket: string) => svg(120, 110, `<rect x="4" y="8" width="10" height="102" rx="4" fill="#ffffff" stroke="#e3d6f0" stroke-width="2"/><rect x="106" y="8" width="10" height="102" rx="4" fill="#ffffff" stroke="#e3d6f0" stroke-width="2"/>
    <rect x="10" y="60" width="100" height="26" rx="6" fill="${blanket}"/><rect x="14" y="52" width="30" height="14" rx="7" fill="#ffffff"/>
    ${Array.from({ length: 7 }, (_, i) => `<rect x="${20 + i * 12}" y="18" width="4" height="70" rx="2" fill="#ffffff" opacity=".9"/>`).join('')}
    <rect x="4" y="14" width="112" height="8" rx="4" fill="#ffffff"/><rect x="4" y="86" width="112" height="9" rx="4" fill="#ffffff"/>`),
  change: svg(150, 140, `<rect x="0" y="40" width="150" height="100" rx="8" fill="#ffffff"/><rect x="0" y="24" width="150" height="22" rx="10" fill="#ffd6e7"/>
    ${[0, 1].map((r) => `<rect x="10" y="${56 + r * 40}" width="130" height="34" rx="5" fill="#f3eef8"/><circle cx="75" cy="${73 + r * 40}" r="4" fill="#b48cf0"/>`).join('')}
    <rect x="104" y="2" width="34" height="22" rx="4" fill="#bfe3ff"/><rect x="108" y="-6" width="26" height="12" rx="3" fill="#ffffff"/><text x="22" y="20" font-size="18">🧷</text>`),
  milk: svg(90, 140, `<rect x="0" y="0" width="90" height="140" rx="12" fill="#ffffff" stroke="#e3d6f0" stroke-width="3"/><rect x="0" y="52" width="90" height="4" fill="#e3d6f0"/>
    <rect x="72" y="18" width="5" height="22" rx="2" fill="#c7bcef"/><rect x="72" y="70" width="5" height="30" rx="2" fill="#c7bcef"/><text x="40" y="104" font-size="38" text-anchor="middle">🍼</text>`),
  chair: svg(150, 140, `<rect x="10" y="0" width="130" height="96" rx="40" fill="#ff9eb0"/><rect x="0" y="50" width="34" height="80" rx="16" fill="#ff7fa0"/><rect x="116" y="50" width="34" height="80" rx="16" fill="#ff7fa0"/>
    <rect x="26" y="74" width="98" height="46" rx="14" fill="#ffc2d4"/><path transform="translate(75 40) scale(2)" d="M0 6 C-8 0 -7 -8 0 -5 C7 -8 8 0 0 6Z" fill="#ffffff" opacity=".85"/>
    <rect x="16" y="126" width="10" height="14" rx="3" fill="${WOOD_D}"/><rect x="124" y="126" width="10" height="14" rx="3" fill="${WOOD_D}"/>`),
  wardrobe: svg(150, 280, `<rect x="0" y="0" width="150" height="270" rx="10" fill="#ffffff" stroke="#e3d6f0" stroke-width="3"/><rect x="8" y="10" width="64" height="250" rx="6" fill="#d9cff5"/><rect x="78" y="10" width="64" height="250" rx="6" fill="#d9cff5"/>
    <circle cx="64" cy="140" r="5" fill="#f5c542"/><circle cx="86" cy="140" r="5" fill="#f5c542"/><rect x="10" y="266" width="14" height="14" rx="3" fill="${WOOD_D}"/><rect x="126" y="266" width="14" height="14" rx="3" fill="${WOOD_D}"/>
    <text x="40" y="60" font-size="30" text-anchor="middle">👗</text><text x="110" y="60" font-size="30" text-anchor="middle">🎀</text><text x="75" y="226" font-size="26" text-anchor="middle">👟</text>`),
  furn: (e: string) => svg(110, 100, `<ellipse cx="55" cy="92" rx="48" ry="8" fill="#000" opacity=".08"/><text x="55" y="84" font-size="78" text-anchor="middle">${e}</text>`),
};

export const STATIONS: Station[] = [
  { id: 'desk', floor: 'down', x: 195, y: 530, w: 180, h: 105, label: 'Front desk', art: ART.desk, kind: 'desk', kx: 195, ky: 640 },
  { id: 'kitchen', floor: 'down', x: 360, y: 400, w: 150, h: 160, label: '🍪 Kitchen', art: ART.kitchen, act: 'snack', kx: 360, ky: 478 },
  { id: 'easel', floor: 'down', x: 495, y: 418, w: 90, h: 160, label: '🎨 Painting', art: ART.easel, act: 'painting', kx: 495, ky: 492 },
  { id: 'books', floor: 'down', x: 615, y: 400, w: 110, h: 180, label: '📖 Stories', art: ART.books, act: 'story', kx: 615, ky: 482 },
  { id: 'piano', floor: 'down', x: 740, y: 420, w: 120, h: 115, label: '🎵 Piano', art: ART.piano, act: 'song', kx: 740, ky: 496 },
  { id: 'potty', floor: 'down', x: 862, y: 400, w: 84, h: 185, label: '🚽 Potty', art: ART.potty, act: 'potty', kx: 862, ky: 482 },
  { id: 'garden', floor: 'down', x: 980, y: 400, w: 116, h: 210, label: '🌳 Outside', art: ART.garden, act: 'outside', kx: 980, ky: 486 },
  { id: 'toys', floor: 'down', x: 480, y: 684, w: 110, h: 75, label: '🧱 Blocks', art: ART.toys, act: 'blocks', kx: 480, ky: 636 },
  { id: 'dress', floor: 'down', x: 630, y: 684, w: 115, h: 80, label: '👑 Dress up', art: ART.dress, act: 'dressup', kx: 630, ky: 636 },
  { id: 'stairsUp', floor: 'down', x: 985, y: 690, w: 150, h: 150, label: '⬆️ Upstairs', art: ART.stairsUp, kind: 'stairs', kx: 940, ky: 640 },
  { id: 'cot1', floor: 'up', x: 105, y: 480, w: 120, h: 110, label: '😴 Cot', art: ART.cot('#bfe3ff'), act: 'nap', kx: 105, ky: 462 },
  { id: 'cot2', floor: 'up', x: 240, y: 480, w: 120, h: 110, label: '😴 Cot', art: ART.cot('#ffd6e7'), act: 'nap', kx: 240, ky: 462 },
  { id: 'cot3', floor: 'up', x: 375, y: 480, w: 120, h: 110, label: '😴 Cot', art: ART.cot('#c9f0dc'), act: 'nap', kx: 375, ky: 462 },
  { id: 'change', floor: 'up', x: 525, y: 480, w: 150, h: 140, label: '🧷 Nappies', art: ART.change, act: 'nappy', kx: 525, ky: 552 },
  { id: 'milk', floor: 'up', x: 668, y: 430, w: 90, h: 140, label: '🍼 Milk', art: ART.milk, act: 'bottle', kx: 668, ky: 520 },
  { id: 'chair', floor: 'up', x: 805, y: 548, w: 150, h: 140, label: '🤗 Cuddles', art: ART.chair, act: 'cuddle', kx: 805, ky: 528 },
  { id: 'wardrobe', floor: 'up', x: 955, y: 430, w: 150, h: 280, label: '👗 Wardrobe', art: ART.wardrobe, kind: 'wardrobe', kx: 900, ky: 520 },
  { id: 'stairsDown', floor: 'up', x: 985, y: 690, w: 150, h: 150, label: '⬇️ Downstairs', art: ART.stairsDown, kind: 'stairs', kx: 940, ky: 640 },
];

const SLOTS: Record<Floor, [number, number][]> = { down: [[775, 690], [400, 560], [880, 600]], up: [[80, 640], [800, 690], [470, 500]] };

/** Furniture the player owns, placed in its floor's free spots in the order it was won. */
export function furnitureStations(owned: FurnId[]): Station[] {
  const used: Record<Floor, number> = { down: 0, up: 0 };
  return owned.map((id) => {
    const f = FURNITURE[id];
    const [x, y] = SLOTS[f.floor][used[f.floor]++ % 3];
    return { id: `furn-${id}`, floor: f.floor, x, y, w: 110, h: 100, label: `${f.e} ${f.name}`, art: ART.furn(f.e), act: 'play', kind: 'furn', minAge: f.minAge, kx: x, ky: y - 30 };
  });
}

/** Where children wander when they're not doing anything. */
export const PLAY_AREA: Record<Floor, { x: [number, number]; y: [number, number] }> = {
  down: { x: [520, 860], y: [530, 600] },
  up: { x: [240, 700], y: [600, 680] },
};

export function wallDecor(floor: Floor): string {
  if (floor === 'down') {
    return `<div class="sign">${narwhal(0.55)}<span>Narwhal Nursery</span>${narwhal(0.55)}</div>
      <div class="bunting">${Array.from({ length: 14 }, (_, i) => `<i style="color:${['#ff8fb8', '#ffd84d', '#8ec5f0', '#8fd6a0', '#b48cf0'][i % 5]}"></i>`).join('')}</div>
      <div class="door-front">${ART.frontDoor}</div>`;
  }
  return `<div class="window"><span>☁️</span><span>🌙</span><span>⭐</span></div>
    <div class="mobile">${['⭐', '🌙', '🐳', '⭐'].map((e) => `<span>${e}</span>`).join('')}</div>
    <div class="rainbow"></div><div class="mat"></div>`;
}
