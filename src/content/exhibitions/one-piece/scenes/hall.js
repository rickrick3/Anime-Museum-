// The Hall of the Great Pirate Era: One Piece's gallery, a great covered dock. Down its middle a basin
// of sea water runs out through an arch to the open sea at sunset, and in it lies the Roger Pirates'
// ship, sails set, gangplank down. Each part of the hall is one part of the world, a space rather than
// a sign: the crews on the quays, the Marines facing the pirates across the water, the Emperors and
// their flags, ships in miniature, history as a walk, the world chart, a legendary moment.
//
//                 the open sea, through the great arch (north)
//     WORLD MAP (-15, -31)                              LEGENDARY MOMENTS (15, -31.5)
//     ROGER PIRATES (-12, -15)   ~~ basin ~~            MARINES (15, -18.5)
//       their history along      ~~ the Oro ~~          WHITEBEARD PIRATES (12, -1.6)
//       the west wall            ~~ Jackson ~~
//     STRAW HAT PIRATES (-12, 11)  ships in cases (z 2)  FOUR EMPERORS (12, 7.6 .. 19.8)
//                                HISTORY (x 0, z 19 → 4.6)
//     WANTED (-9, 24.7)          arrival (0, 21.5)      WANTED (9, 24.7)
//                                the museum's doorway (0, 24)
//
// Plain data; exhibits name the universe's entities and take their words, looks and links from it.
import { characters } from '../data/characters.js';
import { crews, factions } from '../data/crews.js';
import { ships } from '../data/ships.js';

const ACCENT = '#e8b04a';
const CURRENCY = '฿ ';
const byId = id => characters.find(item => item.id === id);
const emblemOf = id => [...crews, ...factions].find(item => item.id === id)?.emblem;
const ORO = ships.find(item => item.id === 'oro-jackson');

// A character on a low plinth: its figure comes from its data; its size sets how much room it takes
function figure(id, at, facing, { plinth = 0.35, accent = ACCENT, where = null } = {}) {
    const height = byId(id)?.figure?.height ?? 1;
    const tall = (byId(id)?.figure?.build === 'small' ? 0.62 : 1) * height;
    return {
        id: `figure:${id}`,
        entity: id,
        model: { name: 'character-figure', params: { plinth, accent } },
        at,
        facing,
        display: 'none',
        marker: false,
        radius: Math.max(0.55, 0.42 * height) + 0.08,
        reach: 2.6 + tall * 0.6,
        anchorHeight: plinth + 1.75 * tall,
        standOff: 1.2 + tall * 0.5,
        where
    };
}

// A crew's or a power's flag on a pole
const standard = (id, at, facing, where = null) => ({
    id: `standard:${id}`,
    entity: id,
    model: 'faction-standard',
    at,
    facing,
    display: 'none',
    marker: false,
    radius: 0.6,
    anchorHeight: 2.6,
    where
});

// A wanted poster on a notice board; the figure it stands for is somewhere in the hall (anchor: false)
const poster = (id, x, z) => ({
    id: `poster:${id}`,
    entity: id,
    model: { name: 'wanted-poster', params: { height: 1.75, currency: CURRENCY } },
    at: [x, z],
    facing: 0,
    display: 'none',
    marker: false,
    anchor: false,
    radius: 0.05,
    reach: 2.8,
    anchorHeight: 1.75,
    prompt: 'Read'
});

// A ship in miniature, under glass
const shipCase = (id, x, z, facing) => ({
    id: `ship:${id}`,
    entity: id,
    model: { name: 'ship-model', params: { scale: 1 / 16 } },
    at: [x, z],
    facing,
    display: 'case',
    case: [1.75, 1.55, 0.62],
    height: 0.9,
    radius: 0.95,
    anchorHeight: 1.9,
    marker: false,
    where: 'with the ships in miniature'
});

// Something of the past on a pedestal, along the Roger Pirates' wall
const relic = (id, model, x, z, extra = {}) => ({
    id: `relic:${id}`,
    entity: id,
    model,
    at: [x, z],
    facing: 90,
    height: 0.95,
    radius: 0.45,
    marker: false,
    where: 'by the Roger Pirates',
    ...extra
});

const STRAW_HATS = ['monkey-d-luffy', 'roronoa-zoro', 'nami', 'usopp', 'sanji', 'tony-tony-chopper', 'nico-robin', 'franky', 'brook', 'jinbe'];
const GREATS = ['gol-d-roger', 'edward-newgate', 'shanks', 'kaido', 'charlotte-linlin', 'marshall-d-teach', 'portgas-d-ace', 'marco', 'buggy'];

export default {
    title: 'The Hall of the Great Pirate Era',
    kind: 'gallery',
    seed: 12,
    arrivalLine: 'The hall of the Great Pirate Era. A pirate ship lies in the basin with her sails set and her crew on the quay beside her. The Marines face them across the water, and past the arch is the open sea.',

    arrival: { at: [0, 21.5], facing: 0 },
    arrivals: {
        marineford: { at: [-11.6, -28], facing: 315, line: 'Back in the hall, at the chart table. Marineford\'s light is still burning on the Grand Line.' }
    },
    bounds: { minX: -21.6, maxX: 21.6, minZ: -35.6, maxZ: 25.6 },

    ground: {
        size: 80,
        segments: 160,
        base: 'stone',
        colors: { stone: '#958c7e', stoneDark: '#837a6d', water: '#14262c', tile: '#d9d6cc', wood: '#6b5038' },
        hills: { amplitude: 0, rimHeight: 0 },
        areas: [
            // The basin, and the sea beyond the far wall
            { shape: 'rect', at: [0, -18.25], size: [13, 36.5], height: -4, blend: 0, surface: 'water' },
            { shape: 'rect', at: [0, -60], size: [80, 47], height: -4, blend: 0, surface: 'water' },
            // The Marines' white floor
            { shape: 'rect', at: [15.2, -18.5], size: [13, 18], surface: 'tile', blend: 0 }
        ]
    },
    sky: {
        top: '#1c2a50',
        middle: '#6a5a7c',
        horizon: '#ff9a5e',
        below: '#3a2a36',
        stars: 0.02,
        bodies: [{ facing: 345, elevation: 4, size: 3, color: '#ffd29a', glow: 1.5 }]
    },
    fog: { color: '#c08a6e', density: 0.0055 },
    look: { exposure: 1.05, bloom: { strength: 0.55, radius: 0.5, threshold: 0.74 } },
    environmentIntensity: 0.6,
    particleLight: '#d8a07a',
    lightCenter: [0, -6],
    lights: [
        { type: 'hemisphere', sky: '#9aa6c0', ground: '#4a3a2c', intensity: 1.05 },
        // The sun going down over the sea, straight in through the arch and the open roof
        { type: 'directional', color: '#ffb27a', intensity: 2.3, facing: 345, elevation: 9, shadows: true, shadowArea: 46 },
        // One lamp over each quay (the court has the evening from the arch and the lanterns' glow)
        { type: 'point', color: '#ffc896', intensity: 70, distance: 38, decay: 1.35, at: [-12, 7, 1] },
        { type: 'point', color: '#f2ecff', intensity: 70, distance: 38, decay: 1.35, at: [12.5, 7, -4] }
    ],

    scenery: [
        {
            piece: 'dock-hall',
            west: -22, east: 22, north: -36, south: 26,
            height: 11,
            roof: { height: 14, court: 0, slot: [-8, 8] },
            arch: { width: 16, height: 10.5 },
            columns: [[-8, -30], [8, -30], [-8, -22], [8, -22], [-8, -6], [8, -6], [-8, 0], [8, 0]],
            lanterns: [[-14, -30, 3.2], [-14, -20, 3.2], [-14, -10, 3.2], [14, -30, 3.2], [14, -20, 3.2], [14, -10, 3.2],
                [-14, 6, 5], [-14, 16, 5], [14, 6, 5], [14, 16, 5], [0, 9, 6], [0, 17, 6], [-7, 22, 6], [7, 22, 6]],
            banners: [
                { at: [-13.5, 19.5], facing: 90, text: 'Straw Hat', sub: 'Pirates', emblem: emblemOf('straw-hat-pirates'), colors: { cloth: '#2a1a14', ink: '#e8d8b0' }, top: 9.6 },
                { at: [-13.5, -24.5], facing: 90, text: 'Roger', sub: 'Pirates', emblem: emblemOf('roger-pirates'), colors: { cloth: '#3a1414', ink: '#e8d8b0' }, top: 9 },
                { at: [-15, -34.6], facing: 180, text: 'World Map', sub: 'Grand Line', colors: { cloth: '#14243a', ink: '#bfe8ff' }, top: 8.8 },
                { at: [14.5, -27.5], facing: 270, text: 'Marines', sub: 'The Navy', emblem: { ...emblemOf('marines'), ink: '#e8eef8' }, colors: { cloth: '#1e2f55', ink: '#e8eef8' }, top: 9 },
                { at: [14.5, -6.6], facing: 270, text: 'Whitebeard', sub: 'Pirates', emblem: emblemOf('whitebeard-pirates'), colors: { cloth: '#1b1626', ink: '#e8e0d0' }, top: 9 },
                { at: [14.5, 21.8], facing: 270, text: 'Emperors', sub: 'The Four', emblem: emblemOf('four-emperors'), colors: { cloth: '#2a1e10', ink: '#e8c870' }, top: 9.6 },
                { at: [15, -34.6], facing: 180, text: 'Legends', sub: 'Legendary Moments', colors: { cloth: '#3a2410', ink: '#ffd9a0' }, top: 8.8 },
                { at: [0, 20.2], facing: 180, text: 'History', sub: 'Great Pirate Era', colors: { cloth: '#20180f', ink: '#e8d8b0' }, top: 9.6, hang: 4.5 },
                { at: [-7.3, 1.2], facing: 180, text: 'Ships', colors: { cloth: '#102434', ink: '#cfe8f0' }, width: 1.1, top: 7.4, hang: 6 }
            ]
        },
        // The basin's walls and the sea in it; a rail along its near end and across the arch
        { piece: 'sea', level: -1.0, size: 420, center: [0, -170], color: '#123a46', swell: 0.09, segments: 70 },
        { piece: 'quay', from: [-6.5, -36.5], to: [-6.5, 0], height: 0, bottom: -4, gaps: [[22.7, 24.3]], bollards: 6 },
        { piece: 'quay', from: [6.5, 0], to: [6.5, -36.5], height: 0, bottom: -4, bollards: 6 },
        { piece: 'quay', from: [-6.5, 0], to: [6.5, 0], height: 0, bottom: -4, bollards: 99 },
        { piece: 'balustrade', from: [-6.4, 0.45], to: [6.4, 0.45], height: 0.95 },
        { piece: 'balustrade', from: [-8, -35.55], to: [-6.6, -35.55], height: 0.95 },
        { piece: 'balustrade', from: [6.6, -35.55], to: [8, -35.55], height: 0.95 },
        // The Roger Pirates' ship, sails set, her gangplank down to the west quay
        {
            piece: 'ship',
            name: 'oro-jackson',
            ...ORO.model,
            at: [0, -15],
            facing: 0,
            waterline: -1.0,
            quay: 0,
            gangplank: { side: 'port', at: 2, reach: 4.0 },
            sails: 'set',
            lines: { helm: 'The wheel turns under your hands, and far below the rudder answers. She was built for the end of the world.' }
        },
        // The wanted posters' boards, either side of the museum's doorway
        { piece: 'notice-board', at: [-9, 24.75], facing: 0, width: 10.2, height: 2.4, bottom: 0.45 },
        { piece: 'notice-board', at: [9, 24.75], facing: 0, width: 10.2, height: 2.4, bottom: 0.45 },
        { piece: 'cargo', positions: [[-9.6, -27.5, 'barrels'], [-9.8, -3.6, 'coil'], [9.6, -33.2, 'crates', 20], [-20.6, 22.4, 'crate', 15], [20.4, 22.2, 'barrels']] }
    ],

    atmosphere: [
        { type: 'particles', kind: 'dust', count: 320, box: { min: [-21, 0.5, -35], max: [21, 12, 25] }, colors: ['#ffd9a8', '#ffffff'], size: 0.024, intensity: 0.75 }
    ],

    audio: {
        ambience: [{ preset: 'harbor-dusk', volume: 0.75 }, { preset: 'chart-room', volume: 0.35 }],
        room: { amount: 0.32, decay: 2.8 }
    },

    exhibits: [
        // ---- The Straw Hat Pirates, on the west quay ----
        figure('monkey-d-luffy', [-11.6, 11], 90, { plinth: 0.45, where: 'with the Straw Hat Pirates' }),
        figure('roronoa-zoro', [-11.6, 7.8], 90, { where: 'with the Straw Hat Pirates' }),
        figure('sanji', [-11.6, 14.2], 90, { where: 'with the Straw Hat Pirates' }),
        figure('nami', [-11.6, 4.6], 90, { where: 'with the Straw Hat Pirates' }),
        figure('usopp', [-11.6, 17.4], 90, { where: 'with the Straw Hat Pirates' }),
        figure('tony-tony-chopper', [-15.2, 6.2], 90, { where: 'with the Straw Hat Pirates' }),
        figure('nico-robin', [-15.2, 9.4], 90, { where: 'with the Straw Hat Pirates' }),
        figure('franky', [-15.2, 12.6], 90, { where: 'with the Straw Hat Pirates' }),
        figure('brook', [-15.2, 15.8], 90, { where: 'with the Straw Hat Pirates' }),
        figure('jinbe', [-15.2, 19.0], 90, { where: 'with the Straw Hat Pirates' }),
        standard('straw-hat-pirates', [-19.4, 11], 90, 'with the Straw Hat Pirates'),
        {
            id: 'straw-hat', entity: 'straw-hat', model: 'hat-display', at: [-9.2, 8.9], facing: 90,
            display: 'case', case: [0.8, 0.62, 0.8], height: 0.95, radius: 0.55, marker: false, where: 'beside Luffy'
        },

        // ---- The Roger Pirates, on the west quay beside their ship ----
        figure('gol-d-roger', [-11.2, -15], 90, { plinth: 0.55, where: 'with the Roger Pirates' }),
        figure('silvers-rayleigh', [-12.4, -18.8], 80, { where: 'with the Roger Pirates' }),
        figure('kozuki-oden', [-12.4, -11.2], 100, { where: 'with the Roger Pirates' }),
        figure('scopper-gaban', [-14.6, -22.2], 70, { where: 'with the Roger Pirates' }),
        figure('crocus', [-14.6, -7.8], 110, { where: 'with the Roger Pirates' }),
        standard('roger-pirates', [-17.2, -15], 90, 'with the Roger Pirates'),
        {
            id: 'oro-jackson-plaque', entity: 'oro-jackson',
            model: { name: 'timeline-post', params: { era: 'Moored here', title: 'The Oro Jackson', accent: '#ffb877' } },
            at: [-8.7, -17.6], facing: 90, display: 'none', marker: false, radius: 0.3, anchorHeight: 1.3,
            anchorPoint: [0, 6, -15], stand: [-9.4, -13, 90], where: 'moored in the basin'
        },
        // Their history, and the places of it, along the west wall
        relic('god-valley-incident', { name: 'mini-flag', params: { emblem: emblemOf('rocks-pirates') } }, -19.7, -27),
        relic('reach-laugh-tale', 'treasure-chest', -19.7, -22.5),
        relic('laugh-tale', { name: 'island-model', params: { style: 'ruins' } }, -19.7, -18),
        relic('roger-crew-disbands', { name: 'mini-flag', params: { emblem: emblemOf('roger-pirates') } }, -19.7, -13.5),
        relic('loguetown', { name: 'island-model', params: { style: 'tower' } }, -19.7, -9),
        // Aboard the Oro Jackson, in her cabin (in the ship's own frame: x to starboard, z toward the stern)
        {
            id: 'odens-journal', entity: 'odens-journal', frame: 'oro-jackson', at: [1.25, 9.4], facing: 0,
            model: { name: 'log-book', params: { lines: ['Day after day, the sea.', 'Tomorrow, the last island.'] } },
            behavior: 'open', cue: 'paper', display: 'none', marker: false, radius: 0.42, reach: 2.2, anchorHeight: 1.1,
            where: 'in the Oro Jackson\'s cabin'
        },

        // ---- The Marines, on the east quay, facing the pirates across the water ----
        figure('monkey-d-garp', [11.6, -18.5], 270, { plinth: 0.45, accent: '#9fc8ff', where: 'with the Marines' }),
        figure('smoker', [11.6, -13.6], 270, { accent: '#9fc8ff', where: 'with the Marines' }),
        figure('coby', [11.6, -23.4], 270, { accent: '#9fc8ff', where: 'with the Marines' }),
        figure('sakazuki', [14.8, -22.2], 270, { plinth: 0.42, accent: '#9fc8ff', where: 'with the Marines' }),
        figure('borsalino', [14.8, -18.5], 270, { plinth: 0.42, accent: '#9fc8ff', where: 'with the Marines' }),
        figure('kuzan', [14.8, -14.8], 270, { plinth: 0.42, accent: '#9fc8ff', where: 'with the Marines' }),
        figure('sengoku', [18.2, -18.5], 270, { plinth: 0.6, accent: '#9fc8ff', where: 'with the Marines' }),
        standard('marines', [20.4, -18.5], 270, 'with the Marines'),
        shipCase('marine-battleship', 9.4, -9.4, 270),

        // ---- The Whitebeard Pirates ----
        figure('portgas-d-ace', [11.6, -5], 270, { where: 'with the Whitebeard Pirates' }),
        figure('marco', [11.6, -1.6], 270, { where: 'with the Whitebeard Pirates' }),
        figure('vista', [11.6, 1.8], 270, { where: 'with the Whitebeard Pirates' }),
        figure('jozu', [15.2, -1.6], 270, { where: 'with the Whitebeard Pirates' }),
        standard('whitebeard-pirates', [18.6, -1.6], 270, 'with the Whitebeard Pirates'),

        // ---- The Four Emperors, each before their crew's flag ----
        figure('edward-newgate', [12, 7.8], 270, { plinth: 0.5, where: 'among the Four Emperors' }),
        figure('shanks', [12, 11.8], 270, { plinth: 0.5, where: 'among the Four Emperors' }),
        figure('kaido', [12, 15.8], 270, { plinth: 0.5, where: 'among the Four Emperors' }),
        figure('charlotte-linlin', [12, 19.8], 270, { plinth: 0.5, where: 'among the Four Emperors' }),
        standard('four-emperors', [17.6, 7.8], 270, 'among the Four Emperors'),
        standard('red-hair-pirates', [15.8, 11.8], 270, 'among the Four Emperors'),
        standard('beasts-pirates', [15.8, 15.8], 270, 'among the Four Emperors'),
        standard('big-mom-pirates', [15.8, 19.8], 270, 'among the Four Emperors'),
        figure('marshall-d-teach', [19.2, 13.8], 270, { accent: '#8a7aa8', where: 'behind the Emperors\' seats' }),
        standard('blackbeard-pirates', [20.6, 17.2], 270, 'behind the Emperors\' seats'),

        // ---- Ships in miniature, at the head of the basin ----
        shipCase('going-merry', -5.4, 2.1, 180),
        shipCase('thousand-sunny', -2.4, 2.1, 180),
        shipCase('moby-dick', 2.4, 2.1, 180),
        shipCase('red-force', 5.4, 2.1, 180),

        // ---- The world chart's instrument, and the legendary moment ----
        {
            id: 'log-pose', entity: 'log-pose', model: 'compass-instrument', at: [-10.4, -28.6], facing: 135,
            height: 1.0, radius: 0.45, marker: false, where: 'by the chart table'
        },
        {
            id: 'summit-war-diorama', entity: 'summit-war', model: { name: 'bay-diorama', params: { size: 0.72 } },
            at: [15, -31.4], facing: 180, display: 'case', case: [1.7, 0.75, 1.7], height: 0.85, radius: 1.05,
            anchorHeight: 1.7, marker: false, where: 'with the legendary moments'
        },

        // ---- Wanted: the era's pirates on the boards by the doorway ----
        ...STRAW_HATS.map((id, i) => poster(id, -13.5 + i * 1.0, 24.7)),
        ...GREATS.map((id, i) => poster(id, 4.8 + i * 1.05, 24.7))
    ],

    // The history of the era as a walk from the doorway to the ships, things on show beside its posts
    timeline: {
        from: [0, 19],
        to: [0, 4.6],
        title: 'The Great Pirate Era',
        events: ['roger-execution', 'luffy-receives-hat', 'luffy-sets-sail', 'alabasta-war', 'enies-lobby-assault', 'impel-down-break', 'marineford-war', 'sixteen-bells', 'sabaody-reunion', 'raid-on-onigashima'],
        displays: {
            'roger-execution': { model: 'mini-scaffold' },
            'luffy-receives-hat': { model: 'hat-display', scale: 0.7 },
            'luffy-sets-sail': { model: { name: 'mini-flag', params: { emblem: emblemOf('straw-hat-pirates') } } },
            'alabasta-war': { model: { name: 'island-model', params: { style: 'peak', green: '#c9a86a', rock: '#c9a26a' } }, scale: 0.8 },
            'enies-lobby-assault': { model: { name: 'ship-model', params: { scale: 1 / 34, entity: ships.find(item => item.id === 'going-merry') } } },
            'impel-down-break': { model: { name: 'island-model', params: { style: 'fortress', green: '#4a4a52' } }, scale: 0.8 },
            'marineford-war': { model: { name: 'bay-diorama', params: { size: 0.3 } } },
            'sixteen-bells': { model: 'bell', scale: 0.8 },
            'sabaody-reunion': { model: { name: 'ship-model', params: { scale: 1 / 34, entity: ships.find(item => item.id === 'thousand-sunny') } } },
            'raid-on-onigashima': { model: { name: 'mini-flag', params: { emblem: emblemOf('beasts-pirates') } } }
        }
    },

    // The world: set sail from here
    navigation: { at: [-15, -31], facing: 0, radius: 2.3, height: 0.95 },

    portals: [{ to: 'museum', at: [0, 24], facing: 0 }]
};
