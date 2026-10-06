// catalog.js - Every scenery piece and exhibit model by name, so content can be plain data
// ({ piece: 'house', at: [4, 2] }, { model: { name: 'blade' } }) and a world only downloads the kits
// it uses, when it is entered.
//
// New kits register their pieces and models here (registerPiece / registerModel) with a loader that
// imports them on demand. A model could equally be a licensed glTF file later: registerModel('name',
// () => loadGltf(url)) - the museum never needs to know.

const PIECES = {
    'pine-forest': () => import('./nature.js').then(kit => kit.pineForest),
    'maple-trees': () => import('./nature.js').then(kit => kit.mapleTrees),
    'bamboo-grove': () => import('./nature.js').then(kit => kit.bambooGrove),
    grass: () => import('./nature.js').then(kit => kit.grass),
    ferns: () => import('./nature.js').then(kit => kit.ferns),
    rocks: () => import('./nature.js').then(kit => kit.rocks),
    mountains: () => import('./nature.js').then(kit => kit.mountains),
    gate: () => import('./eastern.js').then(kit => kit.gate),
    house: () => import('./eastern.js').then(kit => kit.house),
    temple: () => import('./eastern.js').then(kit => kit.temple),
    'stone-lantern': () => import('./eastern.js').then(kit => kit.stoneLantern),
    'training-post': () => import('./eastern.js').then(kit => kit.trainingPost),
    target: () => import('./eastern.js').then(kit => kit.target),
    banner: () => import('./eastern.js').then(kit => kit.banner),
    // The sea and a harbor town
    sea: () => import('./water.js').then(kit => kit.sea),
    ship: () => import('./ship.js').then(kit => kit.ship),
    quay: () => import('./harbor.js').then(kit => kit.quay),
    pier: () => import('./harbor.js').then(kit => kit.pier),
    building: () => import('./harbor.js').then(kit => kit.building),
    lighthouse: () => import('./harbor.js').then(kit => kit.lighthouse),
    cargo: () => import('./harbor.js').then(kit => kit.cargo),
    'lamp-post': () => import('./harbor.js').then(kit => kit.lampPost),
    rowboats: () => import('./harbor.js').then(kit => kit.rowboats),
    'floating-lanterns': () => import('./harbor.js').then(kit => kit.floatingLanterns),
    lightning: () => import('./harbor.js').then(kit => kit.lightning),
    crowd: () => import('./figures.js').then(kit => kit.crowd),
    formation: () => import('./mannequin.js').then(kit => kit.formation),
    // A gallery hall inside an upturned hull
    'hull-hall': () => import('./hall.js').then(kit => kit.hullHall),
    // A great covered dock: a hall with a basin of sea water open to the sky
    'dock-hall': () => import('./docks.js').then(kit => kit.dockHall),
    balustrade: () => import('./docks.js').then(kit => kit.balustrade),
    'hall-banner': () => import('./docks.js').then(kit => kit.banner),
    'notice-board': () => import('./displays.js').then(kit => kit.noticeBoard),
    // A navy's harbour stronghold
    fortress: () => import('./fortress.js').then(kit => kit.fortress),
    'siege-wall': () => import('./fortress.js').then(kit => kit.siegeWall),
    scaffold: () => import('./fortress.js').then(kit => kit.scaffold),
    flagpoles: () => import('./fortress.js').then(kit => kit.flagpoles),
    cannons: () => import('./fortress.js').then(kit => kit.cannons),
    fissure: () => import('./fortress.js').then(kit => kit.fissure),
    // A battle held still
    'ice-sheet': () => import('./warfx.js').then(kit => kit.iceSheet),
    'ice-waves': () => import('./warfx.js').then(kit => kit.iceWaves),
    meteors: () => import('./warfx.js').then(kit => kit.meteors),
    fracture: () => import('./warfx.js').then(kit => kit.fracture),
    beams: () => import('./warfx.js').then(kit => kit.beams)
};

const MODELS = {
    blade: () => import('./artifacts.js').then(kit => kit.blade),
    'village-map': () => import('./artifacts.js').then(kit => kit.villageMap),
    'timeline-board': () => import('./artifacts.js').then(kit => kit.timelineBoard),
    statue: () => import('./artifacts.js').then(kit => kit.statue),
    scroll: () => import('./artifacts.js').then(kit => kit.scroll),
    'museum-guide': () => import('./artifacts.js').then(kit => kit.museumGuide),
    // People, as statues or as echoes in light
    'character-statue': () => import('./figures.js').then(kit => kit.characterStatue),
    'echo-figure': () => import('./figures.js').then(kit => kit.echoFigure),
    'character-figure': () => import('./mannequin.js').then(kit => kit.characterFigure),
    // A universe's things
    'ship-model': () => import('./ship.js').then(kit => kit.shipModel),
    'faction-standard': () => import('./relics.js').then(kit => kit.factionStandard),
    'timeline-post': () => import('./relics.js').then(kit => kit.timelinePost),
    'chart-table': () => import('./relics.js').then(kit => kit.chartTable),
    'log-book': () => import('./relics.js').then(kit => kit.logBook),
    'hanging-lantern': () => import('./relics.js').then(kit => kit.hangingLantern),
    memorial: () => import('./relics.js').then(kit => kit.memorial),
    // Small things on show in a world of the sea
    'wanted-poster': () => import('./displays.js').then(kit => kit.wantedPoster),
    'island-model': () => import('./displays.js').then(kit => kit.islandModel),
    'treasure-chest': () => import('./displays.js').then(kit => kit.treasureChest),
    'hat-display': () => import('./displays.js').then(kit => kit.hatDisplay),
    'compass-instrument': () => import('./displays.js').then(kit => kit.compassInstrument),
    'mini-scaffold': () => import('./displays.js').then(kit => kit.miniScaffold),
    'mini-flag': () => import('./displays.js').then(kit => kit.miniFlag),
    'bay-diorama': () => import('./displays.js').then(kit => kit.bayDiorama),
    bell: () => import('./displays.js').then(kit => kit.bell),
    'bell-tower': () => import('./fortress.js').then(kit => kit.bellTower)
};

// Each kit is imported once; asking again gets the same promise, already settled, so a world of a
// hundred exhibits doesn't wait a hundred times for the module loader (each wait would let a frame pass)
const loaded = new Map();
const once = (key, load) => {
    if (!loaded.has(key)) loaded.set(key, load());
    return loaded.get(key);
};

export function registerPiece(name, load) {
    PIECES[name] = load;
    loaded.delete(`piece:${name}`);
}

export function registerModel(name, load) {
    MODELS[name] = load;
    loaded.delete(`model:${name}`);
}

export function loadPiece(name) {
    if (!PIECES[name]) return Promise.reject(new Error(`Unknown scenery piece "${name}"`));
    return once(`piece:${name}`, PIECES[name]);
}

export function loadModel(name) {
    if (!MODELS[name]) return Promise.reject(new Error(`Unknown exhibit model "${name}"`));
    return once(`model:${name}`, MODELS[name]);
}
