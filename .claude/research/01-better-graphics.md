# Research: making Narwhal Nursery's graphics much better

*Researched: 2026-10-24*

## TL;DR

**Recommendation: painted room backgrounds (AI-generated, one image per floor) behind the game, with the people kept as
code-drawn SVG restyled to match.** The room is most of the screen and is where code-drawn shapes look cheapest, and a
painted picture-book room is one image per floor, with invisible tap zones on top. People must stay code-drawn because the
wardrobe swaps outfits, moods and poses live, and image models can't make swappable, aligned clothing layers reliably.
Stay on DOM: no engine needed for about 30 moving things.

---

## Current state

- Vite + TypeScript, no engine. People are SVG strings built in `src/ui/people.ts` (head drawn in its own space, outfits
  layered from `catalog.ts` items, moods, sit pose, walking legs). Furniture is SVG in `src/ui/room.ts`; walls and floors
  are CSS gradients.
- Up to about 30 people on screen plus about 20 furniture pieces, placed as absolutely positioned DOM elements.
- Targets: iPad, and Fire HD 8 and 10. The Fire HD 10 (2023) runs a Mali-G52 MC2 GPU with 3 GB RAM: a weak GPU
  ([UL benchmarks](https://benchmarks.ul.com/de/hardware/tablet/Amazon+Fire+HD+10+(2023)+review)).
- The look today: clean flat vector with gradients. It reads as "app icon", not "picture book".

The look comes from two things, and they need different fixes: **where the art comes from** (code shapes, hand-made art
or generated art) and **how it's rendered** (DOM/SVG, canvas engine, skeletal animation).

---

## Where the art comes from

### Option 1: better code-drawn SVG
**What:** keep generating shapes in code, with illustrator techniques: a consistent limited palette, coloured outlines
with uneven line weight, cel shading (one flat shadow shape per part rather than gradients), and texture through a
paper-grain overlay.
**Complexity:** Low. **Cost:** none.
**Pros:** wardrobe, moods and poses keep working; tiny files; scales crisply.
**Cons:** the ceiling is "tidy vector". Rooms and furniture drawn in code never look painted.

### Option 2: generated painted art (images)
**What:** generate illustrations with an image model in one fixed style, then use them as `<img>`s: one full painted
room per floor, plus furniture "stickers" for the things that move or get added (rewards).
**Key tech:** Gemini image models ("Nano Banana"). A Gemini API key is already saved on the server
(`~/.config/agent/credentials/gemini_api_key`). Third-party price lists put it at about $0.02–0.04 per image
([anotherwrapper](https://anotherwrapper.com/tools/llm-pricing/image-models/gemini-25-flash-image-nano-banana),
[pricepertoken](https://pricepertoken.com/image/model/google-gemini-2-5-flash-image)). Google's official pricing page
wasn't checked.
**Complexity:** Medium: prompt a style, choose the best images, cut out stickers, and line up tap zones.
**Pros:** the biggest jump in quality for the least code. A whole floor becomes picture-book quality in a few images.
**Cons:** keeping one style across images takes a reference image and retries. General image models make one
illustration, not aligned sprite sheets or swappable clothes
([Sorceress](https://sorceress.games/blog/craft-an-ai-game-sprite-generator-ready-sheet-2026)). Transparent
backgrounds are unconfirmed, so plan on a solid key colour and cutting it out
([Rosebud guide](https://rosebud.ai/blog/how-to-create-a-sprite-sheet-with-ai-using-google-gemini-and-nano-banana-easy-guide)).
Every image costs a little money.

### Option 3: ready-made asset packs
**What:** licensed packs such as Kenney's modular characters (CC0, separate parts plus vector files)
([OpenGameArt](https://opengameart.org/content/modular-character-pack)).
**Complexity:** Low to Medium. **Cost:** free.
**Pros:** legal and consistent.
**Cons:** no pack matches a cosy nursery with babies, cots and changing tables. Mixing packs breaks the style.

| How good it looks when done well (axis: art source) | Option 1 code SVG | Option 2 generated | Option 3 packs |
|---|---|---|---|
| Rooms and furniture | low | **high** | medium |
| People with live outfits, moods and poses | **high** | low | medium |

Each source wins on a different part, so the answer splits by part: generated art for rooms, code for people.

---

## How it's rendered

- **Stay DOM/SVG + images (recommended).** About 30 sprites is nothing for the browser. Painted backgrounds are plain
  `<img>`s, which are cheap. The one real cost on the Fire's weak GPU is CSS `filter: drop-shadow` on many elements:
  WebKit has a history of slow or crashing filters on many filtered SVG elements
  ([WebKit bug 196295](https://bugs.webkit.org/show_bug.cgi?id=196295)). Paint shadows into the art instead.
- **PixiJS (canvas/WebGL).** Fast for thousands of sprites, but its own guide warns that complex SVGs are "more expensive
  to parse" and that turning them into textures "does not scale cleanly"
  ([PixiJS SVG guide](https://pixijs.com/8.x/guides/components/assets/svg)). It would mean rewriting all the drawing,
  tapping and layout code for no visual gain. Not worth it at this size.
- **Skeletal animation (Rive or Spine).** Gives smooth, squash-and-stretch character animation. Both need art made by
  hand in their editors. Rive is free to make things in but costs $9 a month to export
  ([Rive blog](https://rive.app/blog/beta-pricing)), and Spine Essential is a one-off payment of about $69–99
  ([Spine](https://esotericsoftware.com/spine-purchase)). Worth it only once there's hand-made character art. Rive's own
  advice is to measure Canvas2D against WebGL2 on your own content
  ([Rive docs](https://rive.app/docs/runtimes/web/canvas-vs-webgl)).

---

## Recommendation

**Painted backgrounds plus restyled code-drawn people, on the existing DOM.**

Why:
1. The room fills most of the screen and looks the most "programmer-drawn". Painting it is the biggest visual gain, and
   it's one image per floor.
2. The people need live outfits, moods, poses and walking. Only code-drawn parts do that reliably, so they stay code,
   restyled with outlines and cel shading so they sit naturally in a painted room.
3. No engine change means no rewrite, and the Fire tablets stay smooth.

Steps:
1. **Style test first (needs Rich's yes for a few images, about $0.20):** generate one downstairs room in a fixed prompt
   style ("soft picture-book gouache, cosy nursery, warm light, front-on view, empty floor in front, no people, no
   text"). Check how it looks at Fire HD 8 size.
2. Lock the style with that first image as the reference, then make the upstairs room and loose furniture stickers
   (cots, chair, toy box, reward furniture) on a solid key colour, and cut them out.
3. In `room.ts`, replace the CSS walls and SVG furniture with the painted image per floor. Keep each `Station` as an
   invisible tap zone with its label, with positions measured from the painting.
4. In `people.ts`, restyle to match: coloured outlines (a darker tone of the fill, about 1.5–2.5px, thicker at the
   bottom), cel shadows instead of gradients, the palette taken from the painting, and a soft ground shadow drawn in
   the SVG instead of CSS filters.
5. Remove `filter: drop-shadow` from the stations (the painting carries its own shadows).
6. Re-run the e2e tests: tap zones must still hit, and every child must still be tappable on both floors.

---

## Debugging notes: things to check if it breaks

- Image models often ignore "transparent background". Ask for a flat key colour (#00ff00) and cut it out locally.
- Style drift between images: always pass the first approved image as the reference; reject and retry.
- Painted rooms are fixed at one size. Export at 2× (2120×1380) for iPad sharpness, as WebP, under 500 KB each.
- Tap zones drawn over the painting must keep the "people above floor" layering (`.floor` z-index 0).
- If the Fire HD 8 stutters, first remove any CSS filters, then cut the number of DOM nodes per person.

---

## Sources

- [UL benchmarks: Fire HD 10 (2023)](https://benchmarks.ul.com/de/hardware/tablet/Amazon+Fire+HD+10+(2023)+review): GPU and RAM
- [Amazon Fire HD specs](https://developer.amazon.com/docs/fire-tablets/ft-device-specifications-firehd-models.html): Fire HD 8 chipset
- [PixiJS v8 SVG guide](https://pixijs.com/8.x/guides/components/assets/svg): SVG as texture or graphics, costs
- [PixiJS v8 launch](https://pixijs.com/blog/pixi-v8-launches): engine performance
- [Rive: choose a renderer](https://rive.app/docs/runtimes/choose-a-renderer) and [canvas vs WebGL](https://rive.app/docs/runtimes/web/canvas-vs-webgl)
- [Rive pricing blog](https://rive.app/blog/beta-pricing): free to make things, paid to export
- [Spine purchase](https://esotericsoftware.com/spine-purchase) and [spine-pixi runtime](https://eu.esotericsoftware.com/blog/spine-pixi-runtime-released)
- [Kenney modular character pack](https://opengameart.org/content/modular-character-pack): CC0 parts
- [Rosebud: sprite sheets with Nano Banana](https://rosebud.ai/blog/how-to-create-a-sprite-sheet-with-ai-using-google-gemini-and-nano-banana-easy-guide)
- [Sorceress: illustration is not a sprite sheet](https://sorceress.games/blog/craft-an-ai-game-sprite-generator-ready-sheet-2026)
- [Gemini image pricing (third-party)](https://anotherwrapper.com/tools/llm-pricing/image-models/gemini-25-flash-image-nano-banana)
- [WebKit bug 196295](https://bugs.webkit.org/show_bug.cgi?id=196295): slow and crashing filters on many SVG elements

---

## Proposed knowledge note

```markdown
---
topic: kids-game-2d-graphics
question: How to get picture-book quality graphics in a small DOM/SVG kids' game that runs on Fire tablets?
verified: 2026-10-24
recheck: 2027-04-24
sources:
  - https://pixijs.com/8.x/guides/components/assets/svg
  - https://rive.app/docs/runtimes/choose-a-renderer
  - https://esotericsoftware.com/spine-purchase
  - https://benchmarks.ul.com/de/hardware/tablet/Amazon+Fire+HD+10+(2023)+review
chosen: Painted (AI-generated) room backgrounds with invisible tap zones; people stay code-drawn SVG restyled with outlines and cel shading; stay on DOM.
issues:
  - richroberts-prog/narwhal-nursery
---
Split the art by part. Rooms are generated images, one per floor. People who need live outfits, moods and poses stay
code-drawn: image models can't make swappable, aligned clothing layers. An engine (PixiJS) gives nothing at about 30
sprites. Skeletal animation (Rive $9/month to export, Spine about $69 one-off) only pays off with hand-made art. On Fire
tablets (Mali-G52), avoid CSS filters on many elements.
```
