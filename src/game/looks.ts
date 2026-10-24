// What people can look like: painted paper dolls (baby, kid, grown-up), their hairstyles, hair colours, skin tones,
// and the clothes that fit each doll. The lists come from the art build (public/art/manifest.json).
import manifest from '../../public/art/manifest.json' with { type: 'json' };
import { Rng, pick } from './world';

export type Kind = 'baby' | 'kid' | 'adult';
export type Sex = 'boy' | 'girl';
/** Babies are newborns; children up to 15 use the kid doll; 16 and over (and every grown-up) the adult doll. */
export const kindOf = (age: number | 'adult'): Kind => (age === 'adult' || age >= 16 ? 'adult' : age === 0 ? 'baby' : 'kid');

export type Slot = 'head' | 'glasses' | 'top' | 'bottoms' | 'shoes' | 'extra' | 'suit' | 'dummy' | 'outfit';
export const SLOTS: Record<Kind, Slot[]> = {
  baby: ['head', 'suit', 'dummy'],
  kid: ['head', 'glasses', 'top', 'bottoms', 'shoes', 'extra'],
  adult: ['head', 'outfit'],
};
export const SLOT_LABEL: Record<Slot, string> = {
  head: 'Hats', glasses: 'Glasses', top: 'Tops', bottoms: 'Bottoms', shoes: 'Shoes', extra: 'Extras', suit: 'Bodysuits', dummy: 'Dummies', outfit: 'Outfits',
};
/** Slots a doll can't go without: no bare doll walking about in a vest. */
export const NEEDED: Slot[] = ['top', 'bottoms', 'shoes', 'suit', 'outfit'];

export type Item = { id: string; kind: Kind; slot: Slot; name: string; file: string; back?: boolean; for?: Sex };
type Raw = { id: string; cat: string; name: string; z?: string };
const slotOf = (cat: string): Slot => (cat === 'hat' || cat === 'headband' ? 'head' : (cat as Slot));

/** Clothes painted for girls or for boys; everything else is for anyone. */
const OUTFIT_FOR: Record<string, Sex> = {
  'kid:3': 'girl', 'kid:10': 'girl', 'kid:17': 'girl', 'kid:18': 'girl', 'kid:19': 'girl', 'kid:20': 'girl', 'kid:21': 'girl', 'kid:22': 'girl',
  'kid:11': 'boy', 'kid:12': 'boy', 'kid:13': 'boy', 'kid:14': 'boy', 'kid:15': 'boy', 'kid:16': 'boy', 'kid:9': 'boy',
  'baby:3': 'girl', 'baby:7': 'girl', 'baby:8': 'girl', 'baby:5': 'boy', 'baby:6': 'boy',
};
/** Single pieces that differ from their outfit (a pink tutu in an otherwise anyone outfit, sunglasses anyone can wear). */
const PIECE_FOR: Record<string, Sex | null> = {
  'kid:bottoms-2': 'girl', 'kid:headband-6': 'girl', 'kid:bottoms-6': 'girl', 'kid:headband-8': 'girl', 'kid:top-8': 'girl', 'kid:bottoms-8': 'girl',
  'kid:shoes-8': 'girl', 'kid:extra-wings': 'girl', 'kid:glasses-15': null, 'kid:hat-13': null, 'kid:top-9': null, 'baby:head-4': 'girl',
};
function sexOf(kind: Kind, file: string): Sex | undefined {
  const id = `${kind}:${file}`;
  if (id in PIECE_FOR) return PIECE_FOR[id] ?? undefined;
  return OUTFIT_FOR[`${kind}:${file.split('-')[1]}`];
}

export const ITEMS: Item[] = (['baby', 'kid', 'adult'] as Kind[]).flatMap((kind) =>
  (manifest[kind].items as Raw[]).map((r) => ({ id: `${kind}:${r.id}`, kind, slot: slotOf(r.cat), name: r.name, file: r.id, back: r.z === 'back', for: kind === 'adult' ? undefined : sexOf(kind, r.id) })));
export const fits = (it: Item, sex: Sex) => !it.for || it.for === sex;
export const ITEM: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export const HAIR: Record<Kind, string[]> = { baby: manifest.baby.hair, kid: manifest.kid.hair, adult: manifest.adult.hair };
/** Hairstyles new boys usually get (any child can change to any style in the wardrobe). */
const BOY_HAIR = ['short', 'spiky', 'curly', 'wisps', 'curls'];
export const HAIR_COLOURS: Record<string, string> = {
  black: '#2a1d17', darkbrown: '#4a2f20', brown: '#7b4c2c', auburn: '#9c4a2a', ginger: '#d07a3c', blonde: '#e3bf6e', platinum: '#efe0b4',
};
export const SKIN_TONES = ['#ffe3cc', '#f6cfa9', '#e6b48a', '#c98d63', '#9a6540', '#6b4329'];
export const DOLL_SIZE: Record<Kind, [number, number]> = { baby: manifest.baby.size as [number, number], kid: manifest.kid.size as [number, number], adult: manifest.adult.size as [number, number] };

/** Face details chosen in the wardrobe; anything missing comes from the person's own fixed defaults. Old saves have none. */
export type FaceLook = Partial<{
  eyes: string; eyeShape: string; eyeSize: number; eyeGap: number; lashes: string; brows: string; browColour: string;
  browHeight: number; browTilt: number; nose: string; mouth: string; freckles: boolean; blush: number;
}>;
export type Look = { skin: number; hair: string; hairColor: string; outfit: Partial<Record<Slot, string>>; face?: FaceLook };

/** Starting clothes: the first painted outfits; the rest unlock day by day and through wishes. */
const STARTER_OUTFITS: Record<Kind, number[]> = { baby: [1, 2], kid: [1, 2, 3, 4], adult: [1, 2] };
export const STARTER: string[] = ITEMS.filter((i) => i.slot === 'dummy' || STARTER_OUTFITS[i.kind].includes(Number(i.file.split('-')[1]))).map((i) => i.id);

export const itemsFor = (kind: Kind, slot: Slot) => ITEMS.filter((i) => i.kind === kind && i.slot === slot);

/** A random look from what's unlocked: always dressed, sometimes a hat, glasses or a dummy. */
export function randomLook(rng: Rng, kind: Kind, unlocked: string[], skin = Math.floor(rng() * SKIN_TONES.length), sex: Sex = 'girl'): Look {
  const outfit: Look['outfit'] = {};
  for (const slot of SLOTS[kind]) {
    const options = itemsFor(kind, slot).filter((i) => unlocked.includes(i.id) && fits(i, sex));
    if (!options.length) continue;
    const chance = NEEDED.includes(slot) ? 1 : slot === 'dummy' ? 0.5 : slot === 'extra' ? 0.1 : 0.3;
    if (rng() < chance) outfit[slot] = pick(rng, options).id;
  }
  const hair = HAIR[kind].filter((h) => kind === 'adult' || BOY_HAIR.includes(h) === (sex === 'boy') || h === 'curly');
  return { skin, hair: pick(rng, hair), hairColor: pick(rng, Object.keys(HAIR_COLOURS)), outfit };
}

/** A child growing into a new doll (baby to kid, kid to grown-up) keeps their hair colour and skin, and gets clothes that fit. */
export function regrow(look: Look, from: Kind, to: Kind, unlocked: string[], rng: Rng, sex: Sex = 'girl'): Look {
  if (from === to) return look;
  const fresh = randomLook(rng, to, unlocked, look.skin, sex);
  return { ...fresh, hairColor: look.hairColor, hair: HAIR[to].includes(look.hair) ? look.hair : fresh.hair };
}
