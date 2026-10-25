# Narwhal Nursery

A nursery game for Isabelle: greet parents, look after children (newborn to 4) in two rooms on one level, dress them in the
wardrobe, have her own child who grows a year a day. Static site on GitHub Pages; progress saved in each device's
browser. Agreed design: `docs/design.md`.

## Commands

- `npm test`: unit tests (rules, growth, rewards, own child, saving). `npm run typecheck`.
- `npx playwright test`: plays by touch on an iPad Pro held sideways, the only device Isabelle uses (the 3D draws in software). `SHOTS=shots` saves screenshots.
- `npm run check`: the hot-fix check (types, unit tests, day 1 and a full day 10 played on the iPad Pro), about 2 min.

## Hot fixes

Small fix (words, a number, a position): branch from main, make it, `npm run check`, screenshot the change, push the
branch, and tell Rich it's ready. When Rich says merge: `git switch main && git merge --ff-only <branch> && git push`;
Pages deploys in about 30 s (`gh run list --limit 1`); open https://richroberts-prog.github.io/narwhal-nursery/ to
confirm. Big changes (layout, rules, 3D) run the full `npx playwright test` before asking. Saves survive any deploy
unless `World.v` changes.
- `npm run dev`; `npm run build` to `dist/`. A push to main deploys to Pages.
- `npm run single`: one self-contained `dist/narwhal-nursery.html` to send as a file.

## Map

- `src/game/`: pure rules, no DOM. `catalog.ts` lists (clothes, activities, helpers, names), `world.ts` the lasting
  nursery and how it grows (birthdays and leaving at 5, friendship, best friends, level, the day's surprise; `fillNew`
  gives older saves the newer parts), `day.ts` one day (clock, needs, desk queue, helpers), `talk.ts` parent lines, `save.ts`.
- `src/game/looks.ts`: dolls (baby, kid, adult), hairstyles, hair colours, skin tones and clothes, from `public/art/manifest.json`.
- `src/ui/`: `dolls.ts` stacks picture layers into people, `room.ts` the one-level layout (play room 'down', baby room 'up',
  parents outside) in room pixels: tap zones, beds, queue; `sound.ts` Web Audio. `ui/three/`: `world3d.ts` draws it in 3D (plus wall colours and special-day decorations)
  (a camera spot per room maps room pixels to 3D; painted people as cut-outs; Isabelle carrying), `furniture.ts`, `paint.ts`.
- `art/`: the picture pipeline. `gen.py` paints with OpenRouter (Gemini image, about $0.07 a picture: money, so ask first);
  `build.py` turns painted dolls and their edits into layers (`public/art/{kid,baby,adult}`); `rooms.py` builds rooms,
  front pieces and sticker sheets. Raw paintings live in `art/src` (not in git); the built layers in `public/art` are.
- `src/main.ts`: start screen, room, chats, wardrobe, album, decorating, have-a-child, end of day.

## Rules

- Text never says he or she: names only (a test checks).
- Every personality must have a favourite at every age (a baby once froze a chat).
- Each floor has z-index 0 so furniture layering stays under the people layer; only drawn shapes take taps, so every child can be tapped (a test checks both
  floors); Emily lives in the desk layer to stay behind it.
- Inputs must allow text selection or the iPad keyboard won't open.
- Short class names clash across screens (`.wardrobe`, `.done`): tap zones use `st-`, wish states `wish-`.
- Saves are versioned (`World.v`); an old version is ignored, not migrated. New fields go in `fillNew` instead, so
  Isabelle's nursery survives.
