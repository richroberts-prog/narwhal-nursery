// The two painted floors: where each thing is in the painting (room pixels, 1376 x 768), where children stand for it,
// the cots' sleeping spots, and the front pieces cut from the painting that stand in front of people.
import rooms from '../../public/art/rooms.json' with { type: 'json' };
import { Act, FURNITURE, Floor, FurnId } from '../game/catalog';

export const ROOM_W = 1376;
export const ROOM_H = 768;

type Box = [number, number, number, number];
export type Bed = { id: string; x: number; y: number; length: number; z: number };
export type Station = {
  id: string; floor: Floor; zone: Box; label: string;
  act?: Act; kind?: 'desk' | 'stairs' | 'wardrobe' | 'furn'; minAge?: number;
  /** Where a child stands for it. */
  kx: number; ky: number;
  /** Cots: where a sleeping child lies. */
  beds?: Bed[];
};

export const STATIONS: Station[] = [
  { id: 'desk', floor: 'down', zone: [188, 400, 396, 572], label: '🛎️ Desk', kind: 'desk', kx: 330, ky: 690 },
  { id: 'kitchen', floor: 'down', zone: [305, 378, 525, 520], label: '🍪 Kitchen', act: 'snack', kx: 450, ky: 600 },
  { id: 'easel', floor: 'down', zone: [525, 325, 645, 530], label: '🎨 Painting', act: 'painting', kx: 590, ky: 600 },
  { id: 'books', floor: 'down', zone: [650, 222, 790, 515], label: '📖 Stories', act: 'story', kx: 720, ky: 595 },
  { id: 'piano', floor: 'down', zone: [798, 410, 940, 525], label: '🎵 Piano', act: 'song', kx: 860, ky: 600 },
  { id: 'potty', floor: 'down', zone: [945, 200, 1093, 505], label: '🚽 Potty', act: 'potty', kx: 1020, ky: 585 },
  { id: 'garden', floor: 'down', zone: [1140, 95, 1345, 560], label: '🌳 Outside', act: 'outside', kx: 1160, ky: 610 },
  { id: 'toys', floor: 'down', zone: [40, 600, 250, 760], label: '🧱 Blocks', act: 'blocks', kx: 300, ky: 715 },
  { id: 'dress', floor: 'down', zone: [944, 583, 1141, 760], label: '👑 Dress up', act: 'dressup', kx: 1043, ky: 655 },
  { id: 'stairsUp', floor: 'down', zone: [1200, 580, 1376, 768], label: '⬆️ Upstairs', kind: 'stairs', kx: 1150, ky: 710 },
  {
    id: 'cots', floor: 'up', zone: [40, 375, 493, 660], label: '😴 Cots', act: 'nap', kx: 300, ky: 690,
    beds: [{ id: 'A', x: 222, y: 566, length: 165, z: 600 }, { id: 'B', x: 322, y: 516, length: 140, z: 550 }, { id: 'C', x: 394, y: 478, length: 122, z: 524 }],
  },
  { id: 'cotD', floor: 'up', zone: [538, 370, 749, 533], label: '😴 Cot', act: 'nap', kx: 640, ky: 600, beds: [{ id: 'D', x: 642, y: 488, length: 155, z: 522 }] },
  { id: 'change', floor: 'up', zone: [755, 370, 935, 530], label: '🧷 Nappies', act: 'nappy', kx: 845, ky: 600 },
  { id: 'milk', floor: 'up', zone: [935, 375, 1035, 530], label: '🍼 Milk', act: 'bottle', kx: 985, ky: 600 },
  { id: 'wardrobe', floor: 'up', zone: [1036, 197, 1175, 360], label: '👗 Wardrobe', kind: 'wardrobe', kx: 1100, ky: 620 },
  { id: 'chair', floor: 'up', zone: [1062, 360, 1200, 640], label: '🤗 Cuddles', act: 'cuddle', kx: 1120, ky: 695 },
  { id: 'stairsDown', floor: 'up', zone: [1200, 560, 1376, 768], label: '⬇️ Downstairs', kind: 'stairs', kx: 1150, ky: 720 },
];

/** Front pieces: cut from the painting, drawn over anyone standing behind them (smaller y than their depth). */
export const FRONTS: Record<Floor, { id: string; x: number; y: number; w: number; h: number; z: number }[]> = {
  down: rooms['room-down'].fronts, up: rooms['room-up'].fronts,
};

/** Painted sticker sizes from the art build. */
export const SIZES = rooms as unknown as Record<'parents' | 'helpers' | 'rewards' | 'staff' | 'bedding', Record<string, [number, number]>>;

const SLOTS: Record<Floor, [number, number][]> = { down: [[580, 760], [800, 730], [130, 520]], up: [[520, 760], [960, 735], [440, 600]] };

/** Furniture the player owns, placed in its floor's free spots in the order it was won. */
export function furnitureStations(owned: FurnId[]): Station[] {
  const used: Record<Floor, number> = { down: 0, up: 0 };
  return owned.map((id) => {
    const f = FURNITURE[id];
    const [x, y] = SLOTS[f.floor][used[f.floor]++ % 3];
    const [w, h] = SIZES.rewards[id];
    const H = 150;
    const W = (H * w) / h;
    return { id: `furn-${id}`, floor: f.floor, zone: [x - W / 2, y - H, x + W / 2, y] as Box, label: `${f.e} ${f.name}`, act: 'play' as Act, kind: 'furn' as const, minAge: f.minAge, kx: x + W / 2 + 20, ky: y - 10 };
  });
}

/** Where children wander when they're not doing anything; babies sit on the upstairs mat. */
export const PLAY_AREA: Record<Floor, { x: [number, number]; y: [number, number] }> = {
  down: { x: [440, 900], y: [620, 740] },
  up: { x: [500, 950], y: [615, 700] },
};

export const QUEUE: [number, number][] = [[330, 690], [250, 728], [430, 745], [160, 760]];
export const DOOR: [number, number] = [120, 640];
export const EMILY_SPOT: [number, number] = [292, 522];
export const HOME_SPOT: Record<Floor, [number, number]> = { down: [600, 700], up: [900, 705] };
