// nature.js - Living scenery for exhibition worlds: forests of pines, autumn maples, bamboo groves,
// grass that moves in the wind, ferns that lean away as you pass, mossy rocks and far mountains.
//
// Every piece is a function (params, kit) called by the exhibition builder (see
// src/museum/exhibition.js for `kit`), and adds what it makes to the world. Trees and grass are
// instanced (a draw call or two for a whole forest) and sway in the vertex shader, so a forest costs
// almost nothing per frame. Things the player could walk into get colliders; ferns register with the
// environment and answer the player like the desert's plants did (src/environment/).
// Leaves, bark and stone use Lambert shading: on rough surfaces it looks the same as physically based
// shading, and its shaders are much quicker to compile when a world is entered.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { addWind } from './kit.js';
import { Sway } from '../environment/responses.js';

// Merging needs every part non-indexed; some shapes (icosahedra) already are
const flat = geometry => (geometry.index ? geometry.toNonIndexed() : geometry);

const matrix = new THREE.Matrix4();
const quaternion = new THREE.Quaternion();
const scaleVector = new THREE.Vector3();
const positionVector = new THREE.Vector3();
const euler = new THREE.Euler();
const tint = new THREE.Color();

// Positions spread over the ground: `count` of them between `inner` and `outer` metres from `center`
// (or anywhere in `area` { minX, maxX, minZ, maxZ }), on clear ground, at least `spacing` apart, and
// outside every circle in `avoid` ([[x, z, radius], ...])
function scatter(kit, {
    count, center = [0, 0], inner = 0, outer = 60, area = null, margin = 1, spacing = 1.5, accept = null, avoid = []
}) {
    const { random, ground } = kit;
    const points = [];
    const cell = spacing;
    const grid = new Map();
    const key = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
    const crowded = (x, z) => {
        const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                for (const p of grid.get(`${cx + i},${cz + j}`) ?? []) {
                    if ((p.x - x) ** 2 + (p.z - z) ** 2 < spacing * spacing) return true;
                }
            }
        }
        return false;
    };
    for (let attempt = 0; attempt < count * 30 && points.length < count; attempt++) {
        let x, z;
        if (area) {
            x = random.range(area.minX, area.maxX);
            z = random.range(area.minZ, area.maxZ);
        } else {
            // Even over the ring's area, not bunched toward the middle
            const r = Math.sqrt(random.range(inner * inner, outer * outer));
            const a = random() * Math.PI * 2;
            x = center[0] + Math.cos(a) * r;
            z = center[1] + Math.sin(a) * r;
        }
        if (!ground.isClear(x, z, margin) || (accept && !accept(x, z)) || crowded(x, z)) continue;
        if (avoid.some(([ax, az, radius]) => (x - ax) ** 2 + (z - az) ** 2 < radius * radius)) continue;
        const point = { x, z };
        points.push(point);
        const k = key(x, z);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(point);
    }
    return points;
}

// Inside the part of the world the player can walk in (colliders are only needed there)
function walkable(kit, x, z, pad = 1) {
    const b = kit.space.bounds;
    return x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad;
}

function instanced(geometry, material, count, { shadows = true } = {}) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    return mesh;
}

// ---- Pines -----------------------------------------------------------------------------------

function pineGeometries() {
    const trunk = new THREE.CylinderGeometry(0.09, 0.2, 3.4, 6).translate(0, 1.7, 0);
    const cones = [];
    for (let i = 0; i < 4; i++) {
        const radius = 1.85 - i * 0.4;
        const height = 2.5 - i * 0.28;
        cones.push(new THREE.ConeGeometry(radius, height, 7, 1).translate(0, 1.7 + i * 1.12 + height / 2, 0)
            .rotateY(i * 0.7));
    }
    return { trunk, foliage: mergeGeometries(cones.map(flat)) };
}

// params: count, center, inner, outer, area, spacing, scale: [min, max], colors: { trunk, foliage: [..] }
export function pineForest(params, kit) {
    const { random, materials, time } = kit;
    const points = scatter(kit, { margin: 1.2, spacing: 2.2, ...params });
    const { trunk, foliage } = pineGeometries();
    const trunkMaterial = materials.get('pine-trunk', () => new THREE.MeshLambertMaterial({ color: params.colors?.trunk ?? '#3b2a20' }));
    const foliageMaterial = materials.get('pine-foliage', () => addWind(
        new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
        time, { strength: 0.22, height: 9, speed: 0.8 }
    ));
    const trunks = instanced(trunk, trunkMaterial, points.length);
    const crowns = instanced(foliage, foliageMaterial, points.length);
    const shades = (params.colors?.foliage ?? ['#1f3324', '#24392a', '#1a2c22']).map(value => new THREE.Color(value));
    const [low, high] = params.scale ?? [0.85, 1.6];

    points.forEach((point, i) => {
        const s = random.range(low, high);
        positionVector.set(point.x, kit.ground.heightAt(point.x, point.z) - 0.15, point.z);
        quaternion.setFromEuler(euler.set(random.range(-0.03, 0.03), random() * Math.PI * 2, random.range(-0.03, 0.03)));
        scaleVector.set(s * random.range(0.9, 1.1), s, s * random.range(0.9, 1.1));
        matrix.compose(positionVector, quaternion, scaleVector);
        trunks.setMatrixAt(i, matrix);
        crowns.setMatrixAt(i, matrix);
        crowns.setColorAt(i, tint.copy(random.pick(shades)).multiplyScalar(random.range(0.85, 1.15)));
        if (walkable(kit, point.x, point.z)) kit.addCollider({ x: point.x, z: point.z, radius: 0.22 * s });
    });
    kit.add(trunks);
    kit.add(crowns);
}

// ---- Maples ----------------------------------------------------------------------------------

function mapleGeometries(random) {
    const trunk = mergeGeometries([
        new THREE.CylinderGeometry(0.12, 0.24, 3, 7).translate(0, 1.5, 0),
        new THREE.CylinderGeometry(0.05, 0.1, 1.8, 5).translate(0, 0.9, 0).rotateZ(0.7).translate(0.2, 2.2, 0),
        new THREE.CylinderGeometry(0.05, 0.1, 1.6, 5).translate(0, 0.8, 0).rotateZ(-0.65).rotateY(2).translate(-0.1, 2.4, 0.1)
    ].map(flat));
    const clumps = [];
    for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + random() * 0.5;
        const r = i === 0 ? 0 : random.range(0.8, 1.6);
        const size = random.range(0.9, 1.4);
        clumps.push(new THREE.IcosahedronGeometry(size, 1).scale(1, 0.75, 1)
            .translate(Math.cos(a) * r, 3.6 + random.range(-0.3, 0.8), Math.sin(a) * r));
    }
    return { trunk, crown: mergeGeometries(clumps.map(flat)) };
}

// params: positions: [[x, z], ...], colors: { trunk, leaves: [..] }, scale: [min, max]
export function mapleTrees(params, kit) {
    const { random, materials, time } = kit;
    const positions = params.positions ?? [];
    const { trunk, crown } = mapleGeometries(random);
    const trunks = instanced(trunk, materials.get('maple-trunk', () => new THREE.MeshLambertMaterial({ color: params.colors?.trunk ?? '#3a2620' })), positions.length);
    const crownMaterial = materials.get('maple-crown', () => addWind(
        new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
        time, { strength: 0.18, height: 5, speed: 1 }
    ));
    const crowns = instanced(crown, crownMaterial, positions.length);
    const shades = (params.colors?.leaves ?? ['#a8361f', '#c9542a', '#8f2a1f']).map(value => new THREE.Color(value));
    const [low, high] = params.scale ?? [0.9, 1.3];
    positions.forEach(([x, z], i) => {
        const s = random.range(low, high);
        matrix.compose(
            positionVector.set(x, kit.ground.heightAt(x, z) - 0.1, z),
            quaternion.setFromEuler(euler.set(0, random() * Math.PI * 2, 0)),
            scaleVector.set(s, s, s)
        );
        trunks.setMatrixAt(i, matrix);
        crowns.setMatrixAt(i, matrix);
        crowns.setColorAt(i, tint.copy(random.pick(shades)));
        kit.addCollider({ x, z, radius: 0.3 * s });
    });
    kit.add(trunks);
    kit.add(crowns);
}
mapleTrees.takesPositions = true;

// ---- Bamboo ----------------------------------------------------------------------------------

function bambooStalkGeometry() {
    const geometry = new THREE.CylinderGeometry(0.045, 0.055, 1, 6, 14).translate(0, 0.5, 0);
    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
        // Darker rings at each node
        const y = position.getY(i) * 14;
        const node = Math.abs(y - Math.round(y)) < 0.08 ? 0.55 : 1;
        colors.set([node, node, node], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
}

// params: at: [x, z] (the grove's centre), radius, clumps, height: [min, max], colors: { stalk, leaves }
export function bambooGrove(params, kit) {
    const { random, materials, time, ground } = kit;
    const [cx, cz] = params.at;
    const clumpCenters = scatter(kit, {
        count: params.clumps ?? 30, center: [cx, cz], inner: 0, outer: params.radius ?? 8, margin: 0.8, spacing: 1.6
    });
    const stalks = [];
    clumpCenters.forEach(({ x, z }) => {
        const n = 3 + Math.floor(random() * 4);
        for (let i = 0; i < n; i++) {
            stalks.push({ x: x + random.range(-0.45, 0.45), z: z + random.range(-0.45, 0.45) });
        }
        if (walkable(kit, x, z)) kit.addCollider({ x, z, radius: 0.55 });
    });

    const stalkMaterial = materials.get('bamboo-stalk', () => addWind(
        new THREE.MeshLambertMaterial({ color: params.colors?.stalk ?? '#7f9a4a', vertexColors: true }),
        time, { strength: 0.25, height: 1, speed: 1.2 }
    ));
    const leafMaterial = materials.get('bamboo-leaf', () => addWind(
        new THREE.MeshLambertMaterial({ color: params.colors?.leaves ?? '#4f7a36', side: THREE.DoubleSide }),
        time, { strength: 0.05, height: 0.3, speed: 2.4 }
    ));
    const stalkMesh = instanced(bambooStalkGeometry(), stalkMaterial, stalks.length);
    const leavesPerStalk = 9;
    const leafGeometry = new THREE.PlaneGeometry(0.07, 0.42).translate(0, 0.21, 0);
    const leafMesh = instanced(leafGeometry, leafMaterial, stalks.length * leavesPerStalk);
    const [low, high] = params.height ?? [6, 9];

    let leaf = 0;
    stalks.forEach(({ x, z }, i) => {
        const h = random.range(low, high);
        const lean = random.range(-0.06, 0.06);
        const base = ground.heightAt(x, z) - 0.05;
        matrix.compose(positionVector.set(x, base, z), quaternion.setFromEuler(euler.set(lean, 0, random.range(-0.06, 0.06))),
            scaleVector.set(1, h, 1));
        stalkMesh.setMatrixAt(i, matrix);
        stalkMesh.setColorAt(i, tint.setHSL(0.21 + random() * 0.04, 0.35, 0.42 + random() * 0.12));
        for (let j = 0; j < leavesPerStalk; j++) {
            const y = base + h * random.range(0.5, 0.98);
            const a = random() * Math.PI * 2;
            matrix.compose(
                positionVector.set(x + Math.cos(a) * 0.05, y, z + Math.sin(a) * 0.05),
                quaternion.setFromEuler(euler.set(random.range(1.6, 2.4), a, 0, 'YXZ')),
                scaleVector.setScalar(random.range(0.8, 1.3))
            );
            leafMesh.setMatrixAt(leaf++, matrix);
        }
    });
    kit.add(stalkMesh);
    kit.add(leafMesh);
}

// ---- Grass -----------------------------------------------------------------------------------

function bladeGeometry() {
    const geometry = new THREE.BufferGeometry();
    // A tapered blade, leaning a little forward toward its tip
    const vertices = new Float32Array([
        -0.025, 0, 0, 0.025, 0, 0, -0.012, 0.5, 0.03, 0.012, 0.5, 0.03, 0, 1, 0.09
    ]);
    const colors = new Float32Array([0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 1, 1, 1]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
    geometry.computeVertexNormals();
    return geometry;
}

// params: clumps, center, inner, outer, bladesPerClump: [min, max], height: [min, max], color
export function grass(params, kit) {
    const { random, materials, time, ground, quality } = kit;
    const clumps = scatter(kit, {
        count: Math.round((params.clumps ?? 500) * (quality.low ? 0.4 : 1)), margin: 0.15, spacing: 0.9, ...params
    });
    const [fewest, most] = params.bladesPerClump ?? [10, 22];
    const blades = [];
    clumps.forEach(({ x, z }) => {
        const n = Math.round(random.range(fewest, most));
        for (let i = 0; i < n; i++) {
            const r = Math.sqrt(random()) * 0.45, a = random() * Math.PI * 2;
            blades.push({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r });
        }
    });
    const material = materials.get('grass', () => addWind(
        new THREE.MeshLambertMaterial({ color: params.color ?? '#5d7a3c', vertexColors: true, side: THREE.DoubleSide }),
        time, { strength: 0.1, height: 0.6, speed: 1.7 }
    ));
    const mesh = instanced(bladeGeometry(), material, blades.length, { shadows: false });
    const [low, high] = params.height ?? [0.25, 0.6];
    blades.forEach(({ x, z }, i) => {
        const h = random.range(low, high);
        matrix.compose(
            positionVector.set(x, ground.heightAt(x, z) - 0.02, z),
            quaternion.setFromEuler(euler.set(random.range(-0.25, 0.25), random() * Math.PI * 2, random.range(-0.25, 0.25))),
            scaleVector.set(1, h, h)
        );
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, tint.setHSL(0.2 + random() * 0.07, 0.35 + random() * 0.2, 0.45 + random() * 0.2));
    });
    kit.add(mesh);
}

// ---- Ferns (respond to the player) -----------------------------------------------------------

function fernGeometry(random) {
    const fronds = [];
    const count = 7 + Math.floor(random() * 3);
    for (let i = 0; i < count; i++) {
        const length = random.range(0.55, 0.85);
        const frond = new THREE.PlaneGeometry(0.16, length, 1, 6).translate(0, length / 2, 0);
        const position = frond.attributes.position;
        for (let j = 0; j < position.count; j++) {
            const t = position.getY(j) / length;
            position.setX(j, position.getX(j) * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.1))); // Pointed ends
            position.setZ(j, t * t * length * 0.7); // Arching outward
            position.setY(j, position.getY(j) * (1 - 0.35 * t));
        }
        frond.rotateX(-0.25).rotateY((i / count) * Math.PI * 2 + random() * 0.4);
        fronds.push(frond);
    }
    const geometry = mergeGeometries(fronds);
    geometry.computeVertexNormals();
    return geometry;
}

// params: count, near (paths: within this many metres of open ground's edge), center, inner, outer,
// color, colors: [..]
export function ferns(params, kit) {
    const { random, materials } = kit;
    const variants = [0, 1, 2].map(() => fernGeometry(random));
    const material = materials.get('fern', () => new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    const shades = (params.colors ?? ['#3f6a33', '#4c7a3a', '#365c2d']).map(value => new THREE.Color(value));
    const points = scatter(kit, { margin: 0.4, spacing: 1.2, ...params });
    points.forEach(({ x, z }, i) => {
        const fern = new THREE.Mesh(variants[i % variants.length], material.clone());
        fern.material.color.copy(random.pick(shades));
        fern.position.set(x, kit.ground.heightAt(x, z) - 0.03, z);
        fern.rotation.y = random() * Math.PI * 2;
        fern.scale.setScalar(random.range(0.8, 1.3));
        fern.castShadow = true;
        kit.add(fern);
        // Soft and light: leans away as you pass, sways at your steps and settles
        kit.addReactive({
            id: `fern-${i}`,
            object: fern,
            reactionRadius: 0.9,
            stepRadius: 1.5,
            response: new Sway(fern, { stiffness: 55, duration: 1.9, pushBend: 0.12, leanBend: 0.22, maxBend: 0.32 }),
            sound: 'rustle',
            loudness: 0.35,
            brushes: true
        });
    });
}

// ---- Rocks -----------------------------------------------------------------------------------

function rockGeometry(random, noise) {
    const geometry = mergeVertices(new THREE.IcosahedronGeometry(1, 2));
    const position = geometry.attributes.position;
    const seed = random() * 100;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        const bump = 1 + 0.28 * noise.noise(x * 1.7 + seed, y * 1.7, z * 1.7);
        position.setXYZ(i, x * bump, y * bump * 0.62, z * bump);
    }
    geometry.computeVertexNormals();
    return geometry;
}

// params: positions: [[x, z, size], ...], or count and scatter options; color
export function rocks(params, kit) {
    const { random, materials } = kit;
    const noise = new ImprovedNoise();
    const material = materials.get('rock', () => new THREE.MeshLambertMaterial({ color: params.color ?? '#5d5a55', flatShading: true }));
    const list = params.positions ?? scatter(kit, { margin: 0.8, spacing: 3, ...params })
        .map(({ x, z }) => [x, z, random.range(0.3, 1.1)]);
    list.forEach(([x, z, size = 0.8]) => {
        const rock = new THREE.Mesh(rockGeometry(random, noise), material);
        rock.position.set(x, kit.ground.heightAt(x, z) - size * 0.15, z);
        rock.scale.setScalar(size);
        rock.rotation.y = random() * Math.PI * 2;
        rock.castShadow = rock.receiveShadow = true;
        kit.add(rock);
        if (size > 0.45) {
            kit.addCollider({ x, z, radius: size * 0.85 });
            kit.addSolid(rock);
        }
    });
}
rocks.takesPositions = true;

// ---- Mountains -------------------------------------------------------------------------------

// Ridges far beyond the world, in colours already hazed by the distance (they ignore the fog)
// params: layers: [{ radius, height, color, roughness }], seed
export function mountains(params, kit) {
    const noise = new ImprovedNoise();
    (params.layers ?? []).forEach((layer, index) => {
        const segments = 160;
        const geometry = new THREE.CylinderGeometry(layer.radius, layer.radius, 1, segments, 1, true);
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
            const x = position.getX(i), z = position.getZ(i);
            if (position.getY(i) > 0) {
                const a = Math.atan2(z, x);
                const ridge = 0.55 + 0.45 * noise.noise(Math.cos(a) * 3 + index * 7, Math.sin(a) * 3, (params.seed ?? 1) + index) +
                    0.18 * noise.noise(Math.cos(a) * 11, Math.sin(a) * 11, index * 3.3);
                position.setY(i, layer.height * Math.max(0.12, ridge * (layer.roughness ?? 1)));
            } else {
                position.setY(i, -20);
            }
        }
        geometry.computeVertexNormals();
        const ridge = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: layer.color, fog: false, side: THREE.BackSide }));
        ridge.renderOrder = -5 + index;
        kit.add(ridge);
    });
}
