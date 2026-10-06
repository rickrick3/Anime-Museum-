# The Mirage of Light

A short interactive parable inspired by Paulo Coelho's *The Alchemist*, and the project the
museum grew out of. It lives at `/mirage.html` (`http://localhost:5173/mirage.html` in the dev
server).

You wake before dawn beneath an old tree at the Al-Fayoum oasis in Egypt. Far across the dunes,
a light is pulsing. Overhead is the real sky of this morning: the stars, moon and planets where
they actually are over the oasis today. As you walk, the night turns slowly toward sunrise, the
mist lifts and the world grows quiet and echoing, until you reach the light as the sun rises
behind it.

The text is original, written for the piece; nothing is quoted from the book.

**Choose a morning:** add `?date=YYYY-MM-DD` to see the sky of another day, e.g.
`http://localhost:5173/mirage.html?date=2027-01-15`.

## Files

The desert shares the player, interactions and environment with the museum (see
[engine.md](engine.md)). Its own files:

```text
mirage.html           Page, UI elements and styles
public/ambient.mp3    Background music
scripts/
  build-stars.mjs     Generates src/data/stars.json from the HYG star database
src/
  mirage/main.js      Scene setup and main loop
  stages.js           The stages of the journey (story text and what happens at each stage)
  story.js            Story state machine and story text overlay
  orb.js              The glowing orb, its sound-reactive waves and particles
  effects.js          One-shot particle effects (shatter, transformation)
  data/stars.json     5,070 naked-eye stars (generated, see below)
  world/
    world.js          Puts the world together: oasis, desert, lights, fog
    terrain.js        Dune height function and ground mesh
    sky.js            The real sky: stars, moon phase, planets, twilight colours, sun and moonlight
    astronomy.js      Sky positions over Al-Fayoum, dawn times, and the walking-driven sky clock
    props.js          Old tree, palms, shrubs, rocks, grass, flowers
    dust.js           Sand drifting on the wind
    footprints.js     Footprints left in the sand
    sandSpray.js      Grains kicked up by steps, landings and slides
```

## In the dev server

`window.mirage` exposes the scene, camera, player, world and story in the browser console, e.g.
`mirage.story.goTo('touch')` or `mirage.world.sky.clock.progress = 0.9`. `mirage.interaction` and
`mirage.environment` are the systems themselves.

A test stone and flower sit a few steps from the start to try the interaction system on
(`?fixtures=off` leaves them out), and `?debug` shows what the gaze rests on and what is near.
None of this is in a production build.

## Adding to the story

The journey is a list of stages in `src/stages.js`. Each stage can define:

- `enter()`: runs when the stage starts (show text, trigger effects)
- `update(stageTime, delta)`: return the name of the next stage to move on
- `exit()`: runs when the stage ends

## How the sky works

- The sky clock runs from full night (just before astronomical dawn) to just after sunrise.
  It advances with the distance you walk (about 160 units for the whole dawn), and only
  slowly on its own while you stand still.
- The whole sky is turned so that the sun rises directly behind the light.
- Everything is bundled with the app; nothing is downloaded while playing.

## Star data

`src/data/stars.json` is generated from the [HYG database](https://github.com/astronexus/HYG-Database)
(v3.8, by David Nash), which combines the Hipparcos, Yale Bright Star and Gliese catalogues:

```bash
node scripts/build-stars.mjs path/to/hyg_v38.csv.gz
```

The HYG database is under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), and
`src/data/stars.json` is a derived work under the same licence. Sun, moon and planet positions
come from [astronomy-engine](https://github.com/cosinekitty/astronomy) by Don Cross (MIT).
