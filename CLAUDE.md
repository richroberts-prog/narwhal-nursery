# Narwhal Nursery

A nursery game for Isabelle: greet parents, look after children (newborn to 4) on two floors, dress them in the
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
- `src/ui/`: `people.ts` draws people in SVG, `room.ts` the two floors, `sound.ts` Web Audio music and sounds.
- `src/main.ts`: start screen, room, chats, wardrobe, have-a-child, end of day.

## Rules

- Text never says he or she: names only (a test checks).
- Every personality must have a favourite at every age (a baby once froze a chat).
- Each floor has z-index 0 so furniture layering stays under the people layer; only drawn shapes take taps, so every child can be tapped (a test checks both
  floors); Emily lives in the desk layer to stay behind it.
- Inputs must allow text selection or the iPad keyboard won't open.
- Saves are versioned (`World.v`); an old version is ignored, not migrated.
