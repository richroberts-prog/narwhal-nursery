// What parents say at drop-off and pick-up. Short lines, names instead of he or she.
import { ACTS, Act, favourite } from './catalog';
import { Child, Rng, pick } from './world';

const TIP: Record<Act, [string, string]> = {
  cuddle: ['{n} is a bit shy. A cuddle helps!', '{n} likes the big comfy chair in the baby room.'],
  nap: ['{n} gets sleepy. Naps are the best!', '{n} sleeps best in a cot with a blanket.'],
  bottle: ['{n} is always hungry. Lots of milk please!', '{n} drinks the whole bottle every time!'],
  snack: ['{n} is always hungry!', 'A snack makes {n} smile.'],
  painting: ['{n} loves painting!', '{n} paints rainbows and cats.'],
  blocks: ['{n} loves building blocks!', '{n} builds the tallest towers.'],
  song: ['{n} loves a sing-song!', 'Twinkle Twinkle is the favourite.'],
  outside: ['{n} has lots of energy. Playing outside is best!', '{n} loves running in the garden.'],
  story: ['{n} loves stories!', '{n} likes stories about animals.'],
  dressup: ['{n} loves dressing up!', 'Crowns are the favourite.'],
  potty: ['{n} is learning to use the potty!', 'Remind {n} every now and then.'],
  nappy: ['{n} needs lots of nappy changes!', 'The spare nappies are in the bag.'],
  play: ['{n} loves to play!', '{n} likes everything!'],
};

const fill = (s: string, c: Child) => s.replaceAll('{n}', c.name);
const ageWords = (age: number) => (age === 0 ? 'a newborn' : `${age}`);

export const tip = (c: Child) => fill(TIP[favourite(c.pers, c.age)][0], c);
export const tipMore = (c: Child) => fill(TIP[favourite(c.pers, c.age)][1], c);

export function hello(kids: Child[], first: boolean): string {
  const names = kids.map((k) => k.name);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  if (!first) return `Morning Isabelle! ${list} ${names.length === 1 ? 'is' : 'are'} here again!`;
  if (kids.length === 1) return `Hi Isabelle! This is ${kids[0].name}. ${kids[0].name} is ${ageWords(kids[0].age)}.`;
  return `Hi Isabelle! These are ${kids.map((k) => `${k.name} (${k.age === 0 ? 'newborn' : k.age})`).join(' and ')}.`;
}

export const didLabel = (a: Act) => `${ACTS[a].e} ${ACTS[a].label}`;
export const reaction = (rng: Rng, a: Act) => `${ACTS[a].label}? ${pick(rng, ['How lovely!', 'Wonderful!', 'Yay!', 'That sounds fun!'])}`;

export function heartsLine(c: Child, hearts: number): string {
  if (hearts >= 4) return `${c.name} looks so happy! Thank you!`;
  if (hearts >= 2.5) return `Thanks for looking after ${c.name}!`;
  return `${c.name} looks a bit tired. See you tomorrow!`;
}

// --- smarter parents: their own day, yesterday, and checking on this morning's tip ---

export const smallTalk = (rng: Rng) => pick(rng, [
  "I'm off to work at the bakery. It smells so good there!",
  'We saw a fox on the way here!',
  "It's raining cats and dogs out there!",
  "I've got a big meeting today. Wish me luck!",
  'We had pancakes for breakfast!',
  "I'm going to the dentist. Eek!",
  'The bus was so busy this morning!',
  'Grandma is coming for tea later!',
]);

export const homeTalk = (rng: Rng) => pick(rng, [
  "We're off to the park now!",
  "It's fish fingers for tea tonight!",
  'Time for a bath and bed!',
  "We're visiting Grandad on the way home.",
  'I missed you all day!',
]);

export function yesterday(c: Child, hearts: number | undefined): string | null {
  if (hearts === undefined) return null;
  if (hearts >= 4) return `${c.name} had the best day yesterday! Thank you!`;
  if (hearts >= 2.5) return `${c.name} liked it here yesterday.`;
  return `${c.name} was a bit sad yesterday. I hope today is better!`;
}

const DID_YOU: Record<Act, string> = {
  bottle: 'have lots of milk', nappy: 'get changed', nap: 'have a good nap', cuddle: 'get a cuddle', snack: 'have a snack',
  blocks: 'play with blocks', song: 'have a sing-song', painting: 'do some painting', dressup: 'dress up', story: 'hear a story',
  outside: 'play outside', potty: 'use the potty', play: 'play',
};

/** At pick-up the parent checks on this morning's tip. */
export const checkTip = (c: Child) => `Did ${c.name} ${DID_YOU[favourite(c.pers, c.age)]} today?`;

export function tipAnswer(c: Child, saidYes: boolean, didIt: boolean): string {
  if (saidYes && didIt) return 'Brilliant! Thank you for remembering!';
  if (saidYes) return `Hmm, ${c.name} says no! Maybe tomorrow.`;
  if (didIt) return `${c.name} says yes! You forgot. Silly!`;
  return "That's okay. Maybe tomorrow!";
}

/** Two children chatting: a question or idea, and an answer. Little ones (2 and 3) keep it short. */
const KID_TALK: [string, string][] = [
  ['Want to play with me, {b}?', 'Yes! Let\'s play!'], ['I like your clothes, {b}!', 'Thank you! I like yours!'],
  ['Look, {b}! I can jump!', 'Wow! Me too!'], ['You\'re my best friend, {b}!', 'You\'re mine too, {a}!'],
  ['Let\'s build a big tower!', 'The biggest ever!'], ['Rawr! I\'m a dinosaur!', 'Aaah! Run!'],
  ['Do you like cookies, {b}?', 'I love cookies!'], ['Race you, {b}!', 'Ready, steady, go!'],
  ['What\'s your favourite colour?', 'Pink! No, blue! Both!'], ['Can I have a turn, {b}?', 'OK! Here you go!'],
  ['Let\'s play mummies and babies!', 'I\'ll be the mummy!'], ['I drew a rainbow!', 'So pretty, {a}!'],
];
const LITTLE_TALK: [string, string][] = [['Hi {b}!', 'Hiya!'], ['Play?', 'Yay!'], ['Look! Ball!', 'Ball!'], ['Me hug!', 'Hug!']];
export function kidTalk(rng: Rng, a: Child, b: Child): [string, string] {
  const [x, y] = pick(rng, a.age <= 3 || b.age <= 3 ? LITTLE_TALK : KID_TALK);
  const put = (s: string) => s.replaceAll('{a}', a.name).replaceAll('{b}', b.name);
  return [put(x), put(y)];
}

/** A parent at pick-up asks to take their child's best friend home to play. */
export const playdateAsk = (c: Child, friend: Child, friendParent: string) =>
  `${c.name} and ${friend.name} are best friends! Can ${friend.name} come to ours to play? I've told ${friend.name}'s ${friendParent}.`;

/** A 5-year-old's last day, at pick-up. */
export const leavingLine = (c: Child) => `${c.name} is 5 and off to big school! Thank you for everything, Isabelle!`;

/** What a child says when they like Isabelle a little more (friendship stars 1 to 4). */
export const bondLine = (stars: number) => [
  '', 'I like you, Isabelle! 💛', 'Big hug, Isabelle! 🤗', 'I drew you a picture, Isabelle! 🖍️', "You're my best teacher, Isabelle! 💖",
][Math.max(0, Math.min(4, stars))];
