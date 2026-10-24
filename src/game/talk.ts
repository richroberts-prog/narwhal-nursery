// What parents say at drop-off and pick-up. Short lines, names instead of he or she.
import { ACTS, Act, favourite } from './catalog';
import { Child, Rng, pick } from './world';

const TIP: Record<Act, [string, string]> = {
  cuddle: ['{n} is a bit shy. A cuddle helps!', '{n} likes the big comfy chair upstairs.'],
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
