// mannequin.js - People as a museum of a series shows them when it has no licensed models: smooth,
// faceless mannequins, told apart only by how they stand, what they wear, what colours they wear it
// in and what they carry. Never a likeness: a silhouette, a costume and a prop.
//
// A figure is plain data (a content pack gives one per character, as the character's `figure`):
//
//   build     'average' | 'slim' | 'broad' | 'heavy' | 'small' (proportions)
//   height    scale (1: about 1.8 m; a giant may be 2 or more)
//   stance    'stand' | 'wide' | 'stride' | 'kneel'
//   arms      { right, left }: rest, hip, fist-up, fist-forward, point, salute, wave, crossed, pocket,
//             behind, forward-low, raised, shoulder, polearm, staff, chained, none (no arm)
//   hold      { right, left }: sword, sabre, polearm, club, staff, axe, cane, slingshot, pistol, rifle,
//             jitte, spyglass, lantern, flame (a hand alight: params.flame is its colour)
//   swords    how many swords hang sheathed at the left hip
//   coat      'none' | 'short' | 'long' | 'cape' (worn over the shoulders) | 'suit' | 'vest' | 'robe' | 'dress'
//   shorts    true: bare from the knee down
//   hat       'none' | 'straw' | 'tricorne' | 'bicorne' | 'cowboy' | 'cap' | 'top' | 'bandana'
//   hair      'none' | 'short' | 'long' | 'spiky' | 'afro' | 'bun' | 'tied' | 'swept' | 'crest'
//   extras    ['horns', 'antlers', 'glasses', 'goggles', 'sash', 'scarf', 'belt', 'epaulettes', 'forearms', 'collar']
//   sleeves   'short': bare forearms;  bare: true: no shirt
//   palette   { skin, coat, trim, shirt, pants, boots, hat, band, hair, metal, wood, sash, glow }
//
// mannequinGeometry(figure) -> { body: BufferGeometry (one mesh, its colours in a vertex attribute),
// glow: BufferGeometry | null (what shines: a burning hand), height }: drawn in one or two calls.
//
//   models  'character-figure' { figure | entity.figure, name, epithet, accent, echo, plate }   a figure
//           on a low plinth (echo: drawn as a person remembered in light, see figures.js; plate: its
//           name on the plinth's face)
//   pieces  'formation' { groups: [{ figure, positions: [[x, z, facing], ...] }], seed }   many
//           figures, one instanced draw per kind (ranks of soldiers, a charge across the ice)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRandom } from './kit.js';
import { createText } from './text.js';
import { echoMaterial } from './figures.js';

const v = (x, y, z) => new THREE.Vector3(x, y, z);

const BUILDS = {
    average: { shoulders: 0.2, hips: 0.12, limb: 0.06, chest: 0.17, belly: 0.16, neck: 0.05 },
    slim: { shoulders: 0.18, hips: 0.1, limb: 0.048, chest: 0.145, belly: 0.13, neck: 0.045 },
    broad: { shoulders: 0.25, hips: 0.135, limb: 0.072, chest: 0.21, belly: 0.19, neck: 0.06 },
    heavy: { shoulders: 0.26, hips: 0.16, limb: 0.08, chest: 0.23, belly: 0.25, neck: 0.065 },
    small: { shoulders: 0.17, hips: 0.12, limb: 0.06, chest: 0.16, belly: 0.17, neck: 0.05 }
};

// The right arm's elbow and hand for each pose (the left mirrors it), and which way a held thing points
const ARMS = {
    rest: { elbow: v(0.27, 1.12, 0.04), hand: v(0.28, 0.86, 0.0), aim: v(0, -1, 0.15) },
    hip: { elbow: v(0.37, 1.13, 0.06), hand: v(0.21, 0.99, -0.06), aim: v(0, -1, 0.3) },
    'fist-up': { elbow: v(0.33, 1.62, -0.06), hand: v(0.3, 1.96, -0.1), aim: v(0, 1, 0) },
    'fist-forward': { elbow: v(0.26, 1.36, -0.3), hand: v(0.18, 1.4, -0.62), aim: v(0, 0, -1) },
    point: { elbow: v(0.3, 1.38, -0.28), hand: v(0.32, 1.44, -0.62), aim: v(0, 0.1, -1) },
    salute: { elbow: v(0.36, 1.52, -0.1), hand: v(0.12, 1.74, -0.1), aim: v(-1, 0.2, 0) },
    wave: { elbow: v(0.42, 1.5, -0.02), hand: v(0.5, 1.82, -0.02), aim: v(0.2, 1, 0) },
    crossed: { elbow: v(0.24, 1.18, -0.16), hand: v(-0.1, 1.26, -0.18), aim: v(-1, 0, 0) },
    pocket: { elbow: v(0.3, 1.06, 0.06), hand: v(0.2, 0.9, 0.0), aim: v(0, -1, 0) },
    behind: { elbow: v(0.25, 1.1, 0.14), hand: v(0.07, 0.98, 0.17), aim: v(0, -1, 0) },
    chained: { elbow: v(0.22, 1.12, 0.16), hand: v(0.04, 1.02, 0.2), aim: v(0, -1, 0) },
    'forward-low': { elbow: v(0.28, 1.14, -0.18), hand: v(0.24, 1.08, -0.44), aim: v(0, 0.35, -1) },
    raised: { elbow: v(0.36, 1.66, 0.0), hand: v(0.25, 1.94, -0.1), aim: v(0.1, 1, 0.1) },
    shoulder: { elbow: v(0.36, 1.18, -0.12), hand: v(0.22, 1.42, -0.18), aim: v(0.05, 0.75, 1) },
    polearm: { elbow: v(0.36, 1.22, -0.06), hand: v(0.4, 1.36, -0.22), aim: v(0, 1, 0) },
    staff: { elbow: v(0.33, 1.18, -0.1), hand: v(0.34, 1.24, -0.3), aim: v(0, 1, 0) },
    rifle: { elbow: v(0.26, 1.16, -0.16), hand: v(0.12, 1.22, -0.26), aim: v(-0.35, 1, 0) },
    lantern: { elbow: v(0.33, 1.62, -0.06), hand: v(0.3, 1.96, -0.14), aim: v(0, -1, 0) },
    spyglass: { elbow: v(0.3, 1.42, -0.22), hand: v(0.09, 1.6, -0.2), aim: v(-0.1, 0.1, -1) }
};

const DEFAULT_PALETTE = {
    skin: '#cdbba4', coat: '#3a3f4a', trim: '#c9a04a', shirt: '#d9d2c4', pants: '#2b2f38', boots: '#1d1a17',
    hat: '#3a2a1e', band: '#8a1e1e', hair: '#2a221c', metal: '#b9bcc2', wood: '#5a3d27', sash: '#3d6b3a', glow: '#ff8a3a'
};

// ---- Shapes -----------------------------------------------------------------------------------

function capsuleBetween(a, b, radius, segments = 8) {
    const length = Math.max(0.001, a.distanceTo(b));
    const geometry = new THREE.CapsuleGeometry(radius, length, 3, segments);
    const direction = b.clone().sub(a).normalize();
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction));
    const middle = a.clone().add(b).multiplyScalar(0.5);
    return geometry.translate(middle.x, middle.y, middle.z);
}

function cylinderBetween(a, b, radiusA, radiusB = radiusA, segments = 8) {
    const length = Math.max(0.001, a.distanceTo(b));
    const geometry = new THREE.CylinderGeometry(radiusB, radiusA, length, segments).translate(0, length / 2, 0);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    return geometry.translate(a.x, a.y, a.z);
}

// A garment turned about the body from a profile ([radius, height] pairs), flattened front to back;
// arc < 2π leaves it open (a cape: its back half only)
function lathe(profile, depth = 0.74, arc = Math.PI * 2, start = 0) {
    const points = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.001, r), y));
    return new THREE.LatheGeometry(points, 16, start, arc).scale(1, 1, depth);
}

// Every part keeps (or is given) an index, so the shared corners of a sphere or a capsule are stored
// once: a figure is a few thousand vertices rather than ten thousand, quick to send to the GPU
export function indexed(geometry) {
    if (!geometry.index) geometry.setIndex([...Array(geometry.attributes.position.count).keys()]);
    geometry.deleteAttribute('uv');
    geometry.clearGroups();
    return geometry;
}

// Collects coloured parts, then merges them into one geometry with a colour per vertex
class Parts {
    constructor(palette) {
        this.palette = palette;
        this.items = [];
        this.glows = [];
    }

    add(slot, geometry) {
        const colour = new THREE.Color(this.palette[slot] ?? slot);
        const part = indexed(geometry);
        const count = part.attributes.position.count;
        const colours = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) colour.toArray(colours, i * 3);
        part.setAttribute('color', new THREE.BufferAttribute(colours, 3));
        this.items.push(part);
        return this;
    }

    glow(geometry) {
        this.glows.push(indexed(geometry));
    }

    build(scale) {
        const merge = list => {
            if (!list.length) return null;
            const merged = mergeGeometries(list);
            list.forEach(geometry => geometry.dispose());
            merged.scale(scale, scale, scale);
            merged.computeBoundingSphere();
            return merged;
        };
        return { body: merge(this.items), glow: merge(this.glows) };
    }
}

// ---- What is held -------------------------------------------------------------------------------

function blade(parts, hand, aim, { length = 0.95, curve = 0, guard = true } = {}) {
    const direction = aim.clone().normalize();
    const tip = hand.clone().addScaledVector(direction, length);
    const middle = hand.clone().lerp(tip, 0.5).add(v(curve, curve * 0.3, 0));
    const curvePath = new THREE.QuadraticBezierCurve3(hand.clone().addScaledVector(direction, 0.08), middle, tip);
    parts.add('metal', new THREE.TubeGeometry(curvePath, 8, 0.014, 4).scale(1, 1, 1));
    parts.add('metal', cylinderBetween(hand.clone().addScaledVector(direction, 0.06), hand.clone().addScaledVector(direction, 0.4), 0.02, 0.008, 4));
    if (guard) parts.add('trim', new THREE.TorusGeometry(0.04, 0.012, 4, 10).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0, 0, 1), direction)).translate(...hand.clone().addScaledVector(direction, 0.06).toArray()));
    parts.add('wood', cylinderBetween(hand.clone().addScaledVector(direction, -0.12), hand.clone().addScaledVector(direction, 0.05), 0.018, 0.018, 6));
}

function held(parts, item, hand, aim, side, palette) {
    switch (item) {
        case 'sword':
            blade(parts, hand, aim, { length: 0.95 });
            break;
        case 'sabre':
            blade(parts, hand, aim, { length: 0.8, curve: 0.06 * side });
            break;
        case 'polearm': { // A long shaft from the ground past the head, a broad curved blade at its top
            const foot = v(hand.x, 0.02, hand.z), top = v(hand.x, 2.75, hand.z);
            parts.add('wood', cylinderBetween(foot, top, 0.028, 0.024, 8));
            const edge = new THREE.Shape();
            edge.moveTo(0, 0);
            edge.quadraticCurveTo(0.26, 0.2, 0.12, 0.62);
            edge.quadraticCurveTo(0.06, 0.3, -0.03, 0.05);
            edge.closePath();
            parts.add('metal', new THREE.ExtrudeGeometry(edge, { depth: 0.012, bevelEnabled: false }).translate(0, 0, -0.006).rotateY(side > 0 ? 0 : Math.PI).translate(top.x, top.y - 0.18, top.z));
            parts.add('trim', new THREE.TorusGeometry(0.035, 0.012, 4, 10).rotateX(Math.PI / 2).translate(top.x, top.y - 0.18, top.z));
            break;
        }
        case 'club': { // A heavy studded club, long as a person
            const end = hand.clone().addScaledVector(aim.clone().normalize(), 1.6);
            parts.add('metal', cylinderBetween(hand.clone().addScaledVector(aim.clone().normalize(), -0.15), end, 0.04, 0.11, 8));
            const along = end.clone().sub(hand);
            for (let i = 0; i < 14; i++) {
                const t = 0.45 + (i % 7) * 0.08;
                const p = hand.clone().addScaledVector(along, t);
                const a = (i / 7) * Math.PI * 2;
                parts.add('trim', new THREE.SphereGeometry(0.022, 5, 4).translate(p.x + Math.cos(a) * 0.08 * t, p.y + Math.sin(a) * 0.08 * t, p.z));
            }
            break;
        }
        case 'staff': { // A slim segmented staff, held upright
            const bottom = hand.clone().add(v(0, -0.85, 0)), top = hand.clone().add(v(0, 0.75, 0));
            parts.add('metal', cylinderBetween(bottom, top, 0.016, 0.016, 6));
            for (const y of [-0.3, 0.3]) parts.add('trim', new THREE.CylinderGeometry(0.024, 0.024, 0.05, 6).translate(hand.x, hand.y + y, hand.z));
            break;
        }
        case 'jitte': { // A tall forked staff with a heavy tip
            const bottom = v(hand.x, 0.05, hand.z), top = v(hand.x, 2.05, hand.z);
            parts.add('metal', cylinderBetween(bottom, top, 0.026, 0.02, 6));
            parts.add('trim', cylinderBetween(top, top.clone().add(v(0, 0.24, 0)), 0.045, 0.02, 6));
            parts.add('metal', cylinderBetween(top.clone().add(v(0, -0.25, 0)), top.clone().add(v(0.12 * side, -0.02, 0)), 0.012, 0.012, 4));
            break;
        }
        case 'axe': {
            const top = hand.clone().addScaledVector(aim.clone().normalize(), 0.9);
            parts.add('wood', cylinderBetween(hand.clone().addScaledVector(aim.clone().normalize(), -0.2), top, 0.02, 0.02, 6));
            parts.add('metal', new THREE.CylinderGeometry(0.2, 0.2, 0.025, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2).translate(top.x, top.y - 0.1, top.z));
            break;
        }
        case 'cane': {
            parts.add('wood', cylinderBetween(v(hand.x, 0.02, hand.z - 0.02), hand.clone(), 0.012, 0.014, 6));
            parts.add('trim', new THREE.SphereGeometry(0.03, 8, 6).translate(hand.x, hand.y + 0.03, hand.z));
            break;
        }
        case 'slingshot': {
            const direction = aim.clone().normalize();
            const fork = hand.clone().addScaledVector(direction, 0.14);
            parts.add('wood', cylinderBetween(hand.clone().addScaledVector(direction, -0.06), fork, 0.014, 0.014, 5));
            for (const s of [-1, 1]) parts.add('wood', cylinderBetween(fork, fork.clone().add(v(s * 0.06, 0.1, -0.02)), 0.011, 0.011, 5));
            break;
        }
        case 'pistol': {
            const direction = aim.clone().normalize();
            parts.add('metal', cylinderBetween(hand, hand.clone().addScaledVector(direction, 0.32), 0.016, 0.014, 6));
            parts.add('wood', new THREE.BoxGeometry(0.04, 0.1, 0.06).translate(hand.x, hand.y - 0.04, hand.z));
            break;
        }
        case 'rifle': {
            const direction = aim.clone().normalize();
            parts.add('wood', cylinderBetween(hand.clone().addScaledVector(direction, -0.45), hand.clone().addScaledVector(direction, 0.35), 0.022, 0.018, 6));
            parts.add('metal', cylinderBetween(hand.clone().addScaledVector(direction, 0.3), hand.clone().addScaledVector(direction, 0.95), 0.011, 0.011, 5));
            break;
        }
        case 'spyglass': {
            parts.add('trim', capsuleBetween(hand.clone().add(v(0.02 * side, 0, 0.08)), hand.clone().add(v(-0.04 * side, 0.02, -0.34)), 0.028));
            parts.add('trim', capsuleBetween(hand.clone().add(v(-0.04 * side, 0.02, -0.3)), hand.clone().add(v(-0.06 * side, 0.03, -0.46)), 0.036));
            break;
        }
        case 'lantern': {
            const at = hand.clone().add(v(0, -0.22, 0));
            parts.add('metal', new THREE.ConeGeometry(0.08, 0.07, 8).translate(at.x, at.y + 0.1, at.z));
            parts.glow(new THREE.CylinderGeometry(0.062, 0.062, 0.15, 8).translate(at.x, at.y, at.z));
            break;
        }
        case 'flame': { // The hand itself alight: tongues of light rising from the fist
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                parts.glow(new THREE.ConeGeometry(0.05 - i * 0.004, 0.22 + (i % 3) * 0.08, 6).translate(hand.x + Math.cos(a) * 0.05, hand.y + 0.12 + (i % 2) * 0.04, hand.z + Math.sin(a) * 0.05));
            }
            parts.glow(new THREE.SphereGeometry(0.085, 8, 6).translate(hand.x, hand.y, hand.z));
            break;
        }
        default:
            break;
    }
    void palette;
}

// ---- The figure -------------------------------------------------------------------------------

// figure: as at the top of this file. Returns { body, glow, height } (geometries in the figure's own
// space: feet at the origin, facing -z, scaled to its height)
export function mannequinGeometry(figure = {}) {
    const build = BUILDS[figure.build] ?? BUILDS.average;
    const palette = { ...DEFAULT_PALETTE, ...figure.palette };
    const parts = new Parts(palette);
    const extras = new Set(figure.extras ?? []);
    const coat = figure.coat ?? 'none';
    const stance = figure.stance ?? 'stand';
    const kneel = stance === 'kneel';
    const drop = kneel ? 0.48 : 0; // How far the body sinks when kneeling
    const s = build.shoulders, limb = build.limb;
    const up = y => y - drop; // Heights above the hips follow the body down

    // Legs: thighs, shins, boots. Stance spreads or strides them
    const spread = stance === 'wide' ? 0.17 : 0.1;
    for (const side of [-1, 1]) {
        const stride = stance === 'stride' ? side * 0.22 : 0;
        if (kneel) {
            const hip = v(side * 0.1, up(0.92), 0);
            const knee = side < 0 ? v(side * 0.12, 0.42, -0.36) : v(side * 0.12, 0.08, 0.08);
            const foot = side < 0 ? v(side * 0.12, 0.05, -0.36) : v(side * 0.12, 0.1, 0.48);
            parts.add('pants', capsuleBetween(hip, knee, limb * 1.25));
            parts.add(figure.shorts ? 'skin' : 'pants', capsuleBetween(knee, foot, limb * 1.05));
            parts.add('boots', new THREE.BoxGeometry(0.1, 0.07, 0.22).translate(foot.x, 0.035, foot.z - (side < 0 ? 0.06 : -0.04)));
            continue;
        }
        const hip = v(side * 0.1, 0.92, 0);
        const foot = v(side * spread, 0.06, stride - 0.02);
        const knee = hip.clone().lerp(foot, 0.5).add(v(0, 0, -0.03));
        parts.add('pants', capsuleBetween(hip, knee, limb * 1.25));
        parts.add(figure.shorts ? 'skin' : 'pants', capsuleBetween(knee, foot.clone().add(v(0, 0.12, 0)), limb * 1.05));
        if (figure.shorts) parts.add('pants', new THREE.CylinderGeometry(limb * 1.4, limb * 1.5, 0.1, 8).translate(knee.x, knee.y + 0.02, knee.z));
        const bootHeight = figure.shorts ? 0.05 : 0.24;
        parts.add('boots', new THREE.CylinderGeometry(limb * 1.2, limb * 1.25, bootHeight, 8).translate(foot.x, bootHeight / 2, foot.z));
        parts.add('boots', new THREE.BoxGeometry(limb * 1.8, 0.07, 0.24).translate(foot.x, 0.035, foot.z - 0.06));
    }

    // The body: hips, a shirt, and over it whatever coat is worn
    const torso = [[build.hips, up(0.86)], [build.hips * 1.1, up(0.95)], [build.belly, up(1.1)], [build.chest, up(1.3)], [s * 0.95, up(1.4)], [s * 0.55, up(1.49)], [build.neck, up(1.52)]];
    parts.add(coat === 'none' && figure.bare ? 'skin' : 'shirt', lathe(torso, 0.74));
    const coatHems = { short: 0.86, suit: 0.84, vest: 0.9, long: 0.42, robe: 0.1, dress: 0.03 };
    if (coatHems[coat] !== undefined) {
        const hem = coat === 'robe' || coat === 'dress' ? coatHems[coat] : up(coatHems[coat]);
        const flare = coat === 'dress' ? 0.62 : coat === 'robe' ? build.hips * 1.9 : coat === 'long' ? build.hips * 2.3 : build.hips * 1.35;
        const profile = [[flare, hem], [flare * 0.92, Math.max(hem + 0.05, up(0.7))], [build.hips * 1.2, up(0.95)], [build.belly * 1.06, up(1.1)],
            [build.chest * 1.06, up(1.3)], [s * 1.02, up(1.4)], [s * 0.6, up(1.5)], [build.neck * 1.25, up(1.54)]]
            .filter((point, i, all) => i === 0 || point[1] > all[i - 1][1] - 0.001);
        parts.add('coat', lathe(profile, 0.78));
        if (coat !== 'vest' && coat !== 'suit') parts.add('trim', new THREE.TorusGeometry(flare * 0.99, 0.012, 4, 24).rotateX(Math.PI / 2).scale(1, 1, 0.78).translate(0, hem + 0.01, 0));
        if (coat === 'robe') parts.add('sash', new THREE.CylinderGeometry(build.belly * 1.12, build.belly * 1.12, 0.12, 14).scale(1, 1, 0.78).translate(0, up(1.0), 0));
    }
    if (coat === 'cape') {
        // Worn over the shoulders, sleeves empty: a cloak open at the front, falling to the calves
        const profile = [[0.34, up(0.32)], [0.3, up(0.7)], [s * 1.25, up(1.25)], [s * 1.22, up(1.43)], [s * 0.8, up(1.5)], [build.neck * 1.4, up(1.54)]];
        parts.add('coat', lathe(profile, 0.8, Math.PI * 1.35, -Math.PI * 0.675)); // Around the back (+z), open at the front
        for (const side of [-1, 1]) parts.add('coat', new THREE.SphereGeometry(s * 0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1.1).translate(side * (s * 0.95), up(1.42), 0));
        if (extras.has('epaulettes')) for (const side of [-1, 1]) parts.add('trim', new THREE.CylinderGeometry(0.07, 0.08, 0.03, 10).translate(side * s * 1.05, up(1.5), 0));
    }
    if (extras.has('sash')) parts.add('sash', new THREE.CylinderGeometry(build.belly * 1.12, build.hips * 1.2, 0.18, 14).scale(1, 1, 0.8).translate(0, up(0.98), 0));
    if (extras.has('belt')) parts.add('boots', new THREE.TorusGeometry(build.hips * 1.13, 0.018, 4, 18).rotateX(Math.PI / 2).scale(1, 1, 0.78).translate(0, up(0.92), 0));
    if (extras.has('collar')) parts.add('trim', new THREE.TorusGeometry(build.neck * 2.2, 0.035, 6, 16).rotateX(Math.PI / 2).translate(0, up(1.5), 0));
    if (extras.has('scarf')) parts.add('band', new THREE.TorusGeometry(0.075, 0.032, 6, 14).rotateX(Math.PI / 2).translate(0, up(1.5), 0));

    // Neck and head: smooth, without a face
    parts.add('skin', new THREE.CylinderGeometry(build.neck, build.neck * 1.12, 0.12, 8).translate(0, up(1.53), 0));
    const head = up(1.665);
    parts.add('skin', new THREE.SphereGeometry(0.105, 16, 12).scale(1, 1.14, 1.04).translate(0, head, 0));
    hairAndHat(parts, figure, head, extras);

    // Arms and what the hands hold
    const sleeve = coat === 'none' || coat === 'vest' ? (figure.bare || coat === 'vest' ? 'skin' : 'shirt') : coat === 'cape' ? 'shirt' : 'coat';
    const arms = figure.arms ?? {};
    const hold = figure.hold ?? {};
    const forearm = extras.has('forearms') ? 2.1 : 1;
    for (const side of [-1, 1]) {
        const poseName = side > 0 ? arms.right ?? 'rest' : arms.left ?? 'rest';
        const shoulder = v(side * (s - 0.02), up(1.4), 0);
        if (poseName === 'none') {
            parts.add(sleeve, capsuleBetween(shoulder, shoulder.clone().add(v(side * 0.04, -0.12, 0)), limb * 0.95));
            continue;
        }
        const pose = ARMS[poseName] ?? ARMS.rest;
        const place = p => v(p.x * side * (s / 0.2), up(p.y), p.z);
        const elbow = place(pose.elbow), hand = place(pose.hand);
        parts.add(sleeve, capsuleBetween(shoulder, elbow, limb * 0.95));
        const lower = figure.sleeves === 'short' || extras.has('forearms') ? 'skin' : sleeve;
        parts.add(lower, capsuleBetween(elbow, hand, limb * 0.82 * forearm));
        if (coat === 'long' || coat === 'robe' || coat === 'suit' || coat === 'short') parts.add('trim', new THREE.TorusGeometry(limb * 0.9 * forearm, 0.01, 4, 10).rotateX(Math.PI / 2).translate(...elbow.clone().lerp(hand, 0.85).toArray()));
        parts.add('skin', new THREE.SphereGeometry(0.052 * Math.max(1, forearm * 0.75), 8, 6).translate(hand.x, hand.y, hand.z));
        const item = side > 0 ? hold.right : hold.left;
        if (item) held(parts, item, hand, v(pose.aim.x * side, pose.aim.y, pose.aim.z), side, palette);
    }

    // Swords sheathed at the left hip, slanting back
    for (let i = 0; i < (figure.swords ?? 0); i++) {
        const at = v(-build.hips * 1.25 - i * 0.03, up(0.93) - i * 0.025, -0.06 + i * 0.07);
        const end = at.clone().add(v(-0.18 - i * 0.04, -0.62, 0.52));
        parts.add(i === 0 ? 'boots' : i === 1 ? 'trim' : 'band', cylinderBetween(at, end, 0.022, 0.018, 6));
        parts.add('trim', cylinderBetween(at.clone().add(v(0.08, 0.14, -0.12)), at, 0.017, 0.017, 6));
    }

    const height = figure.height ?? 1;
    const scale = height * (figure.build === 'small' ? 0.62 : 1);
    return { ...parts.build(scale), height: (head + 0.3) * scale };
}

function hairAndHat(parts, figure, head, extras) {
    const hair = figure.hair ?? 'short';
    const hat = figure.hat ?? 'none';
    const top = head + 0.12;
    // Hair
    if (hair !== 'none') parts.add('hair', new THREE.SphereGeometry(0.115, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1, 1.1, 1.08).translate(0, head + 0.005, 0.012));
    if (hair === 'long') parts.add('hair', new THREE.CylinderGeometry(0.1, 0.13, 0.5, 12, 1, true, -Math.PI * 0.85, Math.PI * 1.7).rotateY(Math.PI).scale(1, 1, 0.8).translate(0, head - 0.24, 0.03));
    if (hair === 'tied') parts.add('hair', capsuleBetween(v(0, head + 0.02, 0.11), v(0, head - 0.24, 0.16), 0.03));
    if (hair === 'bun') parts.add('hair', new THREE.SphereGeometry(0.055, 10, 8).translate(0, head + 0.12, 0.06));
    if (hair === 'afro') parts.add('hair', new THREE.SphereGeometry(0.2, 16, 12).scale(1, 0.9, 1).translate(0, head + 0.1, 0.03));
    if (hair === 'spiky') {
        for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2;
            parts.add('hair', new THREE.ConeGeometry(0.035, 0.12, 5).rotateZ(Math.cos(a) * 0.9).rotateX(Math.sin(a) * 0.9).translate(Math.cos(a) * 0.08, head + 0.08, Math.sin(a) * 0.08 + 0.02));
        }
    }
    if (hair === 'swept') parts.add('hair', new THREE.SphereGeometry(0.07, 10, 8).scale(1.1, 1.4, 0.5).translate(-0.05, head + 0.01, -0.09)); // A fringe falling over one side
    if (hair === 'crest') parts.add('hair', new THREE.BoxGeometry(0.1, 0.12, 0.26).translate(0, head + 0.15, -0.06)); // A tall crest swept forward

    // Hats
    if (hat === 'straw') {
        parts.add('hat', new THREE.CylinderGeometry(0.27, 0.28, 0.014, 24).translate(0, top - 0.02, 0));
        parts.add('hat', new THREE.CylinderGeometry(0.115, 0.125, 0.1, 18).translate(0, top + 0.035, 0));
        parts.add('band', new THREE.CylinderGeometry(0.127, 0.127, 0.035, 18).translate(0, top + 0.004, 0));
    } else if (hat === 'cowboy') {
        const brim = new THREE.CylinderGeometry(0.24, 0.24, 0.014, 20).translate(0, top - 0.015, 0);
        const position = brim.attributes.position;
        for (let i = 0; i < position.count; i++) position.setY(i, position.getY(i) + Math.pow(Math.abs(position.getX(i)) / 0.24, 3) * 0.06);
        parts.add('hat', brim);
        parts.add('hat', new THREE.CylinderGeometry(0.1, 0.12, 0.13, 14).scale(1, 1, 1.15).translate(0, top + 0.05, 0));
        parts.add('band', new THREE.CylinderGeometry(0.122, 0.122, 0.025, 14).scale(1, 1, 1.15).translate(0, top + 0.0, 0));
    } else if (hat === 'tricorne') {
        parts.add('hat', new THREE.CylinderGeometry(0.11, 0.12, 0.1, 14).translate(0, top + 0.02, 0));
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2 + Math.PI;
            parts.add('hat', new THREE.BoxGeometry(0.25, 0.09, 0.02).rotateX(-0.35).rotateY(-a).translate(Math.sin(a) * 0.15, top + 0.02, Math.cos(a) * 0.15));
        }
        parts.add('trim', new THREE.TorusGeometry(0.17, 0.006, 4, 3).rotateX(Math.PI / 2).translate(0, top + 0.065, 0));
    } else if (hat === 'bicorne') {
        parts.add('hat', new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.55, 0.72, 0.42).translate(0, top - 0.03, 0));
        parts.add('trim', new THREE.TorusGeometry(0.2, 0.007, 4, 24, Math.PI).scale(1.55, 0.72, 1).translate(0, top - 0.03, -0.085));
    } else if (hat === 'cap') {
        parts.add('hat', new THREE.CylinderGeometry(0.13, 0.115, 0.085, 16).translate(0, top - 0.005, 0));
        parts.add('band', new THREE.CylinderGeometry(0.117, 0.117, 0.03, 16).translate(0, top - 0.035, 0));
        parts.add('boots', new THREE.CylinderGeometry(0.1, 0.1, 0.012, 14, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 0.8).translate(0, top - 0.05, -0.07));
    } else if (hat === 'top') {
        parts.add('hat', new THREE.CylinderGeometry(0.1, 0.1, 0.24, 16).translate(0, top + 0.1, 0));
        parts.add('hat', new THREE.CylinderGeometry(0.17, 0.17, 0.012, 18).translate(0, top - 0.02, 0));
        parts.add('band', new THREE.CylinderGeometry(0.102, 0.102, 0.03, 16).translate(0, top + 0.01, 0));
    } else if (hat === 'bandana') {
        parts.add('hat', new THREE.SphereGeometry(0.118, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1, 1.1, 1.08).translate(0, head + 0.01, 0.005));
        for (const s of [-1, 1]) parts.add('hat', new THREE.BoxGeometry(0.03, 0.14, 0.05).rotateZ(s * 0.4).translate(s * 0.03, head - 0.06, 0.13));
    }
    // Things on the head
    if (extras.has('horns')) for (const s of [-1, 1]) parts.add('trim', cylinderBetween(v(s * 0.07, head + 0.08, -0.02), v(s * 0.2, head + 0.32, 0.04), 0.035, 0.004, 6));
    if (extras.has('antlers')) {
        for (const s of [-1, 1]) {
            const base = v(s * 0.08, head + 0.18, 0);
            const tip = v(s * 0.24, head + 0.38, 0.02);
            parts.add('wood', cylinderBetween(base, tip, 0.016, 0.01, 5));
            parts.add('wood', cylinderBetween(base.clone().lerp(tip, 0.5), v(s * 0.12, head + 0.4, -0.04), 0.012, 0.008, 5));
        }
    }
    if (extras.has('glasses')) {
        for (const s of [-1, 1]) parts.add('metal', new THREE.TorusGeometry(0.032, 0.006, 4, 12).translate(s * 0.042, head + 0.01, -0.108));
    }
    if (extras.has('goggles')) {
        parts.add('band', new THREE.TorusGeometry(0.112, 0.012, 4, 18).rotateX(Math.PI / 2 - 0.25).translate(0, head + 0.07, 0));
        for (const s of [-1, 1]) parts.add('metal', new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10).rotateX(Math.PI / 2 - 0.4).translate(s * 0.045, head + 0.1, -0.09));
    }
}

// ---- A figure on a plinth, for a gallery ---------------------------------------------------------

// params: figure (or entity.figure), name (or entity.name), epithet, accent, plinth (height), echo, plate
export function characterFigure(params, kit) {
    const figure = params.figure ?? params.entity?.figure ?? {};
    const accent = new THREE.Color(params.accent ?? '#ffcf8a');
    const shapes = mannequinGeometry(figure);
    const group = new THREE.Group();
    const plinth = params.plinth ?? 0.32;
    const radius = params.plinthRadius ?? Math.max(0.5, 0.42 * (figure.height ?? 1));

    let material, glowMaterial = null, geometry = shapes.body.translate(0, plinth, 0);
    if (params.echo) {
        material = echoMaterial(accent, { time: kit?.time ?? { value: 0 } });
    } else {
        // The plinth is part of the figure's one mesh: dark stone, with a fine line of its accent round the top
        material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.05, emissive: accent, emissiveIntensity: 0, side: THREE.DoubleSide });
        const painted = (part, colour) => {
            indexed(part);
            const c = new THREE.Color(colour), colours = new Float32Array(part.attributes.position.count * 3);
            for (let i = 0; i < colours.length; i += 3) c.toArray(colours, i);
            part.setAttribute('color', new THREE.BufferAttribute(colours, 3));
            return part;
        };
        const stone = painted(new THREE.CylinderGeometry(radius, radius + 0.05, plinth, 32).translate(0, plinth / 2, 0), '#1b1d22');
        const line = painted(new THREE.TorusGeometry(radius + 0.004, 0.01, 4, 64).rotateX(Math.PI / 2).translate(0, plinth - 0.03, 0), accent.clone().multiplyScalar(1.6));
        const merged = mergeGeometries([geometry, stone, line]);
        [geometry, stone, line].forEach(part => part.dispose());
        geometry = merged;
    }
    const body = new THREE.Mesh(geometry, material);
    body.castShadow = !params.echo;
    body.receiveShadow = !params.echo;
    group.add(body);
    if (shapes.glow) {
        glowMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(figure.palette?.glow ?? '#ff8a3a').multiplyScalar(2.4) });
        glowMaterial.userData.noShadow = true;
        const glow = new THREE.Mesh(shapes.glow.translate(0, plinth, 0), glowMaterial);
        group.add(glow);
    }

    // The name, small, on the plinth's face
    const name = params.name ?? params.entity?.name;
    if (name && params.plate) {
        const label = createText([
            { text: name.toUpperCase(), size: 1, weight: 500, spacing: 0.2, color: '#efe6d6' },
            ...(params.epithet ? [{ text: params.epithet, font: 'serif', italic: true, size: 0.62, color: '#b9ad98', gap: 0.35 }] : [])
        ], { size: 0.06, padding: 0.05, intensity: 1.05 });
        const fit = Math.min(1, (radius * 1.5) / label.userData.size.width);
        label.scale.setScalar(fit);
        label.position.set(0, plinth * 0.5, -radius - 0.055);
        label.rotation.y = Math.PI;
        group.add(label);
    }

    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.06, 0.012, 6, 64).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false }));
    ring.position.y = plinth + 0.02;
    group.add(ring);
    const glows = params.echo ? [{ material, base: 1, peak: 1.6 }] : [{ material, base: 0, peak: 0.16 }];
    group.userData.parts = { ring, glows };
    group.userData.height = plinth + shapes.height;
    return group;
}

// ---- Ranks of figures: one instanced draw per kind -------------------------------------------------

// params: groups: [{ figure, positions: [[x, z, facing], ...], jitter (degrees), scale: [min, max] }],
// color (one colour for all: silhouettes), solid (the body bumps into them), name (to move them all later)
export function formation(params, kit) {
    const random = createRandom(params.seed ?? 13);
    const root = new THREE.Group();
    const material = params.color
        ? kit.materials.standard(`formation-${params.color}`, { color: params.color, roughness: 0.85, side: THREE.DoubleSide })
        : kit.materials.get('formation-painted', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }));
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
    for (const group of params.groups ?? []) {
        const { body } = mannequinGeometry(group.figure);
        if (params.color) body.deleteAttribute('color');
        const positions = group.positions ?? [];
        const mesh = new THREE.InstancedMesh(body, material, positions.length);
        positions.forEach(([x, z, facing = 0], i) => {
            const jitter = THREE.MathUtils.degToRad((random() - 0.5) * (group.jitter ?? 16));
            quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -THREE.MathUtils.degToRad(facing) + jitter);
            const [low, high] = group.scale ?? [0.94, 1.06];
            scale.setScalar(low + random() * (high - low));
            matrix.compose(new THREE.Vector3(x, kit.ground.heightAt(x, z) + (group.lift ?? 0), z), quaternion, scale);
            mesh.setMatrixAt(i, matrix);
            if (params.solid !== false) kit.addCollider({ x, z, radius: 0.3 * (group.figure?.height ?? 1) });
        });
        mesh.castShadow = params.shadows !== false;
        mesh.receiveShadow = true;
        mesh.computeBoundingSphere();
        root.add(mesh);
    }
    kit.add(root);
    if (params.name) kit.named[params.name] = root;
}
formation.takesPositions = true;
