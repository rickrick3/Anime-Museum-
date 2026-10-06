// fortress.js - The buildings of a navy's harbour stronghold: a tiered fortress with a tower, curved
// walls that stand along a shore (low, sunk into the quay; or raised to their full height), a scaffold
// with a stair up its front, flagpoles, cannons on their carriages, a bell in a small tower, and a
// fissure torn through a paved square. Original and generic; content gives them their colours and marks.
//
//   pieces  'fortress'    { width, depth, tiers: [{ height, inset }], tower: { width, height }, gate,
//                           emblem (see emblems.js), colors: { wall, roof, trim, window } }
//           'siege-wall'  { center, radius, from, to (facings, degrees), height, thickness, gaps: [[from, to]], colors }
//           'scaffold'    { width, depth, height, base (the ground's height under it), stair: { width, length },
//                           colors }  walkable: its stair and its top
//           'flagpoles'   { positions, height, emblem }
//           'cannons'     { positions: [[x, z, facing], ...] }
//           'fissure'     { points: [[x, z], ...], width, glow }
//   models  'bell-tower'  { accent }  a bell hung in a small open tower; the bell swings when rung
import * as THREE from 'three';
import { PieceBuilder, createRandom, toWorld } from './kit.js';
import { emblemTexture } from './textures.js';

function materialsFor(kit, colors = {}) {
    const m = kit.materials;
    return {
        wall: m.standard(`fort-wall-${colors.wall ?? 'w'}`, { color: colors.wall ?? '#e9e6de', roughness: 0.8 }),
        roof: m.standard(`fort-roof-${colors.roof ?? 'r'}`, { color: colors.roof ?? '#24345c', roughness: 0.55, metalness: 0.2 }),
        trim: m.standard(`fort-trim-${colors.trim ?? 't'}`, { color: colors.trim ?? '#b9b3a6', roughness: 0.7 }),
        dark: m.standard('fort-dark', { color: '#1c1e24', roughness: 0.7 }),
        iron: m.standard('fort-iron', { color: colors.iron ?? '#3e454f', roughness: 0.45, metalness: 0.75 }),
        timber: m.standard('fort-timber', { color: '#4a3424', roughness: 0.8 }),
        window: m.get(`fort-window-${colors.window ?? 'w'}`, () => {
            const material = new THREE.MeshStandardMaterial({ color: '#141a24', emissive: colors.window ?? '#ffd9a0', emissiveIntensity: 0.35, roughness: 0.3 });
            material.userData.noShadow = true;
            return material;
        })
    };
}

// A box whose top is drawn in by `shrink` on every side: a sloping roof, a stepped base
function frustum(width, height, depth, shrink) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        if (position.getY(i) > 0) {
            position.setX(i, position.getX(i) * (1 - (2 * shrink) / width));
            position.setZ(i, position.getZ(i) * (1 - (2 * shrink) / depth));
        }
    }
    geometry.computeVertexNormals();
    return geometry;
}

// ---- The fortress ----------------------------------------------------------------------------------

export function fortress(params, kit) {
    const m = materialsFor(kit, params.colors);
    const width = params.width ?? 48, depth = params.depth ?? 20;
    const tiers = params.tiers ?? [{ height: 11, inset: 0 }, { height: 8, inset: 6 }, { height: 7, inset: 12 }];
    const b = new PieceBuilder();
    const random = createRandom(params.seed ?? 3);
    let y = 0;
    const windowRow = (w, d, base, h) => {
        for (let row = 0; row < Math.floor(h / 3.2); row++) {
            const wy = base + 1.6 + row * 3.2;
            for (let x = -w / 2 + 2; x <= w / 2 - 2; x += 2.6) {
                if (Math.abs(x) < (params.gate?.width ?? 6) / 2 + 1 && base === 0 && row === 0) continue;
                const lit = random() < 0.4;
                b.add(lit ? m.window : m.dark, new THREE.PlaneGeometry(0.9, 1.6).rotateY(Math.PI).translate(x, wy, -d / 2 - 0.02));
            }
            for (const side of [-1, 1]) {
                for (let z = -d / 2 + 2; z <= d / 2 - 2; z += 2.6) {
                    b.add(random() < 0.3 ? m.window : m.dark, new THREE.PlaneGeometry(0.9, 1.6).rotateY(side * Math.PI / 2).translate(side * (w / 2 + 0.02), wy, z));
                }
            }
        }
    };
    tiers.forEach(({ height, inset = 0 }, i) => {
        const w = width - inset * 2, d = depth - inset * 1.2;
        b.box(m.wall, w, height, d, 0, y + height / 2, 0);
        b.box(m.trim, w + 0.4, 0.5, d + 0.4, 0, y + 0.25, 0);
        windowRow(w, d, y, height - 1.4);
        // A sloping roof of its own colour, its eaves overhanging
        b.add(m.roof, frustum(w + 1.6, 1.6, d + 1.6, i === tiers.length - 1 ? 2.4 : 1.4).translate(0, y + height + 0.8, 0));
        y += height + 1.6;
    });
    // The tower on top, its pointed roof, and the mark of those who hold it on its face
    const tower = { width: 9, height: 12, ...params.tower };
    b.box(m.wall, tower.width, tower.height, tower.width, 0, y + tower.height / 2, 0);
    b.box(m.trim, tower.width + 0.6, 0.6, tower.width + 0.6, 0, y + tower.height, 0);
    b.add(m.roof, new THREE.ConeGeometry(tower.width * 0.78, tower.width * 0.9, 4).rotateY(Math.PI / 4).translate(0, y + tower.height + 0.3 + tower.width * 0.45, 0));
    for (const side of [-1, 1]) b.add(m.dark, new THREE.PlaneGeometry(1.4, 2.4).rotateY(side * Math.PI / 2).translate(side * (tower.width / 2 + 0.02), y + tower.height - 3, 0));
    // The gate, and a portico of pillars before it
    const gate = { width: 6, height: 7, ...params.gate };
    b.add(m.dark, new THREE.PlaneGeometry(gate.width, gate.height).rotateY(Math.PI).translate(0, gate.height / 2, -depth / 2 - 0.03));
    for (const x of [-gate.width / 2 - 1.5, -gate.width / 2 - 4, gate.width / 2 + 1.5, gate.width / 2 + 4]) {
        b.cylinder(m.trim, 0.55, 0.6, gate.height + 1.6, x, 0, -depth / 2 - 2.2, 14);
        const pillar = toWorld(x, -depth / 2 - 2.2, params.x, params.z, params.yaw);
        kit.addCollider({ x: pillar.x, z: pillar.z, radius: 0.7 });
    }
    b.box(m.trim, gate.width + 10, 1.0, 3.2, 0, gate.height + 2.1, -depth / 2 - 1.6);
    b.box(m.roof, gate.width + 10.8, 0.4, 3.8, 0, gate.height + 2.8, -depth / 2 - 1.7);
    const object = b.build();
    object.position.set(params.x, params.y ?? 0, params.z);
    object.rotation.y = params.yaw;
    kit.add(object);
    kit.addSolid(object);

    if (params.emblem) {
        const map = emblemTexture({ border: true, ...params.emblem });
        const plaque = new THREE.Mesh(new THREE.PlaneGeometry(tower.width * 0.7, tower.width * 0.7), new THREE.MeshStandardMaterial({ map, roughness: 0.6, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.15 }));
        plaque.rotation.y = Math.PI;
        plaque.position.set(0, y + tower.height * 0.5, -tower.width / 2 - 0.03);
        object.add(plaque);
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(gate.width + 2, 3.2), plaque.material);
        banner.rotation.y = Math.PI;
        banner.position.set(0, tiers[0].height + 1.6 + (tiers[1]?.height ?? 6) * 0.55, -(depth - (tiers[1]?.inset ?? 6) * 1.2) / 2 - 0.04);
        banner.scale.x = 3.2 / (gate.width + 2);
        object.add(banner);
    }

    // Solid: its footprint
    const corners = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]].map(([lx, lz]) => toWorld(lx, lz, params.x, params.z, params.yaw));
    corners.forEach((p, i) => {
        const q = corners[(i + 1) % 4];
        kit.addCollider({ ax: p.x, az: p.z, bx: q.x, bz: q.z, radius: 0.3 });
    });
}

// ---- Walls along a shore ------------------------------------------------------------------------------

// The point at `facing` degrees on a circle about center (facing: clockwise from north, as everywhere)
const onArc = (center, radius, facing) => {
    const a = THREE.MathUtils.degToRad(facing);
    return [center[0] + Math.sin(a) * radius, center[1] - Math.cos(a) * radius];
};

export function siegeWall(params, kit) {
    const m = materialsFor(kit, params.colors);
    const { center = [0, 0], radius = 30, from = 90, to = 270, height = 9, thickness = 1.2, gaps = [], base = 0 } = params;
    const step = params.step ?? 4; // Degrees per panel
    const b = new PieceBuilder();
    const inGap = a => gaps.some(([g0, g1]) => a > g0 && a < g1);
    for (let a = from; a < to - 0.01; a += step) {
        const a1 = Math.min(to, a + step);
        if (inGap((a + a1) / 2)) continue;
        const [x0, z0] = onArc(center, radius, a), [x1, z1] = onArc(center, radius, a1);
        const length = Math.hypot(x1 - x0, z1 - z0);
        const yaw = Math.atan2(-(z1 - z0), x1 - x0);
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        const panel = new THREE.BoxGeometry(length + 0.05, height, thickness).rotateY(yaw).translate(mx, base + height / 2, mz);
        b.add(m.iron, panel);
        if (height > 2) {
            for (const band of [0.25, 0.6, 0.92]) b.add(m.dark, new THREE.BoxGeometry(length + 0.06, 0.22, thickness + 0.06).rotateY(yaw).translate(mx, base + height * band, mz));
            b.add(m.dark, new THREE.BoxGeometry(0.4, height, thickness + 0.12).rotateY(yaw).translate(x0, base + height / 2, z0));
        } else {
            b.add(m.dark, new THREE.BoxGeometry(length + 0.06, 0.08, thickness + 0.04).rotateY(yaw).translate(mx, base + height, mz));
        }
        kit.addCollider({ ax: x0, az: z0, bx: x1, bz: z1, radius: thickness / 2 + 0.05 });
    }
    const object = b.build();
    kit.add(object);
    if (height > 2) kit.addSolid(object);
    if (params.name) kit.named[params.name] = object;
}
siegeWall.takesPositions = true;

// ---- A scaffold with a stair up its front ---------------------------------------------------------------

const scaffoldSize = params => ({
    width: params.width ?? 7, depth: params.depth ?? 5, height: params.height ?? 7, stair: params.stair?.width ?? 2.2,
    run: params.stair?.length ?? (params.height ?? 7) * 1.6
});

export function scaffold(params, kit) {
    const m = materialsFor(kit, params.colors);
    const { width, depth, height, stair, run } = scaffoldSize(params);
    const b = new PieceBuilder();
    b.add(m.wall, frustum(width + 1.2, height - 0.3, depth + 1.2, 0.5).translate(0, (height - 0.3) / 2, 0));
    b.box(m.timber, width, 0.3, depth, 0, height - 0.15, 0);
    b.box(m.trim, width + 0.3, 0.12, depth + 0.3, 0, height - 0.32, 0);
    // A rail round the top, open where the stair arrives
    for (const [x0, z0, x1, z1] of [[-width / 2, depth / 2, width / 2, depth / 2], [-width / 2, -depth / 2, -stair / 2, -depth / 2], [stair / 2, -depth / 2, width / 2, -depth / 2], [-width / 2, -depth / 2, -width / 2, depth / 2], [width / 2, -depth / 2, width / 2, depth / 2]]) {
        const length = Math.hypot(x1 - x0, z1 - z0);
        b.box(m.timber, x1 === x0 ? 0.08 : length, 0.08, x1 === x0 ? length : 0.08, (x0 + x1) / 2, height + 1.0, (z0 + z1) / 2);
        for (let s = 0; s <= length; s += 1.2) b.box(m.timber, 0.1, 1.0, 0.1, x0 + (x1 - x0) * (s / length), height + 0.5, z0 + (z1 - z0) * (s / length));
    }
    // The stair: steps from the ground to the top, coming down toward the front (-z)
    const steps = Math.ceil(height / 0.25);
    for (let i = 0; i < steps; i++) {
        const top = height * ((i + 1) / steps);
        const z = -depth / 2 - run + (i + 0.5) * (run / steps);
        b.box(m.trim, stair, top, run / steps + 0.02, 0, top / 2, z);
    }
    const object = b.build();
    object.position.set(params.x, params.base ?? params.y ?? 0, params.z);
    object.rotation.y = params.yaw;
    kit.add(object);
    if (params.name) kit.named[params.name] = object;
    // Solid: its sides and back (the top's edges; the stair's sides)
    const w = (lx, lz) => toWorld(lx, lz, params.x, params.z, params.yaw);
    const edge = (a, c) => {
        const p = w(...a), q = w(...c);
        kit.addCollider({ ax: p.x, az: p.z, bx: q.x, bz: q.z, radius: 0.2 });
    };
    edge([-width / 2 - 0.6, -depth / 2], [-width / 2 - 0.6, depth / 2 + 0.6]);
    edge([width / 2 + 0.6, -depth / 2], [width / 2 + 0.6, depth / 2 + 0.6]);
    edge([-width / 2 - 0.6, depth / 2 + 0.6], [width / 2 + 0.6, depth / 2 + 0.6]);
    edge([-width / 2 - 0.6, -depth / 2 - 0.1], [-stair / 2 - 0.3, -depth / 2 - 0.1]);
    edge([stair / 2 + 0.3, -depth / 2 - 0.1], [width / 2 + 0.6, -depth / 2 - 0.1]);
    edge([-stair / 2 - 0.3, -depth / 2 - run], [-stair / 2 - 0.3, -depth / 2]);
    edge([stair / 2 + 0.3, -depth / 2 - run], [stair / 2 + 0.3, -depth / 2]);
}

// Its top and its stair are ground to walk on
scaffold.areas = params => {
    const { width, depth, height, stair, run } = scaffoldSize(params);
    const front = toWorld(0, -depth / 2 - run / 2, params.x, params.z, params.yaw);
    const base = params.base ?? 0; // The ground isn't made yet when this is asked: the content says how high it is
    return [
        { shape: 'rect', at: [params.x, params.z], size: [width, depth], facing: params.facing ?? 0, height: base + height, blend: 0, surface: 'wood', paint: false, mesh: false },
        { shape: 'rect', at: [front.x, front.z], size: [stair, run], facing: (params.facing ?? 0) + 180, ramp: { from: base + height, to: base }, blend: 0, surface: 'stone', paint: false, mesh: false }
    ];
};

// ---- Flagpoles -------------------------------------------------------------------------------------------

export function flagpoles(params, kit) {
    const height = params.height ?? 10;
    const pole = kit.materials.standard('flagpole', { color: '#d9d6cf', roughness: 0.4, metalness: 0.6 });
    const map = emblemTexture({ border: false, ...params.emblem });
    const cloth = kit.materials.get(`flag-cloth-${JSON.stringify(params.emblem ?? {})}`, () => new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.85 }));
    const flags = [];
    const random = createRandom(params.seed ?? 4);
    const b = new PieceBuilder();
    for (const [x, z] of params.positions ?? []) {
        const y = kit.ground.heightAt(x, z);
        b.cylinder(pole, 0.07, 0.1, height, x, y, z, 8);
        b.add(pole, new THREE.SphereGeometry(0.14, 8, 6).translate(x, y + height + 0.1, z));
        kit.addCollider({ x, z, radius: 0.15 });
        const geometry = new THREE.PlaneGeometry(2.6, 1.7, 10, 4).translate(1.3, 0, 0);
        const flag = new THREE.Mesh(geometry, cloth);
        flag.position.set(x, y + height - 1, z);
        flag.rotation.y = THREE.MathUtils.degToRad(params.wind ?? 200) + (random() - 0.5) * 0.2;
        flag.castShadow = true;
        kit.add(flag);
        flags.push({ flag, rest: Float32Array.from(geometry.attributes.position.array), phase: x * 0.3 + z * 0.17 });
    }
    kit.add(b.build());
    kit.onUpdate(() => {
        const time = kit.time.value;
        for (const { flag, rest, phase } of flags) {
            const position = flag.geometry.attributes.position;
            for (let i = 0; i < position.count; i++) {
                const x = rest[i * 3], y = rest[i * 3 + 1];
                const amount = x / 2.6;
                position.setXYZ(i, x, y + Math.sin(time * 3 + x * 2 + phase) * 0.06 * amount, Math.sin(time * 4.2 + x * 3 + y + phase) * 0.26 * amount);
            }
            position.needsUpdate = true;
        }
    });
}
flagpoles.takesPositions = true;

// ---- Cannons on their carriages -------------------------------------------------------------------------

export function cannons(params, kit) {
    const iron = kit.materials.standard('cannon-iron', { color: '#2b2d31', roughness: 0.4, metalness: 0.85 });
    const wood = kit.materials.standard('cannon-wood', { color: '#4a3424', roughness: 0.8 });
    const b = new PieceBuilder();
    for (const [x, z, facing = 0] of params.positions ?? []) {
        const yaw = -THREE.MathUtils.degToRad(facing);
        const y = kit.ground.heightAt(x, z);
        const piece = new PieceBuilder();
        piece.box(wood, 0.9, 0.35, 1.5, 0, 0.35, 0.1);
        for (const side of [-1, 1]) for (const zz of [-0.45, 0.6]) piece.add(wood, new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12).rotateZ(Math.PI / 2).translate(side * 0.5, 0.24, zz));
        piece.add(iron, new THREE.CylinderGeometry(0.16, 0.24, 2.1, 14).rotateX(Math.PI / 2 - 0.08).translate(0, 0.72, -0.35));
        piece.add(iron, new THREE.SphereGeometry(0.26, 12, 8).translate(0, 0.72, 0.62));
        piece.parts.forEach((geometries, material) => geometries.forEach(geometry => {
            geometry.rotateY(yaw).translate(x, y, z);
            b.add(material, geometry);
        }));
        kit.addCollider({ x, z, radius: 0.75 });
    }
    kit.add(b.build());
}
cannons.takesPositions = true;

// ---- A fissure torn through paving --------------------------------------------------------------------

export function fissure(params, kit) {
    const random = createRandom(params.seed ?? 9);
    const points = params.points ?? [];
    const width = params.width ?? 1.2;
    const dark = kit.materials.standard('fissure-dark', { color: '#0d0c0b', roughness: 1 });
    const lip = kit.materials.standard('fissure-lip', { color: params.lip ?? '#5e5850', roughness: 0.95 });
    const b = new PieceBuilder();
    for (let i = 0; i < points.length - 1; i++) {
        const [ax, az] = points[i], [bx, bz] = points[i + 1];
        const length = Math.hypot(bx - ax, bz - az);
        const yaw = Math.atan2(-(bz - az), bx - ax);
        const pieces = Math.ceil(length / 0.7);
        for (let s = 0; s < pieces; s++) {
            const t = (s + 0.5) / pieces;
            const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
            const w = width * (0.5 + random() * 0.7) * (1 - Math.abs(t - 0.5) * 0.5);
            const y = kit.ground.heightAt(x, z);
            b.add(dark, new THREE.PlaneGeometry(length / pieces + 0.15, w).rotateX(-Math.PI / 2).rotateY(yaw + (random() - 0.5) * 0.3).translate(x, y + 0.025, z));
            for (const side of [-1, 1]) {
                const off = (w / 2 + 0.12) * side;
                b.add(lip, new THREE.BoxGeometry(length / pieces * (0.6 + random() * 0.5), 0.12 + random() * 0.2, 0.3 + random() * 0.3)
                    .rotateY(yaw + (random() - 0.5) * 0.6).rotateZ((random() - 0.5) * 0.4)
                    .translate(x - Math.sin(yaw) * off, y + 0.04, z - Math.cos(yaw) * off));
            }
        }
    }
    kit.add(b.build({ castShadow: false }));
}
fissure.takesPositions = true;

// ---- A bell in a small open tower ---------------------------------------------------------------------------

export function bellTower(params) {
    const group = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: params.stone ?? '#b9b3a6', roughness: 0.85 });
    const roof = new THREE.MeshStandardMaterial({ color: params.roof ?? '#24345c', roughness: 0.6 });
    const bronze = new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.32, metalness: 0.9, emissive: params.accent ?? '#ffcf7a', emissiveIntensity: 0 });
    const b = new PieceBuilder();
    b.add(stone, frustum(3.0, 0.6, 3.0, 0.2).translate(0, 0.3, 0));
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(stone, 0.42, 3.6, 0.42, x * 1.1, 0.6 + 1.8, z * 1.1);
    b.box(stone, 2.9, 0.4, 2.9, 0, 4.4, 0);
    b.add(roof, new THREE.ConeGeometry(2.3, 1.6, 4).rotateY(Math.PI / 4).translate(0, 5.4, 0));
    b.box(stone, 2.4, 0.18, 0.2, 0, 4.05, 0);
    group.add(b.build());
    const moving = new THREE.Group();
    moving.position.y = 3.95;
    moving.add(new THREE.Mesh(new THREE.LatheGeometry([[0.0, -1.1], [0.62, -1.1], [0.58, -0.96], [0.42, -0.5], [0.34, -0.1], [0.0, 0.0]].map(([r, y]) => new THREE.Vector2(r, y)), 28), bronze));
    moving.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8).translate(0, -1.0, 0), stone));
    group.add(moving);
    group.traverse(part => {
        if (part.isMesh) part.castShadow = part.receiveShadow = true;
    });
    group.userData.parts = { moving, glows: [{ material: bronze, base: 0, peak: 0.4 }] };
    return group;
}
