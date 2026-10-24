// Saving in this device's browser: the nursery, plus today so far. Reads and writes never throw.
import { DayState } from './day';
import { World } from './world';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const KEY = 'narwhal-nursery';
export type Saved = { world: World; today: DayState | null };

export function load(store: Store | null): Saved | null {
  try {
    const raw = store?.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as Saved) : null;
    return s?.world?.v === 2 ? s : null;
  } catch { return null; }
}

export function save(store: Store | null, s: Saved) {
  try { store?.setItem(KEY, JSON.stringify(s)); } catch { /* not kept */ }
}

export function wipe(store: Store | null) {
  try { store?.removeItem(KEY); } catch { /* nothing to wipe */ }
}
