// Marineford: the location. The old headquarters of the Marines on a clear afternoon, years after the
// war: the fortress and its flags, the iron walls sunk back into the quay, the scaffold still standing
// on the plaza, and the scar the war tore through the paving. A warship lies at the pier: board her.
// The bell the Straw Hat captain rang hangs in its tower. Beside the stone that tells what happened
// here, a rift hangs in the air: the way into the war itself.
//
// Plain data; the layout is shared with the moment (see marineford-layout.js).
import { LAND, PIER, SCAFFOLD, NAVY, ground, stronghold, shipOf, SOLDIER, OFFICER } from './marineford-layout.js';

const ACCENT = '#8fc8ff';

export default {
    title: 'Marineford',
    kind: 'location',
    location: 'marineford',
    seed: 31,
    arrivalLine: 'Marineford, years after the war. The fortress still flies the Navy\'s flag, the scaffold still stands on the plaza, and the ground is still split where the war broke it.',

    arrival: { at: [4.5, -0.6], facing: 192 },
    arrivals: {
        'marineford-war': { at: [12.6, 11.4], facing: 60, line: 'Back on the plaza, on a quiet afternoon. The bay is open water again.' }
    },
    bounds: { minX: -47, maxX: 47, minZ: -31, maxZ: 30.5 },

    ground: ground({ sea: -6 }),
    sky: {
        top: '#2c5a9a',
        middle: '#7aa6d0',
        horizon: '#f0d6b0',
        below: '#5a6a7a',
        stars: 0,
        bodies: [{ facing: 250, elevation: 24, size: 2.2, color: '#fff2d8', glow: 1.2 }]
    },
    fog: { color: '#b9c9d8', density: 0.0042 },
    look: { exposure: 1.0, bloom: { strength: 0.35, radius: 0.45, threshold: 0.85 } },
    environmentIntensity: 0.9,
    particleLight: '#e8e0d0',
    lightCenter: [0, 8],
    lights: [
        { type: 'hemisphere', sky: '#bcd2f0', ground: '#7a7060', intensity: 1.15 },
        { type: 'directional', color: '#fff0d8', intensity: 2.5, facing: 250, elevation: 30, shadows: true, shadowArea: 62 }
    ],

    scenery: [
        { piece: 'sea', level: -0.8, size: 460, center: [0, -150], color: '#14404e', swell: 0.14 },
        ...stronghold({ walls: 'lowered', lit: 0.15 }),
        // The pier, and a warship of the Navy lying at it with her gangplank down
        { piece: 'pier', at: PIER.at, facing: 0, length: PIER.length, width: PIER.width, height: LAND, bottom: -6, gaps: [{ side: 'right', at: 11.15, width: 1.4 }] },
        {
            piece: 'ship', name: 'warship', ...shipOf('marine-battleship'), at: [24.2, -21], facing: 0, waterline: -0.8, quay: LAND,
            gangplank: { side: 'port', at: 2, reach: 2.0 }, sails: 'furled',
            lines: { helm: 'The warship\'s wheel is heavy and well kept. Somewhere below, a bell rings the watch.' }
        },
        // A few marines keeping watch at the gate
        { piece: 'formation', groups: [{ figure: SOLDIER, positions: [[-6.5, 28.6, 0], [-5, 28.6, 0], [5, 28.6, 0], [6.5, 28.6, 0], [-12, 26.5, 20], [12, 26.5, 340]] }, { figure: OFFICER, positions: [[0, 27.6, 0]] }] },
        { piece: 'cargo', positions: [[15.6, -6, 'crates', 10], [21, -2.4, 'barrels'], [-24, 2.2, 'coil'], [-20, 3, 'crate', 30]] }
    ],

    atmosphere: [
        { type: 'particles', kind: 'dust', count: 140, box: { min: [-30, 1.5, -20], max: [30, 8, 28] }, colors: ['#fff8e8', '#ffffff'], size: 0.022, intensity: 0.5 }
    ],

    audio: {
        ambience: [{ preset: 'harbor-dusk', volume: 1 }],
        room: { amount: 0.06, decay: 1.6 }
    },

    exhibits: [
        // What happened here: the stone that tells it, and the war's own plaque beside the rift
        {
            id: 'marineford-stone', entity: 'marineford',
            model: { name: 'memorial', params: { title: 'Marineford', lines: ['Headquarters of the Navy.', 'Here the Great Pirate Era turned.'], accent: '#cfe0ff' } },
            at: [9, 3], facing: 200, display: 'none', marker: false, radius: 1.25, anchorHeight: 2.4, prompt: 'Read', where: 'on the plaza',
            description: [
                'The stone lists what happened here. Look down its connections to find each event, and the moment the museum has kept.',
                'Marineford was the headquarters of the Navy until the war; after it, the headquarters moved to the New World.'
            ]
        },
        {
            id: 'war-plaque', entity: 'marineford-war',
            model: { name: 'timeline-post', params: { era: 'Great Pirate Era · Year 22', title: 'The Summit War', accent: '#ffcf7a', moment: true } },
            at: [12, 6.2], facing: 225, display: 'none', marker: false, radius: 0.3, anchorHeight: 1.3, where: 'beside the rift'
        },
        // The scaffold: a plaque at the foot of its stair; threads lead to the platform itself
        {
            id: 'platform-plaque', entity: 'execution-platform',
            model: { name: 'timeline-post', params: { era: 'On the plaza', title: 'The Execution Platform', accent: ACCENT } },
            at: [3.4, SCAFFOLD.at[1] - SCAFFOLD.depth / 2 - SCAFFOLD.stair.length - 0.4], facing: 20, display: 'none', marker: false, radius: 0.3,
            anchorHeight: 1.3, anchorPoint: [0, 9, SCAFFOLD.at[1]], where: 'at the foot of the scaffold'
        },
        {
            id: 'walls-plaque', entity: 'siege-walls',
            model: { name: 'timeline-post', params: { era: 'Along the shore', title: 'The Encircling Walls', accent: ACCENT } },
            at: [-9.5, -0.9], facing: 180, display: 'none', marker: false, radius: 0.3, anchorHeight: 1.3, where: 'along the shore'
        },
        {
            id: 'scar-plaque', entity: 'quake-scar',
            model: { name: 'timeline-post', params: { era: 'On the plaza', title: 'The Scar', accent: ACCENT } },
            at: [-7.4, 3.8], facing: 100, display: 'none', marker: false, radius: 0.3, anchorHeight: 1.3, anchorPoint: [-3.4, 1.4, 4], where: 'across the plaza'
        },
        // The bell in its tower: ring it
        {
            id: 'ox-bell', entity: 'sixteen-bells', model: 'bell-tower', at: [-16, 8], facing: 30, display: 'none', marker: false,
            radius: 1.7, reach: 4.2, anchorHeight: 3.2, behavior: 'swing', prompt: 'Ring the bell', cue: 'chime', where: 'in the bell tower'
        },
        // Aboard the warship: her standard on deck
        {
            id: 'warship-standard', entity: 'marine-battleship', frame: 'warship', at: [0, -8.6], facing: 180,
            model: { name: 'mini-flag', params: { height: 1.1, emblem: NAVY } }, display: 'pedestal', height: 0.5, radius: 0.4, marker: false,
            reach: 2.6, anchorHeight: 2.6, where: 'aboard her, at the pier'
        }
    ],

    portals: [
        // Into the war: a rift hanging in the air beside the stone that tells of it
        {
            to: 'marineford-war',
            entity: 'summit-war',
            shape: 'oval',
            at: [15.5, 9.5],
            facing: 240,
            prompt: 'Enter the Legendary Moment',
            where: 'through the rift on the plaza',
            accent: '#ffb46a',
            preview: { style: 'sea', sky: ['#2a2c36', '#d8925a'], far: '#5a4a44', near: '#cfe0ea', celestial: { x: 0.36, y: 0.6, size: 0.04, color: '#ffe0b0' } },
            ambience: 'held-storm'
        },
        // Back to the hall (and from there, the museum)
        {
            to: 'hall',
            at: [-23, 16],
            facing: 90,
            title: 'The Hall',
            subtitle: 'One Piece',
            prompt: 'Return to the Hall',
            accent: '#e8b04a',
            preview: { style: 'sea', sky: ['#22305e', '#ff9a52'], far: '#3a3e6a', near: '#0b1830', celestial: { x: 0.5, y: 0.34, size: 0.09, color: '#ffd59a' } }
        }
    ]
};
