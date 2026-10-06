// Marineford's layout, shared by the location (the old headquarters, years after the war) and by the
// legendary moment (the same fortress at the height of the war). Plain data: where the bay, the quay,
// the plaza, the fortress, the scaffold, the town and the walls stand. Each scene adds its own light,
// weather, people and story. An original interpretation of a crescent bay with a fortress city behind
// it, not a reconstruction of any official art.
//
// North (-z) is the sea. The bay is a circle around (0, -42); its southern shore is a crescent of quay
// with iron walls along it. The plaza runs from the shore to the fortress; the scaffold stands before it.
//
//                 the open sea (north)            the frozen tidal waves (in the war)
//                    ( the bay, r 38 )
//       walls ════════  shore (0, -3.4)  ════════ walls       pier (18, -7.9) and a warship
//          bell tower (-16, 8)   the plaza   memorial, event, rift (9..15, 3..9)
//                     the scar   scaffold (0, 24)
//                  ▇▇▇▇▇▇▇▇▇ the fortress (0, 42) ▇▇▇▇▇▇▇▇▇
import { crews, factions } from '../data/crews.js';
import { ships } from '../data/ships.js';

export const LAND = 1.2; // The quay and plaza
export const BAY = { center: [0, -42], radius: 38 };
export const WALL_RADIUS = 38.6;
export const PIER = { at: [18, -7.85], length: 22, width: 3.2 };
export const SCAFFOLD = { at: [0, 24], base: LAND, width: 8, depth: 5.5, height: 7.5, stair: { width: 2.4, length: 15 } };
export const NAVY = factions.find(item => item.id === 'marines').emblem;
export const emblemOf = id => [...crews, ...factions].find(item => item.id === id)?.emblem;
export const shipOf = id => ships.find(item => item.id === id)?.model;

// The point at `facing` degrees on the bay's shore (or a circle `radius` about the bay's centre)
export function shore(facing, radius = WALL_RADIUS) {
    const a = facing * Math.PI / 180;
    return [BAY.center[0] + Math.sin(a) * radius, BAY.center[1] - Math.cos(a) * radius];
}

// The ground: the land at quay height, the bay and the open sea; `sea` is where water (or ice) lies
export function ground({ sea = -6, ice = false } = {}) {
    return {
        size: 280,
        segments: 220,
        base: 'stone',
        colors: { stone: '#a8a294', stoneDark: '#958f82', paving: '#c9c3b6', water: ice ? '#dbe9f0' : '#1a2e38', ice: '#dbe9f0', grass: '#6a7a4a', earth: '#7a6a52' },
        hills: { amplitude: 0.3, scale: 0.04, rimStart: 95, rimEnd: 135, rimHeight: 22, seed: 8 },
        areas: [
            { shape: 'rect', at: [0, 10], size: [170, 120], height: LAND, blend: 2, surface: 'stone' },
            { shape: 'rect', at: [0, -120], size: [300, 140], height: sea, blend: 0, surface: ice ? 'ice' : 'water' },
            { shape: 'circle', at: BAY.center, radius: BAY.radius, height: sea, blend: 0, surface: ice ? 'ice' : 'water' },
            // The plaza, paved, from the shore to the fortress
            { shape: 'rect', at: [0, 14], size: [64, 36], surface: 'paving', blend: 0 },
            ...(ice ? [{ shape: 'rect', at: [0, -3.4], size: [10, 7], facing: 0, ramp: { from: sea, to: LAND }, blend: 0, surface: 'stone' }] : [])
        ]
    };
}

// The fortress city, the same in every scene that shows it. walls: 'lowered' (sunk into the quay)
// or 'raised' (risen for war, with a breach where the ice meets the plaza)
export function stronghold({ walls = 'lowered', lit = 0.25 } = {}) {
    const raised = walls === 'raised';
    const cannonsOnShore = [];
    for (let a = 136; a <= 224; a += 11) {
        if (Math.abs(a - 180) < 8) continue;
        const [x, z] = shore(a, WALL_RADIUS + 3.2);
        cannonsOnShore.push([x, z, a - 180]);
    }
    return [
        {
            piece: 'fortress', at: [0, 42], facing: 0, width: 52, depth: 20,
            tiers: [{ height: 11, inset: 0 }, { height: 8, inset: 7 }, { height: 7, inset: 13 }],
            tower: { width: 9, height: 12 }, gate: { width: 7, height: 7 }, emblem: { ...NAVY, border: true },
            colors: { wall: '#ebe8e0', roof: '#24345c', trim: '#c9c3b6', window: '#ffd9a0' }
        },
        { piece: 'scaffold', name: 'scaffold', ...SCAFFOLD, colors: { wall: '#d9d4c8', trim: '#b9b3a6' } },
        {
            piece: 'siege-wall', name: 'walls', center: BAY.center, radius: WALL_RADIUS, from: 100, to: 260,
            ...(raised
                ? { base: -0.8, height: 10, thickness: 1.4, gaps: [[173, 187]] }
                : { base: 0.5, height: 0.95, thickness: 0.8, gaps: [[149, 155]] }),
            colors: { iron: '#4d5560' }
        },
        { piece: 'flagpoles', positions: [[-16, 30], [16, 30], [-28, 27], [28, 27], [-31, -13], [31, -13]], height: 12, emblem: NAVY, wind: 220 },
        { piece: 'cannons', positions: cannonsOnShore },
        { piece: 'fissure', points: [[-6.5, -1.4], [-3.2, 2.6], [-3.8, 6.4], [-1.6, 9.2]], width: 1.1, lip: '#8a8478' },
        // The town around the plaza: white walls, navy roofs
        {
            piece: 'building', positions: [[-40, 2, 90], [-40, 11, 90], [-40, 20, 90], [40, 2, 270], [40, 11, 270], [40, 20, 270], [-49, 7, 90], [49, 7, 270], [-49, 17, 90], [49, 17, 270]],
            lit, width: 7, depth: 6, floors: 3, colors: { wall: '#e6e2d8', roof: '#2a3a5e', trim: '#c9c3b6', shutters: '#2a3a5e' }
        },
        {
            piece: 'building', positions: [[-30, 36, 90], [30, 36, 270]], style: 'warehouse', width: 12, depth: 9, lit: lit * 0.5,
            colors: { wall: '#d9d4c8', roof: '#2a3a5e', trim: '#c9c3b6' }
        }
    ];
}

// What the Marines' soldiers and the pirates look like in the crowd: faceless figures, one colour scheme each
export const SOLDIER = {
    build: 'average', coat: 'none', hat: 'cap', hair: 'none',
    arms: { right: 'rifle', left: 'rest' }, hold: { right: 'rifle' },
    palette: { shirt: '#ecebe6', pants: '#1e2f55', hat: '#ecebe6', band: '#1e2f55', boots: '#1a1a1e' }
};
export const OFFICER = {
    build: 'average', coat: 'cape', hat: 'cap', hair: 'short', swords: 1,
    arms: { right: 'raised', left: 'hip' }, hold: { right: 'sabre' },
    palette: { coat: '#f1efe8', shirt: '#3a4a6a', pants: '#2a2f3e', hat: '#ecebe6', band: '#1e2f55' }
};
export const PIRATES = [
    { build: 'broad', coat: 'vest', hat: 'bandana', stance: 'stride', arms: { right: 'raised', left: 'forward-low' }, hold: { right: 'sabre' }, palette: { coat: '#6a2a22', pants: '#3a3226', hat: '#1e1e22', skin: '#b08a6a' } },
    { build: 'average', coat: 'short', hat: 'none', hair: 'short', stance: 'stride', arms: { right: 'fist-forward', left: 'raised' }, hold: { left: 'axe' }, palette: { coat: '#2a3a2a', pants: '#2a2a2e', hair: '#3a2a1e' } },
    { build: 'slim', coat: 'none', hat: 'tricorne', stance: 'stride', arms: { right: 'point', left: 'rest' }, hold: { right: 'pistol' }, palette: { shirt: '#c9bfa8', pants: '#4a3a2a', hat: '#2a2220' } }
];
