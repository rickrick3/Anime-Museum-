# One Piece content pack

The museum's first content pack for its universe engine (`src/universe/`). The engine never refers to
this series; removing this folder removes the exhibition, and another series is added the same way.

```
universe.js           The pack: assembles the data below, the world chart and the scenes
summary.js            What the museum's lobby shows (title, tagline, doorway preview)
data/characters.js    33 characters: story, affiliation, crew, origin, places, relationships, figure
data/crews.js         8 crews and 2 factions (the Marines, the Four Emperors), with their emblems
data/ships.js         6 ships, and how the museum's procedural ship is dressed for each
data/locations.js     17 locations and the world chart's layout (the Grand Line, the Red Line, four seas)
data/history.js       13 events in order, 6 artifacts, 1 legendary moment
scenes/hall.js        The Hall of the Great Pirate Era (gallery)
scenes/marineford*.js Marineford (location), the Summit War (legendary moment), their shared layout
```

## Legal status: a decision for the project owner

**Names and story facts.** Character, crew, ship, place and event names, epithets, bounties and
plot facts are the series' own. They appear only here, as data, so they can be removed or replaced
without touching the engine. **Whether this open-source project may use them needs a legal decision
from the project owner** (and, ideally, the rights holder's permission) before the pack is
published or deployed.

**Descriptions** are written for this museum (no text is copied from any official or fan source).

**No ripped, official or third-party asset is used.** Every model, texture, emblem, poster, map and
sound is original and generated in the browser at run time:

| What | How it is made | Licence |
|---|---|---|
| Characters | Faceless mannequins built from primitives (`src/scenery/mannequin.js`), told apart by build, stance, costume, palette and props | Project's own code (MIT) |
| Crew flags, sail marks, navy mark | Original skull / crossed-things / anchor motifs drawn on canvas (`src/scenery/emblems.js`); no official jolly roger or navy logo is reproduced | Project's own code (MIT) |
| Wanted posters | The museum's own poster layout (`posterTexture` in `src/scenery/textures.js`) with a silhouette in the character's colours; no official artwork | Project's own code (MIT) |
| Ships | One procedural two-masted ship (`src/scenery/ship.js`) dressed per ship: colours, a generic figurehead, the crew's mark | Project's own code (MIT) |
| The hall, Marineford, the war | Procedural architecture, terrain, water and effects (`docks.js`, `fortress.js`, `warfx.js`, `harbor.js`, `water.js`) | Project's own code (MIT) |
| World chart | Stylised layout drawn on canvas (`chartTexture`): not a copy of any official map | Project's own code (MIT) |
| Sound | Synthesized with the Web Audio API (`src/sounds/maritime.js`: harbour, held storm, bell) | Project's own code (MIT) |
| Fonts | The visitor's own system fonts | none bundled |

## Procedural fallbacks in use (in place of licensed assets)

| Missing | Fallback used |
|---|---|
| Character models | Stylised mannequin per character (prop + palette + silhouette) |
| Ship models | The procedural walkable ship: hull, deck with collision, masts, sails, rail, helm, cabin |
| Location environment | Procedural terrain, water shader, sky, fog and modular buildings |
| Legendary Moment | A staged, enterable scene of instanced silhouettes, echo figures, lighting, props and effects |
| Audio | Synthesized ambience and cues only; no music |

## Replacing placeholders with licensed content

Register a licensed model under an existing name, or a new one, in `src/scenery/catalog.js`
(`registerModel('character-figure', ...)`, or a new name used from a scene's exhibit), and the scenes
use it without other changes. Character figures read `figure` from their entity, crew flags
`emblem`, ships `model`: replace those fields, or point the exhibits at new models.
