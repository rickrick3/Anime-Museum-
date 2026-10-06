// The ships of the One Piece hall. Plain data: the story of each, and how the museum's own procedural
// ship (src/scenery/ship.js, a two-masted ship built from primitives) is dressed to stand for it:
// colours, a generic figurehead, the crew's emblem on flag and sail. None is a reconstruction of an
// official design; a licensed model could later be registered in its place (src/scenery/catalog.js).
import { crews, factions } from './crews.js';

const emblemOf = id => [...crews, ...factions].find(item => item.id === id)?.emblem;

export const ships = [
    {
        id: 'oro-jackson',
        name: 'The Oro Jackson',
        epithet: 'Flagship of the Roger Pirates',
        description: [
            'Built by a fish-man shipwright from the wood of Adam, a treasure tree, she carried the Roger Pirates around the whole Grand Line and to its last island.',
            'Here she lies in the hall\'s basin with her gangplank down: anyone may go aboard.'
        ],
        crew: 'roger-pirates',
        model: {
            figurehead: 'serpent',
            emblem: emblemOf('roger-pirates'),
            sailEmblem: true,
            colors: { hull: '#2a1f17', band: '#7a2a1c', bottom: '#4a2a20', bulwark: '#3b2b1f', sail: '#ece4d0', deck: '#8d6c4b' }
        }
    },
    {
        id: 'going-merry',
        name: 'The Going Merry',
        epithet: 'The Straw Hats\' first ship',
        description: 'A small caravel given to the crew by a friend in the East Blue. She carried them through the first half of the Grand Line; when she could no longer be repaired, she came for them one last time, and they gave her a farewell by fire.',
        crew: 'straw-hat-pirates',
        model: {
            figurehead: 'ram',
            emblem: emblemOf('straw-hat-pirates'),
            sailEmblem: true,
            colors: { hull: '#c9a77a', band: '#3a6a3a', bottom: '#5a3a2a', bulwark: '#c9a77a', sail: '#f2ede0' }
        }
    },
    {
        id: 'thousand-sunny',
        name: 'The Thousand Sunny',
        epithet: 'The Straw Hats\' second ship',
        description: 'Built by Franky from the same treasure wood as the Oro Jackson, to carry the crew to the end of the world.',
        crew: 'straw-hat-pirates',
        builder: 'franky',
        model: {
            figurehead: 'lion',
            emblem: emblemOf('straw-hat-pirates'),
            sailEmblem: true,
            colors: { hull: '#c98a3a', band: '#e8c56a', bottom: '#3a5a8a', bulwark: '#d9a24a', sail: '#f2ede0' }
        }
    },
    {
        id: 'moby-dick',
        name: 'The Moby Dick',
        epithet: 'Flagship of the Whitebeard Pirates',
        description: 'Whitebeard\'s flagship, its bow shaped like the head of a great white whale. She led his whole fleet into the bay of Marineford.',
        crew: 'whitebeard-pirates',
        model: {
            figurehead: 'whale',
            emblem: emblemOf('whitebeard-pirates'),
            sailEmblem: true,
            colors: { hull: '#e6e2d8', band: '#4a3a6a', bottom: '#2a2a32', bulwark: '#d8d2c4', sail: '#f2ede0' }
        }
    },
    {
        id: 'red-force',
        name: 'The Red Force',
        epithet: 'Flagship of the Red Hair Pirates',
        description: 'Shanks\'s ship, which sailed into Marineford as the war reached its end.',
        crew: 'red-hair-pirates',
        model: {
            figurehead: 'bird',
            emblem: emblemOf('red-hair-pirates'),
            sailEmblem: true,
            colors: { hull: '#7a1e1c', band: '#d9b25a', bottom: '#2a1a16', bulwark: '#8a2a22', sail: '#ece4d0' }
        }
    },
    {
        id: 'marine-battleship',
        name: 'A Marine Battleship',
        epithet: 'A warship of the Navy',
        description: 'The Navy\'s warships fly its mark on their sails and carry their crew of marines and a battery of cannons to every sea. One lies at Marineford\'s pier.',
        faction: 'marines',
        home: 'marineford',
        model: {
            figurehead: 'none',
            emblem: { ...emblemOf('marines'), sailInk: '#1e2f55' },
            sailEmblem: true,
            colors: { hull: '#e9e6de', band: '#1e2f55', bottom: '#1e2f55', bulwark: '#d9d6cc', sail: '#f2f0ea', deck: '#9a7a58' }
        }
    }
];
