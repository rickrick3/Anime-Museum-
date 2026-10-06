// hall.js - A gallery hall for a universe of the sea: the inside of an enormous upturned hull. Its
// ribs arch overhead to a keel beam, its planking curves down to a dark plank floor with a runner
// along the middle, lanterns hang from the ribs, framed charts lean against the walls, and at the far
// end a row of tall stern windows looks out onto that world's evening sea. Original and generic.
//
// Piece 'hull-hall'. params: at (its middle), length, width, height, ribs (metres apart), colors:
// { wood, floor, runner, trim }, windows: { preview } (what the stern windows show; see
// portalSurface.js), lanterns: [[x, z, drop], ...] (hanging from the ribs; the first `lights` of
// them cast real light), charts: [[x, z, facing], ...], title / subtitle (over the entrance)
import * as THREE from 'three';
import { PieceBuilder } from './kit.js';
import { deckTexture, chartTexture } from './textures.js';
import { createText } from './text.js';
import { createPortalMaterial } from './portalSurface.js';

// The hull's section: walls nearly upright at the floor, curving in to the keel overhead
function section(width, height, steps = 36) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI;
        const x = (width / 2) * Math.cos(theta) * (1 - 0.08 * Math.sin(theta));
        const y = height * Math.pow(Math.sin(theta), 0.62);
        points.push(new THREE.Vector2(x, y));
    }
    return points;
}

// The planking: the section swept along the hall, facing inward
function skinGeometry(points, length) {
    const positions = [], uvs = [], indices = [];
    let arc = 0;
    points.forEach((p, i) => {
        if (i > 0) arc += p.distanceTo(points[i - 1]);
        for (const end of [-1, 1]) {
            positions.push(p.x, p.y, (end * length) / 2);
            uvs.push((end * length) / 4, arc / 2);
        }
    });
    for (let i = 0; i < points.length - 1; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        indices.push(a, b, c, b, d, c);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}

// An end wall: the section's outline filled, with arched window openings (holes)
function endWall(points, holes = []) {
    const shape = new THREE.Shape();
    points.forEach((p, i) => (i ? shape.lineTo(p.x, p.y) : shape.moveTo(p.x, p.y)));
    shape.closePath();
    for (const { x, y, width, height } of holes) {
        const hole = new THREE.Path();
        hole.moveTo(x - width / 2, y);
        hole.lineTo(x + width / 2, y);
        hole.lineTo(x + width / 2, y + height - width / 2);
        hole.absarc(x, y + height - width / 2, width / 2, 0, Math.PI, false);
        hole.lineTo(x - width / 2, y);
        shape.holes.push(hole);
    }
    return new THREE.ShapeGeometry(shape, 24);
}

export function hullHall(params, kit) {
    const length = params.length ?? 34, width = params.width ?? 13, height = params.height ?? 11;
    const [cx, cz] = params.at ?? [0, 0];
    const colors = { wood: '#3a2a1e', floor: '#4a3828', runner: '#1d2b44', trim: '#b08a4a', ...params.colors };
    const m = kit.materials;
    const plank = m.get('hall-planking', () => {
        const map = deckTexture({ color: colors.wood, planks: 8, seed: 12 });
        return new THREE.MeshStandardMaterial({ map, roughness: 0.75, side: THREE.DoubleSide });
    });
    const rib = m.standard('hall-rib', { color: '#2a1d14', roughness: 0.6 });
    const trim = m.standard('hall-trim', { color: colors.trim, roughness: 0.35, metalness: 0.85 });
    const floor = m.get('hall-floor', () => {
        const map = deckTexture({ color: colors.floor, planks: 10, seed: 3 });
        map.repeat.set(width / 4, length / 4);
        return new THREE.MeshStandardMaterial({ map, roughness: 0.42, metalness: 0.05 });
    });
    const runner = m.get('hall-runner', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.fillStyle = colors.runner;
        context.fillRect(0, 0, 64, 64);
        context.fillStyle = colors.trim;
        context.fillRect(3, 0, 3, 64);
        context.fillRect(58, 0, 3, 64);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, length / 2);
        return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 });
    });
    const points = section(width, height);
    const b = new PieceBuilder();

    // Floor and runner
    b.add(floor, new THREE.PlaneGeometry(width, length).rotateX(-Math.PI / 2));
    b.add(runner, new THREE.PlaneGeometry(2.6, length - 2).rotateX(-Math.PI / 2).translate(0, 0.004, 0));
    // The planking overhead, the ribs across it, the keel along its top, stringers along its sides
    b.add(plank, skinGeometry(points, length));
    const spacing = params.ribs ?? 2.6;
    const ribCurve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x * 0.975, p.y * 0.985, 0)));
    for (let z = -length / 2 + 0.6; z <= length / 2 - 0.5; z += spacing) {
        b.add(rib, new THREE.TubeGeometry(ribCurve, 40, 0.15, 5).translate(0, 0, z));
    }
    b.box(rib, 0.5, 0.4, length, 0, height - 0.32, 0);
    for (const theta of [0.32, 0.62, 2.52, 2.82]) {
        const i = Math.round((theta / Math.PI) * (points.length - 1));
        const p = points[i];
        b.box(rib, 0.16, 0.16, length, p.x * 0.96, p.y * 0.98, 0);
    }
    b.box(trim, width - 0.4, 0.05, 0.05, 0, 0.12, -length / 2 + 0.3);

    // The far end: tall stern windows onto the sea; the near end: the way back, under the title
    const windows = [-3.3, 0, 3.3].map(x => ({ x, y: 1.6, width: x === 0 ? 2.6 : 2.0, height: x === 0 ? 6.4 : 5.2 }));
    b.add(plank, endWall(points, windows).translate(0, 0, -length / 2));
    b.add(plank, endWall(points).rotateY(Math.PI).translate(0, 0, length / 2));
    for (const w of windows) {
        // Mullions and a sill
        b.box(rib, 0.08, w.height, 0.12, w.x, w.y + w.height / 2, -length / 2 + 0.05);
        for (let k = 1; k < 4; k++) b.box(rib, w.width, 0.06, 0.1, w.x, w.y + (w.height * k) / 4, -length / 2 + 0.05);
        b.box(trim, w.width + 0.3, 0.08, 0.35, w.x, w.y - 0.04, -length / 2 + 0.12);
    }
    const hall = b.build();
    hall.position.set(cx, 0, cz);
    kit.add(hall);

    // What the windows look out on
    windows.forEach(w => {
        const material = createPortalMaterial({ preview: { glow: 0, ...params.windows?.preview }, accent: '#000000', size: { width: w.width * 3, height: w.height * 1.6 } });
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(w.width, w.height), material);
        pane.position.set(cx + w.x, w.y + w.height / 2, cz - length / 2 - 0.02);
        kit.add(pane);
        kit.onUpdate((delta, elapsed) => { material.uniforms.time.value = elapsed; });
    });

    // Lanterns hanging from the ribs
    const tin = m.standard('hall-tin', { color: '#4a4640', roughness: 0.45, metalness: 0.7 });
    const glow = m.get('hall-lantern', () => {
        const material = new THREE.MeshStandardMaterial({ color: '#2a1a08', emissive: '#ffb45e', emissiveIntensity: 2.4 });
        material.userData.noShadow = true;
        return material;
    });
    const lanterns = new PieceBuilder();
    (params.lanterns ?? []).forEach(([x, z, drop = 4], i) => {
        // From the planking overhead: find its height above this x
        const above = points.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best), points[0]).y * 0.95;
        const y = above - drop;
        lanterns.add(tin, new THREE.CylinderGeometry(0.012, 0.012, drop, 4).translate(cx + x, y + drop / 2, cz + z));
        lanterns.add(tin, new THREE.ConeGeometry(0.2, 0.18, 8).translate(cx + x, y + 0.02, cz + z));
        lanterns.add(glow, new THREE.CylinderGeometry(0.15, 0.13, 0.36, 8).translate(cx + x, y - 0.25, cz + z));
        lanterns.add(tin, new THREE.CylinderGeometry(0.17, 0.17, 0.04, 8).translate(cx + x, y - 0.45, cz + z));
        if (i < (params.lights ?? 4)) {
            const light = new THREE.PointLight('#ffb067', params.lightIntensity ?? 9, 13, 1.6);
            light.position.set(cx + x, y - 0.4, cz + z);
            kit.add(light);
        }
    });
    kit.add(lanterns.build({ castShadow: false }));

    // Framed charts leaning on the walls
    (params.charts ?? []).forEach(([x, z, facing], i) => {
        const map = chartTexture({ islands: [{ at: [-0.2, 0.1], size: 0.25, seed: i + 3 }, { at: [0.4, -0.3], size: 0.12, seed: i + 9 }], seed: i + 2, size: 512 });
        const frame = new PieceBuilder();
        frame.box(rib, 1.5, 1.1, 0.06, 0, 0, 0);
        frame.add(new THREE.MeshStandardMaterial({ map, roughness: 0.9 }), new THREE.PlaneGeometry(1.36, 0.96).rotateY(Math.PI).translate(0, 0, -0.035));
        const object = frame.build();
        object.position.set(cx + x, 1.75, cz + z);
        object.rotation.y = -THREE.MathUtils.degToRad(facing);
        object.rotation.x = -0.06;
        kit.add(object);
    });

    // The universe's name over the entrance, read as you turn to leave
    if (params.title) {
        const title = createText([
            { text: params.title.toUpperCase(), size: 1, weight: 300, spacing: 0.32, color: '#f4ead6' },
            ...(params.subtitle ? [{ text: params.subtitle, font: 'serif', italic: true, size: 0.42, color: '#c9b89a', gap: 0.5 }] : [])
        ], { size: 0.42, intensity: 1.4 });
        title.position.set(cx, 8.7, cz + length / 2 - 0.1);
        title.rotation.y = Math.PI;
        kit.add(title);
    }

    // Walls: the planking at the floor, and both ends
    const halfWidth = width / 2 - 0.45, halfLength = length / 2 - 0.35;
    kit.addCollider({ ax: cx - halfWidth, az: cz - halfLength, bx: cx - halfWidth, bz: cz + halfLength, radius: 0.15 });
    kit.addCollider({ ax: cx + halfWidth, az: cz - halfLength, bx: cx + halfWidth, bz: cz + halfLength, radius: 0.15 });
    kit.addCollider({ ax: cx - halfWidth, az: cz - halfLength, bx: cx + halfWidth, bz: cz - halfLength, radius: 0.15 });
    kit.addCollider({ ax: cx - halfWidth, az: cz + halfLength, bx: cx + halfWidth, bz: cz + halfLength, radius: 0.15 });
}
hullHall.takesPositions = true;
