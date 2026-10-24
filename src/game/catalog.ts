// Clothes, activities, helpers, furniture and names: the fixed lists the game draws from.

export type Cat = 'hat' | 'headband' | 'dummy' | 'top' | 'bottoms' | 'shoes';
export const CATS: Cat[] = ['hat', 'headband', 'dummy', 'top', 'bottoms', 'shoes'];
export const CAT_LABEL: Record<Cat, string> = { hat: 'Hats', headband: 'Headbands', dummy: 'Dummies', top: 'Tops', bottoms: 'Bottoms', shoes: 'Shoes' };

export type Pat = 'stripes' | 'dots' | 'rainbow' | 'stars' | 'sparkle' | 'lights';
export type Item = { id: string; cat: Cat; name: string; kind: string; c: string; c2?: string; pat?: Pat };

type Row = [name: string, kind: string, c: string, c2?: string, pat?: Pat];
const rows = (cat: Cat, list: Row[]): Item[] => list.map(([name, kind, c, c2, pat], i) => ({ id: `${cat}${i}`, cat, name, kind, c, c2, pat }));

// Per category: 0-5 from day 1, 6-11 unlock one a day, 12-14 only come as a reward.
export const ITEMS: Record<Cat, Item[]> = {
  hat: rows('hat', [
    ['No hat', 'none', ''], ['Pink beanie', 'beanie', '#f7a8c4'], ['Blue beanie', 'beanie', '#8ec5f0'], ['Sun hat', 'sunhat', '#f9dc6b'],
    ['Red cap', 'cap', '#ef6f6c'], ['Bonnet', 'bonnet', '#ffffff', '#ffb3c8'],
    ['Party hat', 'party', '#b69cf0', '#ffe066'], ['Crown', 'crown', '#f5c542'], ['Bunny hat', 'bunny', '#f3eef8', '#ffb3c8'],
    ['Cowboy hat', 'cowboy', '#b9835a'], ['Flower crown', 'flowers', '#ff9ecf', '#ffe066'], ['Wizard hat', 'wizard', '#5a6ee0', '#ffe066'],
    ['Silver crown', 'crown', '#d5dbe6'], ['Pink cowboy hat', 'cowboy', '#f7a8c4'], ['Mint wizard hat', 'wizard', '#7fd6b5', '#ffffff'],
  ]),
  headband: rows('headband', [
    ['No headband', 'none', ''], ['Pink bow', 'bow', '#ff8fb8'], ['Red bow', 'bow', '#e94f4f'], ['Flower band', 'flower', '#ffd84d', '#ff9ecf'],
    ['Star band', 'star', '#ffd84d', '#6aa7e8'], ['Purple band', 'plain', '#a77de8'],
    ['Unicorn horn', 'unicorn', '#fff2a8', '#ffb3e0'], ['Cat ears', 'cat', '#555555', '#ffb3c8'], ['Rainbow band', 'rainbow', '#ff6b6b'],
    ['Heart band', 'heart', '#ff5d8f', '#ffb3c8'], ['Sparkle band', 'sparkle', '#c9a7ff', '#ffffff'], ['Butterfly band', 'butterfly', '#7ec8ff', '#ffd84d'],
    ['Gold bow', 'bow', '#f5c542'], ['Bunny ears', 'bunnyears', '#ffffff', '#ffb3c8'], ['Blue flower band', 'flower', '#8ec5f0', '#ffffff'],
  ]),
  dummy: rows('dummy', [
    ['No dummy', 'none', ''], ['Pink dummy', 'plain', '#ff8fb8'], ['Blue dummy', 'plain', '#6fb6ff'], ['Yellow dummy', 'plain', '#ffd84d'],
    ['Green dummy', 'plain', '#6fd39b'], ['Purple dummy', 'plain', '#b48cf0'],
    ['Star dummy', 'star', '#6aa7e8', '#ffd84d'], ['Heart dummy', 'heart', '#ffffff', '#ff5d8f'], ['Rainbow dummy', 'plain', '#ff6b6b', undefined, 'rainbow'],
    ['Gold dummy', 'plain', '#f5c542'], ['Mint dummy', 'plain', '#8fe3cf'], ['Panda dummy', 'panda', '#ffffff', '#333333'],
    ['Glitter dummy', 'star', '#ff8fb8', '#ffffff'], ['Orange dummy', 'plain', '#ffa552'], ['Sky dummy', 'heart', '#8ec5f0', '#ffffff'],
  ]),
  top: rows('top', [
    ['Pink top', 'tee', '#f7a8c4'], ['Blue top', 'tee', '#8ec5f0'], ['Yellow top', 'tee', '#f9dc6b'], ['Green top', 'tee', '#8fd6a0'],
    ['Stripy top', 'tee', '#ffffff', '#3d5a99', 'stripes'], ['Spotty top', 'tee', '#ef6f6c', '#ffffff', 'dots'],
    ['Rainbow top', 'tee', '#ff6b6b', undefined, 'rainbow'], ['Star top', 'star', '#3d5a99', '#ffd84d'], ['Dino top', 'dino', '#8fd6a0', '#3f9a5a'],
    ['Heart top', 'heart', '#ffffff', '#ff5d8f'], ['Purple stripes', 'tee', '#c9a7ff', '#ffffff', 'stripes'], ['Orange top', 'tee', '#ffa552'],
    ['Gold star top', 'star', '#ffffff', '#f5c542'], ['Mint spotty top', 'tee', '#8fe3cf', '#ffffff', 'dots'], ['Red stripes', 'tee', '#ffffff', '#e94f4f', 'stripes'],
  ]),
  bottoms: rows('bottoms', [
    ['Blue trousers', 'trousers', '#5b8fd6'], ['Pink skirt', 'skirt', '#f7a8c4'], ['Green shorts', 'shorts', '#6fbf73'], ['Yellow skirt', 'skirt', '#f9dc6b'],
    ['Jeans', 'trousers', '#4a6fa5'], ['Grey trousers', 'trousers', '#9aa3ad'],
    ['Tutu', 'tutu', '#ffc2e0'], ['Rainbow leggings', 'trousers', '#ff6b6b', undefined, 'rainbow'], ['Red shorts', 'shorts', '#e94f4f'],
    ['Purple skirt', 'skirt', '#b48cf0'], ['Star trousers', 'trousers', '#3d5a99', '#ffd84d', 'stars'], ['Spotty skirt', 'skirt', '#ef6f6c', '#ffffff', 'dots'],
    ['Gold tutu', 'tutu', '#f5c542'], ['Mint shorts', 'shorts', '#8fe3cf'], ['Stripy trousers', 'trousers', '#ffffff', '#ef6f6c', 'stripes'],
  ]),
  shoes: rows('shoes', [
    ['White shoes', 'shoe', '#ffffff'], ['Pink shoes', 'shoe', '#ff8fb8'], ['Blue shoes', 'shoe', '#6fb6ff'], ['Red shoes', 'shoe', '#e94f4f'],
    ['Yellow shoes', 'shoe', '#ffd84d'], ['Black shoes', 'shoe', '#333333'],
    ['Sparkly shoes', 'shoe', '#d5dbe6', '#ffffff', 'sparkle'], ['Green wellies', 'wellies', '#4cc38a'], ['Light-up shoes', 'shoe', '#6fb6ff', '#ffe066', 'lights'],
    ['Gold shoes', 'shoe', '#f5c542'], ['Rainbow shoes', 'shoe', '#ff6b6b', undefined, 'rainbow'], ['Bunny slippers', 'slippers', '#ffffff', '#ffb3c8'],
    ['Pink wellies', 'wellies', '#ff8fb8'], ['Purple sparkly shoes', 'shoe', '#b48cf0', '#ffffff', 'sparkle'], ['Yellow wellies', 'wellies', '#ffd84d'],
  ]),
};
export const ITEM: Record<string, Item> = Object.fromEntries(CATS.flatMap((c) => ITEMS[c]).map((i) => [i.id, i]));

export const STARTER: string[] = CATS.flatMap((c) => ITEMS[c].slice(0, 6).map((i) => i.id));
/** One a day per category in turn: day 2 gets a hat, a headband and a dummy; day 3 a top, bottoms and shoes. */
export const DAILY: string[] = [6, 7, 8, 9, 10, 11].flatMap((n) => CATS.map((c) => `${c}${n}`));
export const SPECIAL: string[] = [12, 13, 14].flatMap((n) => CATS.map((c) => `${c}${n}`));

export type Act = 'bottle' | 'nappy' | 'nap' | 'cuddle' | 'snack' | 'blocks' | 'song' | 'painting' | 'dressup' | 'story' | 'outside' | 'potty' | 'play';
export type Floor = 'down' | 'up';

export const ACTS: Record<Act, { e: string; label: string; want: string; place: string; floor: Floor }> = {
  bottle: { e: '🍼', label: 'Bottle', want: 'a bottle', place: 'milk fridge', floor: 'up' },
  nappy: { e: '🧷', label: 'Nappy change', want: 'a nappy change', place: 'changing table', floor: 'up' },
  nap: { e: '😴', label: 'Nap', want: 'a nap', place: 'cots', floor: 'up' },
  cuddle: { e: '🤗', label: 'Cuddle', want: 'a cuddle', place: 'cuddle chair', floor: 'up' },
  snack: { e: '🍪', label: 'Snack', want: 'a snack', place: 'kitchen', floor: 'down' },
  blocks: { e: '🧱', label: 'Blocks', want: 'to play blocks', place: 'toy box', floor: 'down' },
  song: { e: '🎵', label: 'Sing-song', want: 'a sing-song', place: 'piano', floor: 'down' },
  painting: { e: '🎨', label: 'Painting', want: 'to paint', place: 'easel', floor: 'down' },
  dressup: { e: '👑', label: 'Dressing up', want: 'to dress up', place: 'dress-up box', floor: 'down' },
  story: { e: '📖', label: 'Story', want: 'a story', place: 'bookshelf', floor: 'down' },
  outside: { e: '🌳', label: 'Playing outside', want: 'to play outside', place: 'garden door', floor: 'down' },
  potty: { e: '🚽', label: 'Potty', want: 'the potty', place: 'potty door', floor: 'down' },
  play: { e: '🛝', label: 'Playing', want: 'to play', place: 'new toys', floor: 'down' },
};

/** What each age can do. Cuddles and naps are for everyone so shy and sleepy big kids have theirs. */
export function allowed(age: number): Act[] {
  if (age === 0) return ['bottle', 'nappy', 'nap', 'cuddle'];
  if (age <= 2) return ['bottle', 'nappy', 'nap', 'cuddle', 'snack', 'blocks', 'song'];
  return ['snack', 'painting', 'dressup', 'story', 'outside', 'potty', 'cuddle', 'nap'];
}
/** Furniture fun counts for any of these needs. */
export const FUN: Act[] = ['blocks', 'song', 'painting', 'dressup', 'outside'];

export type Personality = 'shy' | 'wild' | 'sleepy' | 'hungry' | 'creative' | 'chatty';
export const PERSONALITIES: Record<Personality, { e: string; label: string; likes: Act[] }> = {
  shy: { e: '🙈', label: 'Shy', likes: ['cuddle'] },
  wild: { e: '⚡', label: 'Wild', likes: ['outside', 'blocks', 'song', 'cuddle'] },
  sleepy: { e: '🌙', label: 'Sleepy', likes: ['nap'] },
  hungry: { e: '😋', label: 'Hungry', likes: ['snack', 'bottle'] },
  creative: { e: '🖍️', label: 'Creative', likes: ['painting', 'blocks', 'song', 'cuddle'] },
  chatty: { e: '💬', label: 'Chatty', likes: ['story', 'song', 'cuddle'] },
};
/** The favourite thing: the first thing the personality likes that the age allows (every list ends in a cuddle, which all ages can have). */
export const favourite = (p: Personality, age: number): Act => PERSONALITIES[p].likes.find((a) => allowed(age).includes(a)) ?? 'cuddle';

export type HelperId = 'nappy' | 'snack' | 'nap' | 'play' | 'art' | 'story';
export const HELPERS: Record<HelperId, { name: string; e: string; job: string; acts: Act[]; floor: Floor; c: string }> = {
  nappy: { name: 'Nappy Helper', e: '🧷', job: 'Changes nappies and helps with the potty', acts: ['nappy', 'potty'], floor: 'up', c: '#8ec5f0' },
  snack: { name: 'Snack Helper', e: '🍪', job: 'Gives out snacks and bottles', acts: ['snack', 'bottle'], floor: 'down', c: '#ffa552' },
  nap: { name: 'Nap Helper', e: '😴', job: 'Puts sleepy children down for a nap', acts: ['nap'], floor: 'up', c: '#b48cf0' },
  play: { name: 'Play Helper', e: '🧱', job: 'Plays blocks, songs and outside', acts: ['blocks', 'song', 'outside'], floor: 'down', c: '#6fbf73' },
  art: { name: 'Art Helper', e: '🎨', job: 'Does painting and dressing up', acts: ['painting', 'dressup'], floor: 'down', c: '#ff8fb8' },
  story: { name: 'Story Helper', e: '📖', job: 'Reads stories and gives cuddles', acts: ['story', 'cuddle'], floor: 'down', c: '#ffd84d' },
};
export const MAX_HELPERS = 4;

export type FurnId = 'slide' | 'ballpit' | 'trampoline' | 'fishtank' | 'teepee' | 'horse';
export const FURNITURE: Record<FurnId, { name: string; e: string; floor: Floor; minAge: number }> = {
  slide: { name: 'Slide', e: '🛝', floor: 'down', minAge: 1 },
  ballpit: { name: 'Ball pit', e: '🔴', floor: 'down', minAge: 1 },
  trampoline: { name: 'Trampoline', e: '🤸', floor: 'down', minAge: 3 },
  fishtank: { name: 'Fish tank', e: '🐠', floor: 'up', minAge: 0 },
  teepee: { name: 'Teepee', e: '⛺', floor: 'up', minAge: 1 },
  horse: { name: 'Rocking horse', e: '🐴', floor: 'up', minAge: 1 },
};

export const MAX_CHILDREN = 22;

export const NAMES = [
  'Max', 'Lily', 'Oscar', 'Ava', 'Leo', 'Rosie', 'Alfie', 'Isla', 'Theo', 'Poppy', 'Noah', 'Ella', 'Freddie', 'Mia', 'Arlo', 'Grace',
  'Jack', 'Daisy', 'Harry', 'Evie', 'Teddy', 'Ruby', 'George', 'Willow', 'Finn', 'Maisie', 'Archie', 'Florence', 'Sam', 'Ivy',
  'Louie', 'Olivia', 'Albie', 'Sophie', 'Ezra', 'Millie', 'Reggie', 'Bella', 'Zak', 'Hana', 'Kai', 'Amara', 'Ollie', 'Nia',
];
export const SKINS = ['#ffe3cc', '#f6cfa9', '#e6b48a', '#c98d63', '#9a6540', '#6b4329'];
export const HAIR_COLOURS = ['#3b2a20', '#6b4226', '#a0522d', '#e8c170', '#1d1d1d', '#c96a3b', '#f2dc9b'];
export const KID_HAIR = ['short', 'long', 'pigtails', 'curly', 'bun'];
