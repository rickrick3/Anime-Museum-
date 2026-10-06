# Adding an exhibition

An exhibition is a folder in `src/content/exhibitions/`. The museum finds it by itself
(`src/content/exhibitions/index.js`): adding a folder adds a gallery to the rotunda, and nothing
in the engine needs to change. Content is plain data, with no code beyond the `import()` calls
that load a scene when someone goes there.

Read the [content rules](../CONTRIBUTING.md#content-rules) first. They decide what a pack may
contain.

## The two kinds

| Kind | Files | Use it for | Example |
| --- | --- | --- | --- |
| A single world | `summary.js`, `exhibition.js` | One place to walk through, with exhibits along the way | `shadow-ninja/` |
| A universe | `summary.js`, `universe.js`, `scenes/`, `data/` | A whole series: characters, crews, places and events that point at each other, and several scenes to travel between | `one-piece/` |

## Steps

1. **Create the folder**: `src/content/exhibitions/<id>/`.
2. **Write `summary.js`**: what the lobby shows before anyone walks in. It is loaded at once, so
   keep it small: `id`, `order`, `title`, `tagline`, `description`, `status`, `accent`, and the
   `preview` its doorway shows (see `src/scenery/portalSurface.js`). Copy an existing summary
   and change it.
3. **Add the world**: `exhibition.js` for a single world, or `universe.js` for a universe. It is
   loaded only when someone walks in. Until it exists, set `status: 'in-preparation'` in the
   summary and the gallery's doorway stays sealed (`soul-reapers/` is one of these).
4. **Give it a side of the rotunda** (optional): add it to `galleries` in `src/content/museum.js`.
   Otherwise it takes the next free side. The rotunda has five gallery sides (north, west, east,
   northwest, northeast), and three are taken.
5. **Walk in.** Run `npm run dev` and go through its doorway. From the browser console,
   `museumApp.museum.enterExhibition('<id>')` takes you straight there, and
   `museumApp.museum.visit('<scene id>')` moves between a universe's scenes.

## A single world

A world is plain data: its ground, sky, fog, lights, scenery pieces, atmosphere, sound and
exhibits. `src/museum/exhibition.js` builds it, and
`src/content/exhibitions/shadow-ninja/exhibition.js` is a complete, commented example. Scenery
pieces and exhibit models are named, and the names come from the
[scenery catalogue](#the-scenery-catalogue).

## A universe is data

A universe is a folder with a `summary.js` and a `universe.js`: its characters, crews, factions,
ships (vehicles), locations, artifacts, events and legendary moments, which point at each other
by id, and the scenes that can be walked into, each loaded only when someone goes there.
`src/universe/schema.js` documents the shape of every kind (`Universe`, `Character`, `Crew`,
`Faction`, `Ship`, `Location`, `Event`, `LegendaryMoment`) and checks a pack in development.

```js
export default {
    id: 'my-series', title: 'My Series', entry: 'gallery',
    vocabulary: { vehicle: 'Ship' },                   // the series' own words for its kinds
    map: { travel: 'Set sail', locked: 'Coming soon', features: [/* bands and labels on the chart */] },
    characters: [{ id: 'hero', name: 'Hero', crew: 'squad', origin: 'home-town', figure: { hat: 'straw' },
                   relationships: [{ with: 'mentor', as: 'teacher', inverse: 'student' }] }],
    crews: [{ id: 'squad', name: 'The Squad', captain: 'hero', members: ['hero'], ship: 'boat' }],
    locations: [{ id: 'home-town', name: 'Home Town', scene: 'home-town', chart: [0.2, -0.1] }],
    events: [{ id: 'the-day', name: 'The Day', era: 'Year 1', location: 'home-town', moment: 'the-day-moment' }],
    moments: [{ id: 'the-day-moment', title: 'The Day', universe: 'my-series', location: 'home-town', era: 'Year 1',
                environment: 'the-day', participants: ['hero'], relatedEvents: ['the-day'] }],
    scenes: {
        gallery: { title: 'The Gallery', kind: 'gallery', load: () => import('./scenes/gallery.js') },
        'home-town': { title: 'Home Town', kind: 'location', load: () => import('./scenes/home-town.js') },
        'the-day': { title: 'The Day', kind: 'moment', load: () => import('./scenes/the-day.js') }
    }
};
```

A scene is the same plain data as a single world, plus:

- exhibits that name an `entity`: their placard (shown after **E**) tells that entity's story,
  facts and connections, examining one draws threads of light to the related things in the same
  room, and each connection that can be reached gets a number: **press it to go there** (a blink
  across the room, or the journey to another scene; a dashed number is in another place). The
  model is handed the entity, so a figure takes its costume, a flag its emblem and a ship its
  colours from the data. `anchor: false` marks an exhibit that only stands for something shown
  elsewhere (a wanted poster): its first link finds the thing itself.
- `portals: [{ to: 'scene-id' | 'museum', ... }]` (`shape: 'oval'` for a rift)
- `navigation` (the world chart: the universe's locations as pins of light over its map
  features), `timeline` (events as a walk, with small 3D displays beside the posts; one or
  several walks)
- `moment: { beats, resolution }`: the world held still until its echoes are found
- things placed `frame: 'ship-name'` stand aboard a ship (or any piece that declares a frame)

## The scenery catalogue

Scenery pieces and exhibit models are looked up by name in `src/scenery/catalog.js`, so content
can stay plain data (`{ piece: 'house', at: [4, 2] }`, `{ model: { name: 'blade' } }`) and a world
only downloads the kits it uses. Each kit is one file in `src/scenery/`; its header comment lists
what it makes. The kits the One Piece pack uses:

| Kit | Pieces and models |
| --- | --- |
| `mannequin.js` | `character-figure` (a faceless figure from a `figure` spec: build, stance, coat, hat, hair, props, palette), `formation` (instanced ranks of figures) |
| `docks.js` | `dock-hall` (a covered dock with a sea basin and an arch to the sea), `balustrade`, `hall-banner` |
| `fortress.js` | `fortress`, `siege-wall`, `scaffold` (walkable), `flagpoles`, `cannons`, `fissure`, `bell-tower` |
| `warfx.js` | `ice-sheet`, `ice-waves`, `meteors`, `fracture`, `beams` |
| `displays.js` | `wanted-poster`, `notice-board`, `island-model`, `treasure-chest`, `hat-display`, `compass-instrument`, `mini-scaffold`, `mini-flag`, `bay-diorama`, `bell` |
| `emblems.js` | the original marks drawn on flags, sails and banners: skull over crossed things, anchor, lantern |
| `ship.js` | `ship` (walkable or seen from afar; figureheads, emblem on flag and sail, held fast in ice), `ship-model` |

Other kits cover nature (`nature.js`), an East Asian village (`eastern.js`), a harbour town
(`harbor.js`), the sea (`water.js`), skies (`skyDome.js`), what hangs in the air
(`atmosphere.js`) and generic exhibit models (`artifacts.js`, `relics.js`, `figures.js`).

**Adding a piece.** Write it in a kit as a function of `(params, kit)`, add it to `catalog.js`
under a name with a loader that imports the kit on demand (as the existing entries do, or with
`registerPiece` / `registerModel`), and use that name from content. A piece must be generic: it
takes its colours, marks and words from the data and never names a series itself.

**Using a licensed model.** A properly licensed glTF model can be registered under an existing
name with `registerModel('character-figure', ...)`, or under a new one, and the scenes use it
without other changes. Record its source and licence (see the content rules).

## Loading and freeing

Worlds are built only when someone heads for them. Walking up to a doorway or the chart table
prepares the world beyond it: built a piece at a time, its shaders compiled in the background
and its textures uploaded. A world is freed on the GPU as soon as it is left.
`src/scenery/kit.js` has the per-world material library and the disposal that pieces rely on.
