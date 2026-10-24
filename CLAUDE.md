# Narwhal Nursery

A nursery game for Isabelle: greet parents, look after children (newborn to 4) in two rooms on one level, dress them in the
wardrobe, have her own child who grows a year a day. Static site on GitHub Pages; progress saved in each device's
browser. Agreed design: `docs/design.md`.

## Commands

- `npm test`: unit tests (rules, growth, rewards, own child, saving). `npm run typecheck`.
- `npx playwright test`: plays by touch at iPad and Fire tablet sizes. `SHOTS=shots` saves screenshots.
- `npm run dev`; `npm run build` to `dist/`. A push to main deploys to Pages.
- `npm run single`: one self-contained `dist/narwhal-nursery.html` to send as a file.

## Map

- `src/game/`: pure rules, no DOM. `catalog.ts` lists (clothes, activities, helpers, names), `world.ts` the lasting
  nursery and how it grows, `day.ts` one day (clock, needs, desk queue, helpers), `talk.ts` parent lines, `save.ts`.
- `src/game/looks.ts`: dolls (baby, kid, adult), hairstyles, hair colours, skin tones and clothes, from `public/art/manifest.json`.
- `src/ui/`: `dolls.ts` stacks picture layers into people, `room.ts` the one-level layout (play room 'down', baby room 'up',
  parents outside) in room pixels: tap zones, beds, queue; `sound.ts` Web Audio. `ui/three/`: `world3d.ts` draws it in 3D
  (a camera spot per room maps room pixels to 3D; painted people as cut-outs; Isabelle carrying), `furniture.ts`, `paint.ts`.
- `art/`: the picture pipeline. `gen.py` paints with OpenRouter (Gemini image, about $0.07 a picture: money, so ask first);
  `build.py` turns painted dolls and their edits into layers (`public/art/{kid,baby,adult}`); `rooms.py` builds rooms,
  front pieces and sticker sheets. Raw paintings live in `art/src` (not in git); the built layers in `public/art` are.
- `src/main.ts`: start screen, room, chats, wardrobe, have-a-child, end of day.

## Rules

- Text never says he or she: names only (a test checks).
- Every personality must have a favourite at every age (a baby once froze a chat).
- Each floor has z-index 0 so furniture layering stays under the people layer; only drawn shapes take taps, so every child can be tapped (a test checks both
  floors); Emily lives in the desk layer to stay behind it.
- Inputs must allow text selection or the iPad keyboard won't open.
- Short class names clash across screens (`.wardrobe`, `.done`): tap zones use `st-`, wish states `wish-`.
- Saves are versioned (`World.v`); an old version is ignored, not migrated.
