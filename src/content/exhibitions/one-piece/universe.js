// One Piece: a content pack for the museum's universe engine. Plain data: who and what is in the world,
// how everything is connected, how its world chart is drawn, and the places that can be walked into
// (each loaded only when someone goes there). The engine knows nothing about this series; see
// src/universe/ for how this is read and src/universe/schema.js for the shape of each kind.
//
//   The hall (gallery) ── chart table ──▶ Marineford (location) ── the rift ──▶ The Summit War (moment)
//     crews, Marines, Emperors,             the old fortress, its plaza and          the war held still at
//     ships, history, the world map         its scar, a warship to board             the instant it turned
//
// Names and story facts belong to the series (see README.md in this folder: their use needs the project
// owner's legal decision). Every description is written for this museum; every model, emblem, poster,
// sound and texture is original and made in the browser.
import { characters } from './data/characters.js';
import { crews, factions } from './data/crews.js';
import { ships } from './data/ships.js';
import { locations, map } from './data/locations.js';
import { events, timeline, artifacts, moments } from './data/history.js';

export default {
    id: 'one-piece',
    title: 'One Piece',
    tagline: 'The Great Pirate Era',
    description: [
        'A world almost all sea, where a pirate king\'s last words sent a generation sailing for the treasure he left at the end of the Grand Line.',
        'Walk among its crews, its navy and its emperors, board a pirate ship, and set sail from the chart table for the fortress where the greatest war of the age was fought.'
    ],
    vocabulary: { vehicle: 'Ship' },
    entry: 'hall',

    scenes: {
        hall: {
            title: 'The Hall of the Great Pirate Era',
            tagline: 'Crews, Marines, Emperors, ships and the sea',
            kind: 'gallery',
            load: () => import('./scenes/hall.js')
        },
        marineford: {
            title: 'Marineford',
            tagline: 'The old headquarters of the Marines',
            kind: 'location',
            accent: '#8fc8ff',
            load: () => import('./scenes/marineford.js')
        },
        'marineford-war': {
            title: 'The Summit War of Marineford',
            tagline: 'Marineford, the instant the war turned',
            kind: 'moment',
            accent: '#ffb46a',
            load: () => import('./scenes/marineford-war.js')
        }
    },

    map,
    characters,
    crews,
    factions,
    ships,
    locations,
    artifacts,
    events,
    timeline,
    moments
};
