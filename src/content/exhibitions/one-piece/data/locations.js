// The places of the One Piece hall, and the world chart they are drawn on. Plain data.
//
// The chart is the museum's own stylised layout (see src/universe/navigation.js), not a copy of any
// official map: a great continent runs top to bottom through the middle, a broad sea lane crosses it
// at a right angle, belts of calm water run either side of the lane, and the four seas fill the
// corners. The first half of the lane runs east from the crossing; the second half comes back from the
// far edge. chart: [u, v], -1..1 across the table (v: north is up). Only places with a `scene` can be
// entered; the others are marked as coming soon.

export const locations = [
    {
        id: 'marineford',
        name: 'Marineford',
        epithet: 'Headquarters of the Marines, until the war',
        description: [
            'A fortress city on a crescent bay, near the end of the first half of the Grand Line, and for years the headquarters of the Navy. Walls rise from its quay when it is attacked.',
            'After the war fought here the Navy moved its headquarters to the New World. The old fortress still stands, and so do the scars.'
        ],
        region: 'Paradise',
        faction: 'marines',
        scene: 'marineford',
        chart: [0.64, 0.17]
    },
    {
        id: 'alabasta',
        name: 'Alabasta',
        epithet: 'A desert kingdom',
        description: 'An ancient kingdom of sand and one great river, which a warlord tried to steal by turning its people against their king.',
        region: 'Paradise',
        chart: [0.26, 0.08]
    },
    {
        id: 'wano',
        name: 'Wano',
        epithet: 'A closed country of samurai',
        description: 'An island nation behind high waterfalls, closed to the outside world for centuries, its samurai famous across the seas. For twenty years it lived under Kaido.',
        region: 'New World',
        chart: [-0.4, -0.11]
    },
    {
        id: 'laugh-tale',
        name: 'Laugh Tale',
        epithet: 'The last island of the Grand Line',
        description: 'The island at the end of the Grand Line, reached only once, by the Roger Pirates, who named it for the way their captain laughed when he saw what was there.',
        region: 'New World',
        chart: [-0.15, 0.08]
    },
    {
        id: 'loguetown',
        name: 'Loguetown',
        epithet: 'The town of beginning and end',
        description: 'The last town before the Grand Line, where the Pirate King was born and where he was executed. Every pirate bound for the Grand Line stops to see the platform.',
        region: 'East Blue',
        chart: [0.15, -0.3]
    },
    {
        id: 'foosha-village',
        name: 'Foosha Village',
        epithet: 'A quiet village in the East Blue',
        description: 'A small windmill village where a pirate crew once stayed for a year, and a boy decided what he wanted to be.',
        region: 'East Blue',
        chart: [0.5, -0.64]
    },
    {
        id: 'reverse-mountain',
        name: 'Reverse Mountain',
        epithet: 'Where the four seas climb into the Grand Line',
        description: 'A mountain on the great continent up which the currents of all four seas flow, meet at its summit, and pour down into the Grand Line.',
        region: 'The Red Line',
        chart: [0.02, -0.02]
    },
    {
        id: 'water-7',
        name: 'Water 7',
        epithet: 'The city of shipwrights',
        description: 'A city of canals that builds the best ships in the world, and slowly sinks a little more each year.',
        region: 'Paradise',
        chart: [0.41, -0.09]
    },
    {
        id: 'enies-lobby',
        name: 'Enies Lobby',
        epithet: 'The island of justice that never sees night',
        description: 'A judicial island of the World Government, on the edge of an enormous waterfall, where prisoners were taken to be sentenced. A crew of pirates once declared war on it.',
        region: 'Paradise',
        chart: [0.5, 0.12]
    },
    {
        id: 'sabaody',
        name: 'Sabaody Archipelago',
        epithet: 'Mangrove islands at the foot of the Red Line',
        description: 'A grove of giant mangroves breathing bubbles into the air, the last stop before the New World, where ships are coated to sail down under the continent.',
        region: 'Paradise',
        chart: [0.79, -0.12]
    },
    {
        id: 'impel-down',
        name: 'Impel Down',
        epithet: 'The great underwater prison',
        description: 'The World Government\'s prison, sunk in the calm belt, its six levels each worse than the one above. Only one man had ever escaped it, until the war.',
        region: 'Calm Belt',
        chart: [0.6, 0.36]
    },
    {
        id: 'fish-man-island',
        name: 'Fish-Man Island',
        epithet: 'A kingdom ten thousand metres under the sea',
        description: 'A kingdom of fish-men and merfolk in a bubble on the seabed, under the great continent, where ships pass on their way into the New World. Whitebeard\'s flag once kept it safe.',
        region: 'Under the Red Line',
        chart: [0.92, 0.04]
    },
    {
        id: 'whole-cake-island',
        name: 'Whole Cake Island',
        epithet: 'An archipelago of sweets',
        description: 'The heart of Big Mom\'s nation of islands, where the trees are candy and the castle is a cake.',
        region: 'New World',
        chart: [-0.64, 0.1]
    },
    {
        id: 'god-valley',
        name: 'God Valley',
        epithet: 'An island erased from the maps',
        description: 'The island where the Rocks Pirates were destroyed. It no longer appears on any chart.',
        region: 'Unknown'
    },
    // Regions people come from (written on the chart as seas, not pins)
    { id: 'east-blue', name: 'The East Blue', epithet: 'The weakest of the four seas, they say', description: 'The calmest of the four seas around the Grand Line, where Luffy and much of his crew began.' },
    { id: 'north-blue', name: 'The North Blue', epithet: 'One of the four seas', description: 'One of the four seas around the Grand Line.' },
    { id: 'west-blue', name: 'The West Blue', epithet: 'One of the four seas', description: 'One of the four seas around the Grand Line.' }
];

// How the chart is drawn: the world's own shapes, then its places as pins of light
export const map = {
    title: 'The Grand Line',
    travel: 'Set sail',
    locked: 'Coming soon',
    description: 'The world as sailors draw it: a continent around the globe from pole to pole, a sea lane around it at the equator, and four seas between. Only one island of the Grand Line can be visited yet.',
    features: [
        { type: 'band', from: [-1.1, -0.16], to: [1.1, -0.16], width: 0.05, opacity: 0.08, edges: false },
        { type: 'band', from: [-1.1, 0.16], to: [1.1, 0.16], width: 0.05, opacity: 0.08, edges: false },
        { type: 'band', from: [-1.1, 0], to: [1.1, 0], width: 0.2, opacity: 0.12, label: 'Grand Line' },
        { type: 'band', from: [0, -1.1], to: [0, 1.1], width: 0.08, opacity: 0.2, label: 'Red Line' },
        { type: 'label', at: [-0.5, -0.5], text: 'North Blue', size: 0.06 },
        { type: 'label', at: [0.5, -0.42], text: 'East Blue', size: 0.06 },
        { type: 'label', at: [-0.5, 0.52], text: 'West Blue', size: 0.06 },
        { type: 'label', at: [0.5, 0.52], text: 'South Blue', size: 0.06 },
        { type: 'label', at: [0.45, 0.31], text: 'Paradise', size: 0.042, opacity: 0.6 },
        { type: 'label', at: [-0.45, 0.31], text: 'New World', size: 0.042, opacity: 0.6 },
        { type: 'label', at: [0.45, -0.205], text: 'Calm Belt', size: 0.026, opacity: 0.45 },
        { type: 'label', at: [-0.45, 0.205], text: 'Calm Belt', size: 0.026, opacity: 0.45 }
    ]
};
