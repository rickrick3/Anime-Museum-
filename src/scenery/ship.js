// ship.js - A two-masted sailing ship (a brigantine): a hull lofted from its lines, a planked deck,
// bulwarks and a cap rail, square sails on the foremast and a gaff sail on the main (furled at
// anchor, set at sea, torn in a storm), standing rigging with ratlines, a bowsprit, a carved bird
// for a figurehead, a stern lantern, and a deckhouse aft with a door into a small cabin.
// Original and generic: it belongs to no story; content names it and says what happens aboard.
//
// As a scenery piece ('ship') it is a place to walk:
//   - its deck is ground (piece.areas), its bulwarks, masts, hatches and cabin walls are solid
//   - its gangplank can be boarded: "Board" walks you up it (and "Go ashore" back down)
//   - its helm can be turned, its cabin door opened ("Enter"; see door.js)
//   - it declares a frame named params.name (piece.frames): content places things aboard with
//     { frame: <name>, at: [x, z] }, x metres to starboard and z toward the stern from midships
// With walkable: false it is only seen (a ship out at sea), and can heel and roll.
// As a model ('ship-model') it is the same ship in miniature, under full sail, for a case.
//
// params: name, waterline (world height of the sea), quay (height the gangplank comes down to),
// gangplank: { side: 'port' | 'starboard', at (z), reach (metres beyond the hull) }, sails:
// 'furled' | 'set' | 'torn', heel, pitch (radians), walkable, lantern (light the stern lantern), prompts:
// { board, ashore, helm, enter, leave }, lines: { helm }, colors: { hull, band, bottom, bulwark, deck,
// sail, flag, emblem }, figurehead: 'bird' | 'whale' | 'lion' | 'ram' | 'serpent' | 'none', emblem: the
// flag's mark (see emblems.js), sailEmblem: true (the same mark painted on the lowest square sail),
// entity: a content pack's ship ({ model: { ...any of these } }, read when the scene leaves them out)
// Seen only (walkable: false): size (scale), rolls (false: held fast, as in ice), solid (true: the
// body can't walk through its hull, at the height it stands)
import * as THREE from 'three';
import { PieceBuilder, toWorld } from './kit.js';
import { addDoorway } from './door.js';
import { hullTexture, deckTexture, sailTexture, emblemTexture } from './textures.js';

const LENGTH = 22;
const BEAM = 6.2;
const FREEBOARD = 2.5; // Deck above the waterline
const DRAFT = 2.4;
const BULWARK = 0.95;
const STATIONS = 44;
const GIRTH = 9; // Points down each side of a section
const HOUSE = { front: 5.4, back: 10.0, half: 2.2, height: 2.35 };
const DOOR = { x: 1.1, width: 1.15, height: 2.0 };
const FORE = { z: -5, height: 15.5 };
const MAIN = { z: 1.5, height: 17 };
const HELM = { z: 3.5, height: 1.25 };
const HATCHES = [{ z: -7.6, w: 1.4, d: 1.4 }, { z: -1.4, w: 2.0, d: 1.8 }];
const RANGE = [-2.7, 4.3]; // Heights the hull's texture spans

// ---- The lines of the hull --------------------------------------------------------------------

// t runs from the stern (0) to the bow (1)
const zAt = t => (0.5 - t) * LENGTH;
const tAt = z => THREE.MathUtils.clamp(0.5 - z / LENGTH, 0, 1);
// Half the beam at the deck, as a fraction: full amidships, a broad transom, a fine bow
const plan = t => (t < 0.5 ? 0.84 + 0.16 * Math.sin((Math.PI / 2) * (t / 0.5)) : Math.pow(Math.cos((Math.PI / 2) * ((t - 0.5) / 0.5)), 0.75));
// The keel, rising into the stem at the bow
const keel = t => -DRAFT * (t < 0.82 ? 1 : 1 - 0.85 * Math.pow((t - 0.82) / 0.18, 1.4));
// The top of the bulwark: the sheer, rising toward the bow and the stern
const rail = t => {
    const d = t - 0.5;
    return FREEBOARD + BULWARK + d * d * (d > 0 ? 2.6 : 1.6);
};

function halfBreadth(t, y) {
    const top = (BEAM / 2) * plan(t);
    if (y >= FREEBOARD) return top * (1 - 0.05 * (y - FREEBOARD) / BULWARK);
    const k = keel(t);
    const u = THREE.MathUtils.clamp((y - k) / (FREEBOARD - k), 0, 1);
    return top * Math.pow(Math.sin((Math.PI / 2) * u), 0.55);
}

// Half the deck's width at z (metres from midships, toward the stern)
const deckHalfWidth = z => halfBreadth(tAt(z), FREEBOARD);

function hullGeometry() {
    const cols = GIRTH * 2 + 1;
    const positions = [], uvs = [], indices = [];
    for (let i = 0; i <= STATIONS; i++) {
        const t = i / STATIONS;
        const k = keel(t), r = rail(t);
        for (let j = 0; j < cols; j++) {
            const side = j < GIRTH ? -1 : 1;
            const g = Math.abs(j - GIRTH) / GIRTH; // 0 at the keel, 1 at the rail
            const y = k + (r - k) * (1 - Math.pow(1 - g, 1.25));
            const x = j === GIRTH ? 0 : side * halfBreadth(t, y);
            positions.push(x, y, zAt(t));
            uvs.push(t, (y - RANGE[0]) / (RANGE[1] - RANGE[0]));
        }
    }
    for (let i = 0; i < STATIONS; i++) {
        for (let j = 0; j < cols - 1; j++) {
            const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
            indices.push(a, c, b, b, c, d);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

// The flat stern: the last section, filled
function transomGeometry() {
    const t = 0, k = keel(t), r = rail(t);
    const shape = new THREE.Shape();
    const points = [];
    for (let j = 0; j <= GIRTH; j++) {
        const y = k + (r - k) * (j / GIRTH);
        points.push([halfBreadth(t, y), y]);
    }
    const outline = [...points.slice().reverse().map(([x, y]) => [-x, y]), ...points.slice(1)];
    outline.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    const geometry = new THREE.ShapeGeometry(shape);
    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < position.count; i++) uv.setXY(i, 0.02 + position.getX(i) * 0.01, (position.getY(i) - RANGE[0]) / (RANGE[1] - RANGE[0]));
    return geometry.translate(0, 0, zAt(0) - 0.005);
}

function deckGeometry() {
    const shape = new THREE.Shape();
    const side = [];
    for (let i = 0; i <= STATIONS; i++) {
        const t = i / STATIONS;
        side.push([Math.max(0.02, halfBreadth(t, FREEBOARD) - 0.12), zAt(t)]);
    }
    const outline = [...side.map(([x, z]) => [-x, -z]), ...side.slice().reverse().map(([x, z]) => [x, -z])];
    outline.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
    return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, FREEBOARD + 0.002, 0);
}

// The cap rail along the top of each bulwark
function capRail(builder, material) {
    for (const side of [-1, 1]) {
        const points = [];
        for (let i = 0; i <= STATIONS; i += 2) {
            const t = i / STATIONS, y = rail(t);
            points.push(new THREE.Vector3(side * halfBreadth(t, y), y + 0.03, zAt(t)));
        }
        builder.add(material, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.07, 5));
    }
}

// ---- Masts, sails and rigging -----------------------------------------------------------------

function spar(builder, material, from, to, r0, r1 = r0) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const length = a.distanceTo(b);
    const geometry = new THREE.CylinderGeometry(r1, r0, length, 8);
    geometry.translate(0, length / 2, 0);
    const up = new THREE.Vector3(0, 1, 0), direction = b.clone().sub(a).normalize();
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction));
    builder.add(material, geometry.translate(a.x, a.y, a.z));
}

// A square sail hanging from a yard, bellied forward by the wind (or a furled bundle on the yard)
function squareSail(builder, material, { z, top, bottom, widthTop, widthBottom, mode, belly = 0.75 }) {
    if (mode === 'furled') {
        const geometry = new THREE.CylinderGeometry(0.2, 0.2, widthTop * 0.92, 8).rotateZ(Math.PI / 2);
        builder.add(material, geometry.translate(0, top - 0.18, z + 0.08));
        return;
    }
    const geometry = new THREE.PlaneGeometry(1, 1, 10, 8);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const u = position.getX(i) + 0.5, v = position.getY(i) + 0.5; // v: 0 at the foot, 1 at the head
        const width = THREE.MathUtils.lerp(widthBottom, widthTop, v);
        const y = THREE.MathUtils.lerp(bottom, top, v);
        const bulge = Math.sin(Math.PI * u) * Math.pow(Math.sin(Math.PI * (0.15 + 0.85 * v)), 0.7) * belly * (mode === 'torn' ? 1.4 : 1);
        position.setXYZ(i, (u - 0.5) * width, y, z - bulge - (1 - v) * 0.15);
    }
    geometry.computeVertexNormals();
    builder.add(material, geometry);
}

// The gaff sail aft of the mainmast: luff on the mast, foot on the boom, head on the gaff
function gaffSail(builder, material, { mast, foot, head, boomEnd, gaffEnd, mode }) {
    if (mode === 'furled') {
        spar(builder, material, [0, foot + 0.2, mast + 0.4], [0, foot + 0.2, boomEnd - 0.4], 0.22, 0.16);
        return;
    }
    const corners = [[0, foot, mast + 0.25], [0, foot, boomEnd], [0, gaffEnd[0], gaffEnd[1]], [0, head, mast + 0.25]];
    const geometry = new THREE.PlaneGeometry(1, 1, 8, 8);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const u = position.getX(i) + 0.5, v = position.getY(i) + 0.5;
        const bottom = new THREE.Vector3(...corners[0]).lerp(new THREE.Vector3(...corners[1]), u);
        const topEdge = new THREE.Vector3(...corners[3]).lerp(new THREE.Vector3(...corners[2]), u);
        const p = bottom.lerp(topEdge, v);
        p.x += Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * (mode === 'torn' ? 0.9 : 0.6);
        position.setXYZ(i, p.x, p.y, p.z);
    }
    geometry.computeVertexNormals();
    builder.add(material, geometry);
}

function rigging(lines, rails) {
    const positions = [];
    const line = (a, b) => positions.push(...a, ...b);
    const railAt = (side, z) => {
        const t = tAt(z), y = rail(t);
        return [side * halfBreadth(t, y), y, z];
    };
    for (const mast of [FORE, MAIN]) {
        const top = FREEBOARD + mast.height;
        const hounds = FREEBOARD + mast.height * 0.6;
        for (const side of [-1, 1]) {
            const shrouds = [-0.9, 0, 0.9].map(dz => railAt(side, mast.z + dz + 0.6));
            shrouds.forEach(foot => line([side * 0.18, hounds, mast.z], foot));
            // Ratlines: rungs across the shrouds to climb by
            for (let h = 0.5; h < 0.92; h += 0.07) {
                const a = shrouds[0].map((value, i) => value + ([side * 0.18, hounds, mast.z][i] - value) * h);
                const b = shrouds[2].map((value, i) => value + ([side * 0.18, hounds, mast.z][i] - value) * h);
                line(a, b);
            }
            line([side * 0.1, top - 0.6, mast.z], [side * 0.7, hounds + 0.1, mast.z + 0.2]);
            line([side * 0.7, hounds + 0.1, mast.z + 0.2], railAt(side, mast.z + 2.2));
        }
    }
    // Stays: from the masts forward to the bowsprit, and between the masts
    const tip = lines.bowspritTip;
    line([0, FREEBOARD + FORE.height - 0.3, FORE.z], tip);
    line([0, FREEBOARD + FORE.height * 0.6, FORE.z], lines.bowspritMid);
    line([0, FREEBOARD + MAIN.height - 0.4, MAIN.z], [0, FREEBOARD + FORE.height * 0.82, FORE.z]);
    line([0, FREEBOARD + MAIN.height * 0.6, MAIN.z], [0, FREEBOARD + FORE.height * 0.45, FORE.z]);
    // Backstays to the quarters
    for (const side of [-1, 1]) line([0, FREEBOARD + MAIN.height - 0.4, MAIN.z], railAt(side, 8.2));
    // The braces from the yard ends aft (sails set only)
    rails.forEach(([a, b]) => line(a, b));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
}

// The figurehead, leaning out over the water ahead: a bird with folded wings, a whale's blunt head,
// a lion's maned head, a ram's curled horns, a serpent's neck, or none. All generic and simple.
function figurehead(builder, material, kind = 'bird') {
    const at = new THREE.Vector3(0, FREEBOARD + 0.15, zAt(1) - 0.25);
    const part = (geometry, x, y, z, rx = 0) => builder.add(material, geometry.rotateX(rx).translate(at.x + x, at.y + y, at.z + z));
    if (kind === 'none') return;
    if (kind === 'whale') {
        part(new THREE.SphereGeometry(0.7, 18, 14).scale(1, 0.85, 1.4), 0, 0.2, -0.3);
        for (const side of [-1, 1]) part(new THREE.SphereGeometry(0.08, 8, 6), side * 0.55, 0.32, -0.7);
        part(new THREE.TorusGeometry(0.5, 0.05, 6, 20, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI), 0, -0.05, -0.55);
        return;
    }
    if (kind === 'lion') {
        part(new THREE.CylinderGeometry(0.62, 0.62, 0.22, 16).rotateX(Math.PI / 2), 0, 0.35, -0.2);
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            part(new THREE.ConeGeometry(0.12, 0.3, 6).rotateZ(-a).rotateX(Math.PI / 2 * 0), Math.sin(a) * 0.7, 0.35 + Math.cos(a) * 0.7, -0.2);
        }
        part(new THREE.SphereGeometry(0.36, 14, 10).scale(1, 0.95, 0.8), 0, 0.35, -0.42);
        part(new THREE.SphereGeometry(0.14, 10, 8), 0, 0.26, -0.7);
        return;
    }
    if (kind === 'ram') {
        part(new THREE.SphereGeometry(0.34, 14, 10).scale(0.9, 0.9, 1.25), 0, 0.3, -0.35);
        part(new THREE.SphereGeometry(0.18, 10, 8).scale(1, 0.9, 1.2), 0, 0.2, -0.7);
        for (const side of [-1, 1]) part(new THREE.TorusGeometry(0.17, 0.06, 8, 16, Math.PI * 1.6).rotateY(Math.PI / 2), side * 0.3, 0.45, -0.25);
        return;
    }
    if (kind === 'serpent') {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.2, 0.4), new THREE.Vector3(0, 0.3, -0.2), new THREE.Vector3(0, 1.0, -0.4), new THREE.Vector3(0, 1.3, -0.9)]);
        builder.add(material, new THREE.TubeGeometry(curve, 16, 0.16, 8).translate(at.x, at.y, at.z));
        part(new THREE.SphereGeometry(0.24, 12, 10).scale(0.85, 0.75, 1.5), 0, 1.35, -1.05);
        for (const side of [-1, 1]) part(new THREE.ConeGeometry(0.05, 0.3, 6).rotateX(-0.6), side * 0.12, 1.55, -0.85);
        return;
    }
    part(new THREE.SphereGeometry(0.3, 14, 10).scale(0.75, 0.85, 1.6), 0, 0, -0.1, -0.5);
    part(new THREE.SphereGeometry(0.17, 12, 10), 0, 0.42, -0.55);
    part(new THREE.ConeGeometry(0.06, 0.2, 8).rotateX(-Math.PI / 2), 0, 0.38, -0.78, 0.3);
    for (const side of [-1, 1]) {
        part(new THREE.SphereGeometry(0.22, 10, 8).scale(0.3, 0.75, 1.9), side * 0.2, 0.08, 0.05, -0.55);
    }
    part(new THREE.ConeGeometry(0.12, 0.6, 8).rotateX(Math.PI / 2), 0, -0.2, 0.55, -0.5);
}

// ---- The whole ship ---------------------------------------------------------------------------

// options: { sails, colors, materials (a Materials, or null for one-off ones), lantern, figurehead,
// emblem, sailEmblem, key (tells two differently dressed ships apart in one world's materials),
// simple (a miniature: one material for all her fittings, no rigging, no lit windows, no wheel to turn) }
// Returns { group, parts: { wheel, lanterns, glows, flag }, gangplank? }; the ship's origin is at
// the waterline amidships, its bow toward -z.
export function buildShip({ sails = 'furled', colors = {}, materials = null, lantern = true, interior = true, detail = 1, figurehead: head = 'bird', emblem = null, sailEmblem = false, key = '', simple = false } = {}) {
    const get = (name, create) => (materials ? materials.get(`${name}${key}`, create) : create());
    const hull = get('ship-hull', () => new THREE.MeshStandardMaterial({
        map: hullTexture({
            range: RANGE,
            bands: [
                [RANGE[0], 0.08, colors.bottom ?? '#5b2b20'],
                [0.08, 0.26, '#cfc4a8'],
                [0.26, FREEBOARD - 0.55, colors.hull ?? '#2a1f17'],
                [FREEBOARD - 0.55, FREEBOARD - 0.15, colors.band ?? '#2f6d69'],
                [FREEBOARD - 0.15, FREEBOARD - 0.07, '#b48c4c'],
                [FREEBOARD - 0.07, RANGE[1], colors.bulwark ?? '#3b2b1f']
            ]
        }),
        roughness: 0.78, metalness: 0.04, side: THREE.DoubleSide
    }));
    const deck = get('ship-deck', () => {
        const map = deckTexture({ color: colors.deck ?? '#8d6c4b' });
        map.repeat.set(0.55, 0.12);
        return new THREE.MeshStandardMaterial({ map, roughness: 0.82 });
    });
    const trim = simple ? get('ship-trim', () => new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.6, metalness: 0.2 })) : null;
    const wood = trim ?? get('ship-wood', () => new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.7 }));
    const dark = trim ?? get('ship-dark', () => new THREE.MeshStandardMaterial({ color: '#2a1d15', roughness: 0.65 }));
    const brass = trim ?? get('ship-brass', () => new THREE.MeshStandardMaterial({ color: '#b08a4a', roughness: 0.35, metalness: 0.85 }));
    const gilt = trim ?? get('ship-gilt', () => new THREE.MeshStandardMaterial({ color: '#c99a4a', roughness: 0.3, metalness: 0.9, emissive: '#3a2408', emissiveIntensity: 0.4 }));
    const torn = sails === 'torn';
    const cloth = get(`ship-sail-${sails}`, () => new THREE.MeshStandardMaterial({
        map: sailTexture({ color: colors.sail ?? '#e9dfc6', torn }), side: THREE.DoubleSide, roughness: 0.9,
        alphaTest: torn ? 0.5 : 0, transparent: false
    }));
    const mark = emblem ?? { motif: 'lantern', field: colors.flag ?? '#14213a', ink: colors.emblem ?? '#e8c56a' };
    const markedCloth = sailEmblem && sails !== 'furled' ? get(`ship-sail-marked-${sails}`, () => new THREE.MeshStandardMaterial({
        map: sailTexture({ color: colors.sail ?? '#e9dfc6', torn, emblem: { ...mark, field: colors.sail ?? '#e9dfc6', ink: mark.sailInk ?? mark.field ?? '#111111', accent: mark.sailAccent ?? mark.accent } }),
        side: THREE.DoubleSide, roughness: 0.9, alphaTest: torn ? 0.5 : 0
    })) : cloth;
    const glass = trim ?? get('ship-window', () => {
        const material = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb25e').multiplyScalar(lantern ? 1.25 : 0.5) });
        material.userData.noShadow = true;
        return material;
    });

    const group = new THREE.Group();
    const b = new PieceBuilder();
    b.add(hull, hullGeometry());
    b.add(hull, transomGeometry());
    b.add(deck, deckGeometry());
    capRail(b, dark);

    // Hatches, with gratings
    for (const hatch of HATCHES) {
        b.box(dark, hatch.w + 0.2, 0.32, hatch.d + 0.2, 0, FREEBOARD + 0.16, hatch.z);
        for (let i = -2; i <= 2; i++) b.box(wood, hatch.w, 0.04, 0.07, 0, FREEBOARD + 0.34, hatch.z + (i * hatch.d) / 5.5);
    }

    // The deckhouse, its windows lit from within (built on its own: its walls hide the cabin)
    const { front, back, half, height } = HOUSE;
    const depth = back - front, mid = (front + back) / 2, wall = 0.1;
    const dl = DOOR.x - DOOR.width / 2, dr = DOOR.x + DOOR.width / 2;
    const h = simple ? b : new PieceBuilder();
    h.box(wood, dl + half, height, wall, (-half + dl) / 2, FREEBOARD + height / 2, front);
    h.box(wood, half - dr, height, wall, (dr + half) / 2, FREEBOARD + height / 2, front);
    h.box(wood, DOOR.width, height - DOOR.height, wall, DOOR.x, FREEBOARD + DOOR.height + (height - DOOR.height) / 2, front);
    for (const side of [-1, 1]) h.box(wood, wall, height, depth, side * half, FREEBOARD + height / 2, mid);
    h.box(wood, half * 2, height, wall, 0, FREEBOARD + height / 2, back);
    h.box(dark, half * 2 + 0.4, 0.12, depth + 0.4, 0, FREEBOARD + height + 0.06, mid); // The roof
    h.box(dark, half * 2 + 0.5, 0.06, 0.06, 0, FREEBOARD + height + 0.15, front - 0.2);
    h.box(dark, 0.08, height, 0.14, dl - 0.04, FREEBOARD + height / 2, front - 0.02); // Door posts
    h.box(dark, 0.08, height, 0.14, dr + 0.04, FREEBOARD + height / 2, front - 0.02);
    const windows = [];
    for (const side of [-1, 1]) {
        for (const wz of [front + 1.3, back - 1.3]) windows.push(new THREE.PlaneGeometry(0.62, 0.46).rotateY(side * Math.PI / 2).translate(side * (half + wall / 2 + 0.006), FREEBOARD + 1.45, wz));
    }
    windows.push(new THREE.PlaneGeometry(0.7, 0.5).rotateY(Math.PI).translate(-1.15, FREEBOARD + 1.45, front - wall / 2 - 0.006));
    for (let i = -1; i <= 1; i++) windows.push(new THREE.PlaneGeometry(0.5, 0.4).translate(i * 1.1, FREEBOARD + 0.62, zAt(0) + 0.01));
    windows.forEach(geometry => b.add(glass, geometry));
    if (interior) {
        // Inside: a bunk, a sea chest, shelves with jars
        b.box(wood, 0.8, 0.5, 2.0, -half + 0.45, FREEBOARD + 0.25, back - 1.2);
        b.box(dark, 0.9, 0.08, 2.1, -half + 0.45, FREEBOARD + 0.55, back - 1.2);
        b.box(dark, 0.5, 0.5, 0.9, -half + 0.35, FREEBOARD + 0.25, front + 0.65);
        b.box(brass, 0.52, 0.04, 0.92, -half + 0.35, FREEBOARD + 0.5, front + 0.65);
        for (const h of [1.5, 1.9]) b.box(wood, 1.4, 0.04, 0.25, 0.2, FREEBOARD + h, back - 0.18);
        for (let i = 0; i < 5; i++) b.cylinder(i % 2 ? brass : dark, 0.05, 0.06, 0.18, -0.35 + i * 0.25, FREEBOARD + 1.92, back - 0.18, 8);
    }

    // The helm: a wheel on its post, in front of the deckhouse
    b.box(dark, 0.26, HELM.height, 0.4, 0, FREEBOARD + HELM.height / 2, HELM.z + 0.12);
    const wheel = new THREE.Group();
    wheel.position.set(0, FREEBOARD + HELM.height, HELM.z - 0.12);
    if (!simple) {
        const wheelParts = new PieceBuilder();
        wheelParts.add(wood, new THREE.TorusGeometry(0.5, 0.035, 6, 32));
        wheelParts.add(brass, new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12).rotateX(Math.PI / 2));
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            wheelParts.add(wood, new THREE.CylinderGeometry(0.022, 0.026, 0.72, 6).translate(0, 0.36, 0).rotateZ(a));
            wheelParts.add(wood, new THREE.CylinderGeometry(0.03, 0.03, 0.14, 6).translate(0, 0.77, 0).rotateZ(a));
        }
        wheel.add(wheelParts.build());
    }
    group.add(wheel);

    // Masts, tops and yards
    for (const mast of [FORE, MAIN]) {
        const top = FREEBOARD + mast.height;
        spar(b, wood, [0, FREEBOARD - 0.2, mast.z], [0, FREEBOARD + mast.height * 0.62, mast.z], 0.21, 0.17);
        spar(b, wood, [0, FREEBOARD + mast.height * 0.57, mast.z], [0, top, mast.z], 0.12, 0.07);
        b.box(dark, 1.5, 0.09, 1.1, 0, FREEBOARD + mast.height * 0.6, mast.z + 0.15);
        b.box(dark, 0.32, 0.22, 0.32, 0, top + 0.06, mast.z);
        b.box(brass, 0.12, 0.12, 0.12, 0, top + 0.24, mast.z);
    }
    const braces = [];
    const foreYards = [
        { y: 8.3, length: 10.6, sailTo: 4.2, widthBottom: 10.4 },
        { y: 12.2, length: 8.2, sailTo: 8.7, widthBottom: 9.6 },
        { y: 14.6, length: 5.8, sailTo: 12.4, widthBottom: 7.4 }
    ];
    foreYards.forEach(({ y, length, sailTo, widthBottom }, i) => {
        const height = FREEBOARD + y;
        spar(b, wood, [-length / 2, height, FORE.z - 0.25], [length / 2, height, FORE.z - 0.25], 0.07, 0.11);
        squareSail(b, i === 0 ? markedCloth : cloth, { z: FORE.z - 0.3, top: height - 0.05, bottom: FREEBOARD + sailTo, widthTop: length * 0.92, widthBottom: Math.min(widthBottom, length * 1.15), mode: sails });
        if (sails !== 'furled') {
            for (const side of [-1, 1]) braces.push([[side * length / 2, height, FORE.z - 0.25], [side * 1.6, FREEBOARD + MAIN.height * 0.55, MAIN.z]]);
        }
    });
    // The main: boom over the deckhouse, gaff above (lowered when furled)
    const boomY = FREEBOARD + HOUSE.height + 0.75;
    const furled = sails === 'furled';
    spar(b, wood, [0, boomY, MAIN.z + 0.2], [0, boomY + 0.3, back + 1.6], 0.11, 0.08);
    const gaffEnd = furled ? [boomY + 0.75, back - 0.5] : [FREEBOARD + 14.3, 8.8];
    spar(b, wood, [0, furled ? boomY + 0.5 : FREEBOARD + 12.2, MAIN.z + 0.2], [0, gaffEnd[0], gaffEnd[1]], 0.09, 0.07);
    gaffSail(b, cloth, { mast: MAIN.z, foot: boomY + 0.08, head: FREEBOARD + 12.0, boomEnd: back + 1.4, gaffEnd, mode: sails });

    // The bowsprit, and jibs when under sail
    const stem = new THREE.Vector3(0, FREEBOARD + 0.55, zAt(1) + 0.4);
    const out = new THREE.Vector3(0, Math.sin(0.3), -Math.cos(0.3));
    const tip = stem.clone().addScaledVector(out, 7.2);
    const middle = stem.clone().addScaledVector(out, 3.6);
    spar(b, wood, stem.toArray(), tip.toArray(), 0.17, 0.07);
    if (!furled) {
        for (const [at, height] of [[tip, FORE.height - 0.6], [middle, FORE.height * 0.66]]) {
            const head = new THREE.Vector3(0, FREEBOARD + height, FORE.z - 0.2);
            const geometry = new THREE.BufferGeometry().setFromPoints([at.clone().add(new THREE.Vector3(0, 0.3, 0)), head, new THREE.Vector3(0, at.y + 0.9, at.z + 3.4)]);
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0.5, 1, 1, 0], 2));
            geometry.computeVertexNormals();
            b.add(cloth, geometry);
        }
    }
    figurehead(b, gilt, head);

    // The stern lantern
    const lanterns = [];
    const lanternMaterial = trim ?? get('ship-lantern', () => {
        const material = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc477').multiplyScalar(lantern ? 3 : 0.4) });
        material.userData.noShadow = true;
        return material;
    });
    b.box(dark, 0.06, 0.9, 0.06, 0, rail(0) + 0.45, zAt(0) + 0.15);
    b.add(lanternMaterial, new THREE.CylinderGeometry(0.16, 0.13, 0.36, 8).translate(0, rail(0) + 1.05, zAt(0) + 0.15));
    b.add(brass, new THREE.ConeGeometry(0.2, 0.18, 8).translate(0, rail(0) + 1.32, zAt(0) + 0.15));
    lanterns.push(lanternMaterial);

    const house = simple ? new THREE.Group() : h.build();
    group.add(b.build());
    group.add(house);
    if (detail > 0.5) {
        const lines = rigging({ bowspritTip: tip.toArray(), bowspritMid: middle.toArray() }, braces);
        const rope = get('ship-rope', () => new THREE.LineBasicMaterial({ color: '#1b1510', transparent: true, opacity: 0.85 }));
        group.add(new THREE.LineSegments(lines, rope));
    }

    // The crew's flag at the masthead
    const flagMaterial = get(`ship-flag-${colors.flag ?? 'default'}`, () => new THREE.MeshStandardMaterial({
        map: emblemTexture({ ...mark, border: false }), side: THREE.DoubleSide, roughness: 0.85
    }));
    const flagGeometry = new THREE.PlaneGeometry(2.0, 1.4, 10, 4).translate(1.0, 0, 0);
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(0, FREEBOARD + MAIN.height + 0.1, MAIN.z);
    flag.rotation.y = -Math.PI / 2; // Streaming aft
    group.add(flag);
    const rest = Float32Array.from(flagGeometry.attributes.position.array);

    group.traverse(object => {
        if (object.isMesh && !object.material.userData?.noShadow) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
    return {
        group, house, wheel, flag,
        parts: { lanterns, glass },
        // The flag flutters (a few dozen points moved on the CPU)
        flutter(time) {
            const position = flagGeometry.attributes.position;
            for (let i = 0; i < position.count; i++) {
                const x = rest[i * 3], y = rest[i * 3 + 1];
                const amount = x / 2;
                position.setXYZ(i, x, y + Math.sin(time * 3.1 + x * 2.4) * 0.05 * amount, Math.sin(time * 4.3 + x * 3.2 + y) * 0.22 * amount);
            }
            position.needsUpdate = true;
        }
    };
}

// ---- The piece: a ship to walk aboard ---------------------------------------------------------

const deckHeight = params => (params.waterline ?? -0.6) + FREEBOARD;

function gangplankEnds(params) {
    const plank = params.gangplank ?? {};
    const side = plank.side === 'starboard' ? 1 : -1;
    const gz = plank.at ?? -3.2;
    const width = deckHalfWidth(gz);
    return { side, gz, inner: side * (width - 0.55), outer: side * (width + (plank.reach ?? 2.15)) };
}

// What a ship looks like: the scene's own words first, then its entity's model
const dress = params => ({ ...params.entity?.model, ...params, colors: { ...params.entity?.model?.colors, ...params.colors } });

export function ship(input, kit) {
    const params = dress(input);
    const walkable = params.walkable !== false;
    const waterline = params.waterline ?? -0.6;
    const prompts = { board: 'Board', ashore: 'Go ashore', helm: 'Take the helm', enter: 'Enter', leave: 'Step outside', ...params.prompts };
    const built = buildShip({
        sails: params.sails ?? (walkable ? 'furled' : 'set'), colors: params.colors, materials: kit.materials, lantern: params.lantern !== false,
        figurehead: params.figurehead, emblem: params.emblem, sailEmblem: params.sailEmblem, key: params.name ? `:${params.name}` : '',
        interior: walkable
    });
    const { group, house, wheel } = built;
    const root = new THREE.Group();
    root.position.set(params.x, waterline, params.z);
    root.rotation.y = params.yaw;
    const hull = new THREE.Group(); // Rolls and heels; the root stays put
    hull.add(group);
    hull.rotation.z = params.heel ?? 0;
    hull.rotation.x = params.pitch ?? 0;
    if (!walkable) hull.scale.setScalar(params.size ?? 1);
    root.add(hull);
    kit.add(root);
    if (params.name) kit.named[params.name] = root;
    if (walkable) kit.addSolid(house);

    const toW = (lx, lz) => toWorld(lx, lz, params.x, params.z, params.yaw);
    const deckY = deckHeight(params);
    kit.onUpdate(delta => {
        const time = kit.time.value;
        built.flutter(time);
        if (!walkable && params.rolls !== false) {
            // At sea: she rolls and pitches with the swell (the world's clock: still, in a held moment)
            hull.rotation.z = (params.heel ?? 0) + Math.sin(time * 0.7) * 0.05;
            hull.rotation.x = (params.pitch ?? 0) + Math.sin(time * 0.53 + 1) * 0.025;
            hull.position.y = Math.sin(time * 0.61) * 0.18;
        }
        if (wheel.userData.spin) {
            wheel.rotation.z += wheel.userData.spin * delta;
            wheel.userData.spin *= Math.exp(-delta * 1.4);
            if (Math.abs(wheel.userData.spin) < 0.01) wheel.userData.spin = 0;
        }
    });
    if (!walkable) {
        // Held fast (in ice, aground): the body walks round her hull, not through it
        if (params.solid) {
            const size = params.size ?? 1;
            const outline = [];
            for (let i = 0; i <= STATIONS; i += 4) outline.push([halfBreadth(i / STATIONS, 0.4) * size, zAt(i / STATIONS) * size]);
            for (const side of [-1, 1]) {
                for (let i = 0; i < outline.length - 1; i++) {
                    const a = toW(side * outline[i][0], outline[i][1]), b = toW(side * outline[i + 1][0], outline[i + 1][1]);
                    kit.addCollider({ ax: a.x, az: a.z, bx: b.x, bz: b.z, radius: 0.25 });
                }
            }
            const tail = toW(0, outline[0][1]);
            kit.addCollider({ x: tail.x, z: tail.z, radius: outline[0][0] });
        }
        return;
    }

    // Solid: the bulwarks all round (open where the gangplank comes aboard), the masts, the
    // hatches, the helm and the deckhouse walls
    const { gz, inner, outer, side: plankSide } = gangplankEnds(params);
    for (const side of [-1, 1]) {
        for (let i = 0; i < STATIONS; i += 2) {
            const t0 = i / STATIONS, t1 = Math.min(1, (i + 2) / STATIONS);
            const z0 = zAt(t0), z1 = zAt(t1);
            if (side === plankSide && z0 > gz - 0.7 && z1 < gz + 0.7) {
                // Leave a gap where the gangplank comes aboard: only what lies outside it is solid
                const piece = (from, to) => {
                    if (from - to < 0.05) return;
                    const a = toW(side * deckHalfWidth(from), from), b = toW(side * deckHalfWidth(to), to);
                    kit.addCollider({ ax: a.x, az: a.z, bx: b.x, bz: b.z, radius: 0.12 });
                };
                piece(z0, Math.max(z1, gz + 0.7));
                piece(Math.min(z0, gz - 0.7), z1);
                continue;
            }
            const a = toW(side * halfBreadth(t0, FREEBOARD), z0), b = toW(side * halfBreadth(t1, FREEBOARD), z1);
            kit.addCollider({ ax: a.x, az: a.z, bx: b.x, bz: b.z, radius: 0.12 });
        }
    }
    const stern = [toW(-halfBreadth(0, FREEBOARD), zAt(0)), toW(halfBreadth(0, FREEBOARD), zAt(0))];
    kit.addCollider({ ax: stern[0].x, az: stern[0].z, bx: stern[1].x, bz: stern[1].z, radius: 0.12 });
    for (const mast of [FORE, MAIN]) {
        const p = toW(0, mast.z);
        kit.addCollider({ x: p.x, z: p.z, radius: 0.24 });
    }
    const rect = (cx, cz, w, d) => {
        const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([lx, lz]) => toW(cx + lx, cz + lz));
        corners.forEach((p, i) => {
            const q = corners[(i + 1) % 4];
            kit.addCollider({ ax: p.x, az: p.z, bx: q.x, bz: q.z, radius: 0.05 });
        });
    };
    HATCHES.forEach(hatch => rect(0, hatch.z, hatch.w + 0.2, hatch.d + 0.2));
    const helmPost = toW(0, HELM.z + 0.1);
    kit.addCollider({ x: helmPost.x, z: helmPost.z, radius: 0.28 });
    const { front, back, half } = HOUSE;
    const wallBetween = (a, b) => {
        const p = toW(...a), q = toW(...b);
        kit.addCollider({ ax: p.x, az: p.z, bx: q.x, bz: q.z, radius: 0.04 });
    };
    wallBetween([-half, front], [DOOR.x - DOOR.width / 2, front]);
    wallBetween([DOOR.x + DOOR.width / 2, front], [half, front]);
    wallBetween([half, front], [half, back]);
    wallBetween([half, back], [-half, back]);
    wallBetween([-half, back], [-half, front]);
    rect(-half + 0.45, back - 1.2, 0.9, 2.1); // The bunk
    rect(-half + 0.35, front + 0.65, 0.5, 0.9); // The sea chest

    // The cabin's lamp, and its door
    const lampAt = toW(0, (front + back) / 2);
    const lamp = new THREE.PointLight('#ffb067', params.cabinLight ?? 2.8, 6.5, 1.5);
    lamp.position.set(lampAt.x, deckY + 1.6, lampAt.z);
    kit.add(lamp);
    const doorAt = toW(DOOR.x, front);
    addDoorway(kit, {
        x: doorAt.x, z: doorAt.z, y: deckY, yaw: params.yaw, width: DOOR.width - 0.04, height: DOOR.height,
        hinge: 'right', material: kit.materials.standard('door-wood', { color: '#5a3d27', roughness: 0.7 }),
        prompts: { enter: prompts.enter, leave: prompts.leave }, inside: 1.5, outside: 1.0
    });

    // The gangplank, from the deck down to the quay
    const quay = (params.quay ?? 0.9) - waterline;
    const plank = new PieceBuilder();
    const run = Math.abs(outer - inner);
    const rise = FREEBOARD - quay;
    const length = Math.hypot(run, rise);
    const angle = Math.atan2(rise, run);
    const plankGeometry = new THREE.BoxGeometry(length, 0.08, 1.1);
    const lay = geometry => geometry.rotateZ(plankSide < 0 ? -angle : angle).translate((inner + outer) / 2, (FREEBOARD + quay) / 2 + 0.02, gz);
    const plankWood = kit.materials.standard('gangplank', { color: '#6b5038', roughness: 0.85 });
    plank.add(plankWood, lay(plankGeometry));
    for (let s = 0.3; s < length - 0.2; s += 0.38) {
        plank.add(kit.materials.standard('ship-dark-cleat', { color: '#3a2a1e', roughness: 0.8 }),
            lay(new THREE.BoxGeometry(0.05, 0.05, 1.04).translate(-length / 2 + s, 0.06, 0)));
    }
    for (const edge of [-1, 1]) {
        for (const end of [inner, outer]) {
            const post = new THREE.CylinderGeometry(0.035, 0.035, 1.0, 6).translate(end, (end === inner ? FREEBOARD : quay) + 0.5, gz + edge * 0.6);
            plank.add(kit.materials.standard('ship-dark-cleat', { color: '#3a2a1e', roughness: 0.8 }), post);
        }
        const rope = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(outer, quay + 0.95, gz + edge * 0.6),
            new THREE.Vector3((inner + outer) / 2, (FREEBOARD + quay) / 2 + 0.75, gz + edge * 0.6),
            new THREE.Vector3(inner, FREEBOARD + 0.95, gz + edge * 0.6)
        ), 12, 0.018, 4);
        plank.add(kit.materials.standard('rope', { color: '#a08a62', roughness: 0.95 }), rope);
    }
    const gangplank = plank.build();
    root.add(gangplank);
    // Its sides keep the visitor out of the water (over the water only: its foot rests on the quay)
    for (const edge of [-1, 1]) {
        const a = toW(inner, gz + edge * 0.62), b = toW(outer - plankSide * 0.55, gz + edge * 0.62);
        kit.addCollider({ ax: a.x, az: a.z, bx: b.x, bz: b.z, radius: 0.05 });
    }

    // Aboard, or ashore: whichever side of the bulwark the visitor is on
    const isAboard = () => {
        const visitor = kit.visitor();
        if (!visitor) return false;
        const dx = visitor.x - params.x, dz = visitor.z - params.z;
        const cos = Math.cos(params.yaw), sin = Math.sin(params.yaw);
        const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
        return Math.abs(lz) < LENGTH / 2 && Math.abs(lx) < deckHalfWidth(lz) - 0.2;
    };
    // Where the walk starts and ends: on the quay before its foot, over the bulwark, out on deck
    const foot = toW(outer + plankSide * 0.8, gz), top = toW(inner - plankSide * 0.3, gz), aboard = toW(plankSide * 0.6, gz + 0.4);
    const ashore = toW(outer + plankSide * 1.6, gz);
    const plankInteractable = kit.addInteractable({
        id: `gangplank:${params.name ?? 'ship'}`,
        object: gangplank,
        prompt: prompts.board,
        interactionType: 'board',
        maxDistance: 4,
        cooldown: 0.8,
        onFocus() {
            plankInteractable.prompt = isAboard() ? prompts.ashore : prompts.board;
        },
        interact() {
            const path = isAboard()
                ? [[top.x, top.z], [foot.x, foot.z], [ashore.x, ashore.z]]
                : [[foot.x, foot.z], [top.x, top.z], [aboard.x, aboard.z]];
            kit.cue('creak', new THREE.Vector3(foot.x, deckY, foot.z), 0.5);
            return kit.guide(path);
        }
    });

    // The helm: it turns, the timbers creak, and (if the content says so) a line is spoken
    const helmPoint = new THREE.Vector3(toW(0, HELM.z).x, deckY + HELM.height, toW(0, HELM.z).z);
    kit.addInteractable({
        id: `helm:${params.name ?? 'ship'}`,
        object: wheel,
        prompt: prompts.helm,
        interactionType: 'use',
        maxDistance: 2.6,
        cooldown: 1.2,
        dynamic: true,
        interact() {
            wheel.userData.spin = (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 2);
            kit.cue('creak', helmPoint, 1);
            if (params.lines?.helm) kit.say(params.lines.helm, 6);
            return new Promise(resolve => setTimeout(resolve, 1200));
        }
    });
}

// The ground the ship makes: its deck where the hull is, and the gangplank's slope from the quay
ship.areas = input => {
    const params = dress(input);
    if (params.walkable === false) return [];
    const deckY = deckHeight(params);
    const { gz, inner, outer } = gangplankEnds(params);
    const middle = toWorld((inner + outer) / 2, gz, params.x, params.z, params.yaw);
    const plankFacing = (params.facing ?? 0) + (outer < 0 ? 270 : 90);
    return [
        { shape: 'rect', at: [params.x, params.z], size: [BEAM, LENGTH], facing: params.facing ?? 0, height: deckY, blend: 0, surface: 'wood', sink: deckY + 4.5, paint: false },
        { shape: 'rect', at: [middle.x, middle.z], size: [1.3, Math.abs(outer - inner)], facing: plankFacing, ramp: { from: params.quay ?? 0.9, to: deckY }, blend: 0, surface: 'wood', sink: deckY + 4.5, paint: false }
    ];
};

// Content can place things aboard in the ship's own frame
ship.frames = input => {
    const params = dress(input);
    return params.name ? { [params.name]: { x: params.x, z: params.z, yaw: params.yaw, facing: params.facing ?? 0, y: deckHeight(params) } } : {};
};

// ---- The model: the same ship in miniature, under sail, on a cradle ---------------------------

// params: scale, accent, broadside, and how it is dressed (as the piece: colors, figurehead, emblem,
// sailEmblem, sails), or the entity's model
export function shipModel(input) {
    const params = dress(input);
    const scale = params.scale ?? 1 / 18;
    const built = buildShip({
        sails: params.modelSails ?? 'set', colors: params.colors, lantern: true, interior: false, detail: 0, simple: true,
        figurehead: params.figurehead, emblem: params.emblem, sailEmblem: params.sailEmblem
    });
    const group = new THREE.Group();
    const model = built.group;
    model.scale.setScalar(scale);
    model.rotation.y = params.broadside === false ? 0 : Math.PI / 2; // Seen from the side, bow to the left
    model.position.y = DRAFT * scale + 0.1;
    const moving = new THREE.Group();
    moving.add(model);
    group.add(moving);
    // The cradle it rests in
    const wood = new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.6 });
    for (const side of [-1, 1]) {
        group.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.26).translate(side * LENGTH * scale * 0.25, 0.08, 0), wood));
    }
    group.add(new THREE.Mesh(new THREE.BoxGeometry(LENGTH * scale * 0.7, 0.03, 0.32).translate(0, 0.015, 0), wood));
    const accent = new THREE.Color(params.accent ?? '#57d6c8');
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.01, 6, 64).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false }));
    ring.position.y = 0.02;
    group.add(ring);
    const band = new THREE.MeshStandardMaterial({ color: '#111111', emissive: accent, emissiveIntensity: 0.15 });
    group.add(new THREE.Mesh(new THREE.BoxGeometry(LENGTH * scale * 0.72, 0.008, 0.34).translate(0, 0.034, 0), band));
    group.userData.parts = { ring, glows: [{ material: band, base: 0.15, peak: 2.2 }], moving };
    return group;
}
