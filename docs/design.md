# Narwhal Nursery: agreed design (2026-10-24)

- Name: Nursery (renamed from Narwhal Nursery). The player is Isabelle, who owns it; Emily runs the front desk.

- Isabelle owns a nursery. Browser game, click or tap; big buttons, short words; no losing. Saves on the device.
- Start screen: Play, and Start again (asks "Are you sure?").
- One level in 3D, two rooms side by side through an archway (tap ➡️/⬅️ and the camera slides across):
  - Play room: Emily's front desk inside the glass front door, kitchen (snack), easel (painting), books (story),
    piano (song), toy box (blocks), dress-up box, potty, garden door (outside).
  - Baby room: cots (nap), changing table (nappy), milk fridge (bottle), cuddle chair, wardrobe.
  - Parents wait outside on the pavement by the front door; children walk in through it.
- Isabelle carries a child: she walks over, picks them up and carries them to what they'll do (and between rooms).
- Children mostly play by themselves; chatting children walk together and say short lines in speech bubbles.
- Isabelle is in the room and has a wardrobe page too.
- Clock on the left, 8am to 5pm, runs by itself (a day is about 15 minutes; ⏩ jumps half an hour); chats and the wardrobe pause it.
  Families arrive and leave at different times.
- Needs build up as meters (hungry, tired, toilet, bored, needs love); a bubble at 65%, crying near full (babies sooner).
  Crying unattended costs hearts; too tired and they nod off on the floor. The more children, the slower each one's needs build.
- Children act by themselves: wander, play with things on their floor, chat to each other; babies sit and crawl on the mat.
  Faces show feelings: happy, laughing, wanting, crying (with tears), asleep.
- Emily walks over and helps a child downstairs every so often when the desk is quiet. Parents chat about their day,
  remember yesterday, and at pick-up ask whether you did this morning's tip.
- Drawings: picture-book 2D with shading, eyes, eyebrows, walking legs, shadows, and golden late-afternoon light.
- Families bring 1 to 3 children, newborn to 4; mum or dad drops off and picks up.
- Drop-off: the parent gives a tip about each child (their favourite thing); you pick reply buttons. Doing the tip gives extra hearts.
- Care: tap the child (or their bubble), then the thing. Meeting a need empties that meter and adds a heart (the favourite, two).
  - Newborn to 1: bottle, nappy, nap, cuddle. 1 to 2: those plus snack, blocks, song.
    3 to 4: snack, painting, dressing up, story, outside, potty (plus cuddle and nap, for shy and sleepy children).
- Personality per child, shown as an icon: shy (cuddle first), wild (outside), sleepy (naps), hungry (snacks), creative (painting), chatty (stories).
- Wardrobe: hats, headbands, dummies (age 2 and under), tops, bottoms, shoes; about 6 each to start; rename children there.
- Emily: tap her for a hint.
- Pick-up: parents queue outside the front door; one chat per family; you tap what each child did today. Parents don't mention outfits.
- End of day: each child's hearts, then Next day.
- Growth: day 1 has 3 children, then new families each day (1-3 children each), rising evenly to all 16 children on day 10 (50 and 30 were tried and were too many). A busy floor draws its children smaller and stands them in staggered rows so everyone can still be tapped. New clothes (a hat, a headband, a dummy, or a top, bottoms, shoes) every day.
- From 16 children the game keeps going; a good day (most children 4+ hearts) lets you pick 1 of 3 rewards:
  a helper who does one job by themselves (up to 4), a toy or furniture for a floor, or new clothes.
- Music and little sounds with a mute button. Nothing read aloud.

## Picture-book rebuild (2026-10-24)

- Painted rooms (AI-generated, one per floor) with invisible tap zones; cut-outs of cots, desk and chest stand in front of
  people by depth; cot bars are half see-through so a sleeping child shows.
- People are painted paper dolls: one baby doll and one child doll (ages 1-15) and one grown-up doll; every face, hairstyle and
  outfit is an edit of the same painting, so the layers line up. 6 skin tones, 7 hair colours, 10 child hairstyles (3 baby, 6 grown-up).
- Wardrobe: Hair (style and colour), Hats, Glasses, Tops, Bottoms, Shoes, Extras (wings, cape, necklace, backpack); babies: hats,
  bodysuits, dummies; Isabelle: hats and outfits. Dummies are for newborns only (the baby doll).
- Parents, Emily and helpers are fixed paintings; a family's children take a parent's skin tone.
- Daily wishes: three goals a day (a child's favourite, a count of an activity, laughs or happy goodbyes); each one done unlocks a piece of clothing.

## 3D nursery (2026-10-24)

- The rooms are 3D (three.js) under the same tap layer; each room keeps its 1376 x 768 room-pixel layout, mapped to 3D
  by a camera spot per room. The people stay the painted paper dolls, standing in the room as cut-outs facing the
  camera (Rich tried Roblox-style 3D people and chose the painted ones).

## Long-term play (2026-10-25)

Rich asked for the six changes from the research on what keeps the top kids' games played (Toca Boca World, Animal
Crossing, Hello Kitty Island Adventure, Tamagotchi), plus best friends going home together.

- Growing up: each visiting child has a birthday every 5 days (🎂 on their tag). At 5 it's their last day (🎓); the
  parent says goodbye at pick-up, and the next morning they've started big school and a new family takes the place.
  Isabelle's own child never leaves.
- Friendship with Isabelle: what she does herself (1, or 2 for the favourite) fills 4 stars (at 5, 15, 30, 50) and
  never drops. Each new star the child says so; from 2 stars they say hello and hug at drop-off. Helpers and Emily don't count.
- Best friends: children who chat 3 times or more become best friends and seek each other out. About one pick-up in
  three, a child's best friend goes home with them for a playdate; a family with nobody left doesn't need to come.
- Album (📒): every child's photo, friendship stars, favourite (❓ until Isabelle has given it), best friend, who
  went to big school, and a sticker for each special day.
- One surprise a real day (not day 1): Halloween week and Advent by the calendar, snow in winter, eggs in spring,
  otherwise pyjama day, teddy bears' picnic, a parcel (3 new clothes) or balloons. Each brings decorations, its own
  wish and an album sticker. Missing a day costs nothing.
- Decorate (🎨): move the toys won or unlocked, and choose each room's wall colour. The clock waits.
- Nursery level: hearts sent home add up; level 2 at 100, then 300, 600, 1000, 1500, each bringing a new thing built in
  3D (no paintings to buy): bubble bath, sandpit, bunny, tea party, playhouse.
- Older saves keep everything; the new parts start empty (no `World.v` change).
