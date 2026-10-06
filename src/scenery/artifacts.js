// artifacts.js - The things exhibits are made of: a blade on its stand, a map table with a model of
// the valley, a board of carved plaques, a statue, a scroll on a lectern, the museum's guide. All
// built from primitives, original, and generic enough to stand for many stories; real, licensed
// models can replace them later (see src/museum/exhibit.js: an exhibit's `model`).
//
// Each model is (params, kit) => a Group whose origin sits on the ground (or on a pedestal) and
// whose front faces -z, with userData.parts naming what its behaviour moves (see behaviors.js):
//   moving    lifted and turned by 'lift'
//   glows     [{ material, base }] brightened by 'illuminate' and 'reveal'
//   markers   pins raised by 'reveal'
//   plaques   [{ material }] lit one by one by 'sequence'
//   paper, rollers   unrolled by 'unfold'
//   glows     also: [{ material, base, peak }] a glow 'illuminate' raises and lets fall
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createText } from './text.js';
import { createRandom } from './kit.js';

function emissiveMaterial(color, intensity = 0) {
    return new THREE.MeshStandardMaterial({ color: '#111111', emissive: color, emissiveIntensity: intensity, roughness: 0.6 });
}

// ---- The blade ------------------------------------------------------------------------------

function bladeShape(length, width) {
    // Side view of a gently curved single-edged blade, from the guard (x = 0) to the tip (x = length)
    const shape = new THREE.Shape();
    const curve = x => 0.04 * (x / length) ** 2; // It rises toward the tip
    shape.moveTo(0, -width / 2);
    for (let i = 1; i <= 12; i++) {
        const x = (i / 12) * length * 0.92;
        shape.lineTo(x, -width / 2 + curve(x) + (i === 12 ? width * 0.1 : 0));
    }
    shape.lineTo(length, curve(length) + width * 0.25);
    for (let i = 12; i >= 0; i--) {
        const x = (i / 12) * length * 0.9;
        shape.lineTo(x, width / 2 + curve(x) - (x / length) * width * 0.15);
    }
    return shape;
}

export function blade(params, kit) {
    const steel = new THREE.MeshStandardMaterial({ color: '#d7dde4', metalness: 1, roughness: 0.16, envMapIntensity: 1.4 });
    const dark = new THREE.MeshStandardMaterial({ color: params.handle ?? '#1d1a1f', roughness: 0.7 });
    const gold = new THREE.MeshStandardMaterial({ color: params.trim ?? '#b08a4a', metalness: 0.9, roughness: 0.35 });
    const lacquer = new THREE.MeshStandardMaterial({ color: '#0f0d10', roughness: 0.25, metalness: 0.1 });
    const group = new THREE.Group();

    // The stand: a lacquered base, two uprights with cradles
    const stand = new THREE.Group();
    stand.add(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.3).translate(0, 0.03, 0), lacquer));
    for (const side of [-1, 1]) {
        stand.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.1).translate(side * 0.3, 0.2, 0), lacquer));
        stand.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 0.12).translate(side * 0.3, 0.36, 0), gold));
    }
    group.add(stand);

    // The blade itself, resting in the cradles; it lifts and turns as a whole
    const moving = new THREE.Group();
    const length = 0.68;
    const edge = new THREE.Mesh(new THREE.ExtrudeGeometry(bladeShape(length, 0.032), {
        depth: 0.005, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1
    }).translate(0, 0, -0.0025), steel);
    edge.position.x = -0.18;
    moving.add(edge);
    moving.add(new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.008, 24).rotateZ(Math.PI / 2).translate(-0.18, 0, 0), gold));
    moving.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.022).translate(-0.31, 0, 0), dark));
    // The wrapping on the grip: small diamonds of gold thread
    for (let i = 0; i < 7; i++) {
        moving.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.009).scale(1.4, 1, 0.6).translate(-0.215 - i * 0.031, 0, 0.012), gold));
    }
    moving.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.034, 0.026).translate(-0.435, 0, 0), gold));
    moving.position.set(0.1, 0.395, 0);
    moving.traverse(part => { part.castShadow = true; });
    group.add(moving);

    group.userData.parts = { moving };
    return group;
}

// ---- The map table --------------------------------------------------------------------------

// A model of the world it stands in: the relief sampled from the real ground, paths and plazas in
// their colours, the buildings as small blocks, and a pin for every exhibit (raised by 'reveal')
export function villageMap(params, kit) {
    const wood = new THREE.MeshStandardMaterial({ color: '#4a3324', roughness: 0.8 });
    const group = new THREE.Group();
    const tableHeight = 0.82, width = 1.7, depth = 1.2;
    group.add(new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.07, depth + 0.12).translate(0, tableHeight, 0), wood));
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        group.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, tableHeight, 0.08).translate(x * (width / 2 - 0.05), tableHeight / 2, z * (depth / 2 - 0.05)), wood));
    }

    const extent = params.extent ?? 90; // Metres of the world shown across the table
    const scale = width / extent;
    const centre = params.center ?? [0, 0];
    const ground = kit.ground;
    const relief = new THREE.PlaneGeometry(width, depth, 60, 42).rotateX(-Math.PI / 2);
    const position = relief.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const palette = { grass: new THREE.Color('#4c6a3a'), earth: new THREE.Color('#a07850'), stone: new THREE.Color('#a8a29a'), wood: new THREE.Color('#7a5236') };
    const color = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
        const wx = centre[0] + position.getX(i) / scale;
        const wz = centre[1] + position.getZ(i) / scale;
        const h = ground ? ground.heightAt(wx, wz) : 0;
        position.setY(i, tableHeight + 0.04 + Math.min(h, 12) * scale * 1.8);
        color.copy(palette[ground?.surfaceAt(wx, wz)] ?? palette.grass).multiplyScalar(0.8 + Math.min(h, 10) * 0.03);
        color.toArray(colors, i * 3);
    }
    relief.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    relief.computeVertexNormals();
    group.add(new THREE.Mesh(relief, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })));

    // The buildings, as small blocks of pale wood
    const blocks = [];
    (kit.landmarks ?? []).forEach(({ piece, x, z, yaw }) => {
        const size = { house: [5, 2.5, 4.5], temple: [10, 4, 7], gate: [5, 3, 0.6] }[piece];
        if (!size) return;
        const lx = (x - centre[0]) * scale, lz = (z - centre[1]) * scale;
        if (Math.abs(lx) > width / 2 || Math.abs(lz) > depth / 2) return;
        const top = tableHeight + 0.04 + Math.min(ground ? ground.heightAt(x, z) : 0, 12) * scale * 1.8;
        blocks.push(new THREE.BoxGeometry(size[0] * scale, size[1] * scale * 1.8, size[2] * scale)
            .rotateY(yaw).translate(lx, top + size[1] * scale * 0.9, lz));
    });
    if (blocks.length) group.add(new THREE.Mesh(mergeGeometries(blocks), new THREE.MeshStandardMaterial({ color: '#d9c8a6', roughness: 0.8 })));

    // A pin for each exhibit; the one for this table is the "you are here"
    const markers = [];
    const glows = [];
    (kit.exhibitSpots ?? []).forEach(({ x, z, self }) => {
        const lx = (x - centre[0]) * scale, lz = (z - centre[1]) * scale;
        if (Math.abs(lx) > width / 2 || Math.abs(lz) > depth / 2) return;
        const top = tableHeight + 0.04 + Math.min(ground ? ground.heightAt(x, z) : 0, 12) * scale * 1.8;
        const material = emissiveMaterial(self ? '#ffffff' : params.accent ?? '#ffb36b', 0.4);
        const pin = new THREE.Group();
        pin.add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 6).translate(0, 0.045, 0), material));
        pin.add(new THREE.Mesh(new THREE.SphereGeometry(self ? 0.016 : 0.012, 12, 8).translate(0, 0.095, 0), material));
        pin.position.set(lx, top, lz);
        pin.userData.rest = top;
        pin.scale.y = 0.35;
        group.add(pin);
        markers.push(pin);
        glows.push({ material, base: 0.4 });
    });

    group.userData.parts = { markers, glows };
    return group;
}

// ---- The timeline board ----------------------------------------------------------------------

export function timelineBoard(params, kit) {
    const wood = new THREE.MeshStandardMaterial({ color: '#4d3526', roughness: 0.85 });
    const dark = new THREE.MeshStandardMaterial({ color: '#251a14', roughness: 0.8 });
    const count = params.count ?? 5;
    const width = Math.max(2.2, count * 0.42 + 0.4);
    const group = new THREE.Group();
    for (const side of [-1, 1]) {
        group.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 0.14).translate(side * (width / 2 + 0.05), 1.25, 0), dark));
    }
    group.add(new THREE.Mesh(new THREE.BoxGeometry(width, 1.05, 0.07).translate(0, 1.55, 0), wood));
    // A little roof to keep the rain off
    group.add(new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.06, 0.5).rotateX(-0.25).translate(0, 2.2, 0.08), dark));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, 0.06, 0.5).rotateX(0.25).translate(0, 2.2, -0.08), dark));

    // The plaques, each with its numeral, waiting to be lit in turn
    const plaques = [];
    for (let i = 0; i < count; i++) {
        const material = new THREE.MeshStandardMaterial({ color: '#a88a62', emissive: '#ffb066', emissiveIntensity: 0, roughness: 0.7 });
        const x = -width / 2 + 0.3 + (i * (width - 0.6)) / Math.max(1, count - 1);
        const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.025), material);
        plaque.position.set(x, 1.55, -0.05);
        group.add(plaque);
        const numeral = createText([{ text: String(i + 1), font: 'serif', weight: 400, color: '#2a1d14' }], { size: 0.16, padding: 0.05 });
        numeral.position.set(x, 1.58, -0.064);
        numeral.rotation.y = Math.PI;
        group.add(numeral);
        plaques.push({ material, mesh: plaque });
    }
    group.traverse(part => { if (part.isMesh) part.castShadow = true; });
    group.userData.parts = { plaques };
    return group;
}

// ---- The statue ------------------------------------------------------------------------------

// A hooded figure in a long cloak, a blade across the back, on a stone plinth
export function statue(params, kit) {
    // The bronze can glow from within, warmly, when the statue is illuminated
    const bronze = new THREE.MeshStandardMaterial({
        color: params.color ?? '#55665c', metalness: 0.55, roughness: 0.45, emissive: params.accent ?? '#ffcf8a', emissiveIntensity: 0
    });
    const stone = new THREE.MeshStandardMaterial({ color: '#5e5a55', roughness: 0.95 });
    const group = new THREE.Group();
    const plinth = 0.85;
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, plinth, 1.1).translate(0, plinth / 2, 0), stone));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 1.25).translate(0, 0.06, 0), stone));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.2).translate(0, plinth - 0.04, 0), stone));

    const figure = new THREE.Group();
    // The cloak: a profile turned about the figure's axis, wide at the hem, narrow at the shoulders
    const profile = [[0.0, 0], [0.42, 0], [0.4, 0.15], [0.33, 0.7], [0.27, 1.1], [0.25, 1.3], [0.21, 1.42], [0.1, 1.48], [0.0, 1.5]]
        .map(([r, y]) => new THREE.Vector2(r, y));
    const cloak = new THREE.LatheGeometry(profile, 18);
    cloak.scale(1, 1, 0.75);
    figure.add(new THREE.Mesh(cloak, bronze));
    // The hood, and the shadow of a face inside it
    const hood = new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1, 1.25, 1.1).translate(0, 1.6, 0.01);
    figure.add(new THREE.Mesh(hood, bronze));
    figure.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10).translate(0, 1.57, -0.04), new THREE.MeshStandardMaterial({ color: '#141615', roughness: 1 })));
    // A scarf trailing in the wind behind the shoulders
    const scarf = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.12, 1.42, 0.1), new THREE.Vector3(0.28, 1.36, 0.32), new THREE.Vector3(0.5, 1.22, 0.4), new THREE.Vector3(0.72, 1.18, 0.36)
    ]), 12, 0.035, 6);
    figure.add(new THREE.Mesh(scarf, bronze));
    // A blade across the back
    figure.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.04).rotateZ(0.6).translate(0.05, 1.05, 0.24), bronze));
    // Arms folded in front, under the cloak
    figure.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.32, 4, 8).rotateZ(Math.PI / 2).translate(0, 1.08, -0.24), bronze));
    figure.position.y = plinth;
    figure.traverse(part => { if (part.isMesh) part.castShadow = true; });
    group.add(figure);

    // A ring of light at the plinth's foot that 'illuminate' sends up around the figure
    const ringMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(params.accent ?? '#ffcf8a').multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.012, 6, 64).rotateX(Math.PI / 2), ringMaterial);
    ring.position.y = plinth + 0.02;
    group.add(ring);

    group.userData.parts = { figure, ring, glows: [{ material: bronze, base: 0, peak: params.glow ?? 0.22 }] };
    return group;
}

// ---- The scroll ------------------------------------------------------------------------------

// Brush marks that look like writing from afar but are no real script: strokes in columns
function scrollTexture(seed) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    context.fillStyle = '#e8dcc0';
    context.fillRect(0, 0, 512, 192);
    const random = createRandom(seed);
    context.strokeStyle = 'rgba(30, 22, 18, 0.85)';
    context.lineCap = 'round';
    for (let column = 0; column < 14; column++) {
        const x = 470 - column * 32;
        for (let mark = 0; mark < 6; mark++) {
            const y = 22 + mark * 26;
            context.lineWidth = 2 + random() * 3;
            context.beginPath();
            context.moveTo(x - 8 + random() * 6, y + random() * 6);
            context.quadraticCurveTo(x + random() * 10 - 5, y + 6 + random() * 8, x + 8 - random() * 6, y + 14 + random() * 6);
            context.stroke();
            if (random() > 0.5) {
                context.beginPath();
                context.moveTo(x - 9, y + 8);
                context.lineTo(x + 9, y + 7 + random() * 4);
                context.stroke();
            }
        }
    }
    // A red seal in the corner
    context.fillStyle = 'rgba(160, 40, 30, 0.85)';
    context.fillRect(20, 140, 26, 26);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

export function scroll(params, kit) {
    const wood = new THREE.MeshStandardMaterial({ color: '#3a281d', roughness: 0.7 });
    const group = new THREE.Group();
    // The lectern: a post and a sloping top, its high side away from the reader
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12).translate(0, 0.475, 0), wood));
    group.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.4).translate(0, 0.025, 0), wood));
    const top = new THREE.Group();
    top.position.set(0, 1.0, 0);
    top.rotation.x = -0.42; // Tilted toward the reader (who stands at -z): the far side is higher
    top.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.36), wood));
    group.add(top);

    const paperMaterial = new THREE.MeshStandardMaterial({ map: scrollTexture(params.seed ?? 7), roughness: 0.9, side: THREE.DoubleSide });
    // Lying on the lectern, the top of the writing away from the reader
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.28).rotateX(-Math.PI / 2).rotateY(Math.PI), paperMaterial);
    paper.position.y = 0.022;
    paper.scale.x = 0.12;
    top.add(paper);
    const rollers = [-1, 1].map(side => {
        const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.33, 12).rotateX(Math.PI / 2), wood);
        roller.position.set(side * 0.05, 0.04, 0);
        roller.userData.side = side;
        top.add(roller);
        return roller;
    });
    group.traverse(part => { if (part.isMesh) part.castShadow = true; });
    group.userData.parts = { paper, rollers, unfoldWidth: 0.78 };
    return group;
}

// ---- The museum guide ------------------------------------------------------------------------

// A slim plinth with a floating plan of the museum: the rotunda and a point of light for each gallery
export function museumGuide(params, kit) {
    const group = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: '#0d1118', roughness: 0.3, metalness: 0.6 });
    group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.0, 8).translate(0, 0.5, 0), dark));
    const accent = new THREE.Color(params.accent ?? '#9fe8ff');
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 8).translate(0, 1.01, 0),
        new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(1.6) }));
    group.add(top);

    const hologram = new THREE.Group();
    hologram.position.y = 1.35;
    const lineMaterial = new THREE.LineBasicMaterial({ color: accent.clone().multiplyScalar(1.8), transparent: true, opacity: 0.85 });
    const octagon = [];
    for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        octagon.push(new THREE.Vector3(Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26));
    }
    hologram.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(octagon), lineMaterial));
    hologram.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(octagon.map(p => p.clone().multiplyScalar(0.35))), lineMaterial));
    // The way in, from the entrance hall
    hologram.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.05, 0, 0.24), new THREE.Vector3(-0.05, 0, 0.42), new THREE.Vector3(0.05, 0, 0.42), new THREE.Vector3(0.05, 0, 0.24)
    ]), lineMaterial));
    const glows = [];
    (params.galleries ?? []).forEach(({ facing, color, open }) => {
        const a = THREE.MathUtils.degToRad(facing);
        const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(open ? 2.2 : 0.8) });
        const dot = new THREE.Mesh(new THREE.SphereGeometry(open ? 0.028 : 0.02, 12, 8), material);
        dot.position.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
        hologram.add(dot);
        glows.push({ material, base: 1, color: material.color.clone() });
    });
    // You are here
    const here = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(2) }));
    here.position.set(0, 0, 0.36);
    hologram.add(here);
    hologram.rotation.x = -0.35;
    group.add(hologram);
    group.userData.parts = { hologram, spin: hologram, glowDots: glows };
    return group;
}
