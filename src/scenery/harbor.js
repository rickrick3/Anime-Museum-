// harbor.js - A harbor town, generic and original: quay walls of dressed stone, a timber pier on
// piles, houses with shutters and lit windows, a warehouse with a hoist, a striped lighthouse, cargo
// on the quay, iron lamp posts, rowboats riding at their moorings, lanterns floating on the water,
// and (for a storm held still) a bolt of lightning. Nothing here belongs to any one story.
//
// Each piece is (params, kit) => adds itself to the world (see src/museum/exhibition.js for `kit`).
// A piece's front is its own -z. Pieces that make ground to walk on (the pier) say so with
// piece.areas(params), read before the ground is made.
import * as THREE from 'three';
import { PieceBuilder, toWorld, createRandom } from './kit.js';
import { deckTexture, canvasTexture } from './textures.js';

// ---- Surfaces ---------------------------------------------------------------------------------

// Dressed stone in courses, each block a little different; one tile is 2 m across, 1 m high
function ashlarTexture(color = '#7d776c', seed = 2) {
    const random = createRandom(seed);
    return canvasTexture(256, 128, (context, width, height) => {
        const base = new THREE.Color(color);
        context.fillStyle = '#2e2b26';
        context.fillRect(0, 0, width, height);
        const rows = 4, rowHeight = height / rows;
        for (let r = 0; r < rows; r++) {
            let x = r % 2 ? -32 : 0;
            while (x < width) {
                const w = 40 + random() * 36;
                const shade = base.clone().multiplyScalar(0.78 + random() * 0.35);
                context.fillStyle = `#${shade.getHexString()}`;
                context.fillRect(x + 2, r * rowHeight + 2, w - 4, rowHeight - 4);
                for (let s = 0; s < 6; s++) {
                    context.fillStyle = `rgba(0,0,0,${random() * 0.12})`;
                    context.fillRect(x + random() * w, r * rowHeight + random() * rowHeight, 3 + random() * 12, 2 + random() * 5);
                }
                x += w;
            }
        }
        // Weed and wet near the foot of the tile
        const gradient = context.createLinearGradient(0, height * 0.7, 0, height);
        gradient.addColorStop(0, 'rgba(20, 40, 25, 0)');
        gradient.addColorStop(1, 'rgba(20, 40, 25, 0.25)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
    }, { repeat: true });
}

function tileTexture(color = '#8a4a36', seed = 4) {
    const random = createRandom(seed);
    return canvasTexture(128, 128, (context, width, height) => {
        const base = new THREE.Color(color);
        context.fillStyle = '#2a1c16';
        context.fillRect(0, 0, width, height);
        const rows = 8;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < 8; c++) {
                const shade = base.clone().multiplyScalar(0.75 + random() * 0.4);
                context.fillStyle = `#${shade.getHexString()}`;
                const x = c * 16 + (r % 2 ? 8 : 0);
                context.fillRect(x + 1, r * 16 + 1, 14, 13);
                context.fillStyle = 'rgba(0,0,0,0.25)';
                context.fillRect(x + 1, r * 16 + 11, 14, 3);
            }
        }
    }, { repeat: true });
}

function scaleUv(geometry, su, sv) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    return geometry;
}

function materialsFor(kit) {
    const m = kit.materials;
    return {
        ashlar: m.get('harbor-ashlar', () => new THREE.MeshStandardMaterial({ map: ashlarTexture('#7f786c'), roughness: 0.92 })),
        coping: m.standard('harbor-coping', { color: '#9a9284', roughness: 0.85 }),
        iron: m.standard('harbor-iron', { color: '#1d1f22', roughness: 0.55, metalness: 0.7 }),
        timber: m.standard('harbor-timber', { color: '#4a3726', roughness: 0.85 }),
        timberDark: m.standard('harbor-timber-dark', { color: '#2c2219', roughness: 0.9 }),
        deck: m.get('harbor-deck', () => {
            const map = deckTexture({ color: '#7a6450', planks: 10, seed: 8 });
            return new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
        }),
        window: m.get('harbor-window-lit', () => {
            const material = new THREE.MeshStandardMaterial({ color: '#2a1a0a', emissive: '#ffb76a', emissiveIntensity: 1.6 });
            material.userData.noShadow = true;
            return material;
        }),
        windowDark: m.standard('harbor-window-dark', { color: '#151a22', roughness: 0.15, metalness: 0.3 }),
        lamp: m.get('lantern-glow', () => {
            const material = new THREE.MeshStandardMaterial({ color: '#2a1a08', emissive: '#ffb560', emissiveIntensity: 2.2 });
            material.userData.noShadow = true;
            return material;
        })
    };
}

// ---- The quay: a stone wall along the water, its edge solid except where the pier begins -------

// params: from: [x, z], to: [x, z] (the edge; the sea is to the left of from→to), height (its
// top), bottom, gaps: [[from, to], ...] metres along it with no edge (where a pier joins),
// bollards (metres between them), ladders
export function quay(params, kit) {
    const materials = materialsFor(kit);
    const [ax, az] = params.from, [bx, bz] = params.to;
    const length = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / length, dz = (bz - az) / length;
    const nx = dz, nz = -dx; // Toward the sea
    const top = params.height ?? 0.9, bottom = params.bottom ?? -3.5;
    const yaw = Math.atan2(-dz, dx); // The wall's own x along from→to
    const b = new PieceBuilder();
    const face = scaleUv(new THREE.PlaneGeometry(length, top - bottom), length / 2, (top - bottom) / 1);
    b.add(materials.ashlar, face.rotateY(Math.PI).translate(0, (top + bottom) / 2, 0));
    b.box(materials.coping, length, 0.16, 0.55, 0, top - 0.06, 0.2);
    const random = createRandom(params.seed ?? 5);
    const spacing = params.bollards ?? 9;
    const gaps = params.gaps ?? [];
    const inGap = s => gaps.some(([g0, g1]) => s > g0 - 0.6 && s < g1 + 0.6);
    for (let s = spacing / 2; s < length; s += spacing) {
        if (inGap(s)) continue;
        const x = s - length / 2;
        b.cylinder(materials.iron, 0.13, 0.16, 0.45, x, top, 0.45, 10);
        b.add(materials.iron, new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, top + 0.45, 0.45));
        if (random() < 0.3) b.add(materials.iron, new THREE.TorusGeometry(0.12, 0.02, 5, 12).translate(x + 1.2, top - 0.35, -0.02));
    }
    for (const s of params.ladders ?? []) {
        const x = s - length / 2;
        for (const side of [-0.25, 0.25]) b.box(materials.iron, 0.04, top - bottom - 0.2, 0.04, x + side, (top + bottom) / 2, -0.12);
        for (let y = bottom + 0.3; y < top - 0.1; y += 0.3) b.box(materials.iron, 0.5, 0.03, 0.03, x, y, -0.12);
    }
    const wall = b.build();
    wall.position.set((ax + bx) / 2, 0, (az + bz) / 2);
    wall.rotation.y = yaw;
    kit.add(wall);

    // The edge: solid along its length, open at the gaps
    const cuts = [[0, 0], ...gaps.slice().sort((p, q) => p[0] - q[0]), [length, length]];
    for (let i = 0; i < cuts.length - 1; i++) {
        const s0 = cuts[i][1], s1 = cuts[i + 1][0];
        if (s1 - s0 < 0.1) continue;
        kit.addCollider({
            ax: ax + dx * s0 - nx * 0.25, az: az + dz * s0 - nz * 0.25,
            bx: ax + dx * s1 - nx * 0.25, bz: az + dz * s1 - nz * 0.25, radius: 0.12
        });
    }
}
quay.takesPositions = true;

// ---- The pier: planks on piles, out into the harbor -------------------------------------------

// params: at: [x, z] (where it leaves the shore), facing (the way it runs), length, width, height
// (its deck), bottom (the seabed), gaps: [{ side: 'left' | 'right', at, width }] (where gangplanks
// come aboard), lamp (a lamp at its end: { intensity, distance })
export function pier(params, kit) {
    const materials = materialsFor(kit);
    const length = params.length ?? 30, width = params.width ?? 3.2, top = params.height ?? 0.9, bottom = params.bottom ?? -3.5;
    const b = new PieceBuilder();
    const deck = scaleUv(new THREE.BoxGeometry(width, 0.14, length), 1, 1);
    // Deck planks run across the pier (the texture's planks, turned)
    const uv = deck.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * length * 0.5, uv.getX(i) * width * 0.5);
    b.add(materials.deck, deck.translate(0, top - 0.07, -length / 2));
    for (const side of [-1, 1]) {
        b.box(materials.timberDark, 0.18, 0.3, length, side * (width / 2 - 0.09), top - 0.28, -length / 2); // Stringers
        b.box(materials.timber, 0.16, 0.1, length, side * (width / 2 + 0.02), top + 0.02, -length / 2); // Kerb
    }
    for (let s = 0.6; s < length; s += 3) {
        for (const side of [-1, 1]) {
            b.cylinder(materials.timberDark, 0.17, 0.19, top - bottom + 0.1, side * (width / 2 - 0.05), bottom, -s, 8);
        }
        b.box(materials.timberDark, width, 0.16, 0.16, 0, top - 0.42, -s);
        if (Math.round(s / 3) % 2 === 0) {
            // Cross-bracing under the deck
            const brace = new THREE.BoxGeometry(0.1, Math.hypot(width, top - bottom - 1) * 0.92, 0.1).rotateZ(Math.atan2(width, top - bottom - 1)).translate(0, (top + bottom) / 2 - 0.4, -s);
            b.add(materials.timberDark, brace);
        }
    }
    // Bollards along its edges, and posts at its end
    for (let s = 4; s < length - 1; s += 7) {
        for (const side of [-1, 1]) {
            if ((params.gaps ?? []).some(gap => (gap.side === 'right' ? 1 : -1) === side && Math.abs(gap.at - s) < gap.width / 2 + 0.8)) continue;
            b.cylinder(materials.timberDark, 0.12, 0.13, 0.5, side * (width / 2 - 0.2), top, -s, 8);
        }
    }
    for (const side of [-1, 1]) b.cylinder(materials.timberDark, 0.13, 0.14, 1.1, side * (width / 2 - 0.15), top, -length + 0.15, 8);
    const object = b.build();
    object.position.set(params.x, 0, params.z);
    object.rotation.y = params.yaw;
    kit.add(object);

    // Its edges (open where a gangplank comes aboard) and its far end
    const toW = (lx, lz) => toWorld(lx, lz, params.x, params.z, params.yaw);
    for (const side of [-1, 1]) {
        const gaps = (params.gaps ?? []).filter(gap => (gap.side === 'right' ? 1 : -1) === side).sort((p, q) => p.at - q.at);
        let start = 0;
        const edge = (s0, s1) => {
            if (s1 - s0 < 0.1) return;
            const p = toW(side * (width / 2 + 0.05), -s0), q = toW(side * (width / 2 + 0.05), -s1);
            kit.addCollider({ ax: p.x, az: p.z, bx: q.x, bz: q.z, radius: 0.12 });
        };
        for (const gap of gaps) {
            edge(start, gap.at - gap.width / 2);
            start = gap.at + gap.width / 2;
        }
        edge(start, length);
    }
    const endA = toW(-width / 2, -length - 0.05), endB = toW(width / 2, -length - 0.05);
    kit.addCollider({ ax: endA.x, az: endA.z, bx: endB.x, bz: endB.z, radius: 0.12 });

    if (params.lamp) {
        const at = toW(width / 2 - 0.3, -length + 0.6);
        lampPost({ positions: [[at.x, at.z]], light: params.lamp, height: top }, kit);
    }
}

pier.areas = params => {
    const length = params.length ?? 30, width = params.width ?? 3.2, top = params.height ?? 0.9;
    const middle = toWorld(0, -length / 2, params.x, params.z, params.yaw);
    return [{ shape: 'rect', at: [middle.x, middle.z], size: [width, length], facing: params.facing ?? 0, height: top, blend: 0, surface: 'wood', sink: top + 4, paint: false }];
};
pier.clearance = 0;

// ---- Buildings --------------------------------------------------------------------------------

// A gable roof over a w x d footprint, ridge along x, of height h
function gableRoof(w, d, h, overhang = 0.35) {
    const W = w / 2 + overhang, D = d / 2 + overhang;
    const shape = new THREE.Shape();
    shape.moveTo(-D, 0);
    shape.lineTo(0, h);
    shape.lineTo(D, 0);
    shape.lineTo(D, -0.12);
    shape.lineTo(0, h - 0.14);
    shape.lineTo(-D, -0.12);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: W * 2, bevelEnabled: false });
    geometry.rotateY(Math.PI / 2).translate(-W, 0, 0);
    scaleUv(geometry, 0.5, 0.5);
    return geometry;
}

// params: width, depth, floors, style ('house' | 'warehouse'), colors: { wall, roof, trim,
// shutters }, lit (0..1 of the windows lit), seed
export function building(params, kit) {
    const materials = materialsFor(kit);
    const random = createRandom(params.seed ?? Math.round(Math.abs(params.x * 13 + params.z * 7)));
    const warehouse = params.style === 'warehouse';
    const w = params.width ?? (warehouse ? 12 : 6), d = params.depth ?? (warehouse ? 9 : 5.5);
    const floors = params.floors ?? (warehouse ? 2 : 2 + (random() < 0.4 ? 1 : 0));
    const storey = warehouse ? 3.2 : 2.8;
    const colors = params.colors ?? {};
    const wallColor = colors.wall ?? (warehouse ? '#6a5a48' : ['#c9bba0', '#b9a58a', '#d4c6a8', '#a99a85', '#c4b49c'][Math.floor(random() * 5)]);
    const shutterColor = colors.shutters ?? ['#2f6d69', '#7a3a2a', '#3b5a7a', '#5a6a3a', '#8a6a2a'][Math.floor(random() * 5)];
    const m = kit.materials;
    const wall = m.standard(`building-wall-${wallColor}`, { color: wallColor, roughness: 0.92 });
    const shutter = m.standard(`building-shutter-${shutterColor}`, { color: shutterColor, roughness: 0.7 });
    const roof = m.get(`building-roof-${colors.roof ?? 'clay'}`, () => new THREE.MeshStandardMaterial({ map: tileTexture(colors.roof ?? '#8a4a36'), roughness: 0.85 }));
    const trim = m.standard('building-trim', { color: colors.trim ?? '#e8e0cc', roughness: 0.8 });
    const b = new PieceBuilder();
    const H = floors * storey;
    // A stone ground course, plastered walls above
    b.add(materials.ashlar, scaleUv(new THREE.BoxGeometry(w + 0.1, 0.9, d + 0.1), w / 2, 0.9).translate(0, 0.35, 0));
    b.box(wall, w, H - 0.8, d, 0, 0.8 + (H - 0.8) / 2, 0);
    b.box(trim, w + 0.16, 0.14, d + 0.16, 0, H, 0);
    for (let f = 1; f < floors; f++) b.box(trim, w + 0.06, 0.08, d + 0.06, 0, f * storey, 0);
    const roofHeight = warehouse ? 2.2 : 1.8 + random() * 0.6;
    b.add(roof, gableRoof(w, d, roofHeight).translate(0, H + 0.05, 0));
    if (!warehouse) {
        const cx = (random() - 0.5) * w * 0.6;
        b.box(materials.ashlar, 0.6, 1.6, 0.6, cx, H + roofHeight * 0.6, d * 0.15);
        b.box(materials.coping, 0.7, 0.1, 0.7, cx, H + roofHeight * 0.6 + 0.8, d * 0.15);
    }

    // Windows (and their shutters) on the front and the sides; some lit
    const lit = params.lit ?? 0.45;
    const windowOn = (x, y, z, rotation, width = 0.8, height = 1.1) => {
        const on = random() < lit;
        const pane = new THREE.PlaneGeometry(width, height).rotateY(rotation).translate(x, y, z);
        b.add(on ? materials.window : materials.windowDark, pane);
        const out = new THREE.Vector3(0, 0, -0.03).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
        b.add(trim, new THREE.BoxGeometry(width + 0.2, 0.08, 0.12).rotateY(rotation).translate(x + out.x, y - height / 2 - 0.04, z + out.z));
        if (!warehouse) {
            const across = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
            for (const side of [-1, 1]) {
                b.add(shutter, new THREE.BoxGeometry(width * 0.5, height, 0.04).rotateY(rotation)
                    .translate(x + across.x * side * (width * 0.78) + out.x, y, z + across.z * side * (width * 0.78) + out.z));
            }
        }
    };
    const across = Math.max(1, Math.floor(w / (warehouse ? 3 : 2)));
    for (let f = 0; f < floors; f++) {
        const y = f * storey + (f === 0 ? 1.6 : 1.5);
        for (let i = 0; i < across; i++) {
            const x = -w / 2 + (w / across) * (i + 0.5);
            if (f === 0 && i === Math.floor(across / 2)) continue; // The door goes here
            windowOn(x, y, -d / 2 - 0.012, Math.PI);
        }
        for (const side of [-1, 1]) windowOn(side * (w / 2 + 0.012), y, 0, side * Math.PI / 2);
    }
    // The door (a warehouse has wide doors and a hoist beam over the upper loading door)
    const doorX = -w / 2 + (w / across) * (Math.floor(across / 2) + 0.5);
    const doorWidth = warehouse ? 2.8 : 1.1, doorHeight = warehouse ? 2.9 : 2.1;
    b.box(materials.timberDark, doorWidth, doorHeight, 0.08, doorX, doorHeight / 2, -d / 2 - 0.02);
    b.box(trim, doorWidth + 0.24, 0.12, 0.14, doorX, doorHeight + 0.06, -d / 2 - 0.04);
    if (warehouse) {
        b.box(materials.timberDark, 2.0, 2.2, 0.08, doorX, storey + 1.3, -d / 2 - 0.02);
        b.box(materials.timber, 0.25, 0.25, 2.4, doorX, H + 0.3, -d / 2 - 0.9);
        b.add(materials.iron, new THREE.TorusGeometry(0.15, 0.03, 6, 12).translate(doorX, H + 0.05, -d / 2 - 1.9));
        b.add(materials.iron, new THREE.CylinderGeometry(0.012, 0.012, 3.4, 4).translate(doorX, H - 1.6, -d / 2 - 1.95));
    } else if (random() < 0.6) {
        // A lantern by the door
        b.box(materials.iron, 0.04, 0.04, 0.35, doorX + 0.95, 2.3, -d / 2 - 0.18);
        b.add(materials.lamp, new THREE.CylinderGeometry(0.09, 0.08, 0.22, 6).translate(doorX + 0.95, 2.12, -d / 2 - 0.34));
    }
    const object = b.build();
    object.position.set(params.x, params.y, params.z);
    object.rotation.y = params.yaw;
    kit.add(object);
    kit.addSolid(object);
    const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([lx, lz]) => toWorld(lx, lz, params.x, params.z, params.yaw));
    corners.forEach((p, i) => {
        const q = corners[(i + 1) % 4];
        kit.addCollider({ ax: p.x, az: p.z, bx: q.x, bz: q.z, radius: 0.15 });
    });
}
building.clearance = 5;

// ---- The lighthouse ---------------------------------------------------------------------------

// params: height, lit (its lamp burning, its beams turning), name (its beam can be lit later:
// named `${name}-beam`, and its lamp `${name}-lamp`)
export function lighthouse(params, kit) {
    const materials = materialsFor(kit);
    const height = params.height ?? 16;
    const m = kit.materials;
    const white = m.standard('lighthouse-white', { color: '#e8e4da', roughness: 0.8 });
    const red = m.standard('lighthouse-red', { color: '#9a2e24', roughness: 0.75 });
    const b = new PieceBuilder();
    b.cylinder(materials.ashlar, 3.4, 3.8, 2.2, 0, -0.6, 0, 20);
    const bands = 5;
    for (let i = 0; i < bands; i++) {
        const y0 = 1.6 + (i * (height - 1.6)) / bands, y1 = 1.6 + ((i + 1) * (height - 1.6)) / bands;
        const r0 = 2.2 - (i / bands) * 0.75, r1 = 2.2 - ((i + 1) / bands) * 0.75;
        b.add(i % 2 ? red : white, new THREE.CylinderGeometry(r1, r0, y1 - y0, 20).translate(0, (y0 + y1) / 2, 0));
    }
    const top = 1.6 + height - 1.6;
    b.cylinder(materials.iron, 2.0, 2.0, 0.18, 0, top, 0, 24); // The gallery
    for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        b.box(materials.iron, 0.04, 0.9, 0.04, Math.cos(a) * 1.9, top + 0.6, Math.sin(a) * 1.9);
    }
    b.add(materials.iron, new THREE.TorusGeometry(1.9, 0.03, 4, 32).rotateX(Math.PI / 2).translate(0, top + 1.05, 0));
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        b.box(materials.iron, 0.06, 1.8, 0.06, Math.cos(a) * 1.05, top + 1.08, Math.sin(a) * 1.05);
    }
    b.add(red, new THREE.SphereGeometry(1.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, top + 2.0, 0));
    b.add(materials.iron, new THREE.ConeGeometry(0.12, 0.7, 8).translate(0, top + 3.5, 0));
    // A door and a few small windows up the tower
    b.box(materials.timberDark, 0.9, 1.9, 0.1, 0, 2.5, -2.15);
    for (let i = 1; i < 4; i++) b.box(materials.windowDark, 0.4, 0.7, 0.1, 0, 1.6 + i * (height / 4.5), -(2.2 - (i / 4) * 0.7));
    const tower = b.build();
    tower.position.set(params.x, params.y, params.z);
    tower.rotation.y = params.yaw;
    kit.add(tower);
    kit.addSolid(tower);

    // The lamp room: glass, and the lamp itself (lit, or dark and broken)
    const lit = params.lit !== false;
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.6, 16), new THREE.MeshStandardMaterial({
        color: '#1a1e24', emissive: '#fff1c8', emissiveIntensity: lit ? 3 : 0.04, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85
    }));
    lamp.position.set(params.x, params.y + top + 1.0, params.z);
    kit.add(lamp);
    // Two beams turning, seen in the haze (additive cones), only while lit
    const beams = new THREE.Group();
    beams.position.copy(lamp.position);
    const beamMaterial = new THREE.ShaderMaterial({
        uniforms: { strength: { value: lit ? 1 : 0 }, color: { value: new THREE.Color('#fff2cc') } },
        vertexShader: /* glsl */ `
            varying float vAlong;
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
                vAlong = uv.y;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                vNormal = normalize(normalMatrix * normal);
                vView = normalize(-mv.xyz);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float strength;
            uniform vec3 color;
            varying float vAlong;
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
                float across = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.5);
                float fade = pow(vAlong, 1.6);
                gl_FragColor = vec4(color * strength * across * fade * 0.14, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    for (const side of [-1, 1]) {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 3.2, 55, 16, 1, true).translate(0, -27.5, 0).rotateZ(side * Math.PI / 2), beamMaterial);
        beams.add(cone);
    }
    beams.visible = lit;
    kit.add(beams);
    kit.onUpdate(delta => {
        if (beams.visible) beams.rotation.y += delta * 0.45 * (kit.space.timeScale ?? 1);
    });
    if (params.name) {
        kit.named[`${params.name}-lamp`] = lamp;
        kit.named[`${params.name}-beam`] = { group: beams, material: beamMaterial };
    }
    kit.addCollider({ x: params.x, z: params.z, radius: 3.6 });
}
lighthouse.clearance = 5;

// ---- On the quay: cargo, lamp posts -----------------------------------------------------------

// params: positions: [[x, z, kind, turn], ...], kind: 'crate', 'crates', 'barrel', 'barrels', 'coil', 'net'
export function cargo(params, kit) {
    const materials = materialsFor(kit);
    const random = createRandom(params.seed ?? 13);
    const m = kit.materials;
    const crate = m.standard('cargo-crate', { color: '#7a5a3a', roughness: 0.85 });
    const barrel = m.standard('cargo-barrel', { color: '#5a3e28', roughness: 0.75 });
    const hoop = materials.iron;
    const rope = m.standard('rope', { color: '#a08a62', roughness: 0.95 });
    const net = m.get('cargo-net', () => new THREE.MeshStandardMaterial({ color: '#4a5a52', roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    const b = new PieceBuilder();
    for (const [x, z, kind = 'crate', turn = random() * 360] of params.positions ?? []) {
        const y = kit.ground.heightAt(x, z);
        const yaw = THREE.MathUtils.degToRad(turn);
        const place = (material, geometry, lx = 0, ly = 0, lz = 0, extraYaw = 0) => {
            const p = toWorld(lx, lz, x, z, -yaw);
            b.add(material, geometry.rotateY(-yaw + extraYaw).translate(p.x, y + ly, p.z));
        };
        const box = (lx, ly, lz, size, extraYaw = 0) => {
            place(crate, new THREE.BoxGeometry(size, size, size), lx, ly + size / 2, lz, extraYaw);
            place(materials.timberDark, new THREE.BoxGeometry(size + 0.02, 0.06, size + 0.02), lx, ly + size * 0.2, lz, extraYaw);
            place(materials.timberDark, new THREE.BoxGeometry(size + 0.02, 0.06, size + 0.02), lx, ly + size * 0.8, lz, extraYaw);
        };
        const cask = (lx, lz, upright = true) => {
            if (upright) {
                place(barrel, new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12), lx, 0.45, lz);
                for (const h of [0.15, 0.75]) place(hoop, new THREE.CylinderGeometry(0.315, 0.315, 0.05, 12), lx, h, lz);
            } else {
                place(barrel, new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12).rotateZ(Math.PI / 2), lx, 0.3, lz);
            }
        };
        if (kind === 'crate') box(0, 0, 0, 0.8);
        if (kind === 'crates') {
            box(0, 0, 0, 0.85);
            box(0.95, 0, 0.1, 0.8, 0.2);
            box(0.45, 0.85, 0.05, 0.75, -0.3);
        }
        if (kind === 'barrel') cask(0, 0);
        if (kind === 'barrels') {
            cask(0, 0);
            cask(0.66, 0.1);
            cask(0.3, 0.6, false);
        }
        if (kind === 'coil') place(rope, new THREE.TorusGeometry(0.32, 0.08, 6, 16).rotateX(Math.PI / 2), 0, 0.08, 0);
        if (kind === 'net') {
            for (const side of [-1, 1]) place(materials.timberDark, new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6), side * 1.4, 1.1, 0);
            place(materials.timberDark, new THREE.CylinderGeometry(0.04, 0.04, 3.0, 6).rotateZ(Math.PI / 2), 0, 2.1, 0);
            const drape = new THREE.PlaneGeometry(2.7, 1.8, 8, 6);
            const position = drape.attributes.position;
            for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin((position.getX(i) / 2.7 + 0.5) * Math.PI) * 0.15 * (1 - (position.getY(i) / 1.8 + 0.5)));
            place(net, drape, 0, 1.2, 0);
        }
        const radius = { crate: 0.6, crates: 1.1, barrel: 0.4, barrels: 0.8, coil: 0, net: 0 }[kind] ?? 0.5;
        if (radius > 0) kit.addCollider({ x, z, radius });
        if (kind === 'net') {
            for (const side of [-1, 1]) {
                const p = toWorld(side * 1.4, 0, x, z, -yaw);
                kit.addCollider({ x: p.x, z: p.z, radius: 0.12 });
            }
        }
    }
    kit.add(b.build());
}
cargo.takesPositions = true;

// An iron lamp post with a glass lantern; a few cast real light. params: positions: [[x, z]],
// light: { intensity, distance, color } (every post) or lights: how many of them do, height (of the ground)
export function lampPost(params, kit) {
    const materials = materialsFor(kit);
    const b = new PieceBuilder();
    (params.positions ?? []).forEach(([x, z], i) => {
        const y = params.height ?? kit.ground.heightAt(x, z);
        b.cylinder(materials.iron, 0.12, 0.16, 0.4, x, y, z, 8);
        b.cylinder(materials.iron, 0.05, 0.07, 3.2, x, y, z, 8);
        b.add(materials.iron, new THREE.ConeGeometry(0.26, 0.22, 6).translate(x, y + 3.75, z));
        b.add(materials.lamp, new THREE.CylinderGeometry(0.17, 0.12, 0.42, 6).translate(x, y + 3.45, z));
        b.cylinder(materials.iron, 0.14, 0.14, 0.05, x, y + 3.2, z, 6);
        kit.addCollider({ x, z, radius: 0.16 });
        const light = params.light && (params.lights === undefined || i < params.lights) ? params.light : null;
        if (light) {
            const lamp = new THREE.PointLight(light.color ?? '#ffb36a', light.intensity ?? 6, light.distance ?? 10, 1.8);
            lamp.position.set(x, y + 3.4, z);
            kit.add(lamp);
        }
    });
    kit.add(b.build());
}
lampPost.takesPositions = true;

// ---- On the water: rowboats, floating lanterns --------------------------------------------------

function rowboatGeometry() {
    // A small clinker-built boat: a hull turned from a profile, squeezed at bow and stern
    const geometry = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        const pinch = 1 - 0.55 * Math.pow(Math.abs(z), 2);
        position.setXYZ(i, x * 0.72 * pinch, y * 0.55, z * 2.2);
    }
    geometry.computeVertexNormals();
    return geometry;
}

// params: positions: [[x, z, facing], ...], level (of the water), lantern (a lantern on a pole at
// the bow), colors
export function rowboats(params, kit) {
    const materials = materialsFor(kit);
    const random = createRandom(params.seed ?? 31);
    const m = kit.materials;
    const paints = ['#2f5d6a', '#7a3a2a', '#d8cfb8', '#3a4a5a', '#5a6a3a'];
    const level = params.level ?? -0.6;
    const boats = [];
    for (const [x, z, facing = random() * 360] of params.positions ?? []) {
        const paint = m.standard(`rowboat-${paints[boats.length % paints.length]}`, { color: paints[boats.length % paints.length], roughness: 0.75, side: THREE.DoubleSide });
        const b = new PieceBuilder();
        b.add(paint, rowboatGeometry().translate(0, 0.42, 0));
        b.box(materials.timber, 1.0, 0.06, 0.3, 0, 0.32, -0.4);
        b.box(materials.timber, 1.1, 0.06, 0.3, 0, 0.32, 0.6);
        b.add(materials.timber, new THREE.CylinderGeometry(0.03, 0.03, 2.6, 5).rotateZ(Math.PI / 2 - 0.2).rotateY(0.3).translate(0.2, 0.42, 0.1));
        if (params.lantern) {
            b.cylinder(materials.timberDark, 0.025, 0.03, 1.3, 0, 0.3, -1.8, 5);
            b.add(materials.lamp, new THREE.CylinderGeometry(0.1, 0.08, 0.2, 6).translate(0, 1.55, -1.8));
        }
        const boat = b.build();
        const holder = new THREE.Group();
        holder.position.set(x, level - 0.18, z);
        holder.rotation.y = -THREE.MathUtils.degToRad(facing);
        holder.add(boat);
        kit.add(holder);
        boats.push({ boat, phase: random() * 10 });
    }
    kit.onUpdate(() => {
        const t = kit.time.value;
        for (const { boat, phase } of boats) {
            boat.position.y = Math.sin(t * 0.9 + phase) * 0.06;
            boat.rotation.z = Math.sin(t * 0.7 + phase * 1.3) * 0.05;
            boat.rotation.x = Math.sin(t * 0.6 + phase * 0.7) * 0.03;
        }
    });
}
rowboats.takesPositions = true;

// Lanterns floating on the water: one draw call. params: count, area: { min: [x, z], max: [x, z] },
// level, avoid: [[x, z, radius], ...]
export function floatingLanterns(params, kit) {
    const materials = materialsFor(kit);
    const random = createRandom(params.seed ?? 41);
    const count = Math.round((params.count ?? 60) * (kit.quality.low ? 0.6 : 1));
    const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.14, 0.24, 6), materials.lamp, count);
    const level = params.level ?? -0.6;
    const { min, max } = params.area ?? { min: [-20, -40], max: [20, -5] };
    const spots = [];
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
        let x, z, tries = 0;
        do {
            x = THREE.MathUtils.lerp(min[0], max[0], random());
            z = THREE.MathUtils.lerp(min[1], max[1], random());
        } while ((params.avoid ?? []).some(([ax, az, r]) => Math.hypot(x - ax, z - az) < r) && ++tries < 10);
        spots.push({ x, z, phase: random() * 10 });
        matrix.makeTranslation(x, level + 0.08, z);
        mesh.setMatrixAt(i, matrix);
    }
    mesh.frustumCulled = false;
    kit.add(mesh);
    kit.onUpdate(() => {
        const t = kit.time.value;
        spots.forEach(({ x, z, phase }, i) => {
            matrix.makeTranslation(x + Math.sin(t * 0.2 + phase) * 0.3, level + 0.08 + Math.sin(t * 0.9 + phase) * 0.07, z);
            mesh.setMatrixAt(i, matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
    });
}
floatingLanterns.takesPositions = true;

// ---- A bolt of lightning, caught mid-strike ----------------------------------------------------

// params: from: [x, y, z] (in the cloud), to: [x, y, z] (where it strikes), branches, name, seed
export function lightning(params, kit) {
    const random = createRandom(params.seed ?? 77);
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfe0ff').multiplyScalar(params.brightness ?? 3), fog: false });
    material.userData.noShadow = true;
    const b = new PieceBuilder();
    const bolt = (from, to, radius, depth) => {
        const points = [from.clone()];
        const steps = 14;
        for (let i = 1; i < steps; i++) {
            const p = from.clone().lerp(to, i / steps);
            p.x += (random() - 0.5) * from.distanceTo(to) * 0.08;
            p.z += (random() - 0.5) * from.distanceTo(to) * 0.05;
            points.push(p);
        }
        points.push(to.clone());
        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i], c = points[i + 1];
            const length = a.distanceTo(c);
            const geometry = new THREE.CylinderGeometry(radius * 0.85, radius, length, 5).translate(0, length / 2, 0);
            geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.clone().sub(a).normalize()));
            b.add(material, geometry.translate(a.x, a.y, a.z));
            if (depth > 0 && random() < 0.22) {
                const end = a.clone().add(new THREE.Vector3((random() - 0.5) * 18, -6 - random() * 10, (random() - 0.5) * 8));
                bolt(a, end, radius * 0.55, depth - 1);
            }
        }
    };
    bolt(new THREE.Vector3(...params.from), new THREE.Vector3(...params.to), params.radius ?? 0.12, params.branches ?? 2);
    const object = b.build({ castShadow: false, receiveShadow: false });
    kit.add(object);
    if (params.name) kit.named[params.name] = { object, material, base: material.color.clone() };
}
lightning.takesPositions = true;
