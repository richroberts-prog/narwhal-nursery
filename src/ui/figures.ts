// Pictures of people for the menus (chats, wardrobe, end of day, start screen): the same 3D people as the room,
// photographed once and kept. Sizes match the old paper dolls so the screens keep their layout.
import { FaceLook, Look } from '../game/looks';
import { dollBox } from './dolls';
import { Mood, grownUpSpec, specFromLook } from './three/people';
import { portrait } from './three/world3d';

const faceKey = (f?: FaceLook) => (f ? JSON.stringify(f) : '');
export const lookKey = (l: Look) => `${l.skin}|${l.hair}|${l.hairColor}|${Object.values(l.outfit).join(',')}|${faceKey(l.face)}`;

/** A child or Isabelle, `height` tall, in the box the old doll used. */
export function figure(look: Look, age: number | 'adult', mood: Mood = 'happy', height?: number, seed = 1, sex: 'boy' | 'girl' = 'girl'): string {
  const [w, h] = dollBox(age, height);
  const url = portrait(() => specFromLook(look, age, seed, sex), `${lookKey(look)}|${age}|${seed}|${sex}`, mood);
  return `<div class="doll fig" style="width:${w}px;height:${h}px"><img src="${url}" alt="" draggable="false"></div>`;
}

/** A grown-up who always looks the same (a parent, Emily, a helper), `height` tall. */
export function grownUp(id: string, height = 300): string {
  const url = portrait(() => grownUpSpec(id), `grown|${id}`);
  return `<div class="doll fig" style="width:${height * 0.6}px;height:${height}px"><img src="${url}" alt="" draggable="false"></div>`;
}
