// The Shadow Ninja exhibition: a hidden village in a mountain valley at dusk. Loaded only when
// someone walks through its doorway. Plain data: the museum's builders make the world from it
// (src/museum/exhibition.js), from scenery pieces and models named in src/scenery/catalog.js.
//
// The valley, from above (north is up, metres):
//
//          temple on its platform (0, -27), maples around it
//                      │ stairs, statue and lanterns at their foot
//   training ground ── village square (0, 6) ── bamboo grove (22, 8)
//      (-22, -6)             │ the blade, banners          │
//                          gate (0, 29), the map table     │ a path back through the bamboo
//                            │                             │
//                   arrival (0, 38) ─────────────────────── ┘
//                   the museum's doorway behind you (0, 42.5)
//
// Everything here is original: no characters, names, symbols or artwork from any existing series.

export default {
    id: 'shadow-ninja',
    title: 'Shadow Ninja',
    seed: 11,
    arrivalLine: 'Dusk in a hidden valley, and the lanterns are being lit. Five exhibits wait along its paths; the museum\'s doorway stands behind you.',

    arrival: { at: [0, 38], facing: 0 },
    exit: { at: [0, 42.5], facing: 0 },
    bounds: { minX: -42, maxX: 42, minZ: -40, maxZ: 46 },
    boundary: { radius: 41, center: [0, 3] },

    ground: {
        size: 150,
        segments: 150,
        base: 'grass',
        colors: { grass: '#2f3d25', grassDark: '#1d281a', earth: '#5d4733', stone: '#6c6862', wood: '#5a3d28' },
        hills: { amplitude: 0.45, scale: 0.06, rimStart: 40, rimEnd: 72, rimHeight: 15, seed: 3 },
        paths: [
            { points: [[0, 41], [0, 30], [-0.8, 22], [0, 14], [0, 8]], width: 3, surface: 'earth' },
            { points: [[0, 4], [0, -6], [0, -13]], width: 3, surface: 'earth' },
            { points: [[-6, 5], [-13, 1], [-19, -4]], width: 2.4, surface: 'earth' },
            { points: [[7, 6], [14, 8], [18.5, 16], [15, 25], [7, 32], [2, 37]], width: 2.2, surface: 'earth' }
        ],
        areas: [
            { shape: 'circle', at: [0, 39.5], radius: 5, surface: 'stone', height: 0, blend: 2.5 },
            { shape: 'circle', at: [0, 6], radius: 9, surface: 'stone', height: 0.05, blend: 2.5 },
            { shape: 'circle', at: [-22.5, -6.5], radius: 7.5, surface: 'earth', height: 0, blend: 3 },
            { shape: 'circle', at: [0, -15], radius: 6, surface: 'stone', height: 0, blend: 2.5 },
            { shape: 'rect', at: [0, -27], size: [24, 18], height: 0, blend: 4 }
        ]
    },

    sky: {
        top: '#141433',
        middle: '#3d2f5c',
        horizon: '#e08a5a',
        below: '#2a1f2a',
        stars: 0.35,
        bodies: [
            { facing: 22, elevation: 14, size: 2.2, color: '#fff1d6', glow: 0.9, phase: 1 },
            { facing: 280, elevation: -3, size: 0.01, color: '#ff9a5c', glow: 1.4 }
        ]
    },
    fog: { color: '#3e3146', density: 0.017 },
    look: { exposure: 1.12, bloom: { strength: 0.6, radius: 0.5, threshold: 0.72 } },
    environmentIntensity: 0.45,
    particleLight: '#9a8a98',
    lights: [
        { type: 'hemisphere', sky: '#7a6aa0', ground: '#3a2a22', intensity: 1.0 },
        { type: 'directional', color: '#bcc8ff', intensity: 0.95, facing: 25, elevation: 35, shadows: true, shadowArea: 48 },
        { type: 'directional', color: '#ff9d6b', intensity: 0.55, facing: 280, elevation: 8 }
    ],

    scenery: [
        {
            piece: 'mountains',
            layers: [
                { radius: 200, height: 78, color: '#43334f' },
                { radius: 160, height: 50, color: '#2e243b' },
                { radius: 125, height: 30, color: '#1f1a2a' }
            ]
        },
        { piece: 'temple', at: [0, -27], facing: 180, platform: [18, 13], height: 1.3, hall: [10, 6.5], stairs: [5, 3.2], elevation: 0, color: '#8e2c1f' },
        { piece: 'gate', at: [0, 29], facing: 0, span: 4.4, height: 5.2, color: '#9a2f20' },
        {
            piece: 'house',
            positions: [[-12, 1.5, 90], [-11, 12.5, 125], [12, 2.5, 270], [11, 13, 235], [-9.5, -6.5, 110], [9.5, -6.5, 250]],
            width: 6,
            depth: 4.8
        },
        { piece: 'stone-lantern', positions: [[-2.4, 33], [2.4, 33], [-2.4, 25.5], [2.4, 25.5], [-2.7, 17], [2.7, 17], [-3.3, -11.5], [3.3, -11.5]] },
        { piece: 'stone-lantern', positions: [[-4.8, 1.2], [5.6, 10.2]], light: { intensity: 9, distance: 13 } },
        { piece: 'stone-lantern', positions: [[-3.4, -17.4]], light: { intensity: 8, distance: 12 } },
        { piece: 'stone-lantern', positions: [[3.4, -17.4]] },
        { piece: 'banner', positions: [[-3.9, 10.8], [3.9, 10.8], [-25, -0.8], [-19.6, -12.6]], color: '#6d1f1a' },
        { piece: 'training-post', positions: [[-25, -1.6, 0], [-22.3, -0.9, 0], [-19.6, -1.5, 0], [-17.6, -3.4, 300]] },
        { piece: 'target', positions: [[-24.5, -12.4, 180], [-21.5, -12.9, 190], [-18.2, -11.4, 215]] },
        { piece: 'bamboo-grove', at: [22, 8], radius: 9, clumps: 34, height: [6, 9.5] },
        {
            piece: 'maple-trees',
            positions: [[-11.5, -23.5], [11.5, -24.5], [-12.5, -31], [12.5, -30], [-7, -36.5], [7, -37], [-14.5, -17.5], [14, -18.5], [-6.5, 22], [6.5, 31]],
            colors: { leaves: ['#a8361f', '#c9542a', '#8f2a1f', '#d4743a'] }
        },
        { piece: 'pine-forest', count: 270, inner: 13, outer: 66, spacing: 2.4, avoid: [[22, 8, 10.5]] },
        {
            piece: 'rocks',
            positions: [[5.5, 30.5, 0.8], [-5, 27, 0.6], [-16.5, 7, 1.0], [17.5, -5, 1.3], [-28, -14, 1.5], [25, 22, 0.9], [-30, 4, 1.2], [-7.5, 35.5, 0.7], [16, -14, 1.1]],
            color: '#5a5650'
        },
        { piece: 'grass', clumps: 800, inner: 0, outer: 46 },
        { piece: 'ferns', count: 60, inner: 4, outer: 36 }
    ],

    atmosphere: [
        { type: 'particles', kind: 'fireflies', count: 190, box: { min: [-32, 0.3, -32], max: [32, 3, 40] }, colors: ['#ffe27a', '#d8ff8a'], size: 0.05, intensity: 2.2 },
        { type: 'particles', kind: 'leaves', count: 130, box: { min: [-17, 0, -39], max: [17, 10, -12] }, colors: ['#c9452a', '#e0702f', '#a8331f', '#d99a3a'], size: 0.09, intensity: 1, speed: 0.8 },
        { type: 'particles', kind: 'dust', count: 110, box: { min: [-10, 0.5, -2], max: [10, 6, 14] }, colors: ['#ffd2a0'], size: 0.02, intensity: 0.8 },
        { type: 'mist', size: 110, height: 0.7, color: '#8c7a99', opacity: 0.22, layers: 3 }
    ],

    audio: {
        ambience: [{ preset: 'forest-dusk', volume: 1 }],
        room: { amount: 0.06, decay: 1.4 }
    },

    exhibits: [
        {
            id: 'hidden-valley-map',
            type: 'map',
            title: 'The Hidden Valley',
            meta: 'Survey model · cedar, clay and pigment',
            description: [
                'The valley as its first mapmakers saw it: a ring of mountains, a single way in, and a village that could vanish into the trees within the hour.',
                'Each pin marks an exhibit. The white one is where you stand.'
            ],
            at: [4.8, 23.5],
            facing: 270,
            model: { name: 'village-map', params: { extent: 96, center: [0, 2] } },
            display: 'none',
            radius: 1.05,
            anchorHeight: 1.35,
            marker: { offset: [1.15, -0.45] }
        },
        {
            id: 'moonlit-blade',
            type: 'weapon',
            title: 'The Moonlit Blade',
            meta: 'Ceremonial blade · Age of the Hidden Clans',
            description: [
                'Forged for a ceremony rather than a battle, this blade was carried once a year from the temple to the village square and back, by night, without a single lantern lit.',
                'The valley\'s smiths said a blade that had travelled in darkness would cut only what deserved to be cut. No record says whether it was ever drawn in anger.'
            ],
            at: [3.2, 4.6],
            facing: 180,
            model: 'blade',
            display: 'case',
            case: [0.98, 0.48, 0.42],
            radius: 0.75
        },
        {
            id: 'seven-trials',
            type: 'timeline',
            title: 'The Seven Trials',
            meta: 'Training record · carved in cedar',
            description: 'Every student of the valley passed seven trials before being given a name. The newest student recarved the plaques each spring.',
            entries: [
                { title: 'I · Stillness.', text: 'A night spent motionless beside the river.' },
                { title: 'II · Silence.', text: 'Crossing the village square on gravel, unheard.' },
                { title: 'III · Balance.', text: 'A day on the training posts without touching the ground.' },
                { title: 'IV · Sight.', text: 'Finding a lantern hidden in the forest after dark.' },
                { title: 'V · Aim.', text: 'Seven throws, seven marks, one target.' },
                { title: 'VI · Patience.', text: 'Waiting at the temple steps until invited in.' },
                { title: 'VII · Return.', text: 'Leaving the valley, and finding the way back alone.' }
            ],
            at: [-28.5, -6],
            facing: 90,
            model: 'timeline-board',
            display: 'none',
            radius: 1.7,
            anchorHeight: 2.1,
            marker: { offset: [1.95, -0.7] }
        },
        {
            id: 'first-shadow',
            type: 'character',
            title: 'The First Shadow',
            meta: 'Bronze · the founder of the hidden village',
            description: [
                'No one remembers the founder\'s face, so the sculptor gave the statue none. It is said the founder led eleven families into the valley through a pass that closed behind them with the first snow.',
                'Visitors still leave a pebble at the plinth, for a safe road home.'
            ],
            at: [-6, -15.5],
            facing: 150,
            model: 'statue',
            display: 'none',
            radius: 0.85,
            anchorHeight: 2.7,
            marker: { offset: [0.95, -0.75] }
        },
        {
            id: 'silent-path-scroll',
            type: 'lore',
            title: 'Scroll of the Silent Path',
            meta: 'Hand scroll · ink on mulberry paper',
            description: [
                'The village\'s only written teaching, kept on the temple porch where anyone may read it:',
                '"Walk so that the grass forgets you. Speak so that the wind repeats you. Leave so that the door is still open behind you."'
            ],
            at: [3, -22.8],
            facing: 180,
            model: 'scroll',
            display: 'none',
            radius: 0.5,
            anchorHeight: 1.55,
            marker: { offset: [0.7, -0.35] }
        }
    ]
};
