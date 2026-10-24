import { Page, expect, test } from '@playwright/test';
import { CLOSE, newDay } from '../src/game/day';
import { KEY } from '../src/game/save';
import { newWorld, nextDay } from '../src/game/world';

const SHOTS = process.env.SHOTS;

// Any script error fails the test: a frozen chat once came from one.
let errors: string[] = [];
test.beforeEach(({ page }) => { errors = []; page.on('pageerror', (e) => errors.push(e.message)); });
test.afterEach(() => expect(errors).toEqual([]));
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${test.info().project.name}-${name}.png` });
}

/** Answer a chat at the desk by tapping the first button until it closes. */
async function chat(page: Page) {
  await expect(page.locator('.chat')).toBeVisible();
  for (let i = 0; i < 20 && (await page.locator('.chat').count()); i++) {
    await page.locator('.choice').first().tap();
    await page.waitForTimeout(60);
  }
  await expect(page.locator('.chat')).toHaveCount(0);
}

const onDown = (page: Page) => page.locator('.floor.down.show').count().then((n) => n > 0);

async function goFloor(page: Page, floor: 'down' | 'up') {
  if ((await onDown(page)) === (floor === 'down')) return;
  await page.locator(`.floor.show [data-st="${floor === 'up' ? 'stairsUp' : 'stairsDown'}"]`).tap();
  await expect(page.locator(`.floor.${floor}.show`)).toHaveCount(1);
}

/** Greet or say goodbye to everyone waiting at the desk. */
async function serveDesk(page: Page) {
  while (await page.locator('.p.parent.front').count()) {
    await goFloor(page, 'down');
    await page.locator('.p.parent.front').tap();
    await chat(page);
  }
}

/** Meet one need like a player: tap the child, then the thing (changing floor if needed). Returns false if nobody needs anything. */
async function careOnce(page: Page): Promise<boolean> {
  const needy = page.locator('.p.kid:has(.bubble[data-need]:not([data-need=""]))');
  if (!(await needy.count())) return false;
  let kid = page.locator('.p.kid:not(.away):has(.bubble[data-need]:not([data-need=""]))').first();
  if (!(await kid.count())) {
    await goFloor(page, (await onDown(page)) ? 'up' : 'down');
    kid = page.locator('.p.kid:not(.away):has(.bubble[data-need]:not([data-need=""]))').first();
  }
  const need = (await kid.locator('.bubble').getAttribute('data-need'))!;
  await kid.tap();
  await expect(kid).toHaveClass(/sel/);
  const where = need === 'bottle' || need === 'nappy' || need === 'nap' || need === 'cuddle' ? 'up' : 'down';
  await goFloor(page, where);
  await page.locator(`.floor.show [data-act="${need}"]`).first().tap();
  await page.waitForTimeout(750);
  return true;
}

async function play(page: Page) {
  await page.goto('/');
  await page.locator('.play').tap();
  await expect(page.locator('.time')).toHaveText('8:00am');
}

test('day 1: greet, care, skip, pick up, next day, and it saves', async ({ page }) => {
  await page.goto('/');
  await shot(page, '01-start');
  await page.locator('.play').tap();
  await expect(page.locator('.dayno')).toHaveText('Day 1');
  await shot(page, '02-room');

  // ⏩ waits until the desk is served.
  await page.locator('.skip').tap();
  await expect(page.locator('.say p')).toContainText('desk first');
  await serveDesk(page);
  await expect(page.locator('.p.kid')).toHaveCount(3);

  // Care until home time, skipping when nobody needs anything.
  let cared = 0;
  for (let i = 0; i < 200 && !(await page.locator('.night').count()); i++) {
    if (await page.locator('.p.parent.front').count()) { await serveDesk(page); continue; }
    if (cared < 8 && (await careOnce(page))) { cared++; if (cared === 2) await shot(page, '03-care'); continue; }
    await page.locator('.skip').tap();
    await page.waitForTimeout(50);
  }
  expect(cared).toBeGreaterThan(3);
  await expect(page.locator('.night')).toBeVisible();
  await expect(page.locator('.night h2')).toHaveText('Day 1 done! 🌙');
  await expect(page.locator('.kc')).toHaveCount(3);
  await shot(page, '04-night');
  await page.locator('.next').tap();
  await expect(page.locator('.dayno')).toHaveText('Day 2');
  await expect(page.locator('.say p')).toContainText('New in the wardrobe');

  await page.reload();
  await expect(page.locator('.play small')).toHaveText('Day 2');
});

test('a parent tells you a tip and asks what the child did', async ({ page }) => {
  await play(page);
  await page.locator('.p.parent.front').tap();
  await expect(page.locator('.speech p')).toContainText('Hi Isabelle!');
  await page.locator('.choice').first().tap();
  await expect(page.locator('.choice').nth(1)).toHaveText('Tell me more');
  await shot(page, '05-chat');
  await chat(page);
});

test('wardrobe: rename a child, dress them, and it sticks', async ({ page }) => {
  await play(page);
  await serveDesk(page);
  await goFloor(page, 'up');
  await page.locator('[data-st="wardrobe"]').tap();
  await expect(page.locator('.modal .wardrobe')).toBeVisible();
  await page.locator('.who').nth(1).tap();
  await page.locator('.preview .name').fill('Sparkle');
  await page.locator('.preview .name').press('Enter');
  await page.locator('.tab', { hasText: 'Hats' }).tap();
  await page.locator('.item[aria-label="Sun hat"]').tap();
  await expect(page.locator('.item[aria-label="Sun hat"]')).toHaveClass(/on/);
  await page.locator('.tab', { hasText: 'Headbands' }).tap();
  await page.locator('.item[aria-label="Star band"]').tap();
  await shot(page, '06-wardrobe');
  await page.locator('.item.locked').first().tap();
  await page.locator('.done').tap();
  await expect(page.locator('.p.kid .tag', { hasText: 'Sparkle' })).toHaveCount(1);
  await page.reload();
  await page.locator('.play').tap();
  await expect(page.locator('.p.kid .tag', { hasText: 'Sparkle' })).toHaveCount(1);
});

test('dummies only for 2 and under; Isabelle has no dummy tab', async ({ page }) => {
  await play(page);
  await serveDesk(page);
  await goFloor(page, 'up');
  await page.locator('[data-st="wardrobe"]').tap();
  await expect(page.locator('.tab', { hasText: 'Dummies' })).toHaveCount(0);
  const ages = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).world.children.map((c: { age: number }) => c.age), KEY);
  for (let i = 0; i < ages.length; i++) {
    await page.locator('.who').nth(i + 1).tap();
    await expect(page.locator('.tab', { hasText: 'Dummies' })).toHaveCount(ages[i] <= 2 ? 1 : 0);
  }
});

test('start again asks first, then wipes', async ({ page }) => {
  await play(page);
  await serveDesk(page);
  await page.reload();
  await page.locator('.again').tap();
  await expect(page.locator('.confirm h2')).toHaveText('Are you sure?');
  await page.locator('.no').tap();
  await page.locator('.again').tap();
  await page.locator('.yes').tap();
  await expect(page.locator('.dayno')).toHaveText('Day 1');
  await expect(page.locator('.p.kid')).toHaveCount(0);
  await expect(page.locator('.p.parent')).toHaveCount(2);
});

test('with 22 children a good day gives a reward to pick', async ({ page }) => {
  const w = newWorld();
  while (w.children.length < 22) nextDay(w);
  const today = newDay(w);
  today.t = CLOSE;
  for (const f of today.fams) f.state = 'gone';
  for (const k of today.kids) { k.hearts = 5; k.did = ['story']; }
  await page.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, [KEY, JSON.stringify({ world: w, today })]);
  await page.goto('/');
  await page.locator('.play').tap();
  await expect(page.locator('.reward')).toHaveCount(3);
  await expect(page.locator('.kc')).toHaveCount(22);
  await expect(page.locator('.next')).toBeHidden();
  await shot(page, '07-reward');
  const helper = page.locator('.reward', { hasText: 'Helper' }).first();
  const picked = (await helper.count()) ? helper : page.locator('.reward').first();
  const name = (await picked.locator('b').textContent())!;
  await picked.tap();
  await page.locator('.next').tap();
  await expect(page.locator('.dayno')).toHaveText(new RegExp(`Day ${w.day + 1}`));
  if (name.includes('Helper')) await expect(page.locator('.p.helper .tag', { hasText: name })).toHaveCount(1);
  else if (name !== 'New clothes') await expect(page.locator('.st.furn')).toHaveCount(1);
  await shot(page, '08-day-after-reward');
});

test("have a child: pick a look, they join today, and a day later they're a year older", async ({ page }) => {
  await play(page);
  await page.locator('.baby').tap();
  await page.locator('.maker .ok').tap();
  await expect(page.locator('.maker .name')).toHaveClass(/bad/);
  await page.locator('.maker .name').fill('Luna');
  await page.locator('.pill', { hasText: '2' }).first().tap();
  await page.locator('.pill', { hasText: 'curly' }).tap();
  await page.locator('.pill', { hasText: 'Chatty' }).tap();
  await page.locator('.sw').nth(3).tap();
  await shot(page, '09-maker');
  await page.locator('.maker .ok').tap();
  await expect(page.locator('.p.kid .tag', { hasText: 'Luna' })).toHaveCount(1);
  await expect(page.locator('.baby')).toBeHidden();
  await page.locator('.p.kid', { hasText: 'Luna' }).tap();
  await expect(page.locator('.card')).toContainText('My child');
  await expect(page.locator('.card')).toContainText('Age 2');

  // Finish the day quickly, then the birthday.
  await serveDesk(page);
  for (let i = 0; i < 80 && !(await page.locator('.night').count()); i++) {
    if (await page.locator('.p.parent.front').count()) { await serveDesk(page); continue; }
    await page.locator('.skip').tap();
  }
  await expect(page.locator('.kc', { hasText: 'Luna' })).toHaveCount(1);
  await page.locator('.next').tap();
  await expect(page.locator('.say p')).toContainText('Happy birthday, Luna! Luna is 3 today!');
  await expect(page.locator('.p.kid .tag', { hasText: 'Luna' })).toHaveCount(1);
});
