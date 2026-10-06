// eastern.js - Architecture in an East Asian village style, generic and original: a gate of two
// pillars and a curved lintel, timber houses with paper screens lit from within, a temple hall with a
// two-tiered roof on a stone platform, stone lanterns, training posts, straw targets and banners.
// Nothing here belongs to any one story; an exhibition places these pieces with data.
//
// Each piece is (params, kit) => adds itself to the world (see src/museum/exhibition.js for `kit`).
// params: x, z, y (ground height there), yaw (from `facing`), scale, plus the piece's own options.
// A piece's front is its own -z (the way it faces). Pieces that change the ground under them (the
// temple's platform and stairs) say so with piece.areas(params), read before the ground is made.
import * as THREE from 'three';
import { PieceBuilder, toWorld, createRandom } from './kit.js';

// ---- Materials (one set per world) -----------------------------------------------------------

function shojiTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, 192);
    gradient.addColorStop(0, '#f5e6c8');
    gradient.addColorStop(1, '#e9cfa3');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 192);
    context.strokeStyle = '#3a2a1f';
    context.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
        context.beginPath();
        context.moveTo((i * 128) / 4, 0);
        context.lineTo((i * 128) / 4, 192);
        context.stroke();
    }
    for (let i = 1; i < 6; i++) {
        context.beginPath();
        context.moveTo(0, (i * 192) / 6);
        context.lineTo(128, (i * 192) / 6);
        context.stroke();
    }
    context.lineWidth = 10;
    context.strokeRect(0, 0, 128, 192);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function tileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 8;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 64, 0);
    gradient.addColorStop(0, '#4a4e58');
    gradient.addColorStop(0.45, '#6b707c');
    gradient.addColorStop(0.55, '#3b3e46');
    gradient.addColorStop(1, '#2a2c33');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 8);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

function materialsFor(kit, params = {}) {
    const m = kit.materials;
    const noShadow = material => {
        material.userData.noShadow = true;
        return material;
    };
    const lacquer = params.color ?? '#8a2a1d';
    return {
        wood: m.standard('wood', { color: '#4d3526', roughness: 0.85 }),
        woodDark: m.standard('wood-dark', { color: '#271b15', roughness: 0.8 }),
        lacquer: m.standard(`lacquer-${lacquer}`, { color: lacquer, roughness: 0.45 }),
        black: m.standard('lacquer-black', { color: '#141215', roughness: 0.35 }),
        stone: m.standard('stone', { color: '#6a6660', roughness: 0.95 }),
        stoneDark: m.standard('stone-dark', { color: '#4a4744', roughness: 0.95 }),
        plaster: m.standard('plaster', { color: '#c9bea9', roughness: 0.95 }),
        straw: m.standard('straw', { color: '#a38a58', roughness: 1 }),
        roof: m.get('roof-tiles', () => {
            const map = tileTexture();
            map.repeat.set(3, 1);
            return new THREE.MeshStandardMaterial({ map, roughness: 0.6, metalness: 0.15, side: THREE.DoubleSide });
        }),
        shoji: m.get('shoji', () => {
            const map = shojiTexture();
            return noShadow(new THREE.MeshStandardMaterial({
                map, emissiveMap: map, emissive: '#ffad5c', emissiveIntensity: 1.15, roughness: 0.9
            }));
        }),
        glow: m.get('lantern-glow', () => noShadow(new THREE.MeshStandardMaterial({
            color: '#ffdcaa', emissive: '#ff9d45', emissiveIntensity: 3.2, roughness: 0.8
        }))),
        interior: m.get('interior-glow', () => noShadow(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb76b').multiplyScalar(1.6) })))
    };
}

// ---- Shapes ----------------------------------------------------------------------------------

// A hip roof with gently hollowed slopes and upturned corners. Its eaves are at y = 0, the ridge
// along x at `height`. width, depth: at the eaves. Includes a fascia band along the eaves.
function hipRoof(width, depth, height, { sag = 0.1, lift = 0.32, segments = 8, fascia = 0.16 } = {}) {
    const hw = width / 2, hd = depth / 2, ridge = Math.max(0, hw - hd);
    const faces = [
        [[-hw, 0, hd], [hw, 0, hd], [-ridge, height, 0], [ridge, height, 0]],
        [[hw, 0, -hd], [-hw, 0, -hd], [ridge, height, 0], [-ridge, height, 0]],
        [[hw, 0, hd], [hw, 0, -hd], [ridge, height, 0], [ridge, height, 0]],
        [[-hw, 0, -hd], [-hw, 0, hd], [-ridge, height, 0], [-ridge, height, 0]]
    ];
    const positions = [];
    const uvs = [];
    const point = ([eaveA, eaveB, ridgeA, ridgeB], u, v) => {
        const e = eaveA.map((a, k) => a + (eaveB[k] - a) * u);
        const r = ridgeA.map((a, k) => a + (ridgeB[k] - a) * u);
        const p = e.map((a, k) => a + (r[k] - a) * v);
        p[1] += -sag * height * Math.sin(Math.PI * v) + lift * Math.abs(2 * u - 1) ** 3 * (1 - v) ** 2;
        return p;
    };
    faces.forEach(face => {
        const eaveLength = Math.hypot(face[1][0] - face[0][0], face[1][2] - face[0][2]);
        const slope = Math.hypot(height, Math.min(hw, hd));
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const u0 = i / segments, u1 = (i + 1) / segments, v0 = j / segments, v1 = (j + 1) / segments;
                const a = point(face, u0, v0), b = point(face, u1, v0), c = point(face, u1, v1), d = point(face, u0, v1);
                positions.push(...a, ...b, ...c, ...a, ...c, ...d);
                const uv = (u, v) => [u * eaveLength, v * slope];
                uvs.push(...uv(u0, v0), ...uv(u1, v0), ...uv(u1, v1), ...uv(u0, v0), ...uv(u1, v1), ...uv(u0, v1));
            }
            // The fascia under this stretch of eave
            const a = point(face, i / segments, 0), b = point(face, (i + 1) / segments, 0);
            const a2 = [a[0], a[1] - fascia, a[2]], b2 = [b[0], b[1] - fascia, b[2]];
            positions.push(...a2, ...b2, ...b, ...a2, ...b, ...a);
            uvs.push(0, 0, 0.1, 0, 0.1, 0.02, 0, 0, 0.1, 0.02, 0, 0.02);
        }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    return geometry;
}

// A lintel bent upward toward both ends, like the top beam of a gate
function curvedBeam(length, height, depth, rise) {
    const geometry = new THREE.BoxGeometry(length, height, depth, 24, 1, 1);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const t = position.getX(i) / (length / 2);
        position.setY(i, position.getY(i) + rise * t * t * t * t + rise * 0.3 * t * t);
    }
    geometry.computeVertexNormals();
    return geometry;
}

// A hanging paper lantern (glowing body, dark caps), hanging from (x, y, z) in the piece's space
function addPaperLantern(builder, materials, x, y, z, size = 1) {
    builder.add(materials.glow, new THREE.SphereGeometry(0.2 * size, 12, 10).scale(1, 1.3, 1).translate(x, y - 0.32 * size, z));
    builder.cylinder(materials.black, 0.1 * size, 0.1 * size, 0.06 * size, x, y - 0.06 * size, z);
    builder.cylinder(materials.black, 0.1 * size, 0.1 * size, 0.05 * size, x, y - 0.62 * size, z);
    builder.cylinder(materials.black, 0.01, 0.01, 0.06 * size, x, y - 0.06 * size, z, 4);
}

// The piece placed in the world: at (x, y, z), turned by yaw, scaled
function place(object, { x, y, z, yaw = 0, scale = 1 }) {
    object.position.set(x, y, z);
    object.rotation.y = yaw;
    object.scale.setScalar(scale);
    return object;
}

// Walls around a rectangle in the piece's own space (centre cx, cz; size w, d), as colliders
function addRectColliders(kit, params, cx, cz, w, d, { skip = null, thickness = 0.12 } = {}) {
    const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
    for (let i = 0; i < 4; i++) {
        if (skip?.(i)) continue;
        const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
        const a = toWorld((cx + ax) * params.scale, (cz + az) * params.scale, params.x, params.z, params.yaw);
        const b = toWorld((cx + bx) * params.scale, (cz + bz) * params.scale, params.x, params.z, params.yaw);
        kit.addCollider({ ax: a.x, az: a.z, bx: b.x, bz: b.z, radius: thickness });
    }
}

// ---- Pieces ----------------------------------------------------------------------------------

// A gate over a path: two pillars, a curved top lintel capped in black, a tie beam below.
// params: span (metres between pillars), height, color
export function gate(params, kit) {
    const materials = materialsFor(kit, params);
    const span = params.span ?? 4.6, height = params.height ?? 5.2;
    const b = new PieceBuilder();
    for (const side of [-1, 1]) {
        b.cylinder(materials.lacquer, 0.2, 0.24, height, side * span / 2, 0, 0, 14);
        b.cylinder(materials.black, 0.3, 0.32, 0.45, side * span / 2, -0.05, 0, 14);
    }
    const top = span + 2.6;
    b.add(materials.lacquer, curvedBeam(top, 0.32, 0.46, 0.38).translate(0, height + 0.05, 0));
    b.add(materials.black, curvedBeam(top + 0.3, 0.16, 0.6, 0.42).translate(0, height + 0.27, 0));
    b.box(materials.lacquer, span + 1.2, 0.24, 0.26, 0, height - 1.05, 0);
    b.box(materials.lacquer, 0.22, 1.0, 0.22, 0, height - 0.5, 0);
    b.box(materials.black, 0.62, 0.78, 0.08, 0, height - 0.5, 0.16);
    kit.add(place(b.build(), params));
    for (const side of [-1, 1]) {
        const p = toWorld(side * span / 2 * params.scale, 0, params.x, params.z, params.yaw);
        kit.addCollider({ x: p.x, z: p.z, radius: 0.28 * params.scale });
    }
}

// A timber house: a stone footing, plaster walls, paper screens lit from within, a tiled hip roof
// and paper lanterns at the door. params: width, depth, wallHeight, lanterns (true/false)
export function house(params, kit) {
    const materials = materialsFor(kit, params);
    const random = createRandom(Math.round((params.x * 31 + params.z * 17) * 10));
    const w = params.width ?? 6, d = params.depth ?? 5, h = params.wallHeight ?? 2.5, base = 0.42;
    const b = new PieceBuilder();
    b.box(materials.stone, w + 0.5, base, d + 0.5, 0, base / 2 - 0.1, 0);
    b.box(materials.plaster, w, h, d, 0, base + h / 2, 0);
    // Timber frame: corner posts, a beam along the top, a sill along the bottom
    for (const [px, pz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) {
        b.box(materials.woodDark, 0.2, h + 0.1, 0.2, px, base + h / 2, pz);
    }
    b.box(materials.woodDark, w + 0.24, 0.22, d + 0.24, 0, base + h - 0.05, 0);
    b.box(materials.woodDark, w + 0.12, 0.16, d + 0.12, 0, base + 0.08, 0);
    // Paper screens: a wide lit door at the front, windows along the sides
    const doorWidth = Math.min(w * 0.55, 2.8);
    b.add(materials.shoji, new THREE.PlaneGeometry(doorWidth, h - 0.45).rotateY(Math.PI).translate(0, base + (h - 0.45) / 2 + 0.12, -d / 2 - 0.012));
    for (const side of [-1, 1]) {
        const windows = Math.max(1, Math.floor(d / 2.2));
        for (let i = 0; i < windows; i++) {
            const wz = -d / 2 + (d / windows) * (i + 0.5);
            b.add(materials.shoji, new THREE.PlaneGeometry(1.1, 0.95).rotateY(side * Math.PI / 2)
                .translate(side * (w / 2 + 0.012), base + h * 0.58, wz));
        }
        b.box(materials.woodDark, 0.12, h - 0.2, 0.14, side * doorWidth / 2, base + h / 2, -d / 2 - 0.04);
    }
    // A step up to the door
    b.box(materials.stoneDark, doorWidth + 0.6, 0.18, 0.6, 0, 0.05, -d / 2 - 0.55);
    // The roof
    const overhang = 0.85;
    b.add(materials.roof, hipRoof(w + overhang * 2, d + overhang * 2, (params.roofHeight ?? 1.9), { lift: 0.3 })
        .translate(0, base + h + 0.08, 0));
    b.box(materials.black, Math.max(0.6, w - d) + 0.5, 0.2, 0.28, 0, base + h + 0.08 + (params.roofHeight ?? 1.9) - 0.05, 0);
    if (params.lanterns !== false) {
        for (const side of [-1, 1]) {
            addPaperLantern(b, materials, side * (doorWidth / 2 + 0.55), base + h + 0.02, -d / 2 - overhang * 0.6, 0.9 + random() * 0.15);
        }
    }
    const object = kit.add(place(b.build(), params));
    kit.addSolid(object);
    addRectColliders(kit, params, 0, 0, w + 0.5, d + 0.5);
}
house.clearance = 5; // Metres kept clear of trees and plants around it

// The temple: a stone platform with stairs at the front, and on it a hall with vermilion posts, lit
// paper doors (the middle ones open on a warm interior) and a two-tiered roof.
// params: platform: [width, depth], elevation (ground level at its foot), height (of the platform),
// hall: [width, depth], stairs: [width, depth], color
export function temple(params, kit) {
    const materials = materialsFor(kit, params);
    const [pw, pd] = params.platform ?? [16, 12];
    const ph = params.height ?? 1.2;
    const [hw, hd] = params.hall ?? [9.5, 6.5];
    const [sw, sd] = params.stairs ?? [5, 3];
    const lift = (params.elevation ?? 0) - params.y; // The piece stands at params.y; build from the elevation
    const b = new PieceBuilder();

    // Platform and stairs (front: -z)
    b.box(materials.stone, pw, ph + 0.6, pd, 0, lift + (ph - 0.6) / 2, 0);
    b.box(materials.stoneDark, pw + 0.2, 0.12, pd + 0.2, 0, lift + ph - 0.04, 0);
    const steps = Math.max(3, Math.round(ph / 0.15));
    for (let i = 0; i < steps; i++) {
        const rise = (ph / steps) * (i + 1);
        const run = sd * (1 - i / steps);
        b.box(materials.stone, sw, rise, run, 0, lift + rise / 2, -pd / 2 - run / 2);
    }
    for (const side of [-1, 1]) {
        b.box(materials.stoneDark, 0.35, ph + 0.15, sd, side * (sw / 2 + 0.17), lift + (ph + 0.15) / 2 - 0.05, -pd / 2 - sd / 2);
    }

    // The hall, set toward the back so a porch opens in front of it
    const floor = lift + ph;
    const hallZ = pd / 2 - hd / 2 - 1.2;
    const wall = 3.6;
    // Back and side walls; the front is all paper doors, so the hall is open inside
    b.box(materials.plaster, hw, wall, 0.2, 0, floor + wall / 2, hallZ + hd / 2 - 0.1);
    for (const side of [-1, 1]) b.box(materials.plaster, 0.2, wall, hd, side * (hw / 2 - 0.1), floor + wall / 2, hallZ);
    // Inside: warm light on the back wall, an altar and a round bronze mirror against it
    b.add(materials.interior, new THREE.PlaneGeometry(hw - 0.5, wall - 0.3).rotateY(Math.PI)
        .translate(0, floor + (wall - 0.3) / 2, hallZ + hd / 2 - 0.21));
    b.box(materials.woodDark, 2.4, 0.95, 0.8, 0, floor + 0.475, hallZ + hd / 2 - 0.8);
    b.add(materials.black, new THREE.CylinderGeometry(0.6, 0.6, 0.06, 32).rotateX(Math.PI / 2).translate(0, floor + 2.1, hallZ + hd / 2 - 0.3));
    b.box(materials.wood, hw - 0.4, 0.05, hd - 0.4, 0, floor + 0.025, hallZ);
    const posts = 6;
    for (let i = 0; i < posts; i++) {
        const px = -hw / 2 + (hw / (posts - 1)) * i;
        b.cylinder(materials.lacquer, 0.16, 0.18, wall + 0.2, px, floor, hallZ - hd / 2 - 0.05, 12);
        b.cylinder(materials.lacquer, 0.16, 0.18, wall + 0.2, px, floor, hallZ + hd / 2 + 0.05, 12);
    }
    b.box(materials.lacquer, hw + 0.5, 0.3, hd + 0.5, 0, floor + wall + 0.05, hallZ);
    // Paper doors between the front posts; the middle two open onto the glowing interior
    const bay = hw / (posts - 1);
    for (let i = 0; i < posts - 1; i++) {
        const cx = -hw / 2 + bay * (i + 0.5);
        const middle = i === 2;
        const front = hallZ - hd / 2 - 0.02;
        if (middle) {
            b.box(materials.woodDark, bay, 0.08, 0.5, cx, floor + 0.04, front - 0.2); // The threshold
        } else {
            b.add(materials.shoji, new THREE.PlaneGeometry(bay - 0.3, wall - 0.5).rotateY(Math.PI).translate(cx, floor + (wall - 0.5) / 2, front));
            b.add(materials.shoji, new THREE.PlaneGeometry(bay - 0.3, wall - 0.5).translate(cx, floor + (wall - 0.5) / 2, front));
        }
    }
    // Two-tiered roof
    const lower = 2.3;
    b.add(materials.roof, hipRoof(hw + 3, hd + 3, lower, { lift: 0.55, sag: 0.14 }).translate(0, floor + wall + 0.2, hallZ));
    const upperWall = 1.3, uw = hw * 0.62, ud = hd * 0.62;
    b.box(materials.lacquer, uw, upperWall, ud, 0, floor + wall + lower * 0.55 + upperWall / 2, hallZ);
    b.box(materials.shoji, uw * 0.7, upperWall * 0.55, 0.05, 0, floor + wall + lower * 0.55 + upperWall / 2, hallZ - ud / 2 - 0.03);
    const upperBase = floor + wall + lower * 0.55 + upperWall;
    b.add(materials.roof, hipRoof(uw + 2.4, ud + 2.4, 2.1, { lift: 0.5, sag: 0.14 }).translate(0, upperBase, hallZ));
    b.box(materials.black, uw - ud + 1.6, 0.26, 0.34, 0, upperBase + 2.05, hallZ);
    // Lanterns hanging from the lower eaves
    for (const side of [-1, 1]) {
        addPaperLantern(b, materials, side * (hw / 2 - 0.6), floor + wall + 0.1, hallZ - hd / 2 - 1.1, 1.15);
    }

    const object = kit.add(place(b.build(), params));
    kit.addSolid(object);

    // Colliders: the platform's edge (open where the stairs are), the stairs' sides and the hall
    const s = params.scale;
    const toW = (lx, lz) => toWorld(lx * s, lz * s, params.x, params.z, params.yaw);
    const wallBetween = (a, b2) => {
        const p = toW(...a), q = toW(...b2);
        kit.addCollider({ ax: p.x, az: p.z, bx: q.x, bz: q.z, radius: 0.12 });
    };
    wallBetween([-pw / 2, -pd / 2], [-sw / 2 - 0.3, -pd / 2]);
    wallBetween([sw / 2 + 0.3, -pd / 2], [pw / 2, -pd / 2]);
    wallBetween([pw / 2, -pd / 2], [pw / 2, pd / 2]);
    wallBetween([pw / 2, pd / 2], [-pw / 2, pd / 2]);
    wallBetween([-pw / 2, pd / 2], [-pw / 2, -pd / 2]);
    for (const side of [-1, 1]) wallBetween([side * (sw / 2 + 0.2), -pd / 2], [side * (sw / 2 + 0.2), -pd / 2 - sd]);
    addRectColliders(kit, params, 0, hallZ, hw + 0.3, hd + 0.3);
}

temple.clearance = 3;
gate.clearance = 2;

// The ground under the temple: its platform, and its stairs rising from the front
temple.areas = params => {
    const [pw, pd] = params.platform ?? [16, 12];
    const ph = params.height ?? 1.2;
    const [sw, sd] = params.stairs ?? [5, 3];
    const elevation = params.elevation ?? 0;
    const facing = params.facing ?? 0;
    const front = toWorld(0, -(pd / 2 + sd / 2) * (params.scale ?? 1), params.x, params.z, params.yaw);
    return [
        { shape: 'rect', at: [params.x, params.z], size: [pw, pd], facing, height: elevation + ph, blend: 0, surface: 'stone', sink: 0.25, paint: false },
        { shape: 'rect', at: [front.x, front.z], size: [sw, sd], facing, ramp: { from: elevation, to: elevation + ph }, blend: 0, surface: 'stone', sink: 0.3, paint: false }
    ];
};

// A stone lantern: footing, post, firebox glowing through its windows, a roof and a finial.
// params: light: { intensity, distance } to also cast real light (use sparingly), size
export function stoneLantern(params, kit) {
    const materials = materialsFor(kit, params);
    const b = new PieceBuilder();
    b.cylinder(materials.stone, 0.32, 0.36, 0.22, 0, -0.05, 0, 6);
    b.cylinder(materials.stone, 0.12, 0.15, 0.75, 0, 0.17, 0, 8);
    b.cylinder(materials.stone, 0.3, 0.22, 0.14, 0, 0.92, 0, 6);
    b.cylinder(materials.glow, 0.17, 0.17, 0.3, 0, 1.06, 0, 6);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        b.box(materials.stone, 0.05, 0.3, 0.05, Math.cos(a) * 0.2, 1.21, Math.sin(a) * 0.2);
    }
    b.add(materials.stone, new THREE.ConeGeometry(0.46, 0.32, 6).translate(0, 1.52, 0));
    b.add(materials.stone, new THREE.SphereGeometry(0.08, 8, 6).translate(0, 1.72, 0));
    kit.add(place(b.build(), params));
    kit.addCollider({ x: params.x, z: params.z, radius: 0.32 * params.scale });
    if (params.light) {
        const light = new THREE.PointLight(params.light.color ?? '#ffa552', params.light.intensity ?? 6, params.light.distance ?? 9, 2);
        light.position.set(params.x, params.y + 1.15 * params.scale, params.z);
        kit.add(light);
    }
}

// A training post: a timber post with a straw-wrapped striking pad. params: height
stoneLantern.clearance = 0.8;

export function trainingPost(params, kit) {
    const materials = materialsFor(kit, params);
    const h = params.height ?? 1.7;
    const b = new PieceBuilder();
    b.box(materials.wood, 0.16, h, 0.12, 0, h / 2 - 0.2, 0);
    b.box(materials.straw, 0.2, 0.42, 0.16, 0, h - 0.45, -0.02);
    for (let i = 0; i < 4; i++) b.box(materials.woodDark, 0.215, 0.025, 0.17, 0, h - 0.62 + i * 0.11, -0.02);
    kit.add(place(b.build(), params));
    kit.addCollider({ x: params.x, z: params.z, radius: 0.15 * params.scale });
}

trainingPost.clearance = 0.8;

function targetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d');
    const rings = ['#cdb88a', '#2a2420', '#cdb88a', '#8f2a1f', '#cdb88a', '#2a2420'];
    rings.forEach((ring, i) => {
        context.fillStyle = ring;
        context.beginPath();
        context.arc(64, 64, 64 - i * 10, 0, Math.PI * 2);
        context.fill();
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

// A four-pointed throwing star, flat on its own xy plane
function throwingStar(size) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? size : size * 0.28;
        if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: false });
}

// A straw target on a timber stand, a few throwing stars in it
export function target(params, kit) {
    const materials = materialsFor(kit, params);
    const face = kit.materials.get('target-face', () => new THREE.MeshStandardMaterial({ map: targetTexture(), roughness: 1 }));
    const metal = kit.materials.standard('steel', { color: '#9aa0a8', roughness: 0.3, metalness: 0.9 });
    const random = createRandom(Math.round(params.x * 13 + params.z * 7));
    const b = new PieceBuilder();
    for (const side of [-1, 1]) {
        b.add(materials.wood, new THREE.BoxGeometry(0.09, 1.8, 0.09).rotateX(side * 0.18).translate(0, 0.85, side * 0.16));
    }
    b.add(materials.straw, new THREE.CylinderGeometry(0.55, 0.55, 0.16, 24).rotateX(Math.PI / 2).translate(0, 1.25, -0.2));
    b.add(face, new THREE.CircleGeometry(0.53, 24).rotateY(Math.PI).translate(0, 1.25, -0.285));
    for (let i = 0; i < 3; i++) {
        const a = random() * Math.PI * 2, r = random() * 0.32;
        b.add(metal, throwingStar(0.07).rotateZ(random() * Math.PI).rotateY(random.range(-0.4, 0.4))
            .translate(Math.cos(a) * r, 1.25 + Math.sin(a) * r, -0.31));
    }
    kit.add(place(b.build(), params));
    kit.addCollider({ x: params.x, z: params.z, radius: 0.4 * params.scale });
}

target.clearance = 1.2;

function crestTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = color;
    context.fillRect(0, 0, 64, 256);
    context.fillStyle = 'rgba(255, 244, 225, 0.85)';
    // An original crest: a crescent over three peaks
    context.beginPath();
    context.arc(32, 48, 18, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = color;
    context.beginPath();
    context.arc(40, 42, 16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 244, 225, 0.85)';
    context.beginPath();
    context.moveTo(8, 100);
    context.lineTo(22, 78);
    context.lineTo(32, 92);
    context.lineTo(44, 72);
    context.lineTo(56, 100);
    context.closePath();
    context.fill();
    context.fillRect(10, 112, 44, 3);
    context.fillRect(10, 236, 44, 3);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

// A tall banner on a pole: a narrow cloth with an original crest. params: color, height
export function banner(params, kit) {
    const materials = materialsFor(kit, params);
    const color = params.color ?? '#6d1f1a';
    const cloth = kit.materials.get(`banner-${color}`, () => new THREE.MeshStandardMaterial({
        map: crestTexture(color), side: THREE.DoubleSide, roughness: 0.95
    }));
    const h = params.height ?? 4.2;
    const b = new PieceBuilder();
    b.cylinder(materials.woodDark, 0.04, 0.05, h, 0, -0.1, 0, 6);
    b.box(materials.woodDark, 0.75, 0.04, 0.04, 0.36, h - 0.25, 0);
    const clothGeometry = new THREE.PlaneGeometry(0.62, 2.4, 1, 8);
    const position = clothGeometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const y = position.getY(i);
        position.setZ(i, Math.sin(y * 1.8 + 0.6) * 0.06); // A soft ripple
    }
    clothGeometry.computeVertexNormals();
    b.add(cloth, clothGeometry.translate(0.37, h - 0.27 - 1.2, 0));
    kit.add(place(b.build(), params));
    kit.addCollider({ x: params.x, z: params.z, radius: 0.1 });
}
banner.clearance = 0.6;
