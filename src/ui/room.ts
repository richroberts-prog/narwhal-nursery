// The nursery is one level: the play room ('down') and the baby room ('up') side by side, joined by an archway, with
// the front door and the parents' pavement on the left. Each room is laid out in room pixels (1376 x 768) as the camera
// sees it; the 3D view (three/world3d.ts) turns those pixels into places. Here: where each thing is, where children
// stand for it, the cots' sleeping spots, and the pieces that stand in front of people.
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
  { id: 'desk', floor: 'down', zone: [370, 430, 540, 588], label: '🛎️ Desk', kind: 'desk', kx: 460, ky: 640 },
  { id: 'kitchen', floor: 'down', zone: [548, 378, 700, 520], label: '🍪 Kitchen', act: 'snack', kx: 620, ky: 600 },
  { id: 'easel', floor: 'down', zone: [706, 325, 800, 530], label: '🎨 Painting', act: 'painting', kx: 750, ky: 600 },
  { id: 'books', floor: 'down', zone: [806, 222, 906, 515], label: '📖 Stories', act: 'story', kx: 856, ky: 595 },
  { id: 'piano', floor: 'down', zone: [912, 410, 1010, 525], label: '🎵 Piano', act: 'song', kx: 960, ky: 600 },
  { id: 'potty', floor: 'down', zone: [1016, 200, 1120, 505], label: '🚽 Potty', act: 'potty', kx: 1060, ky: 585 },
  { id: 'garden', floor: 'down', zone: [1126, 150, 1236, 512], label: '🌳 Outside', act: 'outside', kx: 1180, ky: 600 },
  { id: 'toys', floor: 'down', zone: [290, 650, 450, 762], label: '🧱 Blocks', act: 'blocks', kx: 490, ky: 715 },
  { id: 'dress', floor: 'down', zone: [960, 610, 1130, 762], label: '👑 Dress up', act: 'dressup', kx: 940, ky: 700 },
  { id: 'stairsUp', floor: 'down', zone: [1240, 540, 1376, 768], label: '➡️ Baby room', kind: 'stairs', kx: 1200, ky: 710 },
  {
    id: 'cots', floor: 'up', zone: [150, 375, 560, 660], label: '😴 Cots', act: 'nap', kx: 420, ky: 700,
    beds: [{ id: 'A', x: 300, y: 566, length: 165, z: 600 }, { id: 'B', x: 410, y: 516, length: 140, z: 550 }, { id: 'C', x: 480, y: 478, length: 122, z: 524 }],
  },
  { id: 'cotD', floor: 'up', zone: [590, 370, 760, 533], label: '😴 Cot', act: 'nap', kx: 675, ky: 600, beds: [{ id: 'D', x: 675, y: 488, length: 155, z: 522 }] },
  { id: 'change', floor: 'up', zone: [765, 370, 935, 530], label: '🧷 Nappies', act: 'nappy', kx: 850, ky: 600 },
  { id: 'milk', floor: 'up', zone: [940, 375, 1035, 530], label: '🍼 Milk', act: 'bottle', kx: 985, ky: 600 },
  { id: 'wardrobe', floor: 'up', zone: [1040, 197, 1175, 512], label: '👗 Wardrobe', kind: 'wardrobe', kx: 1100, ky: 620 },
  { id: 'chair', floor: 'up', zone: [1180, 420, 1340, 660], label: '🤗 Cuddles', act: 'cuddle', kx: 1150, ky: 700 },
  { id: 'stairsDown', floor: 'up', zone: [0, 560, 140, 768], label: '⬅️ Play room', kind: 'stairs', kx: 180, ky: 720 },
];

/** Front pieces: anyone standing just behind one would be hidden by it, so children keep out from behind them. */
export const FRONTS: Record<Floor, { id: string; x: number; y: number; w: number; h: number; z: number }[]> = {
  down: [{ id: 'desk', x: 370, y: 430, w: 170, h: 158, z: 600 }, { id: 'toys', x: 290, y: 650, w: 160, h: 112, z: 762 }, { id: 'chest', x: 960, y: 560, w: 170, h: 202, z: 762 }],
  up: [{ id: 'cotA', x: 150, y: 430, w: 300, h: 230, z: 630 }, { id: 'cotB', x: 330, y: 405, w: 200, h: 158, z: 562 }, { id: 'cotD', x: 590, y: 370, w: 170, h: 163, z: 534 }],
};

/** Painted sticker sizes from the art build. */
export const SIZES = rooms as unknown as Record<'parents' | 'helpers' | 'rewards' | 'staff' | 'bedding', Record<string, [number, number]>>;

const SLOTS: Record<Floor, [number, number][]> = { down: [[640, 760], [860, 730], [1180, 760]], up: [[600, 760], [980, 735], [300, 760]] };

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
  down: { x: [540, 920], y: [620, 740] },
  up: { x: [560, 1000], y: [615, 700] },
};

/** Parents wait outside on the pavement, front first by the door; they walk up from the street on the left. */
export const QUEUE: [number, number][] = [[195, 640], [120, 668], [45, 700], [-30, 735]];
export const DOOR: [number, number] = [-150, 700];
/** The glass front wall runs from the back to the front through this room pixel; the door is in it. */
export const GLASS: [number, number] = [250, 700];
export const FRONT_DOOR: [number, number] = [297, 640];
/** Inside the play room: right of the glass front, which slants across the screen (back 398 px, front 196 px). */
export const insideFrom = (floor: Floor, y: number) => (floor === 'up' ? 170 : 398 - 0.79 * (y - 512) + 60);
export const EMILY_SPOT: [number, number] = [455, 530];
export const HOME_SPOT: Record<Floor, [number, number]> = { down: [700, 700], up: [900, 705] };
