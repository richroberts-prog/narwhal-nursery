// Activities, personalities, helpers, furniture and names: the fixed lists the game draws from. Clothes are in looks.ts.

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
