// ground.js - The ground of an exhibition world, from data: gentle hills inside, rising slopes toward
// the edge (so the world ends in hillsides, not a cliff), paths that wind through it, and areas
// flattened into plazas, raised into platforms or sloped into stairs. It knows what each spot is
// made of (grass, earth, stone, wood...), for the footsteps and for its own colours.
//
//   size, segments    metres across, and how finely the mesh follows the heights
//   base              what the ground is where nothing else is said ('grass')
//   colors            { grass, grassDark, earth, stone, wood, ... }: CSS colours per surface
//   hills             { amplitude, scale, rimStart, rimEnd, rimHeight, seed }
//   paths             [{ points: [[x, z], ...], width, surface, smooth, flatten }]
//   areas             [{ shape: 'circle', at: [x, z], radius } or { shape: 'rect', at, size: [w, d], facing },
//                       with height (absolute, metres; leave out to keep the hills), surface, blend (metres
//                       of soft edge), ramp: { from, to } (a slope from the area's front to its back,
//                       e.g. stairs), sink (metres the mesh dips below the walking height, to hide under
//                       something built on top), paint (false: don't colour it), mesh (false: only for
//                       walking on; the drawn ground stays as it was, under something built there, like a stair)]
//
// heightAt(x, z) and surfaceAt(x, z) are cheap enough to call many times per frame.
import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

const smoothstep = THREE.MathUtils.smoothstep;
const lerp = THREE.MathUtils.lerp;

function preparePath(path) {
    let points = path.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    if (path.smooth !== false && points.length > 2) {
        const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
        points = curve.getPoints(points.length * 8);
    }
    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        segments.push({ ax: a.x, az: a.z, dx: b.x - a.x, dz: b.z - a.z, lengthSquared: (b.x - a.x) ** 2 + (b.z - a.z) ** 2 });
    }
    // A quick box test before measuring each segment
    const pad = path.width / 2 + (path.blend ?? 1.2);
    const xs = points.map(p => p.x), zs = points.map(p => p.z);
    return {
        ...path,
        half: path.width / 2,
        blend: path.blend ?? 1.2,
        flatten: path.flatten ?? 0.6,
        segments,
        box: { minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad, minZ: Math.min(...zs) - pad, maxZ: Math.max(...zs) + pad }
    };
}

function distanceToPath(path, x, z) {
    const { box } = path;
    if (x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) return Infinity;
    let best = Infinity;
    for (const s of path.segments) {
        const t = s.lengthSquared > 0 ? THREE.MathUtils.clamp(((x - s.ax) * s.dx + (z - s.az) * s.dz) / s.lengthSquared, 0, 1) : 0;
        const ex = x - (s.ax + s.dx * t), ez = z - (s.az + s.dz * t);
        best = Math.min(best, ex * ex + ez * ez);
    }
    return Math.sqrt(best);
}

function prepareArea(area) {
    const angle = THREE.MathUtils.degToRad(area.facing ?? 0);
    return { ...area, blend: area.blend ?? 1.5, cos: Math.cos(angle), sin: Math.sin(angle) };
}

// Local coordinates in a rect area (x across, z from its front (-) to its back (+)), front = the side
// its facing points to
function areaLocal(area, x, z) {
    const dx = x - area.at[0], dz = z - area.at[1];
    // Facing f points along (sin f, -cos f); its front edge is that way
    return { across: dx * area.cos + dz * area.sin, back: -(dx * area.sin - dz * area.cos) };
}

// Signed distance from the area's edge (negative inside)
function areaDistance(area, x, z) {
    if (area.shape === 'circle') return Math.hypot(x - area.at[0], z - area.at[1]) - area.radius;
    const { across, back } = areaLocal(area, x, z);
    return Math.max(Math.abs(across) - area.size[0] / 2, Math.abs(back) - area.size[1] / 2);
}

function areaHeight(area, x, z) {
    if (!area.ramp) return area.height;
    const { back } = areaLocal(area, x, z);
    const t = THREE.MathUtils.clamp(back / area.size[1] + 0.5, 0, 1); // 0 at the front edge, 1 at the back
    return lerp(area.ramp.from, area.ramp.to, t);
}

export function createGround({
    size = 140, segments = 140, base = 'grass', colors = {}, hills = {}, paths = [], areas = []
} = {}) {
    const noise = new ImprovedNoise();
    const seed = (hills.seed ?? 1) * 17.31;
    const amplitude = hills.amplitude ?? 0.35;
    const scale = hills.scale ?? 0.07;
    const rimStart = hills.rimStart ?? size * 0.32;
    const rimEnd = hills.rimEnd ?? size * 0.5;
    const rimHeight = hills.rimHeight ?? 8;
    const preparedPaths = paths.map(preparePath);
    const preparedAreas = areas.map(prepareArea);

    // The land before anything is made on it
    const natural = (x, z) => {
        let h = noise.noise(x * scale, seed, z * scale) * amplitude +
            noise.noise(x * scale * 2.9, seed + 3.7, z * scale * 2.9) * amplitude * 0.3;
        const rim = smoothstep(Math.hypot(x, z), rimStart, rimEnd);
        h += rim * rim * rimHeight * (0.75 + 0.5 * noise.noise(x * 0.035, seed + 9.1, z * 0.035));
        return h;
    };

    const pathWeight = (path, x, z) => {
        const d = distanceToPath(path, x, z);
        if (d === Infinity) return 0;
        return 1 - smoothstep(d, path.half, path.half + path.blend);
    };

    const areaWeight = (area, x, z) => {
        const d = areaDistance(area, x, z);
        if (area.blend <= 0) return d <= 0 ? 1 : 0;
        return 1 - smoothstep(d, 0, area.blend);
    };

    const heightAt = (x, z, drawn = false) => {
        let h = natural(x, z);
        for (const path of preparedPaths) {
            const w = pathWeight(path, x, z);
            if (w > 0) h = lerp(h, h * (1 - path.flatten), w);
        }
        for (const area of preparedAreas) {
            if (area.height === undefined && !area.ramp) continue;
            if (drawn && area.mesh === false) continue;
            const w = areaWeight(area, x, z);
            if (w > 0) h = lerp(h, areaHeight(area, x, z), w);
        }
        return h;
    };

    const surfaceAt = (x, z) => {
        for (let i = preparedAreas.length - 1; i >= 0; i--) {
            const area = preparedAreas[i];
            if (area.surface && areaDistance(area, x, z) <= 0) return area.surface;
        }
        for (const path of preparedPaths) {
            if (path.surface && distanceToPath(path, x, z) <= path.half) return path.surface;
        }
        return base;
    };

    // Whether (x, z) is open ground, at least `margin` metres from every path and area (for scattering
    // trees and plants)
    const isClear = (x, z, margin = 1) => {
        for (const path of preparedPaths) if (distanceToPath(path, x, z) < path.half + margin) return false;
        for (const area of preparedAreas) if (areaDistance(area, x, z) < margin) return false;
        return true;
    };

    // The mesh, coloured by what each spot is made of
    const palette = Object.fromEntries(Object.entries(colors).map(([key, value]) => [key, new THREE.Color(value)]));
    const fallback = new THREE.Color('#3a3a36');
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments).rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    const colorArray = new Float32Array(position.count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i);
        let y = heightAt(x, z, true);

        const baseColor = palette[base] ?? fallback;
        const dark = palette[`${base}Dark`] ?? baseColor;
        color.copy(baseColor).lerp(dark, THREE.MathUtils.clamp(0.5 + noise.noise(x * 0.18, seed + 5.5, z * 0.18) * 1.4, 0, 1));
        for (const path of preparedPaths) {
            // Worn paths have ragged edges
            const ragged = noise.noise(x * 0.9, seed + 1.3, z * 0.9) * 0.35;
            const d = distanceToPath(path, x, z) + ragged;
            const w = 1 - smoothstep(d, path.half - 0.2, path.half + 0.5);
            if (w > 0 && palette[path.surface]) color.lerp(palette[path.surface], w * 0.92);
        }
        for (const area of preparedAreas) {
            const d = areaDistance(area, x, z);
            const w = 1 - smoothstep(d, -0.2, Math.max(0.4, area.blend * 0.6));
            if (w > 0) {
                if (area.paint !== false && palette[area.surface]) color.lerp(palette[area.surface], w);
                if (area.sink) y -= area.sink * w;
            }
        }
        // Low hollows a little darker, the hillsides a little lighter
        color.multiplyScalar(0.92 + THREE.MathUtils.clamp(y * 0.02, -0.1, 0.12));
        position.setY(i, y);
        color.toArray(colorArray, i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.receiveShadow = true;

    return { mesh, heightAt: (x, z) => heightAt(x, z), surfaceAt, isClear, size };
}
