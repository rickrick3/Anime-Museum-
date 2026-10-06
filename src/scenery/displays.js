// displays.js - Small things a museum of a sea-going world shows: wanted posters on a notice board,
// an island in miniature, a treasure chest, a hat on a stand, a navigator's instrument, a scaffold in
// miniature, a flag on a little pole, a bay at war as a diorama, a bell. All original, built from
// primitives and painted canvases; a content pack names them and gives them its colours and words.
// Licensed models could take their place later under the same names (see catalog.js).
//
// Each model is (params, kit) => a Group whose origin sits on the ground (or on its pedestal) and whose
// front faces -z, with userData.parts naming what its behaviour moves (see src/museum/behaviors.js).
//
//   models  'wanted-poster' { entity | name, bounty, currency, heading, footer, figure, height }
//           'island-model' { style: 'tower' | 'palms' | 'peak' | 'ruins' | 'fortress', sand, green, accent }
//           'treasure-chest' { open, accent }       'hat-display' { hat: 'straw', colors }
//           'compass-instrument' { accent }          'mini-scaffold' { accent }
//           'mini-flag' { emblem }                   'bay-diorama' { accent, frozen }
//           'bell' { accent }
//   pieces  'notice-board' { width, height, roof }  a timber board for posters, on two posts
import * as THREE from 'three';
import { PieceBuilder } from './kit.js';
import { posterTexture, emblemTexture } from './textures.js';

const glowing = (color, intensity = 2.4) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) });
    material.userData.noShadow = true;
    return material;
};

function risingRing(accent, radius, y = 0.02) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.01, 6, 64).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false }));
    ring.position.y = y;
    return ring;
}

// ---- A wanted poster, pinned to a board ----------------------------------------------------------

// params: entity (a character: its name, bounty, figure), currency, heading, footer, height (of its
// middle above the ground), width
export function wantedPoster(params) {
    const entity = params.entity ?? {};
    const width = params.width ?? 0.62;
    const map = posterTexture({
        name: params.name ?? entity.name ?? '',
        bounty: params.bounty ?? entity.bounty ?? '',
        currency: params.currency ?? '',
        heading: params.heading ?? 'WANTED',
        footer: params.footer ?? '',
        figure: params.figure ?? entity.figure ?? {},
        seed: (entity.id ?? params.name ?? 'x').length * 13
    });
    const paper = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffe6b8', emissiveIntensity: 0.08, roughness: 0.95 });
    const group = new THREE.Group();
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 720 / 512, 4, 4), paper);
    // A little curl at the corners
    const position = sheet.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i);
        position.setZ(i, -Math.pow(Math.abs(x) / width * 2, 3) * Math.pow(Math.abs(y) / width, 2) * 0.02);
    }
    sheet.geometry.computeVertexNormals();
    sheet.rotation.y = Math.PI;
    sheet.position.set(0, params.height ?? 1.6, -0.01);
    group.add(sheet);
    group.userData.parts = { glows: [{ material: paper, base: 0.08, peak: 0.35 }] };
    return group;
}

// ---- A notice board on two posts, under a little roof ---------------------------------------------

// params: x, z, yaw, width, height (of the board), roof (true), color
export function noticeBoard(params, kit) {
    const width = params.width ?? 6, height = params.height ?? 2.6, bottom = params.bottom ?? 0.4;
    const m = kit.materials;
    const timber = m.standard('board-timber', { color: params.color ?? '#4a3424', roughness: 0.8 });
    const planks = m.standard('board-planks', { color: '#6b5038', roughness: 0.9 });
    const dark = m.standard('board-roof', { color: '#2c241e', roughness: 0.75 });
    const b = new PieceBuilder();
    b.box(planks, width, height, 0.08, 0, bottom + height / 2, 0.06);
    for (let y = bottom + 0.2; y < bottom + height; y += 0.3) b.box(timber, width, 0.012, 0.012, 0, y, 0.016); // Seams between the planks
    for (const side of [-1, 1]) b.box(timber, 0.16, bottom + height + 0.5, 0.16, side * (width / 2 + 0.06), (bottom + height + 0.5) / 2, 0.06);
    b.box(timber, width + 0.4, 0.12, 0.14, 0, bottom + height + 0.06, 0.04);
    b.box(timber, width + 0.4, 0.12, 0.14, 0, bottom - 0.06, 0.04);
    if (params.roof !== false) {
        const roof = new THREE.BoxGeometry(width + 0.9, 0.06, 0.9).rotateX(-0.32).translate(0, bottom + height + 0.62, 0.0);
        b.add(dark, roof);
    }
    const object = b.build();
    object.position.set(params.x, params.y ?? 0, params.z);
    object.rotation.y = params.yaw;
    kit.add(object);
    kit.addSolid(object);
    const half = width / 2 + 0.1;
    const a = { x: params.x + Math.cos(params.yaw) * -half, z: params.z - Math.sin(params.yaw) * -half };
    const c = { x: params.x + Math.cos(params.yaw) * half, z: params.z - Math.sin(params.yaw) * half };
    kit.addCollider({ ax: a.x, az: a.z, bx: c.x, bz: c.z, radius: 0.18 });
}

// ---- An island in miniature, on its own little sea ---------------------------------------------

// params: style ('tower' | 'palms' | 'peak' | 'ruins' | 'fortress'), sand, green, rock, accent, size
export function islandModel(params) {
    const size = params.size ?? 0.42;
    const group = new THREE.Group();
    const sea = new THREE.MeshStandardMaterial({ color: '#1d4a5a', roughness: 0.2, metalness: 0.1, emissive: '#0a2a34', emissiveIntensity: 0.4 });
    const sand = new THREE.MeshStandardMaterial({ color: params.sand ?? '#d8c08a', roughness: 0.9 });
    const green = new THREE.MeshStandardMaterial({ color: params.green ?? '#4f7a3a', roughness: 0.85 });
    const rock = new THREE.MeshStandardMaterial({ color: params.rock ?? '#77706a', roughness: 0.9 });
    const light = new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.6, emissive: params.accent ?? '#ffcf7a', emissiveIntensity: 0 });
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(size, size, 0.03, 40).translate(0, 0.015, 0), sea));
    const island = new THREE.SphereGeometry(size * 0.62, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.32, 0.8);
    group.add(new THREE.Mesh(island.translate(0, 0.02, 0), sand));
    group.add(new THREE.Mesh(new THREE.SphereGeometry(size * 0.45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 0.7).translate(-size * 0.05, 0.05, 0), green));
    const style = params.style ?? 'palms';
    if (style === 'tower' || style === 'fortress') {
        group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.28, 10).translate(0.05, 0.22, 0), light));
        group.add(new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.08, 10).translate(0.05, 0.4, 0), rock));
        if (style === 'fortress') {
            group.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.12).translate(-0.06, 0.13, 0.02), light));
            group.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08).translate(-0.06, 0.22, 0.02), light));
        }
    } else if (style === 'peak') {
        group.add(new THREE.Mesh(new THREE.ConeGeometry(size * 0.38, size * 0.9, 9).translate(0, size * 0.45 + 0.04, 0), rock));
    } else if (style === 'ruins') {
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.08 + (i % 3) * 0.06, 6).translate(Math.cos(a) * 0.1, 0.1, Math.sin(a) * 0.07), light));
        }
    } else {
        for (const [x, z, h] of [[-0.08, 0.02, 0.24], [0.06, -0.04, 0.2], [0.12, 0.05, 0.16]]) {
            group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, h, 5).rotateZ(0.15).translate(x, 0.06 + h / 2, z), rock));
            group.add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.04, 6).translate(x + 0.02, 0.07 + h, z), green));
        }
    }
    group.add(risingRing(params.accent ?? '#ffcf7a', size + 0.04));
    group.userData.parts = { ring: group.children[group.children.length - 1], glows: [{ material: light, base: 0, peak: 1.2 }, { material: sea, base: 0.4, peak: 1.2 }] };
    return group;
}

// ---- A treasure chest, its lid open on a glow of gold ---------------------------------------------

export function treasureChest(params) {
    const group = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: '#5a3820', roughness: 0.7 });
    const iron = new THREE.MeshStandardMaterial({ color: '#3a3836', roughness: 0.45, metalness: 0.8 });
    const gold = new THREE.MeshStandardMaterial({ color: '#d9a640', roughness: 0.3, metalness: 1, emissive: '#ffb84a', emissiveIntensity: 0.25 });
    const w = 0.5, d = 0.32, h = 0.24;
    group.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), wood));
    for (const x of [-0.18, 0.18]) group.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, h + 0.01, d + 0.01).translate(x, h / 2, 0), iron));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 0.04, d - 0.04).translate(0, h - 0.02, 0), gold));
    for (let i = 0; i < 9; i++) group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.008, 10).rotateX(0.4 * i).translate(-0.18 + (i % 5) * 0.09, h + 0.01 + (i % 2) * 0.012, -0.06 + Math.floor(i / 5) * 0.1), gold));
    const lid = new THREE.Group();
    lid.position.set(0, h, d / 2);
    lid.add(new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, w, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 0, -d / 2), wood));
    lid.rotation.x = params.open === false ? 0 : -1.9;
    group.add(lid);
    group.add(risingRing(params.accent ?? '#ffcf7a', 0.4));
    group.userData.parts = { ring: group.children[group.children.length - 1], glows: [{ material: gold, base: 0.25, peak: 1.4 }], moving: null };
    return group;
}

// ---- A hat on a stand -----------------------------------------------------------------------------

// params: hat ('straw' | 'tricorne' | 'top'), colors: { hat, band }
export function hatDisplay(params) {
    const group = new THREE.Group();
    const colors = { hat: '#e3c46a', band: '#a8231b', ...params.colors };
    const straw = new THREE.MeshStandardMaterial({ color: colors.hat, roughness: 0.85, emissive: colors.hat, emissiveIntensity: 0 });
    const band = new THREE.MeshStandardMaterial({ color: colors.band, roughness: 0.7 });
    const stand = new THREE.MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.4, metalness: 0.5 });
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.32, 10).translate(0, 0.16, 0), stand));
    const hat = new THREE.Group();
    hat.position.y = 0.34;
    hat.add(new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.3, 0.016, 32), straw));
    hat.add(new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.135, 0.11, 24).translate(0, 0.06, 0), straw));
    hat.add(new THREE.Mesh(new THREE.CylinderGeometry(0.137, 0.137, 0.038, 24).translate(0, 0.022, 0), band));
    hat.rotation.z = 0.08;
    group.add(hat);
    group.add(risingRing('#ffd98a', 0.36));
    group.userData.parts = { moving: hat, ring: group.children[group.children.length - 1], glows: [{ material: straw, base: 0, peak: 0.3 }] };
    return group;
}

// ---- A navigator's instrument: a glass globe on a wrist band, its needle trembling toward the next island

export function compassInstrument(params) {
    const group = new THREE.Group();
    const band = new THREE.MeshStandardMaterial({ color: '#6b4a2a', roughness: 0.6 });
    const brass = new THREE.MeshStandardMaterial({ color: '#c09550', roughness: 0.3, metalness: 0.9 });
    const glass = new THREE.MeshStandardMaterial({ color: '#d8f4ff', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const needle = new THREE.MeshStandardMaterial({ color: '#202022', emissive: params.accent ?? '#9fe8ff', emissiveIntensity: 0.3 });
    const moving = new THREE.Group();
    moving.position.y = 0.1;
    moving.add(new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 28).rotateX(Math.PI / 2), band));
    moving.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.03, 20).translate(0, 0.03, 0), brass));
    moving.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14).translate(0, 0.11, 0), glass));
    moving.add(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.1).translate(0, 0.11, 0), needle));
    group.add(moving);
    group.add(risingRing(params.accent ?? '#9fe8ff', 0.22));
    group.userData.parts = { moving, ring: group.children[group.children.length - 1], glows: [{ material: needle, base: 0.3, peak: 2 }] };
    return group;
}

// ---- A scaffold in miniature: a high platform on a stepped base, a stair up its front ------------------

export function miniScaffold(params) {
    const group = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: '#cfcac0', roughness: 0.8, emissive: params.accent ?? '#ffcf7a', emissiveIntensity: 0 });
    const timber = new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.8 });
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.3).translate(0, 0.03, 0), stone));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.14).translate(0, 0.23, 0.04), stone));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.18).translate(0, 0.41, 0.04), timber));
    for (let i = 0; i < 6; i++) group.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.055 * (i + 1), 0.03).translate(0, 0.0275 * (i + 1), -0.04 - i * 0.025), stone));
    for (const x of [-0.08, 0.08]) group.add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.012).translate(x, 0.5, 0.1), timber));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.012).translate(0, 0.58, 0.1), timber));
    group.add(risingRing(params.accent ?? '#ffcf7a', 0.3));
    group.userData.parts = { ring: group.children[group.children.length - 1], glows: [{ material: stone, base: 0, peak: 0.4 }] };
    return group;
}

// ---- A flag on a little pole -------------------------------------------------------------------------

// params: emblem (see emblems.js), height
export function miniFlag(params) {
    const group = new THREE.Group();
    const height = params.height ?? 0.6;
    const pole = new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.6 });
    const map = emblemTexture({ border: false, ...(params.emblem ?? params.entity?.emblem) });
    const cloth = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.05, side: THREE.DoubleSide, roughness: 0.85 });
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, height, 6).translate(0, height / 2, 0), pole));
    const flag = new THREE.PlaneGeometry(0.34, 0.24, 6, 2);
    const position = flag.attributes.position;
    for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin(position.getX(i) * 14) * 0.012);
    flag.computeVertexNormals();
    group.add(new THREE.Mesh(flag.translate(0.17, height - 0.13, 0).rotateY(Math.PI / 2 + 0.3), cloth));
    group.userData.parts = { glows: [{ material: cloth, base: 0.05, peak: 0.6 }] };
    return group;
}

// ---- A bay at war, in miniature: a crescent shore and its walls, a fortress, ships fast in a white sea, a crack of light over it

// params: accent, frozen (the bay iced over), size (radius)
export function bayDiorama(params) {
    const group = new THREE.Group();
    const r = params.size ?? 0.7;
    const base = new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.6, metalness: 0.3 });
    const land = new THREE.MeshStandardMaterial({ color: '#b9b2a4', roughness: 0.85 });
    const water = new THREE.MeshStandardMaterial({ color: params.frozen === false ? '#1d4a5a' : '#cfe6f2', roughness: 0.25, metalness: 0.1 });
    const wall = new THREE.MeshStandardMaterial({ color: '#4d5560', roughness: 0.5, metalness: 0.6 });
    const white = new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.6 });
    const navy = new THREE.MeshStandardMaterial({ color: '#1e2f55', roughness: 0.6 });
    const hull = new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.7 });
    const crack = glowing(params.accent ?? '#dff4ff', 2.2);
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(r + 0.05, r + 0.08, 0.08, 48).translate(0, 0.04, 0), base));
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 48).translate(0, 0.095, 0), water));
    // The shore: the back half of the disc is land, its edge a crescent of wall
    const shore = new THREE.CylinderGeometry(r, r, 0.07, 48, 1, false, -Math.PI / 2, Math.PI).translate(0, 0.115, 0);
    group.add(new THREE.Mesh(shore, land));
    const wallRing = new THREE.CylinderGeometry(r * 0.52, r * 0.52, 0.09, 40, 1, true, -Math.PI / 2, Math.PI).translate(0, 0.19, 0);
    group.add(new THREE.Mesh(wallRing, wall));
    // The fortress at the back of the plaza, and the scaffold before it
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.14).translate(0, 0.2, r * 0.78), white));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.1).translate(0, 0.29, r * 0.78), white));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.08).translate(0, 0.39, r * 0.78), white));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.02, 0.16).translate(0, 0.255, r * 0.78), navy));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.05).translate(0, 0.22, r * 0.6), white));
    // Ships fast in the bay, the largest at the front
    for (const [x, z, s, a] of [[0, -r * 0.45, 1.6, 0], [-0.24, -r * 0.3, 1, 0.3], [0.26, -r * 0.32, 1, -0.3], [-0.38, -r * 0.6, 0.9, 0.5], [0.4, -r * 0.62, 0.9, -0.4]]) {
        const ship = new THREE.Group();
        ship.position.set(x, 0.12, z);
        ship.rotation.y = a;
        ship.scale.setScalar(s);
        ship.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.16).translate(0, 0.015, 0), hull));
        ship.add(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 4).translate(0, 0.08, 0), hull));
        ship.add(new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.06).translate(0, 0.09, -0.01), white));
        group.add(ship);
    }
    // The crack of light hanging over the water
    const points = [];
    for (let i = 0; i < 7; i++) points.push(new THREE.Vector3((i % 2 ? 0.04 : -0.03) + i * 0.03 - 0.1, 0.5 - i * 0.05, -r * 0.3));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, 0.006, 4), crack));
    group.add(risingRing(params.accent ?? '#ffcf7a', r + 0.12, 0.1));
    group.userData.parts = { ring: group.children[group.children.length - 1], glows: [{ material: white, base: 0, peak: 0 }] };
    return group;
}

// ---- A bell, hung in a little frame --------------------------------------------------------------------

export function bell(params) {
    const group = new THREE.Group();
    const bronze = new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.35, metalness: 0.9, emissive: params.accent ?? '#ffcf7a', emissiveIntensity: 0 });
    const timber = new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.8 });
    for (const x of [-0.25, 0.25]) group.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04).translate(x, 0.3, 0), timber));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.06).translate(0, 0.6, 0), timber));
    const moving = new THREE.Group();
    moving.position.y = 0.58;
    moving.add(new THREE.Mesh(new THREE.LatheGeometry([[0.0, -0.3], [0.16, -0.3], [0.15, -0.26], [0.11, -0.12], [0.09, -0.02], [0.0, 0.0]].map(([r, y]) => new THREE.Vector2(r, y)), 20), bronze));
    group.add(moving);
    group.userData.parts = { moving, glows: [{ material: bronze, base: 0, peak: 0.5 }] };
    return group;
}
