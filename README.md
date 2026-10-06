# Virtual Anime Museum

A first-person museum in the browser, built with [Three.js](https://threejs.org/). You walk into
a dark rotunda where every doorway opens onto a world you can step into: a gallery hall, a place
from a story, or one of its great moments held still.

The museum is open source, and it is built so that anyone can add an exhibition. An exhibition is
plain data in its own folder. The engine that turns it into a world never knows which series it
shows.

Everything you see and hear in the museum is made in the browser at run time: models built from
primitives, textures painted on a canvas, sound synthesized with the Web Audio API. No model,
image, font or recording is downloaded.

## Running it

You need [Node.js](https://nodejs.org/) 18, 20, or 22 and later, and a desktop browser with
WebGL 2, a keyboard and a mouse.

```bash
npm install
npm run dev       # start a dev server at http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the production build
```

**Controls:** click to enter, move the mouse to look around, WASD / arrow keys to walk, Shift to
hurry, Space to jump, E to examine what you are looking at, Esc to pause (click to carry on).
When a placard lists numbered connections, press a number to go there. Headphones recommended.

**Weaker device?** Add `?quality=low` to the URL to turn off bloom and shadows.

## What is on show

The museum is the gateway, a universe is the world, a legendary moment is the experience:

```text
Lobby ─▶ One Piece: the Hall of the Great Pirate Era ─(chart table)─▶ Marineford ─(rift)─▶ The Summit War
          crews, Marines, Emperors, ships, history,       the old fortress, its      the war held still:
          the world chart; board the Oro Jackson          plaza, a warship to board  find its five echoes
```

Every doorway leads back the way it came.

| Gallery | What it is | Status |
| --- | --- | --- |
| **One Piece** | A content pack for the universe engine: a gallery hall, a location and a legendary moment. Names and story facts are the series' own; everything seen and heard is original. | Open. See the [legal note](src/content/exhibitions/one-piece/README.md). |
| **Shadow Ninja** | An original world: a hidden village in a mountain valley at dusk, with five exhibits along its paths. | Open |
| **Soul Reapers** | An original theme. Its doorway is sealed until its world is made. | In preparation |

The project grew out of **The Mirage of Light**, a short desert parable inspired by Paulo Coelho's
*The Alchemist*. It is still here at `/mirage.html` and shares the museum's player, interactions
and environment. See [docs/mirage.md](docs/mirage.md).

## How it is built

```text
index.html         The museum's page
mirage.html        The desert parable's page
src/
  main.js          The museum: renderer, visitor, sound, the museum and its exhibitions, the loop
  museum/          The building: lobby, galleries, doorways, exhibits, placards, transitions
  universe/        A universe as data: schema, kinds, links both ways, the world chart, the
                   timeline walk, threads of light, legendary moments
  scenery/         Every scenery piece and exhibit model by name (catalog.js), built from primitives
  content/         The museum's words, and one folder per exhibition
  player/          The first-person visitor: movement, camera, head, hands
  interactions/    Gaze, focus, and E to examine
  environment/     The world answering the visitor: plants, sand, particles, small sounds
  soundscape.js    Each world's ambience, and the sound of the next world leaking through its doorway
  sounds/          Ambiences and cues synthesized in the browser
  audio.js         Music, reverb, and the bus that sound effects play through
  footsteps.js     Footsteps for whatever the floor is made of
  render.js        Renderer, tone mapping, shadows, bloom, quality settings
  story.js         The text overlay (both pages) and the desert's story state machine
  ui/              Styles for what is drawn over the view
  mirage/, world/, stages.js, orb.js, effects.js, data/    The desert parable
scripts/
  build-stars.mjs  Generates src/data/stars.json for the desert's sky
public/ambient.mp3 The desert's music
```

Three rules shape the code:

- **Content is data.** An exhibition is a folder in `src/content/exhibitions/`. Adding a folder
  adds a gallery; nothing else needs to change.
- **The engine is series-free.** `src/universe/`, `src/museum/` and `src/scenery/` never name a
  series, a character or a place.
- **Worlds are built when someone heads for them** (walking up to a doorway prepares the world
  beyond it) and freed on the GPU as soon as they are left.

Every source file starts with a comment saying what it is and how it fits in, so the code is the
most detailed guide. The longer write-ups:

- [docs/exhibitions.md](docs/exhibitions.md): adding an exhibition, the universe data format, the scenery catalogue
- [docs/engine.md](docs/engine.md): the player, interactions and the environment
- [docs/mirage.md](docs/mirage.md): the desert parable, its story stages and its real sky

## Contributing

Contributions are welcome: new exhibitions, scenery pieces, engine work, bug reports. Start with
[CONTRIBUTING.md](CONTRIBUTING.md), and please follow the [code of conduct](CODE_OF_CONDUCT.md).
[ROADMAP.md](ROADMAP.md) lists what is done and what is next.

One rule matters more than the rest: **no ripped, official or fan-made assets**. No models,
textures, logos, flags, map art, screenshots, music or character likenesses from any series.
What the museum shows is original, and a series' names appear only as data inside its content pack.

## Licence and credits

The code is released under the [MIT licence](LICENSE). Some things in the repository are not
covered by it:

- **Star data.** `src/data/stars.json` is derived from the
  [HYG database](https://github.com/astronexus/HYG-Database) (v3.8, by David Nash), under
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The derived file is under the
  same licence.
- **Music.** `public/ambient.mp3`, the desert's background music, is not covered by the MIT
  licence. Its source and terms still need to be recorded here.
- **Series names.** The names and story facts in the One Piece content pack belong to their
  rights holders (*One Piece* is created by Eiichiro Oda and published by Shueisha). This project
  claims no rights in them and its licence does not grant any. See the
  [pack's README](src/content/exhibitions/one-piece/README.md) for the open question on using them.

This is an unofficial fan project. It is not affiliated with, or endorsed by, the rights holders
of any series it refers to.

Built with [three.js](https://github.com/mrdoob/three.js) (MIT) and
[astronomy-engine](https://github.com/cosinekitty/astronomy) by Don Cross (MIT), which gives the
desert its sun, moon and planet positions.
