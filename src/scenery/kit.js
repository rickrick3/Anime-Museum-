// kit.js - Small things every scenery piece shares: seeded randomness, directions, a library of
// materials per world, wind for things that sway, and freeing what a world made on the GPU.
//
// Directions in content are given as `facing`: degrees clockwise from north, where north is -z
// (the way the player looks with yaw 0) and east is +x. facingToYaw() turns that into the player's
// yaw, facingDirection() into a direction along the ground.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const FONTS = {
    sans: '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", serif'
};

// A repeatable random number generator (mulberry32): the same seed gives the same world every time
export function createRandom(seed = 1) {
    let state = seed >>> 0;
    const random = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    random.range = (min, max) => min + (max - min) * random();
    random.pick = list => list[Math.floor(random() * list.length)];
    return random;
}

export function facingToYaw(facing = 0) {
    return -THREE.MathUtils.degToRad(facing);
}

// Unit direction along the ground for a facing (x, z)
export function facingDirection(facing = 0, target = new THREE.Vector2()) {
    const angle = THREE.MathUtils.degToRad(facing);
    return target.set(Math.sin(angle), -Math.cos(angle));
}

// Where to stand to look at something at (x, z) whose front faces `facing`: `distance` metres out
// in front of it, turned back toward it. Returns { x, z, yaw }.
export function standBefore(x, z, facing = 0, distance = 2) {
    const angle = THREE.MathUtils.degToRad(facing);
    return { x: x + Math.sin(angle) * distance, z: z - Math.cos(angle) * distance, yaw: facingToYaw(facing + 180) };
}

// A point given in the own space of an object at (x, z) turned by rotation.y = yaw, in the world
export function toWorld(localX, localZ, x, z, yaw) {
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    return { x: x + localX * cos + localZ * sin, z: z - localX * sin + localZ * cos };
}

export function color(value) {
    return value instanceof THREE.Color ? value : new THREE.Color(value);
}

// One world's materials, made once and shared by every piece that asks for the same key. They
// belong to the world and are freed with it (see disposeObject).
export class Materials {
    constructor() {
        this.cache = new Map();
    }

    get(key, create) {
        let material = this.cache.get(key);
        if (!material) {
            material = create();
            this.cache.set(key, material);
        }
        return material;
    }

    standard(key, options) {
        return this.get(key, () => new THREE.MeshStandardMaterial(options));
    }

    dispose() {
        this.cache.forEach(material => disposeMaterial(material));
        this.cache.clear();
    }
}

function disposeMaterial(material) {
    for (const value of Object.values(material)) {
        if (value?.isTexture) value.dispose();
    }
    if (material.uniforms) {
        for (const uniform of Object.values(material.uniforms)) {
            if (uniform?.value?.isTexture && !uniform.value.userData?.shared) uniform.value.dispose();
        }
    }
    material.dispose();
}

// Free everything under `root` on the GPU: geometries, materials and their textures. Things marked
// userData.shared (made once for the whole app) are left alone.
export function disposeObject(root) {
    const done = new Set();
    root.traverse(object => {
        if (object.userData.shared) return;
        const { geometry, material } = object;
        if (geometry && !done.has(geometry) && !geometry.userData?.shared) {
            done.add(geometry);
            geometry.dispose();
        }
        const materials = Array.isArray(material) ? material : material ? [material] : [];
        for (const item of materials) {
            if (done.has(item) || item.userData?.shared) continue;
            done.add(item);
            disposeMaterial(item);
        }
        object.dispose?.(); // InstancedMesh, lights with shadows, render targets of a mirror...
    });
}

// Let a material sway in the wind: vertices move more the higher they are above the object's own
// origin (so trunks stay planted and crowns move). time: { value } in seconds, shared and advanced by
// the world. strength: metres at `height`; speed: radians per second.
export function addWind(material, time, { strength = 0.15, height = 6, speed = 1.1 } = {}) {
    const uniforms = {
        windTime: time,
        windStrength: { value: strength },
        windHeight: { value: height },
        windSpeed: { value: speed }
    };
    material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                uniform float windTime;
                uniform float windStrength;
                uniform float windHeight;
                uniform float windSpeed;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                {
                    #ifdef USE_INSTANCING
                        vec3 windOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                    #else
                        vec3 windOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                    #endif
                    float windRise = max(0.0, position.y) / windHeight;
                    float windBend = windRise * windRise * windStrength;
                    float windPhase = windTime * windSpeed + windOrigin.x * 0.23 + windOrigin.z * 0.17;
                    float windGust = 0.65 + 0.35 * sin(windTime * 0.31 + windOrigin.x * 0.05);
                    transformed.x += sin(windPhase) * windBend * windGust;
                    transformed.z += cos(windPhase * 0.83 + 1.3) * windBend * windGust * 0.6;
                }`);
    };
    material.customProgramCacheKey = () => 'wind';
    return material;
}

// Merge what doesn't move under `root` into one mesh per material (a model of twenty small parts is
// then drawn in four or five calls instead of twenty). keep: objects something will move or change
// (a lid, a ring of light): each is left as it is, and a kept group's own parts are merged among
// themselves, so it still moves as one. Meshes stay where they were, in root's own space.
export function mergeStatic(root, keep = new Set()) {
    root.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const buckets = new Map(); // key -> { material, cast, receive, renderOrder, items: [{ mesh, geometry }] }
    const groups = [];
    const visit = object => {
        for (const child of [...object.children]) {
            if (keep.has(child)) {
                if (!child.isMesh) groups.push(child);
                continue;
            }
            if (child.isMesh && !child.isInstancedMesh && !Array.isArray(child.material) && child.visible && !child.userData.noMerge && child.children.length === 0) {
                const g = child.geometry;
                const signature = Object.keys(g.attributes).sort().join(',') + (g.index ? ':i' : ':n') + (Object.keys(g.morphAttributes).length ? ':m' : '');
                const key = `${child.material.uuid}|${child.castShadow}|${child.receiveShadow}|${child.renderOrder}|${signature}`;
                if (!buckets.has(key)) buckets.set(key, { material: child.material, cast: child.castShadow, receive: child.receiveShadow, renderOrder: child.renderOrder, items: [] });
                buckets.get(key).items.push(child);
            }
            visit(child);
        }
    };
    visit(root);
    for (const { material, cast, receive, renderOrder, items } of buckets.values()) {
        if (items.length < 2) continue;
        const geometries = items.map(mesh => mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)));
        const merged = mergeGeometries(geometries);
        geometries.forEach(geometry => geometry.dispose());
        if (!merged) continue;
        for (const mesh of items) {
            mesh.removeFromParent();
            if (!mesh.geometry.userData?.shared) mesh.geometry.dispose();
        }
        const mesh = new THREE.Mesh(merged, material);
        mesh.castShadow = cast;
        mesh.receiveShadow = receive;
        mesh.renderOrder = renderOrder;
        root.add(mesh);
    }
    groups.forEach(group => mergeStatic(group, keep));
    return root;
}

// Collects a piece's parts by material while it is being made, then merges each material's share
// into one mesh: a house of thirty boards and panels is drawn in five or six calls.
export class PieceBuilder {
    constructor() {
        this.parts = new Map(); // material -> [geometry]
    }

    // geometry: already placed in the piece's own space
    add(material, geometry) {
        if (!this.parts.has(material)) this.parts.set(material, []);
        this.parts.get(material).push(geometry.index ? geometry.toNonIndexed() : geometry);
        return this;
    }

    // A box of size (w, h, d) centred at (x, y, z), turned `yaw` radians about its own middle
    box(material, w, h, d, x, y, z, yaw = 0) {
        return this.add(material, new THREE.BoxGeometry(w, h, d).rotateY(yaw).translate(x, y, z));
    }

    // An upright cylinder standing on (x, y, z)
    cylinder(material, radiusTop, radiusBottom, height, x, y, z, segments = 8) {
        return this.add(material, new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments)
            .translate(x, y + height / 2, z));
    }

    // One mesh per material; materials with userData.noShadow neither cast nor receive shadows
    build({ castShadow = true, receiveShadow = true } = {}) {
        const group = new THREE.Group();
        this.parts.forEach((geometries, material) => {
            const merged = mergeGeometries(geometries);
            geometries.forEach(geometry => geometry.dispose());
            const mesh = new THREE.Mesh(merged, material);
            const shadows = !material.userData.noShadow;
            mesh.castShadow = castShadow && shadows;
            mesh.receiveShadow = receiveShadow && shadows;
            group.add(mesh);
        });
        this.parts.clear();
        return group;
    }
}
