// People on screen: painted paper dolls stacked from picture layers (body, clothes, face, hair, hat), or one painted
// picture for grown-ups who don't change. Sizes are in room pixels (the painted room is 1376 wide).
import { DOLL_SIZE, ITEM, Kind, Look, SLOTS, kindOf } from '../game/looks';

export type Mood = 'happy' | 'laugh' | 'want' | 'cry' | 'asleep';

/** Where the head top and the feet are on each doll's canvas (fractions of its height), from the art build. */
const SPAN: Record<Kind, [number, number]> = { kid: [44 / 740, 727 / 740], baby: [66 / 768, 734 / 768], adult: [67 / 768, 745 / 768] };
const NECK: Record<Kind, number> = { kid: 262 / 740, baby: 354 / 768, adult: 245 / 768 };

/** How tall someone stands, head to feet, in room pixels. */
export function figureHeight(age: number | 'adult'): number {
  if (age === 'adult' || age >= 16) return 300;
  if (age === 0) return 122;
  return age <= 4 ? 150 + age * 12 : 198 + (age - 4) * 8;
}

/** The doll's box: [width, height, feet offset from the box's bottom], for someone of this age at full height. */
export function dollBox(age: number | 'adult', height = figureHeight(age)): [number, number, number] {
  const kind = kindOf(age);
  const [top, feet] = SPAN[kind];
  const h = height / (feet - top);
  const [cw, ch] = DOLL_SIZE[kind];
  return [(h * cw) / ch, h, h * (1 - feet)];
}

const img = (src: string, extra = '') => `<img src="art/${src}.webp" alt="" draggable="false"${extra}>`;

/** The stacked layers for a doll. Order: things behind, body, bottoms, top, shoes, face, hair, glasses, hat, things in front. */
export function dollLayers(look: Look, age: number | 'adult', mood: Mood = 'happy'): string {
  const kind = kindOf(age);
  const worn = (slot: string) => {
    const id = look.outfit[slot as keyof Look['outfit']];
    return id && ITEM[id] && SLOTS[kind].includes(ITEM[id].slot) ? ITEM[id] : null;
  };
  const at = (slot: string) => { const it = worn(slot); return it ? img(`${kind}/${it.file}`) : ''; };
  const extra = worn('extra');
  const face = mood !== 'happy' && kind !== 'adult' ? img(`${kind}/face-${mood}-${look.skin}`) : '';
  return [
    extra?.back ? img(`${kind}/${extra.file}`) : '',
    img(`${kind}/body-${look.skin}`),
    at('suit'), at('outfit'), at('bottoms'), at('top'), at('shoes'),
    face,
    img(`${kind}/hair-${look.hair}-${look.hairColor}`),
    at('glasses'), at('head'), at('dummy'),
    extra && !extra.back ? img(`${kind}/${extra.file}`) : '',
  ].join('');
}

/** A whole doll in a box `height` tall (room pixels unless the caller scales it). */
export function doll(look: Look, age: number | 'adult', mood: Mood = 'happy', height = figureHeight(age)): string {
  const [w, h] = dollBox(age, height);
  return `<div class="doll" style="width:${w}px;height:${h}px">${dollLayers(look, age, mood)}</div>`;
}

/** Asleep in bed: the doll lies on its back, head on a pillow, a blanket up to the chin. `length` is head to toe. */
export function lyingDoll(look: Look, age: number | 'adult', length: number): string {
  const kind = kindOf(age);
  const [w, h] = dollBox(age, length);
  const neck = NECK[kind] * 100;
  return `<div class="lying" style="width:${h}px;height:${w}px">
    <div class="doll" style="width:${w}px;height:${h}px;transform:translate(${(h - w) / 2}px, ${(w - h) / 2}px) rotate(-90deg)">
      ${img('bedding/pillow', ` class="pillow" style="top:${neck * 0.05}%;height:${neck * 0.9}%"`)}
      ${dollLayers(look, age, 'asleep')}
      ${img('bedding/blanket', ` class="blanket" style="top:${neck - 2}%"`)}
    </div></div>`;
}

/** A painted grown-up who always looks the same (parents, helpers, Emily). */
export function sprite(src: string, size: [number, number], height = 300): string {
  const w = (height * size[0]) / size[1];
  return `<div class="doll" style="width:${w}px;height:${height}px">${img(src)}</div>`;
}
