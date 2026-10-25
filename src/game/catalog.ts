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

export type FurnId = 'slide' | 'ballpit' | 'trampoline' | 'fishtank' | 'teepee' | 'horse' | 'bath' | 'sandpit' | 'bunny' | 'teaparty' | 'playhouse';
export const FURNITURE: Record<FurnId, { name: string; e: string; floor: Floor; minAge: number }> = {
  slide: { name: 'Slide', e: '🛝', floor: 'down', minAge: 1 },
  ballpit: { name: 'Ball pit', e: '🔴', floor: 'down', minAge: 1 },
  trampoline: { name: 'Trampoline', e: '🤸', floor: 'down', minAge: 3 },
  fishtank: { name: 'Fish tank', e: '🐠', floor: 'up', minAge: 0 },
  teepee: { name: 'Teepee', e: '⛺', floor: 'up', minAge: 1 },
  horse: { name: 'Rocking horse', e: '🐴', floor: 'up', minAge: 1 },
  bath: { name: 'Bubble bath', e: '🛁', floor: 'up', minAge: 0 },
  sandpit: { name: 'Sandpit', e: '🏖️', floor: 'down', minAge: 1 },
  bunny: { name: 'Bunny', e: '🐰', floor: 'down', minAge: 1 },
  teaparty: { name: 'Tea party', e: '🫖', floor: 'down', minAge: 2 },
  playhouse: { name: 'Playhouse', e: '🏠', floor: 'up', minAge: 1 },
};
/** What each nursery level brings, from level 2 up. These never come as day rewards. */
export const LEVEL_UNLOCKS: FurnId[] = ['bath', 'sandpit', 'bunny', 'teaparty', 'playhouse'];
/** The nursery's level from all the hearts it has ever sent home: level 2 at 100, then 300, 600, 1000, 1500. */
export function levelFor(stars: number): number {
  let l = 1;
  while (stars >= 50 * l * (l + 1)) l++;
  return l;
}
export const starsFor = (level: number) => 50 * (level - 1) * level;

/** Wall colours Isabelle can paint each room. */
export const WALLS: [string, string][] = [['#ffe3cf', '#fbd2bd'], ['#d9c8f0', '#c6b1e6'], ['#d4f2e2', '#bfe6d0'], ['#d6ebff', '#bcdaf7'], ['#fff3c4', '#fbe7a1'], ['#ffd9e6', '#fbc3d6']];

/** Visiting children have a birthday every few days, and at 5 they leave for big school. */
export const GROW_EVERY = 5;
export const LEAVE_AGE = 5;
/** How much Isabelle does for a child before they like her more: one star at each. */
export const BOND_AT = [5, 15, 30, 50];

/** One surprise a real day: the calendar's own (Halloween, Christmas) or a treat. Each one is a sticker for the album. */
export type SurpriseId = 'halloween' | 'christmas' | 'snow' | 'eggs' | 'pyjamas' | 'teddies' | 'parcel' | 'balloons';
export const SURPRISES: Record<SurpriseId, { name: string; e: string; morning: string; wish: [Act, string] }> = {
  halloween: { name: 'Halloween', e: '🎃', morning: "It's Halloween! Look at all the pumpkins!", wish: ['snack', 'Give out 3 spooky snacks'] },
  christmas: { name: 'Christmas', e: '🎄', morning: "It's nearly Christmas! We've got a tree!", wish: ['cuddle', 'Give 3 Christmas cuddles'] },
  snow: { name: 'Snow day', e: '⛄', morning: "It snowed! There's a snowman in the garden!", wish: ['outside', 'Play in the snow 3 times'] },
  eggs: { name: 'Egg hunt', e: '🥚', morning: "It's spring! Someone hid eggs in the play room!", wish: ['outside', 'Hunt for eggs outside 3 times'] },
  pyjamas: { name: 'Pyjama day', e: '🛌', morning: "It's pyjama day! Comfy cushions everywhere!", wish: ['nap', 'Put 3 children down for a nap'] },
  teddies: { name: "Teddy bears' picnic", e: '🧸', morning: "It's the teddy bears' picnic today!", wish: ['cuddle', 'Give 3 teddy cuddles'] },
  parcel: { name: 'Parcel day', e: '📦', morning: 'A parcel came for the nursery! New clothes inside!', wish: ['painting', 'Paint 3 thank-you pictures'] },
  balloons: { name: 'Balloon day', e: '🎈', morning: "It's balloon day! Balloons everywhere!", wish: ['snack', 'Give out 3 party snacks'] },
};

export const MAX_CHILDREN = 16;
/** The day the nursery is full. */
export const FULL_DAY = 10;

export const BOY_NAMES = [
  'Max', 'Oscar', 'Leo', 'Alfie', 'Theo', 'Noah', 'Freddie', 'Arlo', 'Jack', 'Harry', 'Teddy', 'George', 'Finn', 'Archie', 'Sam',
  'Louie', 'Albie', 'Ezra', 'Reggie', 'Zak', 'Kai', 'Ollie', 'Hugo', 'Ravi', 'Henry', 'Charlie', 'Arthur', 'Jude', 'Rory', 'Otis',
  'Billy', 'Ronnie', 'Luca', 'Elijah', 'Stanley', 'Frankie', 'Idris', 'Ibrahim',
];
export const GIRL_NAMES = [
  'Lily', 'Ava', 'Rosie', 'Isla', 'Poppy', 'Ella', 'Mia', 'Grace', 'Daisy', 'Evie', 'Ruby', 'Willow', 'Maisie', 'Florence', 'Ivy',
  'Olivia', 'Sophie', 'Millie', 'Bella', 'Hana', 'Amara', 'Nia', 'Luna', 'Zara', 'Freya', 'Matilda', 'Phoebe', 'Esme', 'Alice',
  'Harriet', 'Martha', 'Elsie', 'Lottie', 'Clara', 'Iris', 'Nancy', 'Aisha', 'Priya',
];
