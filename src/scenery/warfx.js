// warfx.js - The marks of a battle fought with impossible powers, for a legendary moment held still:
// a sea frozen into a white plain, tidal waves frozen as they broke, burning stones hanging in the
// air, cracks of light in the sky itself, beams of light caught mid-flight. Original and generic: a
// content pack places them and gives them colours; it decides what they mean.
//
//   pieces  'ice-sheet'   { center, radius, level, color }                 the frozen sea, glassy and cracked
//           'ice-waves'   { center, radius, from, to (facings), height, curl, level }  breaking waves turned to ice
//           'meteors'     { positions: [[x, y, z, size], ...], color, name } burning stones with trails, held in the air
//           'fracture'    { at: [x, y, z], facing, radius, branches, color, name }  a crack of light in the air
//           'beams'       { beams: [[[x, y, z], [x, y, z]], ...], color, radius, name }  light caught mid-flight
import * as THREE from 'three';
import { PieceBuilder, createRandom } from './kit.js';
import { canvasTexture } from './textures.js';

const additive = (color, intensity = 2.4, opacity = 1) => {
    const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity), transparent: opacity < 1, opacity, depthWrite: false, blending: THREE.AdditiveBlending
    });
    material.userData.noShadow = true;
    return material;
};

// ---- The frozen sea ---------------------------------------------------------------------------------

function crackTexture(seed) {
    const random = createRandom(seed);
    return canvasTexture(1024, 1024, (context, width, height) => {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        // Pale drifts, then cracks running out from a few points, branching
        for (let i = 0; i < 90; i++) {
            context.fillStyle = `rgba(160, 200, 225, ${random() * 0.12})`;
            context.beginPath();
            context.ellipse(random() * width, random() * height, 30 + random() * 120, 10 + random() * 40, random() * Math.PI, 0, Math.PI * 2);
            context.fill();
        }
        context.strokeStyle = 'rgba(70, 120, 150, 0.55)';
        const crack = (x, y, angle, length, depth) => {
            context.lineWidth = Math.max(0.6, depth * 1.3);
            context.beginPath();
            context.moveTo(x, y);
            for (let s = 0; s < length; s++) {
                angle += (random() - 0.5) * 0.7;
                x += Math.cos(angle) * 14;
                y += Math.sin(angle) * 14;
                context.lineTo(x, y);
                if (depth > 0 && random() < 0.08) crack(x, y, angle + (random() - 0.5) * 2, length * 0.5, depth - 1);
            }
            context.stroke();
        };
        for (let i = 0; i < 12; i++) crack(random() * width, random() * height, random() * Math.PI * 2, 30 + random() * 40, 2);
    }, { repeat: true });
}

export function iceSheet(params, kit) {
    const radius = params.radius ?? 40;
    const map = crackTexture(params.seed ?? 5);
    map.repeat.set(radius / 10, radius / 10);
    const material = kit.materials.get('ice-sheet', () => new THREE.MeshStandardMaterial({
        color: params.color ?? '#d7ebf5', map, roughness: 0.16, metalness: 0.0, envMapIntensity: 1.3
    }));
    const geometry = params.size
        ? new THREE.PlaneGeometry(params.size[0], params.size[1]).rotateX(-Math.PI / 2)
        : new THREE.CircleGeometry(radius, 96).rotateX(-Math.PI / 2);
    const [cx, cz] = params.center ?? [0, 0];
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(cx, params.level ?? 0, cz);
    mesh.receiveShadow = true;
    kit.add(mesh);
}
iceSheet.takesPositions = true;

// ---- Waves frozen as they broke ----------------------------------------------------------------------

export function iceWaves(params, kit) {
    const random = createRandom(params.seed ?? 7);
    const { center = [0, 0], radius = 40, from = -60, to = 60, height = 16, curl = 6, level = 0, thickness = 2.5 } = params;
    const material = kit.materials.get('ice-wave', () => new THREE.MeshStandardMaterial({
        color: params.color ?? '#bfe2f0', roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.88,
        emissive: '#5a9ab8', emissiveIntensity: 0.18, side: THREE.DoubleSide, envMapIntensity: 1.4
    }));
    // A section of the wave: from the sea floor up its face, over its lip, curling forward; swept along an arc
    const profile = [];
    for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const y = level + height * Math.sin(t * Math.PI * 0.55) ** 1.2;
        const forward = curl * Math.pow(t, 3);
        profile.push([forward - thickness * (1 - t), y]);
    }
    for (let i = 14; i >= 0; i--) {
        const [f, y] = profile[i];
        profile.push([f + thickness * 0.4 * (1 - i / 14) + 0.4, y - 0.5 * (i / 14)]);
    }
    const steps = Math.max(8, Math.round((to - from) / 2));
    const positions = [], indices = [];
    const swell = Array.from({ length: steps + 1 }, () => 0.8 + random() * 0.4);
    for (let s = 0; s <= steps; s++) {
        const facing = THREE.MathUtils.degToRad(from + (to - from) * (s / steps));
        const out = new THREE.Vector2(Math.sin(facing), -Math.cos(facing)); // From the centre outward
        const k = swell[s] * (1 - 0.6 * Math.pow(Math.abs(s / steps - 0.5) * 2, 4)); // Lower toward its ends
        for (const [f, y] of profile) {
            const r = radius - f; // The curl leans in toward the centre
            positions.push(center[0] + out.x * r, level + (y - level) * k, center[1] + out.y * r);
        }
    }
    const ring = profile.length;
    for (let s = 0; s < steps; s++) {
        for (let i = 0; i < ring - 1; i++) {
            const a = s * ring + i, b = a + 1, c = a + ring, d = c + 1;
            indices.push(a, c, b, b, c, d);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    kit.add(mesh);
    kit.addSolid(mesh);
    // Solid at its foot
    for (let s = 0; s < steps; s++) {
        const a = THREE.MathUtils.degToRad(from + (to - from) * (s / steps)), b = THREE.MathUtils.degToRad(from + (to - from) * ((s + 1) / steps));
        kit.addCollider({
            ax: center[0] + Math.sin(a) * (radius + thickness * 0.5), az: center[1] - Math.cos(a) * (radius + thickness * 0.5),
            bx: center[0] + Math.sin(b) * (radius + thickness * 0.5), bz: center[1] - Math.cos(b) * (radius + thickness * 0.5), radius: thickness * 0.6
        });
    }
}
iceWaves.takesPositions = true;

// ---- Burning stones held in the air ---------------------------------------------------------------------

export function meteors(params, kit) {
    const random = createRandom(params.seed ?? 3);
    const crust = kit.materials.standard('meteor-crust', { color: '#2a1610', roughness: 0.9, emissive: params.color ?? '#ff4a12', emissiveIntensity: 0.6 });
    const core = kit.materials.get('meteor-core', () => additive(params.color ?? '#ff6a2a', 2.6));
    const trail = kit.materials.get('meteor-trail', () => additive(params.trail ?? '#ff8a3a', 1.2, 0.35));
    const group = new THREE.Group();
    const b = new PieceBuilder();
    for (const [x, y, z, size = 2] of params.positions ?? []) {
        const rock = new THREE.IcosahedronGeometry(size, 1);
        const position = rock.attributes.position;
        for (let i = 0; i < position.count; i++) {
            const k = 0.8 + random() * 0.35;
            position.setXYZ(i, position.getX(i) * k, position.getY(i) * k, position.getZ(i) * k);
        }
        rock.computeVertexNormals();
        b.add(crust, rock.translate(x, y, z));
        b.add(core, new THREE.IcosahedronGeometry(size * 0.92, 1).translate(x, y, z));
        // Its trail, streaming up and back the way it came
        b.add(trail, new THREE.ConeGeometry(size * 0.95, size * 7, 12, 1, true).translate(0, -size * 3.5, 0).rotateX(Math.PI).rotateZ(params.lean ?? 0.35).translate(x, y + size * 0.4, z));
    }
    group.add(b.build({ castShadow: false }));
    kit.add(group);
    if (params.name) kit.named[params.name] = group;
}
meteors.takesPositions = true;

// ---- A crack of light in the air ---------------------------------------------------------------------------

export function fracture(params, kit) {
    const random = createRandom(params.seed ?? 11);
    const [x, y, z] = params.at ?? [0, 20, 0];
    const radius = params.radius ?? 14;
    const material = kit.materials.get(`fracture-${params.color ?? 'w'}`, () => additive(params.color ?? '#e6f4ff', 3));
    const halo = kit.materials.get(`fracture-halo-${params.color ?? 'w'}`, () => additive(params.color ?? '#e6f4ff', 0.6, 0.35));
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = -THREE.MathUtils.degToRad(params.facing ?? 0);
    const b = new PieceBuilder();
    const branch = (start, angle, length, width, depth) => {
        const points = [start.clone()];
        let p = start.clone();
        let a = angle;
        const segments = Math.max(3, Math.round(length / 1.2));
        for (let i = 0; i < segments; i++) {
            a += (random() - 0.5) * 0.9;
            p = p.clone().add(new THREE.Vector3(Math.cos(a), Math.sin(a), (random() - 0.5) * 0.3).multiplyScalar(length / segments));
            points.push(p);
            if (depth > 0 && random() < 0.3) branch(p, a + (random() - 0.5) * 1.6, length * 0.45, width * 0.6, depth - 1);
        }
        b.add(material, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1), segments * 3, width, 4));
    };
    const branches = params.branches ?? 9;
    for (let i = 0; i < branches; i++) branch(new THREE.Vector3(), (i / branches) * Math.PI * 2 + random() * 0.4, radius * (0.6 + random() * 0.5), 0.09, 2);
    b.add(halo, new THREE.SphereGeometry(radius * 0.18, 16, 12));
    b.add(material, new THREE.SphereGeometry(radius * 0.05, 12, 8));
    group.add(b.build({ castShadow: false }));
    kit.add(group);
    if (params.name) kit.named[params.name] = group;
}
fracture.takesPositions = true;

// ---- Light caught mid-flight --------------------------------------------------------------------------------

export function beams(params, kit) {
    const material = kit.materials.get(`beam-${params.color ?? 'y'}`, () => additive(params.color ?? '#fff2a0', 2.8));
    const glow = kit.materials.get(`beam-glow-${params.color ?? 'y'}`, () => additive(params.color ?? '#fff2a0', 0.5, 0.3));
    const b = new PieceBuilder();
    for (const [from, to] of params.beams ?? []) {
        const a = new THREE.Vector3(...from), c = new THREE.Vector3(...to);
        const length = a.distanceTo(c);
        const direction = c.clone().sub(a).normalize();
        const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        const middle = a.clone().lerp(c, 0.5);
        b.add(material, new THREE.CylinderGeometry(params.radius ?? 0.06, params.radius ?? 0.06, length, 6).applyQuaternion(turn).translate(middle.x, middle.y, middle.z));
        b.add(glow, new THREE.CylinderGeometry((params.radius ?? 0.06) * 5, (params.radius ?? 0.06) * 5, length, 8, 1, true).applyQuaternion(turn).translate(middle.x, middle.y, middle.z));
    }
    const object = b.build({ castShadow: false });
    kit.add(object);
    if (params.name) kit.named[params.name] = object;
}
beams.takesPositions = true;
