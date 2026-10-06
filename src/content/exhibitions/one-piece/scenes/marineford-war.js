// The Summit War of Marineford: the legendary moment. The same fortress at the instant the war turned,
// held still. The bay is frozen and the tidal waves that broke over it stand frozen at its mouth; the
// iron walls have risen from the quay, breached where the ice meets the plaza; the Whitebeard Pirates'
// flagship is fast in the ice with the fleet around her; burning stones hang in the smoke; the air
// itself is cracked over the bay; a warship hangs in the sky, falling. Marines in ranks fill the plaza,
// pirates charge across the ice, and on the scaffold kneels the prisoner the war is being fought for.
//
// Time is held almost still. Five echoes glow where the war turned; find them all and it plays out.
// The participants stand in it as echoes of light: observe them to learn who they were.
//
// Plain data; the town is the same as in the location (see marineford-layout.js), its walls raised.
import { BAY, SCAFFOLD, ground, stronghold, shipOf, SOLDIER, OFFICER, PIRATES } from './marineford-layout.js';
import { characters } from '../data/characters.js';

const ICE = -0.6;
const ACCENT = '#ffb46a';
const figureOf = id => characters.find(item => item.id === id)?.figure ?? {};

// Ranks of marines across the plaza, a path left clear from the breach to the scaffold's stair
const marines = [];
for (let z = 1.5; z <= 15; z += 2.7) {
    for (let x = -26; x <= 26; x += 2.3) {
        if (Math.abs(x) < 3.4) continue;
        if (x > 3 && z < 10 && x < 17) continue; // Room around the stone, the rift and the admiral
        if (x < -4 && x > -9 && z < 7) continue; // The scar
        marines.push([x + (z % 2) * 0.6, z, 0]);
    }
}
// Pirates charging across the ice at the walls, kept inside the bay and clear of the flagship
const pirates = [[], [], []];
let n = 0;
for (let z = -17; z <= -8; z += 3) {
    for (let x = -30; x <= 30; x += 2.7) {
        const dx = x - BAY.center[0], dz = z - BAY.center[1];
        if (Math.hypot(dx, dz) > BAY.radius - 1.6 || Math.abs(x) < 4.2) continue;
        if (x > -10 && x < 4 && z < -14) continue; // The Moby Dick's bow
        if (x < -12 && x > -19 && z < -9) continue; // Under the falling warship
        pirates[n++ % 3].push([x + ((z + 17) % 2) * 0.9, z, 180 + ((n * 37) % 30) - 15]);
    }
}

// A participant, standing in the war as an echo of light
const echo = (id, at, facing, { figure = {}, plinth = 0.02, where = 'in the war' } = {}) => ({
    id: `echo:${id}`,
    entity: id,
    model: { name: 'character-figure', params: { echo: true, plinth, plate: false, accent: '#ffe2b8', figure: { ...figureOf(id), ...figure } } },
    at,
    facing,
    display: 'none',
    marker: false,
    radius: 0.5 * (figureOf(id).height ?? 1),
    reach: 3 + (figureOf(id).height ?? 1),
    anchorHeight: 1.6 * (figureOf(id).height ?? 1),
    prompt: 'Observe',
    where
});

export default {
    title: 'The Summit War of Marineford',
    kind: 'moment',
    location: 'marineford',
    seed: 47,
    arrivalLine: 'The Summit War, held still. The bay is ice, the walls have risen, and the sky is cracked. Five echoes of how it went glow across the battlefield.',

    arrival: { at: [6, -17.5], facing: 180 },
    bounds: { minX: -47, maxX: 47, minZ: -76, maxZ: 30.5 },

    ground: ground({ sea: ICE, ice: true }),
    sky: {
        top: '#2a2c36',
        middle: '#6a5850',
        horizon: '#d8925a',
        below: '#2a2420',
        stars: 0,
        bodies: [{ facing: 300, elevation: 12, size: 2.4, color: '#ffc890', glow: 1.6 }]
    },
    fog: { color: '#6a5a52', density: 0.0068 },
    look: { exposure: 1.1, bloom: { strength: 0.8, radius: 0.6, threshold: 0.62 } },
    environmentIntensity: 0.7,
    particleLight: '#c89a7a',
    lightCenter: [0, -10],
    lights: [
        { type: 'hemisphere', sky: '#9a8a80', ground: '#2a2420', intensity: 0.85 },
        { type: 'directional', color: '#ffb07a', intensity: 1.7, facing: 300, elevation: 14, shadows: true, shadowArea: 62 },
        { type: 'directional', name: 'flash', color: '#fff4e0', intensity: 0, facing: 0, elevation: 60 },
        { type: 'point', color: '#ff6a2a', intensity: 60, distance: 45, decay: 1.4, at: [-12, 22, -14] },
        { type: 'point', color: '#ffb46a', intensity: 22, distance: 22, decay: 1.5, at: [0, 12, SCAFFOLD.at[1] - 3] }
    ],

    scenery: [
        // The sea beyond the ice, the ice itself, and the waves that froze as they broke over the bay
        { piece: 'sea', level: -1.4, size: 520, center: [0, -200], color: '#1a3440', swell: 0.06 },
        { piece: 'ice-sheet', center: BAY.center, radius: 52, level: ICE + 0.02 },
        { piece: 'ice-waves', center: BAY.center, radius: 47, from: -64, to: 64, height: 19, curl: 7.5, level: ICE },
        ...stronghold({ walls: 'raised', lit: 0.35 }),
        // The fleet, fast in the ice: the flagship at its head
        { piece: 'ship', name: 'moby-dick', ...shipOf('moby-dick'), walkable: false, at: [-3, -31], facing: 175, waterline: -1.6, size: 1.35, heel: 0.04, sails: 'torn', rolls: false, solid: true },
        { piece: 'ship', name: 'ally-1', ...shipOf('moby-dick'), figurehead: 'bird', colors: { hull: '#3a2a1e', band: '#4a3a6a' }, walkable: false, at: [-24, -25], facing: 160, waterline: -1.3, sails: 'set', rolls: false, solid: true, heel: -0.06 },
        { piece: 'ship', name: 'ally-2', ...shipOf('moby-dick'), figurehead: 'serpent', colors: { hull: '#2a2a2e', band: '#7a2a22' }, walkable: false, at: [23, -27], facing: 200, waterline: -1.3, sails: 'torn', rolls: false, solid: true, heel: 0.08 },
        { piece: 'ship', name: 'ally-3', ...shipOf('moby-dick'), figurehead: 'none', colors: { hull: '#4a3a2a', band: '#2a4a3a' }, walkable: false, at: [-14, -55], facing: 172, waterline: -1.3, sails: 'set', rolls: false, solid: true },
        { piece: 'ship', name: 'ally-4', ...shipOf('moby-dick'), figurehead: 'bird', colors: { hull: '#3a2a22', band: '#5a5a2a' }, walkable: false, at: [13, -53], facing: 188, waterline: -1.3, sails: 'set', rolls: false, solid: true },
        // A warship falling out of the sky into the bay, bow first
        { piece: 'ship', name: 'falling', ...shipOf('marine-battleship'), walkable: false, at: [-15.5, -14.5], facing: 150, waterline: 17, pitch: -0.62, heel: 0.3, sails: 'torn', rolls: false },
        // A ship far out to sea, coming in: the war's end (it sails in when time moves again)
        { piece: 'ship', name: 'red-force', ...shipOf('red-force'), walkable: false, at: [66, -66], facing: 290, waterline: -1.3, sails: 'set' },
        // The powers of the war, caught in the air
        { piece: 'fracture', name: 'quake', at: [-2, 21, -27], facing: 180, radius: 13, branches: 11, color: '#e6f4ff' },
        { piece: 'meteors', name: 'magma', positions: [[-15, 26, -11, 2.2], [11, 31, -19, 2.6], [24, 23, -6, 1.8], [-27, 33, -24, 2.3], [3, 40, -15, 3.1], [-6, 19, 4, 1.6]], color: '#ff4a12' },
        { piece: 'beams', name: 'light', beams: [[[36, 22, 22], [10, 2.4, 6]], [[36, 22, 22], [-7, 2.4, 12]], [[36, 22, 22], [19, 2, 1]]], color: '#fff2a0', radius: 0.05 },
        // The armies, caught mid-stride
        { piece: 'formation', name: 'marines', seed: 5, groups: [{ figure: SOLDIER, positions: marines }, { figure: OFFICER, positions: [[-10, 17.5, 0], [10, 17.5, 0], [-20, 17, 0], [20, 17, 0]] }] },
        { piece: 'formation', name: 'pirates', seed: 9, groups: PIRATES.map((figure, i) => ({ figure, positions: pirates[i], jitter: 30 })) },
        // On the scaffold: the two who stand over the prisoner
        { piece: 'formation', name: 'platform', solid: false, groups: [{ figure: { ...OFFICER, hat: 'none', hair: 'short', arms: { right: 'behind', left: 'behind' }, hold: {} }, positions: [[2.6, SCAFFOLD.at[1] + 1.4, 0]] }] }
    ],

    atmosphere: [
        { type: 'particles', kind: 'embers', count: 700, box: { min: [-34, 0, -44], max: [34, 26, 26] }, colors: ['#ff8a3a', '#ffcf7a'], size: 0.06, intensity: 1.6, speed: 0.6 },
        { type: 'particles', kind: 'dust', count: 420, box: { min: [-40, 2, -50], max: [40, 30, 28] }, colors: ['#8a7a70', '#5a504a'], size: 0.5, intensity: 0.35 },
        { type: 'particles', kind: 'dust', count: 260, box: { min: [-30, -0.4, -60], max: [30, 3, -6] }, colors: ['#ffffff', '#cfe6f2'], size: 0.04, intensity: 0.9 },
        { type: 'mist', size: 140, height: 1.2, color: '#d8e4ea', opacity: 0.22, layers: 3, at: [0, -40], y: ICE }
    ],

    audio: {
        ambience: [{ preset: 'held-storm', volume: 1 }],
        room: { amount: 0.25, decay: 3.4 }
    },

    exhibits: [
        // Those who were there, as echoes
        echo('portgas-d-ace', [0, SCAFFOLD.at[1] + 0.4], 0, { figure: { stance: 'kneel', arms: { right: 'chained', left: 'chained' }, hold: {} }, where: 'kneeling on the scaffold' }),
        echo('monkey-d-garp', [-2.6, SCAFFOLD.at[1] + 1.2], 0, { figure: { arms: { right: 'crossed', left: 'crossed' } }, where: 'on the scaffold' }),
        echo('edward-newgate', [-3, -13.2], 180, { where: 'on the ice before his flagship' }),
        echo('monkey-d-luffy', [1.4, -6.2], 180, { figure: { stance: 'stride' }, where: 'at the breach in the walls' }),
        echo('sakazuki', [5.5, 3.6], 0, { where: 'on the plaza' }),
        echo('kuzan', [20, -37], 330, { where: 'by the frozen waves' })
    ],

    moment: {
        timeScale: 0.02,
        accent: ACCENT,
        beats: [
            {
                id: 'the-scaffold',
                at: [3.6, 10.6],
                text: 'The Navy announced to the whole world that Portgas D. Ace, son of the Pirate King, would be executed here. It gathered every admiral and every ship it could, and raised the scaffold where the bay could see it.'
            },
            {
                id: 'the-quake',
                at: [-9, -20],
                text: 'Whitebeard\'s fleet rose out of the bay itself. He struck the air, and it cracked like glass; the sea heaved up into two great waves on either side of Marineford.'
            },
            {
                id: 'the-frozen-bay',
                at: [21, -34],
                text: 'An admiral of ice met the waves as they broke and froze them where they stood, and the bay with them. The fleet was held fast, and the war went on across the ice.'
            },
            {
                id: 'from-the-sky',
                at: [-15, -9.6],
                text: 'Then a warship fell out of the sky. On it, with an army of escaped prisoners, was Ace\'s younger brother, a pirate in a straw hat with a fraction of the strength of anyone else on that field, who would not stop.'
            },
            {
                id: 'the-last-stand',
                at: [-6.4, -9.6],
                text: 'The walls rose to trap the fleet; Whitebeard broke through them. Ace was freed, and fell shielding his brother from an admiral\'s fist of magma. Whitebeard fought on until the end, and died standing.'
            }
        ],
        resolution: {
            delay: 6,
            ease: 3.5,
            light: 'flash',
            lightPeak: 5,
            cue: 'thunder',
            move: [
                { name: 'red-force', by: [-30, 0, 9], over: 34 },
                { name: 'magma', by: [0, -24, 0], over: 5 },
                { name: 'falling', by: [0, -16, 0], over: 4 }
            ],
            ambience: [{ preset: 'harbor-dusk', volume: 0.8 }],
            lines: [
                { text: 'And time moves again. The burning stones fall, the warship comes down onto the ice, and the war goes on, until a single ship sails in from the open sea.', after: 1.6, seconds: 10 },
                { text: 'Red-Haired Shanks came ashore and told both sides that the war was over. Neither side kept fighting. The way back to Marineford stands on the ice behind where you arrived.', after: 13, seconds: 11 }
            ]
        }
    },

    portals: [
        {
            to: 'marineford',
            at: [6, -21.6],
            facing: 180,
            title: 'Marineford',
            subtitle: 'Leave the moment',
            prompt: 'Return to Marineford',
            accent: '#8fc8ff',
            preview: { style: 'sea', sky: ['#2c5a9a', '#f0d6b0'], far: '#5a7a9a', near: '#14404e', celestial: { x: 0.62, y: 0.5, size: 0.05, color: '#fff2d8' } }
        }
    ]
};
