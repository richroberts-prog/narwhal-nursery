// The painted people as pictures for the 3D room: the same paper-doll layers as the 2D game, stacked on a canvas.
// Pictures load once and are kept, so a child looks the same everywhere.
import { DOLL_SIZE, Look, kindOf } from '../../game/looks';
import { Mood, dollLayers } from '../dolls';
import { SIZES } from '../room';

export type Art =
  | { doll: Look; age: number | 'adult'; mood: Mood }
  | { lying: Look; age: number | 'adult' }
  | { sprite: string; size: [number, number] };

const SCALE = 0.6; // pictures are drawn at 60% of their painted size: sharp enough on a tablet, light on memory
const images = new Map<string, Promise<HTMLImageElement>>();
function image(src: string) {
  let p = images.get(src);
  if (!p) {
    p = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(i); i.src = src; });
    images.set(src, p);
  }
  return p;
}
const layersOf = (look: Look, age: number | 'adult', mood: Mood) => [...dollLayers(look, age, mood).matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
/** Where the neck is down a doll's canvas (as in dolls.ts), for the blanket in bed. */
const NECK = { kid: 262 / 740, baby: 354 / 768, adult: 245 / 768 };

/** The picture for someone, drawn on a canvas. */
export async function paint(a: Art): Promise<HTMLCanvasElement> {
  const c = document.createElement('canvas'), g = c.getContext('2d')!;
  if ('sprite' in a) {
    const [w, h] = a.size;
    c.width = Math.round(w * SCALE * 1.4); c.height = Math.round(h * SCALE * 1.4);
    g.drawImage(await image(`art/${a.sprite}.webp`), 0, 0, c.width, c.height);
    return c;
  }
  const kind = kindOf(a.age), [dw, dh] = DOLL_SIZE[kind];
  const W = Math.round(dw * SCALE), H = Math.round(dh * SCALE);
  if ('doll' in a) {
    c.width = W; c.height = H;
    for (const src of layersOf(a.doll, a.age, a.mood)) g.drawImage(await image(src), 0, 0, W, H);
    return c;
  }
  // Asleep: on their back, head on the pillow (left), a blanket up to the chin.
  c.width = H; c.height = W;
  const neck = NECK[kind] * H;
  g.drawImage(await image('art/bedding/pillow.webp'), -neck * 0.12, 0, neck * 1.15, W);
  g.save(); g.translate(0, W); g.rotate(-Math.PI / 2);
  for (const src of layersOf(a.lying, a.age, 'asleep')) g.drawImage(await image(src), 0, 0, W, H);
  g.restore();
  const [bw, bh] = SIZES.bedding.blanket;
  g.drawImage(await image('art/bedding/blanket.webp'), neck - 4, -W * 0.08, H - neck + 10, (W * 1.16 * bh) / bw > W * 1.16 ? W * 1.16 : W * 1.16);
  return c;
}

export const artKey = (a: Art) => ('sprite' in a ? `s:${a.sprite}` : 'doll' in a ? `d:${JSON.stringify(a.doll)}|${a.age}|${a.mood}` : `l:${JSON.stringify(a.lying)}|${a.age}`);
